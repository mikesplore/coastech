import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type DashboardOrder = {
  id: string
  display_id?: number | null
  email?: string | null
  total?: number | null
  currency_code?: string | null
  created_at?: string | Date
  status?: string
  payment_status?: string
  fulfillment_status?: string
}

type DashboardVariant = {
  id: string
  title?: string | null
  sku?: string | null
  product?: { title?: string | null } | null
  metadata?: Record<string, unknown> | null
  inventory_items?: Array<{
    inventory?: { location_levels?: Array<{ stocked_quantity?: number | null }> } | null
  }>
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const [{ data: orders, metadata }, { data: variants }] = await Promise.all([
    query.graph({
      entity: "order",
      fields: ["id", "display_id", "email", "total", "currency_code", "created_at", "status", "payment_status", "fulfillment_status"],
      filters: { is_draft_order: false },
      pagination: { take: 500, skip: 0 },
    }),
    query.graph({
      entity: "product_variant",
      fields: ["id", "title", "sku", "metadata", "product.title", "inventory_items.inventory.location_levels.stocked_quantity"],
      pagination: { take: 500, skip: 0 },
    }),
  ])

  const orderRows = orders as DashboardOrder[]
  const statusCounts = orderRows.reduce<Record<string, number>>((counts, order) => {
    const status = order.status ?? "unknown"
    counts[status] = (counts[status] ?? 0) + 1
    return counts
  }, {})
  const paymentIssues = orderRows.filter((order) => ["not_paid", "awaiting", "requires_action", "canceled"].includes(order.payment_status ?? ""))
  const fulfillmentIssues = orderRows.filter((order) => ["not_fulfilled", "partially_fulfilled", "canceled"].includes(order.fulfillment_status ?? ""))
  const revenue = orderRows.reduce((total, order) => total + Number(order.total ?? 0), 0)
  const currencies = [...new Set(orderRows.map((order) => order.currency_code).filter(Boolean))]

  const lowStock = (variants as DashboardVariant[])
    .map((variant) => {
      const threshold = Number(variant.metadata?.low_stock_threshold ?? 0)
      const stocked = (variant.inventory_items ?? []).reduce(
        (total, item) => total + (item.inventory?.location_levels ?? []).reduce((sum, level) => sum + Number(level.stocked_quantity ?? 0), 0),
        0
      )
      return { id: variant.id, title: variant.title, sku: variant.sku, product_title: variant.product?.title, stocked_quantity: stocked, low_stock_threshold: threshold }
    })
    .filter((variant) => variant.stocked_quantity <= variant.low_stock_threshold)
    .sort((a, b) => a.stocked_quantity - b.stocked_quantity)

  res.json({
    generated_at: new Date().toISOString(),
    orders: {
      total: metadata?.count ?? orderRows.length,
      status_counts: statusCounts,
      revenue,
      currencies,
      payment_issues: paymentIssues.slice(0, 10),
      fulfillment_issues: fulfillmentIssues.slice(0, 10),
      recent: [...orderRows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8),
    },
    low_stock: lowStock.slice(0, 10),
  })
}
