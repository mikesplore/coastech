import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import { Star } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"
import QuickAdd from "./quick-add"

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
  variant = "catalog",
  saleBadge,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
  variant?: "home" | "catalog"
  saleBadge?: string
}) {
  const { cheapestPrice } = getProductPrice({
    product,
  })

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-surface-variant bg-surface-container-lowest transition-shadow hover:shadow-md" data-testid="product-wrapper">
      {saleBadge && <span className="absolute left-2 top-2 z-10 rounded-full bg-red-600 px-2 py-1 font-label-sm text-label-sm font-bold text-white">{saleBadge}</span>}
      <LocalizedClientLink href={`/products/${product.handle}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square w-full overflow-hidden bg-surface-container-low">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
            className="!aspect-square !bg-transparent !rounded-none"
          />
        </div>
        <div className="flex flex-1 flex-col p-card-padding">
          <h3 className="mb-1 line-clamp-2 font-body-md text-body-md leading-tight text-on-surface transition-colors group-hover:text-primary" data-testid="product-title">
            {product.title}
          </h3>
          <div className="mb-2 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-current text-primary" />
            <span className="font-label-sm text-label-sm text-secondary">4.8 (1.2k)</span>
          </div>
          <div className="mt-auto flex items-end justify-between">
            <div>
              <div className="marketplace-price">{cheapestPrice && <PreviewPrice price={cheapestPrice} />}</div>
            </div>
            <QuickAdd variantId={product.variants?.[0]?.id} compact />
          </div>
        </div>
      </LocalizedClientLink>
      <p className="hidden" aria-label="Inventory status">{((product.variants?.[0]?.inventory_quantity ?? 0) > 0 || !product.variants?.[0]?.manage_inventory) ? "In stock" : "Out of stock"}</p>
    </div>
  )
}
