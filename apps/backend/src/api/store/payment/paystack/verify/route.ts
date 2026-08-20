import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { completeCartWorkflowId } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { authorizePaystackReference } from "../authorize"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const reference = String(req.query.reference ?? req.query.trxref ?? "")

  if (!reference) {
    res.status(400).json({ message: "A Paystack reference is required" })
    return
  }

  const result = await authorizePaystackReference(req, reference)
  if (result.status === "not_found") {
    res.status(404).json({ message: "Paystack payment session not found" })
    return
  }

  if (result.authorized && result.cart_id) {
    const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE)
    const completion = await workflowEngine.run(completeCartWorkflowId, {
      input: { id: result.cart_id },
      throwOnError: false,
    })
    if (!completion.errors?.[0] && completion.result?.id) {
      res.json({ reference, ...result, status: "success", order_id: completion.result.id })
      return
    }
  }

  res.json({ reference, ...result })
}
