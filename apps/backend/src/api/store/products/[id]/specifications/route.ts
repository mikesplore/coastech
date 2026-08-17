import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import SpecificationsModuleService from "../../../../../modules/specifications/service"
import { SPECIFICATIONS_MODULE } from "../../../../../modules/specifications"

function normalize(value: any) {
  if (value.value_number !== null && value.value_number !== undefined) return value.value_number
  if (value.value_boolean !== null && value.value_boolean !== undefined) return value.value_boolean
  const text = value.value_text ?? null
  if (typeof text !== "string") return text
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service: SpecificationsModuleService = req.scope.resolve(SPECIFICATIONS_MODULE)
  const values = await service.getSpecsForProduct(String(req.params.id))

  res.json({
    specifications: values.map((value: any) => ({
      name: value.field?.name,
      label: value.field?.label,
      group: value.field?.group_name ?? "Specifications",
      value: normalize(value),
      unit: value.field?.unit,
    })),
  })
}
