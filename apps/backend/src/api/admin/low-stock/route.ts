import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type VariantRow = {
  id: string
  title: string
  sku: string | null
  metadata: Record<string, unknown> | null
  product?: { id: string; title: string } | null
  inventory_items?: {
    inventory?: {
      location_levels?: { stocked_quantity?: number | null }[]
    } | null
  }[]
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "title",
      "sku",
      "metadata",
      "product.id",
      "product.title",
      "inventory_items.inventory.location_levels.stocked_quantity",
    ],
  })

  const rows = (variants as VariantRow[])
    .map((v) => {
      const threshold = Number((v.metadata ?? {})["low_stock_threshold"] ?? 0)
      const stocked = (v.inventory_items ?? []).reduce((acc, ii) => {
        const levels = ii.inventory?.location_levels ?? []
        const sum = levels.reduce((a, l) => a + (l.stocked_quantity ?? 0), 0)
        return acc + sum
      }, 0)

      return {
        id: v.id,
        title: v.title,
        sku: v.sku,
        product_title: v.product?.title ?? null,
        stocked_quantity: stocked,
        low_stock_threshold: threshold,
      }
    })
    .filter((r) => r.stocked_quantity <= r.low_stock_threshold)
    .sort((a, b) => a.stocked_quantity - b.stocked_quantity)

  res.json({ variants: rows })
}

