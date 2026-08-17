import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Table, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"

type LowStockVariant = {
  id: string
  title: string
  sku: string | null
  product_title: string | null
  stocked_quantity: number
  low_stock_threshold: number
}

async function fetchLowStock(): Promise<LowStockVariant[]> {
  const res = await fetch("/admin/low-stock", { credentials: "include" })
  if (!res.ok) {
    throw new Error("Failed to load low stock variants")
  }
  const json = (await res.json()) as { variants: LowStockVariant[] }
  return json.variants
}

const LowStockPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["custom-low-stock"],
    queryFn: fetchLowStock,
  })

  return (
    <Container>
      <Heading level="h1">Low Stock</Heading>

      {error instanceof Error ? (
        <Text size="small" className="mt-2 text-ui-fg-error">
          {error.message}
        </Text>
      ) : null}

      {isLoading ? (
        <Text size="small" className="mt-2 text-ui-fg-subtle">
          Loading…
        </Text>
      ) : null}

      <div className="mt-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Product</Table.HeaderCell>
              <Table.HeaderCell>Variant</Table.HeaderCell>
              <Table.HeaderCell>SKU</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Stock</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Threshold</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(data ?? []).map((v) => (
              <Table.Row key={v.id}>
                <Table.Cell>{v.product_title ?? "-"}</Table.Cell>
                <Table.Cell>{v.title}</Table.Cell>
                <Table.Cell>{v.sku ?? "-"}</Table.Cell>
                <Table.Cell className="text-right">{v.stocked_quantity}</Table.Cell>
                <Table.Cell className="text-right">{v.low_stock_threshold}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Low Stock",
})

export default LowStockPage

