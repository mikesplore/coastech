import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import SpecificationsModuleService from "../../../../modules/specifications/service"
import { SPECIFICATIONS_MODULE } from "../../../../modules/specifications"

type Filter = {
  field: string
  operator: "equals" | "in" | "gte" | "lte" | "contains"
  value: unknown
}

function normalizeValue(v: any) {
  if (v.value_number !== null && v.value_number !== undefined) return v.value_number
  if (v.value_boolean !== null && v.value_boolean !== undefined) return v.value_boolean
  const text = v.value_text ?? null
  if (typeof text !== "string") return text
  const trimmed = text.trim()
  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return text
    }
  }
  return text
}

function matchesFilter(value: unknown, filter: Filter) {
  if (filter.operator === "equals") {
    return value === filter.value
  }

  if (filter.operator === "contains") {
    return String(value ?? "").includes(String(filter.value ?? ""))
  }

  if (filter.operator === "in") {
    if (Array.isArray(value)) {
      return value.includes(filter.value)
    }
    if (Array.isArray(filter.value)) {
      return filter.value.includes(value)
    }
    return false
  }

  const n = typeof value === "number" ? value : Number(value)
  const f = typeof filter.value === "number" ? filter.value : Number(filter.value)
  if (Number.isNaN(n) || Number.isNaN(f)) return false

  if (filter.operator === "gte") return n >= f
  if (filter.operator === "lte") return n <= f
  return false
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const specificationsService: SpecificationsModuleService = req.scope.resolve(
    SPECIFICATIONS_MODULE
  )

  const body = (req.body ?? {}) as {
    category_id?: string
    category_handle?: string
    filters?: Filter[]
  }

  let categoryId = body.category_id
  if (!categoryId && body.category_handle) {
    const { data: categories } = await query.graph({
      entity: "product_category",
      fields: ["id", "handle"],
      filters: { handle: body.category_handle },
    })
    categoryId = categories[0]?.id
  }

  if (!categoryId) {
    res.status(400).json({ message: "category_id or category_handle is required" })
    return
  }

  const templates = await specificationsService.listSpecTemplates({ category_id: categoryId })
  const template = templates[0]
  if (!template) {
    res.json({ products: [] })
    return
  }

  const fields = await specificationsService.listSpecTemplateFields({
    template_id: template.id,
  })
  const fieldIdByName = new Map(fields.map((f: any) => [f.name, f.id]))

  const fieldIds = Array.from(new Set(fieldIdByName.values()))
  const allValues = await specificationsService.listProductSpecValues({
    field_id: fieldIds as any,
  })

  const valuesByProductId = new Map<string, Map<string, unknown>>()
  for (const v of allValues as any[]) {
    const byField = valuesByProductId.get(v.product_id) ?? new Map<string, unknown>()
    byField.set(v.field_id, normalizeValue(v))
    valuesByProductId.set(v.product_id, byField)
  }

  let candidateIds = Array.from(valuesByProductId.keys())

  for (const f of body.filters ?? []) {
    const fieldId = fieldIdByName.get(f.field)
    if (!fieldId) continue

    candidateIds = candidateIds.filter((pid) => {
      const map = valuesByProductId.get(pid)
      const val = map?.get(fieldId)
      return matchesFilter(val, f)
    })
  }

  if (candidateIds.length === 0) {
    res.json({ products: [] })
    return
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "thumbnail"],
    filters: { id: candidateIds },
  })

  res.json({ products })
}

