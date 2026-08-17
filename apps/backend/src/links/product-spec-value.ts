import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import SpecificationsModule from "../modules/specifications"

/**
 * Link Product to ProductSpecValue
 * This allows accessing specs directly from a product
 */
export default defineLink(
  ProductModule.linkable.product,
  SpecificationsModule.linkable.productSpecValue
)
