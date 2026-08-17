"use client"

import { sdk } from "@lib/config"
import { MagnifyingGlass } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function SearchBar() {
  const router = useRouter(); const { countryCode } = useParams() as { countryCode: string }
  const [value, setValue] = useState("")
  const [results, setResults] = useState<Array<{ handle: string; title: string }>>([])

  useEffect(() => {
    const query = value.trim()
    if (query.length < 2) { setResults([]); return }
    const timer = window.setTimeout(async () => {
      const response = await sdk.client.fetch<{ products: Array<{ handle: string; title: string }> }>("/store/products", { query: { q: query, limit: 5, fields: "id,handle,title" }, cache: "no-store" }).catch(() => ({ products: [] }))
      setResults(response.products)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [value])

  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="site-search" className="sr-only">Search components</label>
      <div className="relative flex h-10 w-full overflow-hidden rounded-lg border border-surface-variant bg-surface-container focus-within:border-primary-container"><input id="site-search" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && value.trim()) router.push(`/${countryCode}/search?q=${encodeURIComponent(value.trim())}`) }} placeholder="Search products, brands and categories..." className="h-full w-full border-none bg-transparent px-4 font-body-md text-body-md text-on-surface outline-none placeholder:text-secondary focus:ring-0" /><button type="button" onClick={() => value.trim() && router.push(`/${countryCode}/search?q=${encodeURIComponent(value.trim())}`)} className="flex h-full items-center justify-center bg-primary-container px-6 text-on-primary transition-colors hover:bg-primary"><MagnifyingGlass className="h-5 w-5" /></button></div>
      {results.length > 0 && <div className="absolute right-0 top-11 z-50 w-full min-w-64 border border-surface-variant bg-surface-container-lowest p-2 shadow-xl">{results.map((product) => <LocalizedClientLink key={product.handle} href={`/products/${product.handle}`} onClick={() => setValue("")} className="block border-b border-surface-variant px-3 py-2 font-body-md text-body-md text-on-surface last:border-0 hover:text-primary">{product.title}<span className="block font-label-sm text-label-sm uppercase text-secondary">product / spec match</span></LocalizedClientLink>)}</div>}
    </div>
  )
}
