import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import PaystackPaymentProvider from "./paystack-provider"

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaystackPaymentProvider],
})

