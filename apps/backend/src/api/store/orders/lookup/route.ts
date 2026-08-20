import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type LookupBody = {
  email?: string
  order_id?: string
}

export async function POST(req: MedusaRequest<LookupBody>, res: MedusaResponse) {
  const email = req.body?.email?.trim().toLowerCase()
  const orderId = req.body?.order_id?.trim()

  if (!email || !orderId) {
    res.status(400).json({ message: "email and order_id are required" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const fields = [
    "id",
    "display_id",
    "email",
    "created_at",
    "currency_code",
    "total",
    "subtotal",
    "item_subtotal",
    "shipping_subtotal",
    "discount_subtotal",
    "tax_total",
    "gift_card_total",
    "shipping_total",
    "discount_total",
    "fulfillment_status",
    "payment_status",
    "fulfillments.id",
    "fulfillments.shipped_at",
    "fulfillments.delivered_at",
    "fulfillments.labels.tracking_number",
    "fulfillments.labels.tracking_url",
    "fulfillments.metadata",
    "items.title",
    "items.id",
    "items.created_at",
    "items.quantity",
    "items.unit_price",
    "items.thumbnail",
    "shipping_methods.name",
    "shipping_methods.total",
    "shipping_address.first_name",
    "shipping_address.last_name",
    "shipping_address.address_1",
    "shipping_address.city",
    "shipping_address.country_code",
  ]
  const { data: orders } = await query.graph({
    entity: "order",
    fields,
    filters: { id: orderId, email },
  })

  let order = orders[0]

  if (!order && /^\d+$/.test(orderId)) {
    const { data: displayIdOrders } = await query.graph({
      entity: "order",
      fields,
      filters: { display_id: orderId, email },
    })
    order = displayIdOrders[0]
  }

  if (!order) {
    res.status(404).json({ message: "Order not found" })
    return
  }

  res.json({ order })
}
