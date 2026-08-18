import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const paymentId = String(req.params.id)
  const body = req.body as { amount?: number; note?: string }
  const amount = Number(body.amount)

  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ message: "A positive refund amount is required" })
    return
  }

  const paymentModule = req.scope.resolve(Modules.PAYMENT) as any
  const existingPayment = await paymentModule.retrievePayment(paymentId, {
    relations: ["refunds"],
  })
  const refundedAmount = (existingPayment.refunds ?? []).reduce(
    (total: number, refund: { amount: number }) => total + Number(refund.amount),
    0
  )
  if (amount > Number(existingPayment.amount) - refundedAmount) {
    res.status(400).json({ message: "Refund amount exceeds the remaining payment balance" })
    return
  }

  const payment = await paymentModule.refundPayment({
    payment_id: paymentId,
    amount,
    note: body.note || undefined,
  })

  res.json({ payment })
}
