import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { completeCartWorkflowId } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { authorizePaystackReference } from "../../../store/payment/paystack/authorize"

function frontendCallbackUrl() {
  return process.env.PAYSTACK_FRONTEND_CALLBACK_URL ?? "http://localhost:8001/ke/paystack/callback"
}

// Paystack redirects the customer's browser here without a Medusa
// publishable-key header. Keep this route outside `/store` so the callback can
// reach the payment module directly and then redirect to the storefront.
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const reference = String(req.query.reference ?? req.query.trxref ?? "")
  const redirectUrl = new URL(frontendCallbackUrl())

  if (!reference) {
    redirectUrl.searchParams.set("status", "error")
    res.redirect(302, redirectUrl.toString())
    return
  }

  try {
    let result = await authorizePaystackReference(req, reference)
    for (let attempt = 0; attempt < 10 && !result.authorized && result.status !== "not_found"; attempt += 1) {
      const delay = Math.min(1000 * 2 ** Math.min(attempt, 4), 8000)
      await new Promise((resolve) => setTimeout(resolve, delay))
      result = await authorizePaystackReference(req, reference)
    }

    redirectUrl.searchParams.set("reference", reference)
    if (result.authorized && result.cart_id) {
      const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE)
      const completion = await workflowEngine.run(completeCartWorkflowId, {
        input: { id: result.cart_id },
        throwOnError: false,
      })

      if (completion.errors?.[0]) {
        redirectUrl.searchParams.set("status", "error")
        redirectUrl.searchParams.set(
          "message",
          completion.errors[0].error?.message ?? "The order could not be completed"
        )
      } else {
        redirectUrl.searchParams.set("status", "success")
        redirectUrl.searchParams.set("order_id", completion.result.id)
      }
    } else {
      redirectUrl.searchParams.set(
        "status",
        result.status === "pending" || result.status === "processing" ? "processing" : result.status
      )
    }
  } catch {
    redirectUrl.searchParams.set("reference", reference)
    redirectUrl.searchParams.set("status", "error")
  }

  res.redirect(302, redirectUrl.toString())
}
