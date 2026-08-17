import { verifyPaystackPayment } from "@lib/data/paystack"
import { placeOrder } from "@lib/data/cart"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const dynamic = "force-dynamic"

export default async function PaystackCallback({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string; status?: string }>
}) {
  const params = await searchParams
  const reference = params.reference ?? params.trxref

  if (reference && params.status !== "cancelled") {
    try {
      const result = await verifyPaystackPayment(reference)
      if (result.authorized) {
        await placeOrder()
      }
    } catch {
      // Render the recovery state below when verification or order completion fails.
    }
  }

  return (
    <main className="content-container flex min-h-[60vh] items-center justify-center py-20">
      <div className="max-w-lg border border-raised bg-surface p-8">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-copper">Paystack callback</p>
        <h1 className="mt-4 font-display text-4xl uppercase">Payment needs attention</h1>
        <p className="mt-4 text-muted">The payment was not completed or the order could not be finalized. You can return to checkout and try again.</p>
        <LocalizedClientLink href="/checkout?step=payment" className="mt-7 inline-block bg-copper px-5 py-3 font-semibold text-pcb">Return to checkout</LocalizedClientLink>
      </div>
    </main>
  )
}
