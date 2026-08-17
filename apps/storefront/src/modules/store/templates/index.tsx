import { Suspense } from "react"

import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div
      className="flex w-full flex-col gap-5 pb-24 md:flex-row md:items-start md:gap-6"
      data-testid="category-container"
    >
      <RefinementList sortBy={sort} />
      <div className="min-w-0 w-full px-4 py-6 md:flex-1 md:py-8 md:pr-6 md:pl-0">
        <div className="mb-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-orange-600">Coast Tech catalog</p>
          <h1 className="text-3xl font-extrabold" data-testid="store-page-title">All products</h1>
        </div>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
