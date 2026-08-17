import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Checkbox, Container, Heading, Input, Text } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"

type SpecField = {
  id: string
  name: string
  label: string
  data_type: string
  unit: string | null
  is_required: boolean
  is_filterable: boolean
  sort_order: number
}

type SpecsResponse = {
  product_id: string
  template: { id: string; name: string; category_id: string | null } | null
  fields: SpecField[]
  values: Record<string, unknown>
}

async function fetchProductSpecs(productId: string): Promise<SpecsResponse> {
  const res = await fetch(`/admin/products/${productId}/specs`, {
    credentials: "include",
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(body.message || "Failed to load specifications")
  }

  return (await res.json()) as SpecsResponse
}

async function saveProductSpecs(productId: string, values: Record<string, unknown>) {
  const res = await fetch(`/admin/products/${productId}/specs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ values }),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(body.message || "Failed to save specifications")
  }
}

function coerceInputValue(field: SpecField, value: unknown) {
  if (field.data_type === "number") {
    return typeof value === "number" ? value : value === null ? "" : String(value)
  }
  if (field.data_type === "boolean") {
    return Boolean(value)
  }
  return value === null || value === undefined ? "" : String(value)
}

const ProductSpecsWidget = () => {
  const params = useParams()
  const productId = params.id
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ["custom-product-specs", productId],
    enabled: Boolean(productId),
    queryFn: () => fetchProductSpecs(productId!),
  })

  const initialValues = useMemo(() => data?.values ?? {}, [data])
  const [draft, setDraft] = useState<Record<string, unknown>>({})

  const merged = useMemo(
    () => ({ ...initialValues, ...draft }),
    [draft, initialValues]
  )

  const mutation = useMutation({
    mutationFn: async () => {
      if (!productId) return
      await saveProductSpecs(productId, merged)
    },
    onSuccess: async () => {
      if (!productId) return
      setDraft({})
      await queryClient.invalidateQueries({ queryKey: ["custom-product-specs", productId] })
    },
  })

  if (!productId) {
    return null
  }

  return (
    <Container>
      <div className="flex items-center justify-between">
        <Heading level="h2">Specifications</Heading>
        <Button
          size="small"
          isLoading={mutation.isPending}
          onClick={() => mutation.mutate()}
          disabled={!data?.template}
        >
          Save
        </Button>
      </div>

      {!data?.template && !isLoading ? (
        <Text size="small" className="mt-2 text-ui-fg-subtle">
          No specification template is configured for this product’s category.
        </Text>
      ) : null}

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

      <div className="mt-4 grid grid-cols-1 gap-3">
        {(data?.fields ?? []).map((field) => {
          const value = merged[field.name]

          if (field.data_type === "boolean") {
            return (
              <div key={field.id} className="flex items-center justify-between">
                <div>
                  <Text size="small">{field.label}</Text>
                  {field.unit ? (
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {field.unit}
                    </Text>
                  ) : null}
                </div>
                <Checkbox
                  checked={Boolean(value)}
                  onCheckedChange={(checked) =>
                    setDraft((d) => ({ ...d, [field.name]: Boolean(checked) }))
                  }
                />
              </div>
            )
          }

          return (
            <div key={field.id}>
              <Text size="small">{field.label}</Text>
              <Input
                className="mt-1"
                value={coerceInputValue(field, value) as any}
                onChange={(e) => {
                  const next =
                    field.data_type === "number"
                      ? e.target.value === ""
                        ? null
                        : Number(e.target.value)
                      : e.target.value
                  setDraft((d) => ({ ...d, [field.name]: next }))
                }}
              />
            </div>
          )
        })}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSpecsWidget

