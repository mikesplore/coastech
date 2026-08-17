import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getCategoryByHandle } from "@lib/data/categories"
import Builder from "@modules/builder/components/builder"

const slots = [
  ["cpu", "processors-cpus", "CPU"],
  ["motherboard", "motherboards", "Motherboard"],
  ["ram", "memory-ram", "Memory"],
  ["storage", "storage", "Storage"],
  ["gpu", "graphics-cards-gpus", "Graphics"],
  ["psu", "power-supplies-psus", "Power supply"],
  ["case", "cases", "Case"],
  ["cooling", "cooling", "Cooling"],
] as const

export default async function BuilderPage({ params }: { params: Promise<{ countryCode: string }> }) {
  const { countryCode } = await params
  const region = await getRegion(countryCode)
  if (!region) return null

  const products = await Promise.all(slots.map(async ([slot, handle, label]) => {
    const category = await getCategoryByHandle([handle])
    return {
      slot,
      label,
      products: category ? (await listProducts({
        regionId: region.id,
        queryParams: { category_id: [category.id], limit: 12, fields: "*variants.calculated_price,+variants.inventory_quantity" },
      })).response.products : [],
    }
  }))

  return <Builder catalog={products} countryCode={countryCode} />
}
