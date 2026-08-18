import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PROMOTIONS_MODULE } from "../../../../modules/promotions"
import PromotionsModuleService from "../../../../modules/promotions/service"

export async function PATCH(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve(PROMOTIONS_MODULE) as PromotionsModuleService
  const id = req.params.id
  const body = req.body as Record<string, unknown>
  const targetType = body.target_type ?? "url"
  if ((!body.href && targetType === "url") || (targetType !== "url" && !body.target_id)) {
    res.status(400).json({ message: "A valid promotion destination is required" })
    return
  }
  const ad = await service.updatePromotionalAds({
    id,
    ...body,
  })
  res.json({ ad: Array.isArray(ad) ? ad[0] : ad })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve(PROMOTIONS_MODULE) as PromotionsModuleService
  await service.softDeletePromotionalAds(req.params.id)
  res.status(204).send()
}
