import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendOrderLifecycleEmail } from "../services/email"

export default async function orderDeliveredEmail({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "order.id", "order.display_id", "order.email"],
    filters: { id: data.id },
  })
  const order = fulfillments[0]?.order
  if (!order) return

  await sendOrderLifecycleEmail({
    order,
    title: "Order delivered",
    message: "Your order has been marked as delivered.",
    logger: container.resolve(ContainerRegistrationKeys.LOGGER),
  })
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}
