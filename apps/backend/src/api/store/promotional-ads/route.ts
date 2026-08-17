import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import PromotionsModuleService from "../../../modules/promotions/service"
import { PROMOTIONS_MODULE } from "../../../modules/promotions"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve(PROMOTIONS_MODULE) as PromotionsModuleService
  const ads = await service.listLivePromotionalAds()
  res.json({ ads })
}
