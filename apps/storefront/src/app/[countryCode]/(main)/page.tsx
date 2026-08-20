import { Metadata } from "next"

import ProductRail from "@modules/home/components/product-rail"
import PromoCarousel from "@modules/home/components/promo-carousel"
import CategoryStrip from "@modules/home/components/category-strip"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { listPromotionalAds } from "@lib/data/promotions"
import TrustBadges from "@modules/home/components/trust-badges"
import SideBanner from "@modules/home/components/side-banner"
import { getProductDiscountLabel } from "@lib/util/product-content"
import CoastTechMenu from "@modules/store/components/coast-tech-menu"

export const metadata: Metadata = {
  title: "Coast Tech | Online computer store",
  description: "Shop computer components, peripherals, and complete builds.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const [categories, ads] = await Promise.all([listCategories({ limit: 20 }), listPromotionalAds()])

  if (!region) {
    return null
  }

  const products = (await listProducts({ regionId: region.id, queryParams: { limit: 30 } })).response.products
  const trustAds = ads.filter((ad) => ad.placement === "homepage_trust")
  const dealProducts = products.filter((product) => getProductDiscountLabel(product))
  return <div className="bg-[#f9f9f9]"><div className="flex w-full items-start"><aside className="sticky top-[5.75rem] hidden min-h-[calc(100vh-5.75rem)] w-64 shrink-0 border-r border-surface-variant bg-surface px-6 py-8 lg:block"><CoastTechMenu /></aside><main className="min-w-0 flex-1 px-6"><PromoCarousel ads={ads} /><CategoryStrip categories={categories} /><section className="content-container py-4"><TrustBadges ads={trustAds} /></section><ProductRail title="Flash Deals & Clearance" products={dealProducts} region={region} /><ProductRail title="Best-Selling Components" products={products.slice().reverse()} region={region} /><ProductRail title="New Arrivals" products={products.slice(2)} region={region} /><section className="content-container py-8"><TrustBadges ads={trustAds} compact /></section></main><SideBanner ads={ads} /></div></div>
}
