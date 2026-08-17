import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"

type VariantRow = {
  id: string
  product_id: string
  price_set?: {
    prices?: Array<{ amount: number; currency_code: string }>
  }
}

export default async function repairProductPrices({ container }: { container: MedusaContainer }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product_id", "price_set.prices.amount", "price_set.prices.currency_code"],
  })

  const variants = (data as VariantRow[]).filter((variant) => {
    return !variant.price_set?.prices?.some((price) => price.currency_code === "kes")
  })

  if (!variants.length) {
    logger.info("All product variants already have KES prices.")
    return
  }

  await updateProductVariantsWorkflow(container).run({
    input: {
      product_variants: variants.map((variant) => {
        const sourcePrice = variant.price_set?.prices?.find((price) => price.currency_code === "usd")?.amount ?? 0
        return {
          id: variant.id,
          prices: [{ amount: sourcePrice, currency_code: "kes" }],
        }
      }),
    },
  })
  logger.info(`Added KES prices to ${variants.length} product variants.`)
}
