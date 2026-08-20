import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendOrderConfirmationEmail } from "../services/email"

export default async function orderPlacedEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "currency_code",
      "total",
      "items.title",
      "items.quantity",
      "items.unit_price",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.address_1",
      "shipping_address.city",
      "shipping_address.country_code",
    ],
    filters: { id: data.id },
  })

  const order = orders[0]

  if (!order) {
    logger.warn(`Order confirmation email skipped: order ${data.id} was not found`)
    return
  }

  await sendOrderConfirmationEmail({
    order: order as unknown as Parameters<typeof sendOrderConfirmationEmail>[0]["order"],
    logger,
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
