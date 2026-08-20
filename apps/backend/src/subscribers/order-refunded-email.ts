import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendOrderLifecycleEmail } from "../services/email"

export default async function orderRefundedEmail({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "payment",
    fields: [
      "id",
      "amount",
      "refunds.amount",
      "payment_collection.order.id",
      "payment_collection.order.display_id",
      "payment_collection.order.email",
      "payment_collection.order.currency_code",
    ],
    filters: { id: data.id },
  })
  const order = orders[0]?.payment_collection?.order
  if (!order) return

  const refunds = (orders[0]?.refunds ?? []) as Array<{ amount?: number | null } | null>
  const amount: number = refunds.reduce((total, refund) => total + Number(refund?.amount ?? 0), 0)
  await sendOrderLifecycleEmail({
    order,
    title: "Refund processed",
    message: "A refund has been processed for your order.",
    detail: amount ? `Refunded amount: ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${(order.currency_code ?? "").toUpperCase()}` : undefined,
    logger: container.resolve(ContainerRegistrationKeys.LOGGER),
  })
}

export const config: SubscriberConfig = {
  event: "payment.refunded",
}
