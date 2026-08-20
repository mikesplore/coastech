import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { authorizePaystackReference } from "../authorize"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const reference = String(req.query.reference ?? req.query.trxref ?? "")

  if (!reference) {
    res.status(400).json({ message: "A Paystack reference is required" })
    return
  }

  const result = await authorizePaystackReference(req, reference)
  if (result.status === "not_found") {
    res.status(404).json({ message: "Paystack payment session not found" })
    return
  }

  res.json({
    reference,
    ...result,
  })
}
