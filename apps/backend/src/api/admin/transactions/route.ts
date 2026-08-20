import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const paymentModule = req.scope.resolve(Modules.PAYMENT) as any
  const [payments, sessions]: [any[], any[]] = await Promise.all([
    paymentModule.listPayments({}, {
      relations: ["payment_collection", "payment_session", "refunds"],
      order: { created_at: "DESC" },
      take: 200,
    }),
    paymentModule.listPaymentSessions({}, {
      order: { created_at: "DESC" },
      take: 200,
    }),
  ])

  const paymentBySessionId = new Map(
    payments
      .filter((payment: any) => payment.payment_session_id)
      .map((payment: any) => [payment.payment_session_id, payment])
  )

  const getReference = (data: any) => {
    const values = [data?.reference, data?.trxref, data?.transaction_reference, data?.id]
    return values.find((value) => value !== undefined && value !== null && value !== "") ?? null
  }

  const sessionTransactions = sessions.map((session: any) => {
    const payment = paymentBySessionId.get(session.id)
    const reference = getReference(session.data) ?? getReference(payment?.data)

    return {
      id: payment?.id ?? `session:${session.id}`,
      payment_id: payment?.id ?? null,
      provider_id: session.provider_id,
      amount: payment?.amount ?? session.amount ?? 0,
      currency_code: payment?.currency_code ?? session.currency_code ?? "",
      created_at: payment?.created_at ?? session.created_at,
      captured_at: payment?.captured_at ?? null,
      canceled_at: payment?.canceled_at ?? null,
      status: payment?.captured_at
        ? "captured"
        : payment?.canceled_at
          ? "canceled"
          : session.status ?? "pending",
      payment_collection_id: payment?.payment_collection_id ?? session.payment_collection_id,
      payment_session_id: session.id,
      reference,
      refunds: (payment?.refunds ?? []).map((refund: any) => ({
        id: refund.id,
        amount: refund.amount,
        note: refund.note,
        created_at: refund.created_at,
      })),
    }
  })

  const sessionIds = new Set(sessions.map((session: any) => session.id))
  const paymentTransactions = payments
    .filter((payment: any) => !payment.payment_session_id || !sessionIds.has(payment.payment_session_id))
    .map((payment: any) => ({
      id: payment.id,
      payment_id: payment.id,
      provider_id: payment.provider_id,
      amount: payment.amount,
      currency_code: payment.currency_code,
      created_at: payment.created_at,
      captured_at: payment.captured_at,
      canceled_at: payment.canceled_at,
      status: payment.captured_at ? "captured" : payment.canceled_at ? "canceled" : "authorized",
      payment_collection_id: payment.payment_collection_id,
      payment_session_id: payment.payment_session_id,
      reference: getReference(payment.data),
      refunds: (payment.refunds ?? []).map((refund: any) => ({
        id: refund.id,
        amount: refund.amount,
        note: refund.note,
        created_at: refund.created_at,
      })),
    }))

  res.json({
    transactions: [...sessionTransactions, ...paymentTransactions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  })
}
