import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { id: customerId },
  })
  const customer = customers[0]

  if (!customer?.email) {
    res.status(404).json({ message: "Customer not found" })
    return
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id"],
    filters: { email: customer.email, customer_id: null },
  })
  const orderModule = req.scope.resolve(Modules.ORDER) as {
    updateOrders: (selector: { id: string[] }, update: { customer_id: string }) => Promise<unknown>
  }

  if (orders.length) {
    await orderModule.updateOrders(
      { id: orders.map((order) => order.id) },
      { customer_id: customerId }
    )
  }

  res.json({ linked: orders.length })
}
