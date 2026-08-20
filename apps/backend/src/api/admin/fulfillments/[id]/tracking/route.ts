import { createShipmentWorkflow, updateFulfillmentWorkflow } from "@medusajs/core-flows"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendOrderShippedEmail } from "../../../../../services/email"

type TrackingBody = {
  tracking_number?: string
  tracking_url?: string
  carrier_name?: string
  estimated_delivery_date?: string
}

export async function POST(req: MedusaRequest<TrackingBody>, res: MedusaResponse) {
  const trackingNumber = req.body?.tracking_number?.trim()
  const trackingUrl = req.body?.tracking_url?.trim()

  if (!trackingNumber || !trackingUrl) {
    res.status(400).json({ message: "tracking_number and tracking_url are required" })
    return
  }

  const fulfillmentId = req.params.id
  const metadata = {
    carrier_name: req.body?.carrier_name?.trim() || null,
    estimated_delivery_date: req.body?.estimated_delivery_date?.trim() || null,
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: existingFulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "metadata"],
    filters: { id: fulfillmentId },
  })
  const existingMetadata = existingFulfillments[0]?.metadata ?? {}

  const { result: shipment } = await createShipmentWorkflow(req.scope).run({
    input: {
      id: fulfillmentId,
      labels: [{ tracking_number: trackingNumber, tracking_url: trackingUrl, label_url: trackingUrl }],
    },
  })
  const { result: fulfillment } = await updateFulfillmentWorkflow(req.scope).run({
    input: { id: fulfillmentId, metadata },
  })

  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "order.id", "order.display_id", "order.email"],
    filters: { id: fulfillmentId },
  })
  const order = fulfillments[0]?.order

  if (order && !existingMetadata.shipment_email_sent_at) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    const emailSent = await sendOrderShippedEmail({
      order,
      trackingNumber,
      trackingUrl,
      carrierName: metadata.carrier_name ?? undefined,
      estimatedDeliveryDate: metadata.estimated_delivery_date ?? undefined,
      logger,
    })
    if (emailSent) {
      await updateFulfillmentWorkflow(req.scope).run({
        input: {
          id: fulfillmentId,
          metadata: { ...metadata, shipment_email_sent_at: new Date().toISOString() },
        },
      })
    }
  }

  res.json({ fulfillment: fulfillment ?? shipment })
}
