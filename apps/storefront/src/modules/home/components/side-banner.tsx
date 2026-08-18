import { PromotionalAd } from "@lib/data/promotions"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function SideBanner({ ads }: { ads: PromotionalAd[] }) {
  const banners = ads.filter((ad) => ad.placement === "homepage_side_banner")
  const banner = banners[0]

  if (!banner) return null

  return <div className="pointer-events-none fixed inset-x-0 top-40 z-20 hidden min-[1560px]:block"><LocalizedClientLink href={banner.href} className="pointer-events-auto absolute left-4 w-48 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest text-on-surface shadow-lg"><div className="aspect-[4/5] bg-surface-container">{banner.image_url ? <img src={banner.image_url} alt="" className="h-full w-full object-cover" /> : null}</div><div className="p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-primary">{banner.eyebrow ?? "Coast Tech"}</p><h2 className="mt-1 text-sm font-bold">{banner.title}</h2>{banner.description ? <p className="mt-1 text-xs text-secondary">{banner.description}</p> : null}</div></LocalizedClientLink></div>
}
