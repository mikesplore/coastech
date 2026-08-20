import { HttpTypes } from "@medusajs/types"

type TrackingFulfillment = HttpTypes.StoreOrder["fulfillments"] extends Array<infer Fulfillment>
  ? Fulfillment & {
      labels?: Array<{ tracking_number?: string; tracking_url?: string }>
      metadata?: Record<string, unknown> | null
    }
  : never

type ShipmentTrackingProps = {
  order: HttpTypes.StoreOrder
}

const formatDate = (value: Date | string | null | undefined) =>
  value ? new Date(value).toLocaleDateString() : null

const ShipmentTracking = ({ order }: ShipmentTrackingProps) => {
  const fulfillments = (order.fulfillments ?? []) as TrackingFulfillment[]
  const trackedFulfillments = fulfillments.filter((fulfillment) =>
    fulfillment.labels?.some((label) => label.tracking_number || label.tracking_url)
  )

  return (
    <section className="border-y border-ui-border-base py-5" data-testid="shipment-tracking">
      <h2 className="text-base-semi mb-4">Order progress</h2>
      <div className="flex flex-wrap gap-3 text-small-regular text-ui-fg-subtle">
        <span className={order.created_at ? "text-ui-fg-base" : ""}>Placed</span>
        <span>→</span>
        <span className={order.payment_status === "captured" ? "text-ui-fg-base" : ""}>Paid</span>
        <span>→</span>
        <span className={order.fulfillment_status !== "not_fulfilled" ? "text-ui-fg-base" : ""}>Processing</span>
        <span>→</span>
        <span className={order.fulfillment_status === "shipped" || order.fulfillment_status === "delivered" ? "text-ui-fg-base" : ""}>Shipped</span>
        <span>→</span>
        <span className={order.fulfillment_status === "delivered" ? "text-ui-fg-base" : ""}>Delivered</span>
      </div>
      {trackedFulfillments.map((fulfillment) => {
        const metadata = fulfillment.metadata ?? {}
        return (
          <div key={fulfillment.id} className="mt-5 grid gap-2 text-small-regular">
            <div>
              <span className="text-ui-fg-subtle">Carrier: </span>
              {String(metadata.carrier_name ?? "Delivery carrier")}
            </div>
            {metadata.estimated_delivery_date && (
              <div>
                <span className="text-ui-fg-subtle">Estimated delivery: </span>
                {String(metadata.estimated_delivery_date)}
              </div>
            )}
            {fulfillment.labels?.map((label, index) => (
              <div key={`${fulfillment.id}-${index}`}>
                {label.tracking_url ? (
                  <a href={label.tracking_url} target="_blank" rel="noreferrer" className="text-ui-fg-interactive underline">
                    Track shipment{label.tracking_number ? ` (${label.tracking_number})` : ""}
                  </a>
                ) : label.tracking_number ? (
                  <span>Tracking number: {label.tracking_number}</span>
                ) : null}
              </div>
            ))}
            {fulfillment.shipped_at && <div className="text-ui-fg-subtle">Shipped {formatDate(fulfillment.shipped_at)}</div>}
            {fulfillment.delivered_at && <div className="text-ui-fg-subtle">Delivered {formatDate(fulfillment.delivered_at)}</div>}
          </div>
        )
      })}
    </section>
  )
}

export default ShipmentTracking
