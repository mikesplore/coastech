"use client"

import { sdk } from "@lib/config"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type BuildSlot = "cpu" | "motherboard" | "ram" | "storage" | "gpu" | "psu" | "case" | "cooling"

export type BuildPart = {
  slot: BuildSlot
  productId: string
  variantId: string
  title: string
  price: number
  currencyCode: string
}

export type SavedBuild = {
  id: string
  name: string
  parts: BuildPart[]
  createdAt: string
}

type BuildContextValue = {
  parts: BuildPart[]
  savedBuilds: SavedBuild[]
  subtotal: number
  compatibility: { compatible: boolean; issues?: string[] } | null
  addPart: (part: BuildPart) => void
  removePart: (slot: BuildSlot) => void
  clearBuild: () => void
  saveBuild: (name: string) => void
  loadBuild: (build: SavedBuild) => void
}

const BuildContext = createContext<BuildContextValue | null>(null)
const storageKey = "coast-tech-build"

export function BuildProvider({ children }: { children: React.ReactNode }) {
  const [parts, setParts] = useState<BuildPart[]>([])
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>([])
  const [compatibility, setCompatibility] = useState<BuildContextValue["compatibility"]>(null)

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored) as { parts?: BuildPart[]; savedBuilds?: SavedBuild[] }
      setParts(parsed.parts ?? [])
      setSavedBuilds(parsed.savedBuilds ?? [])
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ parts, savedBuilds }))
    const timer = window.setTimeout(async () => {
      if (!parts.length) {
        setCompatibility(null)
        return
      }
      try {
        const result = await sdk.client.fetch<{ isCompatible: boolean; warnings?: string[] }>(
          "/store/build/check-compatibility",
          { method: "POST", body: { product_ids: parts.map((part) => part.productId) } }
        )
        setCompatibility({ compatible: result.isCompatible, issues: result.warnings })
      } catch {
        setCompatibility({ compatible: true, issues: ["Compatibility service unavailable"] })
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [parts, savedBuilds])

  const value = useMemo<BuildContextValue>(() => ({
    parts,
    savedBuilds,
    subtotal: parts.reduce((total, part) => total + part.price, 0),
    compatibility,
    addPart: (part) => setParts((current) => [...current.filter((item) => item.slot !== part.slot), part]),
    removePart: (slot) => setParts((current) => current.filter((part) => part.slot !== slot)),
    clearBuild: () => setParts([]),
    saveBuild: (name) => setSavedBuilds((current) => [
      { id: crypto.randomUUID(), name: name.trim() || "Untitled build", parts, createdAt: new Date().toISOString() },
      ...current,
    ]),
    loadBuild: (build) => setParts(build.parts),
  }), [parts, savedBuilds, compatibility])

  return <BuildContext.Provider value={value}>{children}</BuildContext.Provider>
}

export function useBuild() {
  const context = useContext(BuildContext)
  if (!context) throw new Error("useBuild must be used inside BuildProvider")
  return context
}
