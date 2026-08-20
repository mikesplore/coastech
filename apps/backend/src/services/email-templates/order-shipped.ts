type ShippedEmailData = {
  order: {
    display_id?: string | number | null
    email?: string | null
  }
  trackingNumber: string
  trackingUrl: string
  carrierName?: string
  estimatedDeliveryDate?: string
  storefrontUrl: string
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

export const renderOrderShippedEmail = ({
  order,
  trackingNumber,
  trackingUrl,
  carrierName,
  estimatedDeliveryDate,
  storefrontUrl,
}: ShippedEmailData) => `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#202020;line-height:1.5">
  <h1>Your order has shipped</h1>
  <p>Order number: <strong>${escapeHtml(order.display_id)}</strong></p>
  <p>Your order is on its way.</p>
  <p>Carrier: <strong>${escapeHtml(carrierName || "Delivery carrier")}</strong><br />
  Tracking number: <strong>${escapeHtml(trackingNumber)}</strong></p>
  ${estimatedDeliveryDate ? `<p>Estimated delivery: <strong>${escapeHtml(estimatedDeliveryDate)}</strong></p>` : ""}
  <p><a href="${escapeHtml(trackingUrl)}">Track shipment</a></p>
  <p><a href="${escapeHtml(storefrontUrl)}">Visit Coast Tech</a></p>
</body></html>`
