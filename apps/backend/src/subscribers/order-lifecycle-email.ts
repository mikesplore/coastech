import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendOrderLifecycleEmail } from "../services/email"

type Order = {
  id: string
  display_id?: string | number | null
  email?: string | null
  total?: number | null
  currency_code?: string | null
}

async function getOrder(container: SubscriberArgs<{ id: string }>["container"], id: string, paymentId?: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  if (paymentId) {
    const { data } = await query.graph({
      entity: "payment",
      fields: ["id", "payment_collection.order.id", "payment_collection.order.display_id", "payment_collection.order.email", "payment_collection.order.total", "payment_collection.order.currency_code"],
      filters: { id: paymentId },
    })
    return data[0]?.payment_collection?.order as Order | undefined
  }
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "total", "currency_code"],
    filters: { id },
  })
  return data[0] as Order | undefined
}

export default async function orderCanceledEmail({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const order = await getOrder(container, data.id)
  if (!order) return
  await sendOrderLifecycleEmail({
    order,
    title: "Order canceled",
    message: "Your order has been canceled.",
    logger: container.resolve(ContainerRegistrationKeys.LOGGER),
  })
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
