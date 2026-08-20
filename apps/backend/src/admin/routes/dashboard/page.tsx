import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Table, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"

type Order = {
  id: string
  display_id?: number | null
  email?: string | null
  total?: number | null
  currency_code?: string | null
  created_at?: string
  payment_status?: string
  fulfillment_status?: string
}

type DashboardData = {
  generated_at: string
  orders: {
    total: number
    status_counts: Record<string, number>
    revenue: number
    currencies: string[]
    payment_issues: Order[]
    fulfillment_issues: Order[]
    recent: Order[]
  }
  low_stock: Array<{ id: string; title?: string | null; sku?: string | null; product_title?: string | null; stocked_quantity: number; low_stock_threshold: number }>
}

const statusLabel = (value: string) => value.replaceAll("_", " ")

const amount = (value: number, currency: string | undefined) =>
  `${(value / 100).toFixed(2)} ${(currency ?? "").toUpperCase()}`

async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch("/admin/dashboard/overview", { credentials: "include" })
  if (!response.ok) throw new Error("Failed to load dashboard overview")
  return response.json() as Promise<DashboardData>
}

const DashboardPage = () => {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-dashboard-overview"],
    queryFn: fetchDashboard,
    staleTime: 30_000,
  })

  if (isLoading) return <Container><Text>Loading dashboard…</Text></Container>
  if (error instanceof Error) return <Container><Text className="text-ui-fg-error">{error.message}</Text></Container>
  if (!data) return null

  const statusEntries = Object.entries(data.orders.status_counts).sort(([, a], [, b]) => b - a)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">Operations dashboard</Heading>
          <Text className="text-ui-fg-subtle">Orders, payments, fulfillment, and inventory at a glance.</Text>
        </div>
        <Button variant="secondary" onClick={() => refetch()} isLoading={isFetching}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Container><Text className="text-ui-fg-subtle">Orders</Text><Heading>{data.orders.total}</Heading></Container>
        <Container><Text className="text-ui-fg-subtle">Revenue loaded</Text><Heading>{amount(data.orders.revenue, data.orders.currencies[0])}</Heading></Container>
        <Container><Text className="text-ui-fg-subtle">Payment issues</Text><Heading className={data.orders.payment_issues.length ? "text-ui-fg-error" : ""}>{data.orders.payment_issues.length}</Heading></Container>
        <Container><Text className="text-ui-fg-subtle">Low stock</Text><Heading className={data.low_stock.length ? "text-ui-fg-error" : ""}>{data.low_stock.length}</Heading></Container>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Container>
          <Heading level="h2">Order status</Heading>
          <div className="mt-4 flex flex-wrap gap-2">
            {statusEntries.map(([status, count]) => <Badge key={status}>{statusLabel(status)}: {count}</Badge>)}
          </div>
        </Container>
        <Container>
          <Heading level="h2">Fulfillment exceptions</Heading>
          <Text className="mt-2 text-ui-fg-subtle">Orders needing shipment or fulfillment attention.</Text>
          <Text className="mt-3">{data.orders.fulfillment_issues.length} open exceptions</Text>
        </Container>
      </div>

      <Container>
        <Heading level="h2">Recent orders</Heading>
        <Table className="mt-4">
          <Table.Header><Table.Row><Table.HeaderCell>Order</Table.HeaderCell><Table.HeaderCell>Customer</Table.HeaderCell><Table.HeaderCell>Amount</Table.HeaderCell><Table.HeaderCell>Payment</Table.HeaderCell><Table.HeaderCell>Fulfillment</Table.HeaderCell></Table.Row></Table.Header>
          <Table.Body>{data.orders.recent.map((order) => <Table.Row key={order.id}><Table.Cell>#{order.display_id ?? order.id}</Table.Cell><Table.Cell>{order.email ?? "Guest"}</Table.Cell><Table.Cell>{amount(Number(order.total ?? 0), order.currency_code)}</Table.Cell><Table.Cell>{statusLabel(order.payment_status ?? "unknown")}</Table.Cell><Table.Cell>{statusLabel(order.fulfillment_status ?? "unknown")}</Table.Cell></Table.Row>)}</Table.Body>
        </Table>
      </Container>

      <Container>
        <Heading level="h2">Low-stock products</Heading>
        <Table className="mt-4">
          <Table.Header><Table.Row><Table.HeaderCell>Product</Table.HeaderCell><Table.HeaderCell>Variant</Table.HeaderCell><Table.HeaderCell>SKU</Table.HeaderCell><Table.HeaderCell>Stock</Table.HeaderCell><Table.HeaderCell>Threshold</Table.HeaderCell></Table.Row></Table.Header>
          <Table.Body>{data.low_stock.map((variant) => <Table.Row key={variant.id}><Table.Cell>{variant.product_title ?? "-"}</Table.Cell><Table.Cell>{variant.title ?? "-"}</Table.Cell><Table.Cell>{variant.sku ?? "-"}</Table.Cell><Table.Cell>{variant.stocked_quantity}</Table.Cell><Table.Cell>{variant.low_stock_threshold}</Table.Cell></Table.Row>)}</Table.Body>
        </Table>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "Dashboard" })

export default DashboardPage
