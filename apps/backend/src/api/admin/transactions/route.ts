import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const paymentModule = req.scope.resolve(Modules.PAYMENT) as any
  const payments = await paymentModule.listPayments({}, {
    relations: ["payment_collection", "payment_session", "refunds"],
    order: { created_at: "DESC" },
    take: 200,
  })

  res.json({
    transactions: payments.map((payment: any) => ({
      id: payment.id,
      provider_id: payment.provider_id,
      amount: payment.amount,
      currency_code: payment.currency_code,
      created_at: payment.created_at,
      captured_at: payment.captured_at,
      canceled_at: payment.canceled_at,
      payment_collection_id: payment.payment_collection_id,
      payment_session_id: payment.payment_session_id,
      reference: payment.data?.reference ?? null,
      refunds: (payment.refunds ?? []).map((refund: any) => ({
        id: refund.id,
        amount: refund.amount,
        note: refund.note,
        created_at: refund.created_at,
      })),
    })),
  })
}
