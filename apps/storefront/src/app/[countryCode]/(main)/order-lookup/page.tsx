"use client"

import { lookupGuestOrder } from "@lib/data/orders"
import OrderDetailsTemplate from "@modules/order/templates/order-details-template"
import { useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"

export default function GuestOrderLookupPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [orderId, setOrderId] = useState(searchParams.get("order_id") ?? "")
  const [order, setOrder] = useState<Awaited<ReturnType<typeof lookupGuestOrder>>>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(undefined)
    setOrder(undefined)

    try {
      setOrder(await lookupGuestOrder(email.trim(), orderId.trim()))
    } catch {
      setError("We could not find an order with those details.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="content-container py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl-semi mb-3">Track your order</h1>
        <p className="text-ui-fg-subtle mb-8">
          Enter the email address used at checkout and your order ID to view its status.
        </p>
        <form onSubmit={submit} className="grid gap-4 max-w-xl">
          <label className="grid gap-1">
            <span className="text-small-regular">Email address</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border rounded px-3 py-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-small-regular">Order ID</span>
            <input
              required
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              className="border rounded px-3 py-2"
              placeholder="order_..."
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="bg-ui-fg-base text-ui-bg-base rounded px-4 py-2 w-fit disabled:opacity-50"
          >
            {loading ? "Looking up..." : "Track order"}
          </button>
          {error && <p className="text-ui-fg-error">{error}</p>}
        </form>
        {order && <div className="mt-10"><OrderDetailsTemplate order={order} /></div>}
      </div>
    </main>
  )
}
