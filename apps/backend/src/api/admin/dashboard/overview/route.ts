import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getLastFulfillmentStatus, getLastPaymentStatus } from "@medusajs/core-flows"

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
  payment_collections?: Array<{ status?: string; amount?: number; captured_amount?: number; refunded_amount?: number }>
  fulfillments?: Array<{ packed_at?: string | Date | null; shipped_at?: string | Date | null; delivered_at?: string | Date | null; canceled_at?: string | Date | null }>
  items?: Array<{ raw_quantity?: number; detail?: { raw_fulfilled_quantity?: number } }>
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
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const orderQuery = (async () => {
    try {
      return await query.graph({
        entity: "order",
        fields: [
          "id",
          "display_id",
          "email",
          "total",
          "currency_code",
          "created_at",
          "status",
          "payment_collections.status",
          "payment_collections.amount",
          "payment_collections.captured_amount",
          "payment_collections.refunded_amount",
          "fulfillments.packed_at",
          "fulfillments.shipped_at",
          "fulfillments.delivered_at",
          "fulfillments.canceled_at",
          "items.raw_quantity",
          "items.detail.raw_fulfilled_quantity",
          "shipping_methods.version",
        ],
        filters: { is_draft_order: false },
        pagination: { take: 500, skip: 0 },
      })
    } catch (error) {
      logger.warn(
        `Dashboard order details unavailable; falling back to scalar order fields: ${error instanceof Error ? error.message : String(error)}`
      )
      try {
        return await query.graph({
          entity: "order",
          fields: ["id", "display_id", "email", "total", "currency_code", "created_at", "status", "shipping_methods.version"],
          filters: { is_draft_order: false },
          pagination: { take: 500, skip: 0 },
        })
      } catch (fallbackError) {
        logger.error(
          `Dashboard order data unavailable; returning an empty order summary: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
        )
        return { data: [], metadata: { count: 0, take: 500, skip: 0 } }
      }
    }
  })()
  const lowStockQuery = query.graph({
    entity: "product_variant",
    fields: ["id", "title", "sku", "metadata", "product.title", "inventory_items.inventory.location_levels.stocked_quantity"],
    pagination: { take: 500, skip: 0 },
  })
  const [orderResult, lowStockResult] = await Promise.allSettled([orderQuery, lowStockQuery])

  if (lowStockResult.status === "rejected") {
    logger.error("Dashboard low-stock query failed; returning dashboard without inventory data", lowStockResult.reason)
  }

  const orderData = orderResult.status === "fulfilled" ? orderResult.value : { data: [], metadata: { count: 0, take: 500, skip: 0 } }
  const { data: orders, metadata } = orderData
  const variants = lowStockResult.status === "fulfilled" ? lowStockResult.value.data : []
  const orderRows = (orders as unknown as DashboardOrder[]).map((order) => ({
    ...order,
    payment_status: getLastPaymentStatus({ ...order, payment_collections: order.payment_collections ?? [] } as never),
    fulfillment_status: getLastFulfillmentStatus({ ...order, fulfillments: order.fulfillments ?? [], items: order.items ?? [] } as never),
  }))
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
