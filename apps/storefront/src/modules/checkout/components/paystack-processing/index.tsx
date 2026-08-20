"use client"

import { sdk } from "@lib/config"
import { useEffect, useState } from "react"

type PaystackProcessingProps = {
  countryCode: string
  reference: string
}

export default function PaystackProcessing({ countryCode, reference }: PaystackProcessingProps) {
  const [message, setMessage] = useState("We are confirming your payment. This can take a moment.")

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const poll = async (attempt: number) => {
      try {
        const result = await sdk.client.fetch<{
          authorized?: boolean
          order_id?: string
          status?: string
        }>("/store/payment/paystack/verify", {
          method: "GET",
          query: { reference },
          cache: "no-store",
        })

        if (cancelled) return
        if (result.authorized && result.order_id) {
          window.location.assign(`/api/cart/clear?next=${encodeURIComponent(`/${countryCode}/order/${result.order_id}/confirmed`)}`)
          return
        }
        if (result.status === "failed") {
          setMessage("The payment could not be confirmed. Please contact support before trying again.")
          return
        }
      } catch {
        if (!cancelled) setMessage("We are still waiting for Paystack to confirm your payment.")
      }

      if (!cancelled && attempt < 20) {
        timer = setTimeout(() => poll(attempt + 1), Math.min(2000 + attempt * 500, 5000))
      } else if (!cancelled) {
        setMessage("Payment confirmation is taking longer than usual. Check your order status shortly or contact support.")
      }
    }

    void poll(0)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [countryCode, reference])

  return (
    <main className="content-container flex min-h-[60vh] items-center justify-center py-20">
      <div className="max-w-lg border border-raised bg-surface p-8">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-copper">Paystack callback</p>
        <h1 className="mt-4 font-display text-4xl uppercase">Payment processing</h1>
        <p className="mt-4 text-muted">{message}</p>
      </div>
    </main>
  )
}
