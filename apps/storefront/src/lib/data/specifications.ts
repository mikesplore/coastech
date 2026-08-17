import { sdk } from "@lib/config"

export type ProductSpecification = {
  name: string
  label: string
  group: string
  value: unknown
  unit?: string
}

export async function getProductSpecifications(productId: string) {
  return sdk.client.fetch<{ specifications: ProductSpecification[] }>(
    `/store/products/${productId}/specifications`,
    { method: "GET", cache: "force-cache" }
  )
}
