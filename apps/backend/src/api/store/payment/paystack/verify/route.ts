import { Modules } from "@medusajs/framework/utils"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const reference = String(req.query.reference ?? req.query.trxref ?? "")

  if (!reference) {
    res.status(400).json({ message: "A Paystack reference is required" })
    return
  }

  const paymentModule = req.scope.resolve(Modules.PAYMENT)
  const sessions = await paymentModule.listPaymentSessions({ provider_id: "pp_paystack" })
  const session = sessions.find(
    (paymentSession) => String(paymentSession.data?.reference ?? "") === reference
  )

  if (!session) {
    res.status(404).json({ message: "Paystack payment session not found" })
    return
  }

  const payment = await paymentModule.authorizePaymentSession(session.id, { reference })
  const updatedSession = await paymentModule.retrievePaymentSession(session.id)

  res.json({
    reference,
    status: updatedSession.status,
    authorized: updatedSession.status === "authorized",
    payment_session_id: session.id,
    payment_id: payment?.id ?? null,
  })
}
