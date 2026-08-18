import { PromotionalAd } from "@lib/data/promotions"

export default function TrustBadges({ ads, compact = false }: { ads: PromotionalAd[]; compact?: boolean }) {
  if (!ads.length) return null

  return <div className={`grid gap-3 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 small:grid-cols-2 lg:grid-cols-4"}`}>{ads.map((ad) => <div key={ad.id} className="rounded-lg bg-white p-4 text-sm shadow-sm"><strong className="text-orange-600">{ad.title}</strong>{ad.description ? <span className="block text-gray-600">{ad.description}</span> : null}</div>)}</div>
}
