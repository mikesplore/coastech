import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getProductRating, getProductStockStatus } from "@lib/util/product-content"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  const category = product.categories?.[0]
  const rating = getProductRating(product)
  const stock = getProductStockStatus(product)

  return (
    <div id="product-info">
      <div className="flex flex-col gap-y-4 lg:max-w-[560px] mx-auto">
        {product.collection && (
          <LocalizedClientLink
            href={`/collections/${product.collection.handle}`}
            className="text-medium text-ui-fg-muted hover:text-ui-fg-subtle"
          >
            {product.collection.title}
          </LocalizedClientLink>
        )}
        {category && (
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
            {category.name}
          </span>
        )}
        <Heading
          level="h2"
          className="text-2xl font-extrabold leading-8 text-gray-900 small:text-3xl"
          data-testid="product-title"
        >
          {product.title}
        </Heading>

        <div className="flex items-center gap-3 text-sm">
          {rating ? <span className="rounded-full bg-orange-50 px-2 py-1 text-orange-600" aria-label="Product rating">★ {rating.rating.toFixed(1)} <span className="text-xs text-gray-500">({rating.reviewCount} reviews)</span></span> : null}
          <span className={stock.tone === "out-of-stock" ? "text-gray-500" : stock.tone === "low-stock" ? "text-amber-700" : "text-green-600"}>● {stock.label}</span>
        </div>

        <Text
          className="text-medium whitespace-pre-line text-gray-600"
          data-testid="product-description"
        >
          {product.description}
        </Text>

        <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600 small:grid-cols-2 md:p-5">
          <div><span className="font-semibold text-gray-900">Delivery</span><br />Fast delivery available</div>
          <div><span className="font-semibold text-gray-900">Returns</span><br />Easy returns policy</div>
        </div>
      </div>
    </div>
  )
}

export default ProductInfo
