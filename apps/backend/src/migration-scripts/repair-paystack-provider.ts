import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const oldProviderId = "pp_paystack"
const providerId = "pp_paystack_paystack"

export default async function repairPaystackProvider({
  container,
}: {
  container: MedusaContainer
}) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.id"],
  })

  for (const region of regions as Array<{
    id: string
    name: string
    payment_providers?: Array<{ id: string }>
  }>) {
    const providers = region.payment_providers ?? []
    const hasCurrentProvider = providers.some(({ id }) => id === providerId)
    const hasOldProvider = providers.some(({ id }) => id === oldProviderId)

    if (hasOldProvider) {
      await link.dismiss({
        [Modules.REGION]: { region_id: region.id },
        [Modules.PAYMENT]: { payment_provider_id: oldProviderId },
      })
    }

    if (hasOldProvider && !hasCurrentProvider) {
      await link.create({
        [Modules.REGION]: { region_id: region.id },
        [Modules.PAYMENT]: { payment_provider_id: providerId },
      })
    }

    if (hasOldProvider) {
      logger.info(`Repaired Paystack provider link for region ${region.name}`)
    }
  }
}
