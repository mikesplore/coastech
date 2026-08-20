import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"

import { HttpTypes } from "@medusajs/types"
import { getProductSpecifications } from "@lib/data/specifications"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = async ({ product }: ProductTabsProps) => {
  const specs = product.id ? await getProductSpecifications(product.id).catch(() => ({ specifications: [] })) : { specifications: [] }

  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
      <section aria-labelledby="technical-specifications">
        <h2 id="technical-specifications" className="border-b border-gray-200 px-5 py-4 text-2xl font-bold">
          Technical Specifications
        </h2>
        {specs.specifications.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {specs.specifications.map((specification) => (
              <div key={specification.label} className="grid grid-cols-2 gap-4 px-5 py-4 text-sm">
                <span className="text-gray-600">{specification.label}</span>
                <span className="text-right">
                  {String(specification.value)}{specification.unit ? ` ${specification.unit}` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-6 text-sm text-gray-500">
            Technical specifications are not available for this product.
          </p>
        )}
      </section>

      <section className="border-t border-gray-200" aria-labelledby="delivery-returns">
        <h2 id="delivery-returns" className="border-b border-gray-200 px-5 py-4 text-2xl font-bold">
          Delivery &amp; Returns
        </h2>
        <div className="px-5 pb-6 pt-6 md:px-8 md:pb-8">
          <ShippingInfoTab />
        </div>
      </section>
    </div>
  )
}

const ShippingInfoTab = () => {
  return (
    <div className="text-small-regular">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <FastDelivery />
          <div>
            <span className="font-semibold">Fast delivery</span>
            <p className="max-w-sm">
              Your package will arrive in 3-5 business days at your pick up
              location or in the comfort of your home.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <Refresh />
          <div>
            <span className="font-semibold">Simple exchanges</span>
            <p className="max-w-sm">
              Is the fit not quite right? No worries - we&apos;ll exchange your
              product for a new one.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <Back />
          <div>
            <span className="font-semibold">Easy returns</span>
            <p className="max-w-sm">
              Just return your product and we&apos;ll refund your money. No
              questions asked – we&apos;ll do our best to make sure your return
              is hassle-free.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs
