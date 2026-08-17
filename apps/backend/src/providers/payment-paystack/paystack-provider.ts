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

type PaystackVerifyResponse = {
  status: boolean
  message: string
  data?: {
    status: string
    reference: string
    amount: number
    currency: string
    paid_at?: string
  }
}

class PaystackPaymentProvider extends AbstractPaymentProvider<PaystackOptions> {
  static identifier = "paystack"

  protected readonly options_: PaystackOptions

  static validateOptions(options: PaystackOptions) {
    if (!options?.secret_key) {
      throw new Error("Paystack provider requires `secret_key` option")
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

  protected async request<T>(path: string, init: RequestInit & { body?: any } = {}) {
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
      input.context?.email ??
      "customer@example.com"

    const currency = input.currency_code?.toUpperCase?.() ?? input.currency_code

    const initialize = await this.request<PaystackInitializeResponse>(
      "/transaction/initialize",
      {
        method: "POST",
        body: {
          email,
          amount: input.amount,
          currency,
          reference: (input.data as any)?.reference,
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
        authorization_url: initialize.data.authorization_url,
        access_code: initialize.data.access_code,
      },
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    return {
      status: PaymentSessionStatus.PENDING,
      data: input.data,
    }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const reference = (input.data as any)?.reference ?? input.id
    if (!reference) {
      return { status: PaymentSessionStatus.PENDING }
    }

    const verify = await this.request<PaystackVerifyResponse>(
      `/transaction/verify/${encodeURIComponent(String(reference))}`,
      { method: "GET" }
    )

    const status = verify.data?.status
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
    const reference = (input.data as any)?.reference ?? input.payment_id ?? input.id
    if (!reference) {
      return { data: input.data }
    }

    await this.request("/refund", {
      method: "POST",
      body: {
        transaction: reference,
        amount: input.amount,
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

    if (!signature || signature !== expected) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const event = String(payload.data["event"] ?? "")
    const data = (payload.data["data"] ?? {}) as Record<string, any>
    const reference = data.reference

    if (!reference) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    if (event === "charge.success") {
      return {
        action: PaymentActions.SUCCESSFUL,
        data: { reference },
      }
    }

    if (event === "charge.failed") {
      return {
        action: PaymentActions.FAILED,
        data: { reference },
      }
    }

    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

export default PaystackPaymentProvider

