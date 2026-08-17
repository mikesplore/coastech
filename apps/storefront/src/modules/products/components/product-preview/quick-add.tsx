"use client"

import { addToCart } from "@lib/data/cart"
import { Check, PlusMini, Spinner, XMark } from "@medusajs/icons"
import { useParams } from "next/navigation"
import { useState } from "react"

export default function QuickAdd({ variantId, compact = false }: { variantId?: string; compact?: boolean }) {
  const countryCode = useParams().countryCode as string
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState(false)
  if (!variantId) return null

  const compactClasses =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:bg-primary-container hover:text-on-primary"
  const fullClasses =
    "mt-3 flex w-full items-center justify-center gap-2 rounded bg-surface-container px-3 py-2 font-label-bold text-label-bold text-on-surface transition-colors hover:bg-primary-container hover:text-on-primary disabled:opacity-60 small:mx-3 small:mb-3 small:w-[calc(100%-1.5rem)]"

  return (
    <button
      type="button"
      disabled={loading}
      aria-label="Add to cart"
      onClick={async () => {
        setError(false)
        setLoading(true)
        try {
          await addToCart({ variantId, quantity: 1, countryCode })
          setAdded(true)
          window.setTimeout(() => setAdded(false), 1800)
        } catch {
          setError(true)
          window.setTimeout(() => setError(false), 2500)
        } finally {
          setLoading(false)
        }
      }}
      className={compact ? compactClasses : fullClasses}
    >
      {compact ? (
        loading ? <Spinner className="h-5 w-5 animate-spin" /> : added ? <Check className="h-5 w-5" /> : error ? <XMark className="h-5 w-5" /> : <PlusMini className="h-5 w-5" />
      ) : loading ? (
        "Adding..."
      ) : error ? (
        "Could not add item"
      ) : added ? (
        "Added to cart"
      ) : (
        "Add to cart"
      )}
    </button>
  )
}
