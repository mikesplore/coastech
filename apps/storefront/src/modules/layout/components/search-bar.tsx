"use client"

import { sdk } from "@lib/config"
import { MagnifyingGlass } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function SearchBar() {
  const router = useRouter(); const { countryCode } = useParams() as { countryCode: string }
  const [value, setValue] = useState("")
  const [results, setResults] = useState<Array<{ handle: string; title: string; thumbnail?: string | null; images?: Array<{ url?: string | null }> }>>([])
  const [activeResult, setActiveResult] = useState(0)

  useEffect(() => {
    const query = value.trim()
    if (query.length < 2) { setResults([]); setActiveResult(0); return }
    const timer = window.setTimeout(async () => {
      const response = await sdk.client.fetch<{ products: Array<{ handle: string; title: string; thumbnail?: string | null; images?: Array<{ url?: string | null }> }> }>("/store/products", { query: { q: query, limit: 6, fields: "id,handle,title,thumbnail,images.url" }, cache: "no-store" }).catch(() => ({ products: [] }))
      setResults(response.products)
      setActiveResult(0)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [value])

  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="site-search" className="sr-only">Search components</label>
      <div className="relative flex h-10 w-full overflow-hidden rounded-lg border border-surface-variant bg-surface-container focus-within:border-primary-container"><input id="site-search" role="combobox" aria-expanded={results.length > 0} aria-controls="search-suggestions" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setActiveResult((index) => Math.min(index + 1, results.length - 1)) } else if (event.key === "ArrowUp") { event.preventDefault(); setActiveResult((index) => Math.max(index - 1, 0)) } else if (event.key === "Enter") { const target = results[activeResult]; if (target) router.push(`/${countryCode}/products/${target.handle}`); else if (value.trim()) router.push(`/${countryCode}/search?q=${encodeURIComponent(value.trim())}`) } else if (event.key === "Escape") setResults([]) }} placeholder="Search products, brands and categories..." className="h-full w-full border-none bg-transparent px-4 font-body-md text-body-md text-on-surface outline-none placeholder:text-secondary focus:ring-0" /><button type="button" aria-label="Search" onClick={() => value.trim() && router.push(`/${countryCode}/search?q=${encodeURIComponent(value.trim())}`)} className="flex h-full items-center justify-center bg-primary-container px-6 text-on-primary transition-colors hover:bg-primary"><MagnifyingGlass className="h-5 w-5" /></button></div>
      {results.length > 0 && <div id="search-suggestions" role="listbox" className="absolute right-0 top-11 z-50 w-full min-w-64 border border-surface-variant bg-surface-container-lowest p-2 shadow-xl">{results.map((product, index) => <LocalizedClientLink role="option" aria-selected={index === activeResult} key={product.handle} href={`/products/${product.handle}`} onClick={() => setValue("")} className={`flex items-center gap-3 border-b border-surface-variant px-3 py-2 font-body-md text-body-md text-on-surface last:border-0 hover:bg-surface-container hover:text-primary ${index === activeResult ? "bg-surface-container" : ""}`}><span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-surface-container">{(product.thumbnail || product.images?.[0]?.url) ? <img src={product.thumbnail || product.images?.[0]?.url || ""} alt="" className="h-full w-full object-contain" /> : null}</span><span>{product.title}<span className="block font-label-sm text-label-sm uppercase text-secondary">product suggestion</span></span></LocalizedClientLink>)}</div>}
    </div>
  )
}
