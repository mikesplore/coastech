import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import ProductPreview from "@modules/products/components/product-preview"

export default async function SearchPage({ params, searchParams }: { params: Promise<{ countryCode: string }>; searchParams: Promise<{ q?: string }> }) {
  const { countryCode } = await params; const { q = "" } = await searchParams; const region = await getRegion(countryCode)
  if (!region) return null
  const { products, count } = (await listProducts({ regionId: region.id, queryParams: { q, limit: 48 } })).response
  return <main className="content-container bg-gray-100 py-6"><div className="mb-5"><p className="text-sm text-gray-500">Search results for</p><h1 className="text-2xl font-bold text-gray-900">{q || "All products"} <span className="text-sm font-normal text-gray-500">({count})</span></h1></div><div className="grid grid-cols-2 gap-3 small:grid-cols-4 medium:grid-cols-6">{products.map((product) => <ProductPreview key={product.id} product={product} region={region} />)}</div></main>
}
