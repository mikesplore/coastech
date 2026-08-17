import { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { listPromotionalAds } from "@lib/data/promotions"

export default async function ProductRail({ title, products, region, urgency = false }: { title: string; products: HttpTypes.StoreProduct[]; region: HttpTypes.StoreRegion; urgency?: boolean }) {
  if (!products.length) return null
  urgency = urgency || title.toLowerCase().includes("flash")
  const deal = urgency ? (await listPromotionalAds()).find((ad) => ad.placement === "homepage_flash_deals") : null
  return <section className="content-container py-5 small:py-8"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-3"><h2 className="text-xl font-bold text-gray-900">{title}</h2>{deal?.countdown_ends_at && <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">Ends soon</span>}</div><LocalizedClientLink href={deal?.href ?? "/store"} className="text-sm font-semibold text-orange-600 hover:underline">{deal?.cta_label ?? "View all"}</LocalizedClientLink></div><div className="grid grid-cols-2 gap-3 small:grid-cols-5">{products.slice(0, 5).map((product) => <ProductPreview key={product.id} product={product} region={region} variant="home" saleBadge={deal?.discount_label ?? undefined} />)}</div></section>
}
