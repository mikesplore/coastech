import { Modules } from "@medusajs/framework/utils"
import { MedusaRequest } from "@medusajs/framework"

export async function authorizePaystackReference(
  req: MedusaRequest,
  reference: string
) {
  const paymentModule = req.scope.resolve(Modules.PAYMENT)
  const sessions = await paymentModule.listPaymentSessions({})
  const session = sessions.find(
    (paymentSession) => {
      const data = paymentSession.data as Record<string, unknown> | undefined
      const references = [
        data?.reference,
        data?.trxref,
        data?.transaction_reference,
        data?.id,
      ]

      return references.some((value) => String(value ?? "") === reference)
    }
  )

  if (!session) {
    return { status: "not_found", authorized: false as const, cart_id: "" }
  }

  const data = session.data as Record<string, unknown> | undefined
  const payment = await paymentModule.authorizePaymentSession(session.id, {})
  const updatedSession = await paymentModule.retrievePaymentSession(session.id)

  return {
    status: updatedSession.status,
    authorized: updatedSession.status === "authorized",
    payment_session_id: session.id,
    payment_id: payment?.id ?? null,
    cart_id: String(data?.cart_id ?? ""),
  }
}
