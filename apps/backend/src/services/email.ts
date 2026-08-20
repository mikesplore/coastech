import { Resend } from "resend"
import { renderOrderConfirmationEmail } from "./email-templates/order-confirmation"

type EmailLogger = {
  warn: (message: string) => void
  error: (message: string, error?: unknown) => void
}

type OrderEmailData = Parameters<typeof renderOrderConfirmationEmail>[0]["order"] & {
  id: string
}

export const sendOrderConfirmationEmail = async ({
  order,
  logger,
}: {
  order: OrderEmailData
  logger: EmailLogger
}) => {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  const storefrontUrl = process.env.STOREFRONT_URL ?? "http://localhost:8001"

  if (!apiKey || !from) {
    logger.warn("Order confirmation email skipped: Resend is not configured")
    return
  }

  if (!order.email) {
    logger.warn(`Order confirmation email skipped: order ${order.id} has no email`)
    return
  }

  const countryCode = process.env.STOREFRONT_DEFAULT_COUNTRY ?? "ke"
  const trackingUrl = `${storefrontUrl.replace(/\/$/, "")}/${countryCode}/order-lookup?order_id=${encodeURIComponent(order.id)}&email=${encodeURIComponent(order.email)}`
  const resend = new Resend(apiKey)

  try {
    const { error } = await resend.emails.send({
      from,
      to: order.email,
      subject: `Order confirmation #${order.display_id ?? order.id}`,
      html: renderOrderConfirmationEmail({ order, trackingUrl }),
    })

    if (error) {
      logger.error(`Order confirmation email failed for order ${order.id}`, error)
    }
  } catch (error) {
    logger.error(`Order confirmation email failed for order ${order.id}`, error)
  }
}
