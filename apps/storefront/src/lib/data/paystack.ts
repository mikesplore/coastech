import { sdk } from "@lib/config"

export async function verifyPaystackPayment(reference: string) {
  return sdk.client.fetch<{
    reference: string
    status: string
    authorized: boolean
  }>("/store/payment/paystack/verify", {
    method: "GET",
    query: { reference },
    cache: "no-store",
  })
}
