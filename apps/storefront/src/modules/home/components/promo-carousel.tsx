"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useEffect, useState } from "react"
import { PromotionalAd } from "@lib/data/promotions"

export default function PromoCarousel({ ads = [] }: { ads?: PromotionalAd[] }) {
  const [active, setActive] = useState(0)
  const livePromos = ads.filter((ad) => ad.placement === "homepage_carousel").map((ad) => ({ eyebrow: ad.eyebrow ?? "Featured offer", title: ad.title, copy: ad.description ?? "Shop the latest offers from Coast Tech.", href: ad.href, image_url: ad.image_url, cta_label: ad.cta_label ?? "Shop now" }))
  if (!livePromos.length) return null
  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % livePromos.length), 5000)
    return () => window.clearInterval(timer)
  }, [livePromos.length])
  const promo = livePromos[active % livePromos.length]
  return (
    <section className="content-container py-5 small:py-8">
      <div className="relative min-h-[192px] overflow-hidden rounded-xl bg-[#161616] px-6 py-7 text-white shadow-sm small:min-h-[478px] small:px-12 small:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff6a00] via-[#e6470b] to-[#571f00]" style={promo.image_url ? { backgroundImage: `url(${promo.image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border-[28px] border-white/10" />
        <div className="absolute right-20 bottom-[-160px] h-96 w-96 rounded-full border-[42px] border-white/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-transparent" />
        <div className="relative max-w-xl"><p className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">{promo.eyebrow}</p><h1 className="mt-4 text-3xl font-extrabold leading-tight small:text-5xl">{promo.title}</h1><p className="mt-2 text-sm text-gray-100 small:text-base">{promo.copy}</p><LocalizedClientLink href={promo.href} className="mt-5 inline-block rounded-full bg-white px-6 py-3 text-sm font-bold text-orange-700 hover:bg-orange-50">{promo.cta_label}</LocalizedClientLink></div>
        <div className="absolute bottom-5 right-5 hidden items-center gap-2 small:flex"><button aria-label="Previous promotion" onClick={() => setActive((active - 1 + livePromos.length) % livePromos.length)} className="rounded-full border border-white/60 px-3 py-1">‹</button><button aria-label="Next promotion" onClick={() => setActive((active + 1) % livePromos.length)} className="rounded-full border border-white/60 px-3 py-1">›</button></div>
      </div>
      <div className="mt-2 flex justify-center gap-1">{livePromos.map((item, index) => <button aria-label={`Promotion ${index + 1}`} key={item.title} onClick={() => setActive(index)} className={`h-1.5 w-8 rounded-full ${index === active % livePromos.length ? "bg-orange-600" : "bg-gray-300"}`} />)}</div>
    </section>
  )
}
