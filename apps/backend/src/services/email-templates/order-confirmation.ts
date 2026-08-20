type OrderItem = {
  title?: string
  quantity?: number
  unit_price?: number
}

type OrderConfirmationData = {
  order: {
    display_id?: number
    email?: string
    currency_code?: string
    total?: number
    items?: OrderItem[]
    shipping_address?: {
      first_name?: string
      last_name?: string
      address_1?: string
      city?: string
      country_code?: string
    }
  }
  trackingUrl: string
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

const formatAmount = (value: unknown) =>
  Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export const renderOrderConfirmationEmail = ({ order, trackingUrl }: OrderConfirmationData) => {
  const currency = (order.currency_code ?? "").toUpperCase()
  const items = order.items ?? []
  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0">${escapeHtml(item.title)}</td>
          <td style="padding:8px 0;text-align:center">${item.quantity ?? 0}</td>
          <td style="padding:8px 0;text-align:right">${currency} ${formatAmount(item.unit_price)}</td>
        </tr>`
    )
    .join("")
  const address = order.shipping_address
  const addressLines = [
    [address?.first_name, address?.last_name].filter(Boolean).join(" "),
    address?.address_1,
    address?.city,
    address?.country_code,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br />")

  return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#202020;line-height:1.5">
  <h1>Thank you for your order</h1>
  <p>Order number: <strong>${escapeHtml(order.display_id)}</strong></p>
  <p>We have received your order and will keep you updated as it progresses.</p>
  <table style="width:100%;max-width:640px;border-collapse:collapse">
    <thead><tr><th style="text-align:left;border-bottom:1px solid #ddd">Item</th><th style="border-bottom:1px solid #ddd">Qty</th><th style="text-align:right;border-bottom:1px solid #ddd">Price</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <p style="text-align:right;max-width:640px"><strong>Total: ${currency} ${formatAmount(order.total)}</strong></p>
  ${addressLines ? `<h2>Shipping address</h2><p>${addressLines}</p>` : ""}
  <p><a href="${escapeHtml(trackingUrl)}">Track your order</a></p>
</body></html>`
}
