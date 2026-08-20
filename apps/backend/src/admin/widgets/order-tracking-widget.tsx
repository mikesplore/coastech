import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Text } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

type Fulfillment = {
  id: string
  labels?: Array<{ tracking_number?: string; tracking_url?: string }>
  metadata?: Record<string, unknown> | null
  shipped_at?: string | null
}

type OrderResponse = { order: { fulfillments?: Fulfillment[] } }

const OrderTrackingWidget = () => {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [fulfillmentId, setFulfillmentId] = useState<string>()
  const [trackingNumber, setTrackingNumber] = useState("")
  const [trackingUrl, setTrackingUrl] = useState("")
  const [carrierName, setCarrierName] = useState("")
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-order-tracking", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await fetch(`/admin/orders/${id}?fields=*fulfillments,*fulfillments.labels,*fulfillments.metadata`, { credentials: "include" })
      if (!response.ok) throw new Error("Failed to load order fulfillment")
      return (await response.json()) as OrderResponse
    },
  })

  const fulfillment = data?.order.fulfillments?.[0]

  useEffect(() => {
    if (!fulfillment) return
    const label = fulfillment.labels?.[0]
    setFulfillmentId(fulfillment.id)
    setTrackingNumber(label?.tracking_number ?? "")
    setTrackingUrl(label?.tracking_url ?? "")
    setCarrierName(String(fulfillment.metadata?.carrier_name ?? ""))
    setEstimatedDeliveryDate(String(fulfillment.metadata?.estimated_delivery_date ?? ""))
  }, [fulfillment])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!fulfillmentId) throw new Error("Create a fulfillment before adding tracking information")
      const response = await fetch(`/admin/fulfillments/${fulfillmentId}/tracking`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tracking_number: trackingNumber, tracking_url: trackingUrl, carrier_name: carrierName, estimated_delivery_date: estimatedDeliveryDate }),
      })
      const body = await response.json().catch(() => ({})) as { message?: string }
      if (!response.ok) throw new Error(body.message || "Failed to save tracking information")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-order-tracking", id] })
      await queryClient.invalidateQueries({ queryKey: ["order", id] })
    },
  })

  return (
    <Container>
      <Heading level="h2">Shipment tracking</Heading>
      {isLoading && <Text className="mt-2 text-ui-fg-subtle">Loading fulfillment…</Text>}
      {!isLoading && !fulfillment && <Text className="mt-2 text-ui-fg-subtle">Create a fulfillment first, then tracking details can be added here.</Text>}
      {error instanceof Error && <Text className="mt-2 text-ui-fg-error">{error.message}</Text>}
      {fulfillment && (
        <div className="mt-4 grid gap-3">
          <Input placeholder="Tracking number" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} />
          <Input placeholder="Tracking URL" value={trackingUrl} onChange={(event) => setTrackingUrl(event.target.value)} type="url" />
          <Input placeholder="Carrier name" value={carrierName} onChange={(event) => setCarrierName(event.target.value)} />
          <Input placeholder="Estimated delivery date" value={estimatedDeliveryDate} onChange={(event) => setEstimatedDeliveryDate(event.target.value)} type="date" />
          {mutation.error instanceof Error && <Text className="text-ui-fg-error">{mutation.error.message}</Text>}
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending} disabled={!trackingNumber || !trackingUrl}>Save tracking and mark shipped</Button>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.details.after" })

export default OrderTrackingWidget
