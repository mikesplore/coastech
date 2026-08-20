import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function PaystackCallback({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{
    reference?: string
    trxref?: string
    status?: string
    order_id?: string
    message?: string
  }>
}) {
  const { countryCode } = await routeParams
  const params = await searchParams
  if (params.status === "success" && params.order_id) {
    const next = encodeURIComponent(
      `/${countryCode}/order/${params.order_id}/confirmed`
    )
    redirect(`/api/cart/clear?next=${next}`)
  }
  const completionError = params.message ?? null

  return (
    <main className="content-container flex min-h-[60vh] items-center justify-center py-20">
      <div className="max-w-lg border border-raised bg-surface p-8">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-copper">Paystack callback</p>
        <h1 className="mt-4 font-display text-4xl uppercase">
          {completionError ? "Order needs attention" : "Payment needs attention"}
        </h1>
        <p className="mt-4 text-muted">
          {completionError
            ? completionError
            : "The payment was not completed. You can return to checkout and try again."}
        </p>
        <LocalizedClientLink href="/checkout?step=payment" className="mt-7 inline-block bg-copper px-5 py-3 font-semibold text-pcb">Return to checkout</LocalizedClientLink>
      </div>
    </main>
  )
}
