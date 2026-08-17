import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import SpecificationsModuleService from "../../../../modules/specifications/service"
import { SPECIFICATIONS_MODULE } from "../../../../modules/specifications"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service: SpecificationsModuleService = req.scope.resolve(SPECIFICATIONS_MODULE)
  const categoryId = String(req.params.categoryId)
  const templates = await service.listSpecTemplates({ category_id: categoryId })
  const template = templates[0]
  const fields = template
    ? await service.listSpecTemplateFields({ template_id: template.id })
    : []

  res.json({ template: template ?? null, fields })
}
