import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import SpecificationsModuleService from "../../../../../modules/specifications/service"
import { SPECIFICATIONS_MODULE } from "../../../../../modules/specifications"
import { upsertProductSpecsWorkflow } from "../../../../../workflows/product-specs/upsert-product-specs"

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

type SpecValue = {
  id: string
  field_id: string
  value_text: string | null
  value_number: number | null
  value_boolean: boolean | null
}

function normalizeValue(value: SpecValue) {
  if (value.value_number !== null && value.value_number !== undefined) {
    return value.value_number
  }
  if (value.value_boolean !== null && value.value_boolean !== undefined) {
    return value.value_boolean
  }
  return value.value_text ?? null
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const specificationsService: SpecificationsModuleService = req.scope.resolve(
    SPECIFICATIONS_MODULE
  )

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "metadata", "categories.id", "categories.handle", "categories.name"],
    filters: { id: req.params.id },
  })

  const product = products[0]
  if (!product) {
    res.status(404).json({ message: "Product not found" })
    return
  }

  const categoryId: string | undefined = product.categories?.[0]?.id
  if (!categoryId) {
    res.json({
      product_id: product.id,
      template: null,
      fields: [],
      values: {},
    })
    return
  }

  const templates = await specificationsService.listSpecTemplates({ category_id: categoryId })
  const template = templates[0]
  if (!template) {
    res.json({
      product_id: product.id,
      template: null,
      fields: [],
      values: {},
    })
    return
  }

  const fields: SpecField[] = await specificationsService.listSpecTemplateFields(
    { template_id: template.id },
    { order: { sort_order: "ASC" } as any }
  )

  const specValues: SpecValue[] = await specificationsService.listProductSpecValues({
    product_id: product.id,
  })

  const valueByFieldId = new Map(specValues.map((v) => [v.field_id, v]))
  const values = Object.fromEntries(
    fields.map((f) => [f.name, valueByFieldId.has(f.id) ? normalizeValue(valueByFieldId.get(f.id)!) : null])
  )

  res.json({
    product_id: product.id,
    template: {
      id: template.id,
      name: template.name,
      category_id: template.category_id,
    },
    fields,
    values,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const specificationsService: SpecificationsModuleService = req.scope.resolve(
    SPECIFICATIONS_MODULE
  )

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "categories.id"],
    filters: { id: req.params.id },
  })

  const product = products[0]
  if (!product) {
    res.status(404).json({ message: "Product not found" })
    return
  }

  const categoryId: string | undefined = product.categories?.[0]?.id
  if (!categoryId) {
    res.status(400).json({ message: "Product has no category assigned" })
    return
  }

  const body = (req.body ?? {}) as { values?: Record<string, unknown> }
  const values = body.values ?? {}

  const { result } = await upsertProductSpecsWorkflow(req.scope).run({
    input: {
      product_id: product.id,
      category_id: categoryId,
      values,
    },
  })

  if (!result.ok) {
    res.status(400).json({
      message: "Invalid specification values",
      errors: result.errors,
    })
    return
  }

  const updated: SpecValue[] = await specificationsService.listProductSpecValues({
    product_id: product.id,
  })

  res.json({
    product_id: product.id,
    values: updated,
  })
}
