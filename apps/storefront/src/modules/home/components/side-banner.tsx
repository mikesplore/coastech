import { PromotionalAd } from "@lib/data/promotions"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function SideBanner({ ads }: { ads: PromotionalAd[] }) {
  const banners = ads.filter((ad) => ad.placement === "homepage_side_banner")
  const banner = banners[0]

  if (!banner) return null

  return <aside className="hidden w-56 shrink-0 xl:mr-6 xl:block xl:pt-8"><LocalizedClientLink href={banner.href} className="block overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest text-on-surface shadow-lg"><div className="aspect-[4/5] bg-surface-container">{banner.image_url ? <img src={banner.image_url} alt={banner.title} className="h-full w-full object-cover" /> : null}</div><div className="p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-primary">{banner.eyebrow ?? "Coast Tech"}</p><h2 className="mt-1 text-sm font-bold">{banner.title}</h2>{banner.discount_label ? <p className="mt-1 text-xs font-bold text-orange-600">{banner.discount_label}</p> : null}{banner.description ? <p className="mt-1 text-xs text-secondary">{banner.description}</p> : null}{banner.cta_label ? <span className="mt-2 block text-xs font-bold text-primary">{banner.cta_label}</span> : null}</div></LocalizedClientLink></aside>
}
