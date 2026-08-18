import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import PromotionsModuleService from "../../../modules/promotions/service"
import { PROMOTIONS_MODULE } from "../../../modules/promotions"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve(PROMOTIONS_MODULE) as PromotionsModuleService
  const ads = await service.listLivePromotionalAds()
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const productIds = ads.filter((ad) => ad.target_type === "product" && ad.target_id).map((ad) => ad.target_id as string)
  const categoryIds = ads.filter((ad) => ad.target_type === "category" && ad.target_id).map((ad) => ad.target_id as string)
  const [{ data: products }, { data: categories }] = await Promise.all([
    productIds.length ? query.graph({ entity: "product", fields: ["id", "handle", "thumbnail", "images.url"], filters: { id: productIds } }) : { data: [] },
    categoryIds.length ? query.graph({ entity: "product_category", fields: ["id", "handle"], filters: { id: categoryIds } }) : { data: [] },
  ])
  const productHandles = new Map<string, string>(products.map((product) => [product.id, product.handle] as [string, string]))
  const productImages = new Map(products.map((product) => [product.id, product.thumbnail || product.images?.[0]?.url || null] as const))
  const categoryHandles = new Map<string, string>(categories.map((category) => [category.id, category.handle] as [string, string]))
  const resolvedAds = ads.map((ad) => ({
    ...ad,
    image_url: ad.image_url || (ad.target_type === "product" && ad.target_id ? productImages.get(ad.target_id) : ad.image_url),
    href: ad.target_type === "product" && ad.target_id && productHandles.get(ad.target_id)
      ? `/products/${productHandles.get(ad.target_id)}`
      : ad.target_type === "category" && ad.target_id && categoryHandles.get(ad.target_id)
        ? `/categories/${categoryHandles.get(ad.target_id)}`
        : ad.href,
  }))
  res.json({ ads: resolvedAds })
}
