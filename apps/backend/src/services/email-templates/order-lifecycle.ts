type LifecycleEmailData = {
  order: { display_id?: string | number | null }
  title: string
  message: string
  detail?: string
  trackingUrl?: string
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

export const renderOrderLifecycleEmail = ({
  order,
  title,
  message,
  detail,
  trackingUrl,
}: LifecycleEmailData) => `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#202020;line-height:1.5">
  <h1>${escapeHtml(title)}</h1>
  <p>Order number: <strong>${escapeHtml(order.display_id)}</strong></p>
  <p>${escapeHtml(message)}</p>
  ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
  ${trackingUrl ? `<p><a href="${escapeHtml(trackingUrl)}">View your order</a></p>` : ""}
</body></html>`
