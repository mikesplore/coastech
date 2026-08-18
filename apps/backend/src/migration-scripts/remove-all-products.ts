import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"

type ProductRow = {
  id: string
  title?: string | null
  handle?: string | null
}

/**
 * Remove every product in the product module.
 *
 * This is intentionally guarded because it is irreversible at the catalog
 * level. Run with DELETE_ALL_PRODUCTS_CONFIRM=YES to perform the deletion.
 */
export default async function removeAllProducts({ container }: { container: MedusaContainer }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle"],
  })
  const products = data as ProductRow[]

  if (!products.length) {
    logger.info("No products found. Nothing to remove.")
    return
  }

  logger.info(`Found ${products.length} products:`)
  for (const product of products) {
    logger.info(`- ${product.title ?? "Untitled"} (${product.handle ?? product.id})`)
  }

  if (process.env.DELETE_ALL_PRODUCTS_CONFIRM !== "YES") {
    logger.warn(
      "Deletion skipped. Re-run with DELETE_ALL_PRODUCTS_CONFIRM=YES to remove all listed products."
    )
    return
  }

  await deleteProductsWorkflow(container).run({
    input: { ids: products.map((product) => product.id) },
  })

  logger.info(`Removed ${products.length} products.`)
}
