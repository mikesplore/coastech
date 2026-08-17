import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import SpecificationsModuleService from "../../modules/specifications/service"
import { SPECIFICATIONS_MODULE } from "../../modules/specifications"

export type UpsertProductSpecsInput = {
  product_id: string
  category_id: string
  values: Record<string, unknown>
}

export const upsertProductSpecsStepId = "upsert-product-specs-step"

export const upsertProductSpecsStep = createStep(
  upsertProductSpecsStepId,
  async (input: UpsertProductSpecsInput, { container }) => {
    const specificationsService: SpecificationsModuleService = container.resolve(
      SPECIFICATIONS_MODULE
    )

    const validation = await specificationsService.validateSpecsAgainstTemplate(
      input.category_id,
      input.values
    )
    if (!validation.valid) {
      return new StepResponse({
        ok: false,
        errors: validation.errors,
      })
    }

    const templates = await specificationsService.listSpecTemplates({
      category_id: input.category_id,
    })
    const template = templates[0]
    if (!template) {
      return new StepResponse({
        ok: false,
        errors: ["No spec template configured for this category"],
      })
    }

    const fields: any[] = await specificationsService.listSpecTemplateFields({
      template_id: template.id,
    })
    const fieldByName = new Map(fields.map((f) => [f.name, f]))

    const existingValues: any[] = await specificationsService.listProductSpecValues({
      product_id: input.product_id,
    })
    const existingByFieldId = new Map(existingValues.map((v) => [v.field_id, v]))

    const toCreate: any[] = []
    const toUpdate: any[] = []

    for (const [name, rawValue] of Object.entries(input.values)) {
      const field = fieldByName.get(name)
      if (!field) continue

      const normalized =
        rawValue === "" || rawValue === null || rawValue === undefined ? null : rawValue
      if (normalized === null) continue

      const existing = existingByFieldId.get(field.id)
      const payloadBase = {
        field_id: field.id,
        value_text: null,
        value_number: null,
        value_boolean: null,
      }

      const payload =
        typeof normalized === "number"
          ? { ...payloadBase, value_number: normalized }
          : typeof normalized === "boolean"
            ? { ...payloadBase, value_boolean: normalized }
            : Array.isArray(normalized)
              ? { ...payloadBase, value_text: JSON.stringify(normalized) }
              : { ...payloadBase, value_text: String(normalized) }

      if (existing) {
        toUpdate.push({ id: existing.id, ...payload })
      } else {
        toCreate.push({ product_id: input.product_id, ...payload })
      }
    }

    if (toCreate.length > 0) {
      await specificationsService.createProductSpecValues(toCreate)
    }
    if (toUpdate.length > 0) {
      await specificationsService.updateProductSpecValues(toUpdate)
    }

    return new StepResponse({ ok: true })
  }
)

export const upsertProductSpecsWorkflowId = "upsert-product-specs"

export const upsertProductSpecsWorkflow = createWorkflow(
  upsertProductSpecsWorkflowId,
  (input: UpsertProductSpecsInput) => {
    return new WorkflowResponse(upsertProductSpecsStep(input))
  }
)
