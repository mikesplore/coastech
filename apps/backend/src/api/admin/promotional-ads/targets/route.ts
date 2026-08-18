import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const [{ data: products }, { data: categories }] = await Promise.all([
    query.graph({ entity: "product", fields: ["id", "title", "handle"], pagination: { take: 100, skip: 0 } }),
    query.graph({ entity: "product_category", fields: ["id", "name", "handle"], pagination: { take: 100, skip: 0 } }),
  ])
  res.json({ products, categories })
}
