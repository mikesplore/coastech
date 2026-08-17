import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PROMOTIONS_MODULE } from "../../../modules/promotions"
import PromotionsModuleService from "../../../modules/promotions/service"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve(PROMOTIONS_MODULE) as PromotionsModuleService
  res.json({ ads: await service.listPromotionalAds() })
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve(PROMOTIONS_MODULE) as PromotionsModuleService
  const body = req.body as Record<string, unknown>
  if (!body.title || !body.href) {
    res.status(400).json({ message: "title and href are required" })
    return
  }
  const ad = await service.createPromotionalAds([body] as Parameters<typeof service.createPromotionalAds>[0])
  res.status(201).json({ ad: Array.isArray(ad) ? ad[0] : ad })
}
