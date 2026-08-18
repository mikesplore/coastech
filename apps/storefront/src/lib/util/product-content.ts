import { HttpTypes } from "@medusajs/types"

type ProductContent = HttpTypes.StoreProduct & {
  metadata?: Record<string, unknown> | null
}

export function getProductRating(product: ProductContent) {
  const rating = Number(product.metadata?.rating)
  const reviewCount = Number(product.metadata?.review_count)

  if (!Number.isFinite(rating) || !Number.isFinite(reviewCount) || reviewCount <= 0) {
    return null
  }

  return { rating, reviewCount }
}

export function getProductDiscountLabel(product: ProductContent) {
  const percentage = Number(product.metadata?.discount_percentage)

  if (!Number.isFinite(percentage) || percentage <= 0) {
    return null
  }

  return `-${percentage}% OFF`
}

export function getProductStockStatus(product: HttpTypes.StoreProduct) {
  const variant = product.variants?.[0]

  if (!variant || !variant.manage_inventory) {
    return { label: "In stock", tone: "in-stock" as const }
  }

  const quantity = variant.inventory_quantity ?? 0

  if (quantity <= 0) {
    return { label: "Out of stock", tone: "out-of-stock" as const }
  }

  if (quantity <= 5) {
    return { label: `Only ${quantity} left`, tone: "low-stock" as const }
  }

  return { label: "In stock", tone: "in-stock" as const }
}
