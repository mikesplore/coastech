import { Metadata } from "next"

import ProductRail from "@modules/home/components/product-rail"
import PromoCarousel from "@modules/home/components/promo-carousel"
import CategoryStrip from "@modules/home/components/category-strip"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { listPromotionalAds } from "@lib/data/promotions"

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
  return <div className="bg-[#f9f9f9]"><PromoCarousel ads={ads} /><CategoryStrip categories={categories} /><div className="content-container py-4"><div className="grid gap-3 small:grid-cols-3"><div className="rounded-lg bg-white p-4 text-sm shadow-sm"><strong className="text-orange-600">Free delivery</strong><span className="block text-gray-600">Same-day delivery within Mombasa</span></div><div className="rounded-lg bg-white p-4 text-sm shadow-sm"><strong className="text-orange-600">Official warranties</strong><span className="block text-gray-600">Manufacturer-backed support</span></div><div className="rounded-lg bg-white p-4 text-sm shadow-sm"><strong className="text-orange-600">Secure checkout</strong><span className="block text-gray-600">Pay safely in KES</span></div></div></div><ProductRail title="Flash Deals & Clearance" products={products} region={region} /><ProductRail title="Best-Selling Components" products={products.slice().reverse()} region={region} /><ProductRail title="New Arrivals" products={products.slice(2)} region={region} /><section className="content-container py-8"><div className="grid gap-3 small:grid-cols-4"><div className="rounded-lg bg-white p-5 text-sm"><strong>Free shipping</strong><span className="block text-gray-500">On orders over KES 500</span></div><div className="rounded-lg bg-white p-5 text-sm"><strong>Secure payment</strong><span className="block text-gray-500">100% protected checkout</span></div><div className="rounded-lg bg-white p-5 text-sm"><strong>Warranty-backed</strong><span className="block text-gray-500">Support from local experts</span></div><div className="rounded-lg bg-white p-5 text-sm"><strong>Pickup available</strong><span className="block text-gray-500">Collect from Nairobi</span></div></div></section></div>
}
