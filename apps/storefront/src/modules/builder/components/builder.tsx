"use client"

import { addToCart } from "@lib/data/cart"
import { BuildSlot, useBuild } from "@lib/context/build-context"
import { Button } from "@modules/common/components/ui"
import { HttpTypes } from "@medusajs/types"
import Thumbnail from "@modules/products/components/thumbnail"
import { useState } from "react"

type CatalogItem = {
  slot: BuildSlot
  label: string
  products: HttpTypes.StoreProduct[]
}

export default function Builder({ catalog, countryCode }: { catalog: CatalogItem[]; countryCode: string }) {
  const { parts, subtotal, compatibility, addPart, removePart, saveBuild } = useBuild()
  const [name, setName] = useState("")
  const [adding, setAdding] = useState(false)

  const choose = (slot: BuildSlot, product: HttpTypes.StoreProduct) => {
    const variant = product.variants?.find((item) => (item.inventory_quantity ?? 0) > 0) ?? product.variants?.[0]
    if (!variant) return
    addPart({
      slot,
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      price: Number(variant.calculated_price?.calculated_amount ?? 0),
      currencyCode: variant.calculated_price?.currency_code ?? "kes",
    })
  }

  const addAll = async () => {
    setAdding(true)
    await Promise.all(parts.map((part) => addToCart({ variantId: part.variantId, quantity: 1, countryCode })))
    setAdding(false)
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 rounded-xl bg-surface-container-lowest p-6 shadow-sm md:p-8">
        <div>
          <p className="font-label-bold text-label-bold uppercase tracking-[0.2em] text-primary">Build studio</p>
          <h1 className="mt-2 font-display-lg text-display-lg text-on-surface">Build your PC</h1>
          <p className="mt-3 max-w-xl font-body-lg text-body-lg text-secondary">Choose compatible parts in connection order. Optional slots can stay empty while we check your build.</p>
        </div>
        <div className="rounded-lg bg-primary-container px-6 py-4 text-right text-on-primary">
          <p className="font-label-bold text-label-bold uppercase">Build subtotal</p>
          <p className="mt-1 font-price-lg text-price-lg">KES {subtotal.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {catalog.map(({ slot, label, products }) => {
          const selected = parts.find((part) => part.slot === slot)
          return (
            <section key={slot} className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">{label}</h2>
                <span className={`rounded-full px-3 py-1 font-label-sm text-label-sm uppercase ${selected ? "bg-primary-fixed text-on-primary-fixed-variant" : "bg-surface-container text-secondary"}`}>{selected ? "Selected" : "Optional"}</span>
              </div>
              <div className="grid gap-3">
                {products.slice(0, 5).map((product) => (
                  <button key={product.id} type="button" onClick={() => choose(slot, product)} className={`flex items-center gap-3 rounded-lg border p-2 text-left transition ${selected?.productId === product.id ? "border-primary-container bg-primary-fixed" : "border-surface-variant hover:border-primary-container"}`}>
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-surface-container"><Thumbnail thumbnail={product.thumbnail} images={product.images} size="square" className="!rounded-none !p-0" /></div>
                    <span className="min-w-0 flex-1 pr-2"><span className="block truncate font-body-md text-body-md text-on-surface">{product.title}</span><span className="mt-1 block font-price-lg text-price-lg text-primary">{product.variants?.[0]?.calculated_price?.currency_code?.toUpperCase() ?? "KES"} {Number(product.variants?.[0]?.calculated_price?.calculated_amount ?? 0).toLocaleString()}</span></span>
                    <span className={`rounded-full px-3 py-2 font-label-bold text-label-bold ${selected?.productId === product.id ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface"}`}>{selected?.productId === product.id ? "Selected" : "Choose"}</span>
                  </button>
                ))}
              </div>
              {selected && <button type="button" onClick={() => removePart(slot)} className="mt-3 font-label-sm text-label-sm uppercase text-error hover:underline">Remove selection</button>}
            </section>
          )
        })}
      </div>

      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-5 shadow-sm">
        <div>
          <p className={`font-label-bold text-label-bold uppercase ${compatibility?.compatible ? "text-traceOk" : "text-error"}`}>
            {compatibility ? compatibility.compatible ? "Compatibility check passed" : "Review compatibility warnings" : "Select parts to run compatibility check"}
          </p>
          {compatibility?.issues?.map((issue) => <p key={issue} className="mt-2 font-body-md text-body-md text-secondary">{issue}</p>)}
        </div>
        <div className="flex flex-wrap gap-3">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name this build" className="rounded-lg border border-surface-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface outline-none focus:border-primary-container" />
          <Button onClick={() => { saveBuild(name); setName("") }} disabled={!parts.length} variant="secondary">Save build</Button>
          <Button onClick={addAll} disabled={!parts.length || adding} isLoading={adding} variant="primary">Add selected to cart</Button>
        </div>
      </section>
      </div>
    </main>
  )
}
