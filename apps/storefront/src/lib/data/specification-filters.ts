import { sdk } from "@lib/config"

export type SpecFilterField = { id: string; name: string; label: string; data_type: string; enum_values?: string | null; unit?: string | null }

export async function getCategorySpecFields(categoryId: string) {
  return sdk.client.fetch<{ fields: SpecFilterField[] }>(`/store/specifications/${categoryId}`, { cache: "force-cache" })
}

export async function filterProductsBySpecs(categoryHandle: string, filters: Array<{ field: string; operator: string; value: unknown }>) {
  return sdk.client.fetch<{ products: Array<{ id: string }> }>("/store/products/filter", { method: "POST", body: { category_handle: categoryHandle, filters }, cache: "no-store" })
}
