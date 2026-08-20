import crypto from "crypto"
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  AbstractPaymentProvider,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"

type PaystackOptions = {
  secret_key: string
  public_key?: string
  callback_url?: string
  test_mode?: boolean
  base_url?: string
}

type PaystackInitializeResponse = {
  status: boolean
  message: string
  data?: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

type PaystackWebhookData = {
  reference?: string
  metadata?: Record<string, unknown>
}

type PaystackVerifyResponse = {
  status: boolean
  message: string
  data?: {
    status: string
    reference: string
    amount: number
    currency: string
    paid_at?: string
    metadata?: Record<string, unknown>
  }
}

function toMinorUnits(amount: unknown, currencyCode?: string) {
  const amountValue =
    typeof amount === "object" && amount !== null
      ? (amount as { value?: unknown; numeric?: unknown }).value ??
        (amount as { value?: unknown; numeric?: unknown }).numeric ??
        amount
      : amount
  const numericAmount = Number(amountValue)
  if (!Number.isFinite(numericAmount)) {
    return 0
  }

  const zeroDecimalCurrencies = new Set(["jpy", "krw", "vnd"])
  return Math.round(
    numericAmount * (zeroDecimalCurrencies.has(currencyCode?.toLowerCase() ?? "") ? 1 : 100)
  )
}

class PaystackPaymentProvider extends AbstractPaymentProvider<PaystackOptions> {
  static identifier = "paystack"

  protected readonly options_: PaystackOptions

  static validateOptions(options: PaystackOptions) {
    if (!options?.secret_key) {
      throw new Error("Paystack provider requires `secret_key` option")
    }
    if (!options?.public_key) {
      throw new Error("Paystack provider requires `public_key` option")
    }
    if (!options?.callback_url) {
      throw new Error("Paystack provider requires `callback_url` option")
    }
  }

  constructor(container: Record<string, unknown>, options: PaystackOptions) {
    super(container, options)
    PaystackPaymentProvider.validateOptions(options)
    this.options_ = options
  }

  protected get baseUrl() {
    return this.options_.base_url ?? "https://api.paystack.co"
  }

  protected async request<T>(path: string, init: Omit<RequestInit, "body"> & { body?: unknown } = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.options_.secret_key}`,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    })

    const json = (await res.json().catch(() => null)) as T | null
    if (!res.ok || !json) {
      throw new Error(`Paystack request failed: ${res.status}`)
    }

    return json
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const email =
      input.context?.customer?.email ??
      "customer@example.com"

    const currency = input.currency_code?.toUpperCase?.() ?? input.currency_code
    const existingReference = (input.data as Record<string, unknown> | undefined)?.reference
    const reference = existingReference || `coastech_${crypto.randomUUID()}`
    const amountMinor = toMinorUnits(input.amount, input.currency_code)

    const initialize = await this.request<PaystackInitializeResponse>(
      "/transaction/initialize",
      {
        method: "POST",
        body: {
          email,
          amount: amountMinor,
          currency,
          reference,
          ...(input.data?.session_id
            ? { metadata: { session_id: input.data.session_id } }
            : {}),
          ...(this.options_.callback_url
            ? { callback_url: this.options_.callback_url }
            : {}),
        },
      }
    )

    if (!initialize.status || !initialize.data?.reference) {
      throw new Error(initialize.message || "Failed to initialize Paystack transaction")
    }

    return {
      id: initialize.data.reference,
      data: {
        reference: initialize.data.reference,
        ...(input.data?.cart_id ? { cart_id: input.data.cart_id } : {}),
        amount_minor: amountMinor,
        currency_code: input.currency_code,
        authorization_url: initialize.data.authorization_url,
        access_code: initialize.data.access_code,
        public_key: this.options_.public_key,
        callback_url: this.options_.callback_url,
        test_mode: this.options_.test_mode ?? true,
      },
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const status = await this.getPaymentStatus({ data: input.data })

    return {
      status: status.status,
      data: input.data,
    }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const reference = data.reference
    if (!reference) {
      return { status: PaymentSessionStatus.PENDING }
    }

    const verify = await this.request<PaystackVerifyResponse>(
      `/transaction/verify/${encodeURIComponent(String(reference))}`,
      { method: "GET" }
    )

    const status = verify.data?.status
    const expectedAmount = data.amount_minor
    const expectedCurrency = String(data.currency_code ?? "").toUpperCase()
    if (
      status === "success" &&
      expectedAmount !== undefined &&
      (verify.data?.amount !== Number(expectedAmount) ||
        verify.data?.currency?.toUpperCase() !== expectedCurrency)
    ) {
      return { status: PaymentSessionStatus.ERROR }
    }
    if (status === "success") {
      return { status: PaymentSessionStatus.AUTHORIZED }
    }

    if (status === "failed") {
      return { status: PaymentSessionStatus.ERROR }
    }

    return { status: PaymentSessionStatus.PENDING }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return input.data ?? {}
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: { ...(input.data ?? {}), amount: input.amount, currency_code: input.currency_code } }
  }

  async deletePayment(_input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: {} }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: input.data }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const reference = (input.data as any)?.reference
    if (!reference) {
      return { data: input.data }
    }

    await this.request("/refund", {
      method: "POST",
      body: {
        transaction: reference,
        amount: toMinorUnits(input.amount, (input.data as Record<string, unknown> | undefined)?.currency_code as string | undefined),
      },
    })

    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const signature = String(payload.headers["x-paystack-signature"] ?? "")
    const expected = crypto
      .createHmac("sha512", this.options_.secret_key)
      .update(payload.rawData)
      .digest("hex")

    const signaturesMatch =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    if (!signaturesMatch) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const event = String(payload.data["event"] ?? "")
    const data = (payload.data["data"] ?? {}) as PaystackWebhookData & Record<string, any>
    const reference = data.reference
    const sessionId = data.metadata?.session_id

    if (!reference || !sessionId) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    if (event === "charge.success") {
      return {
        action: PaymentActions.SUCCESSFUL,
        data: { session_id: String(sessionId), reference } as any,
      }
    }

    if (event === "charge.failed") {
      return {
        action: PaymentActions.FAILED,
        data: { session_id: String(sessionId), reference } as any,
      }
    }

    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

export default PaystackPaymentProvider
