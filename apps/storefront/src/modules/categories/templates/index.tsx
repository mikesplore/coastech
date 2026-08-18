import { notFound } from "next/navigation"
import { Suspense } from "react"

import InteractiveLink from "@modules/common/components/interactive-link"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { getCategorySpecFields } from "@lib/data/specification-filters"
import { listPromotionalAds } from "@lib/data/promotions"

export default async function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
  optionValueIds,
  productsIds,
  brand,
  priceMin,
  priceMax,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  productsIds?: string[]
  brand?: string
  priceMin?: string
  priceMax?: string
}) {
  const { fields } = await getCategorySpecFields(category.id).catch(() => ({ fields: [] }))
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const flashDeal = (await listPromotionalAds()).find((ad) => ad.placement === "homepage_flash_deals")

  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)

  return (
    <div
      className="flex w-full flex-col md:flex-row md:items-start md:gap-6"
      data-testid="category-container"
    >
      <RefinementList
        sortBy={sort}
        data-testid="sort-by-container"
        hideOptionsPicker
        specFields={fields}
        brand={brand}
        priceMin={priceMin}
        priceMax={priceMax}
      />
      <div className="min-w-0 w-full px-4 py-6 md:flex-1 md:py-8 md:pr-6 md:pl-0">
        <div className="mb-section-gap flex items-center justify-between">
          <div>
            <div className="flex flex-row items-center gap-4">
              {parents &&
                parents.map((parent) => (
                  <span key={parent.id} className="text-secondary">
                    <LocalizedClientLink
                      className="mr-4 hover:text-primary"
                      href={`/categories/${parent.handle}`}
                      data-testid="sort-by-link"
                    >
                      {parent.name}
                    </LocalizedClientLink>
                    /
                  </span>
                ))}
              <h1
                className="font-display-lg text-display-lg text-on-surface"
                data-testid="category-page-title"
              >
                {category.name}
              </h1>
            </div>
            <p className="mt-1 font-body-md text-body-md text-secondary">
              Showing 1-24 of 1,204 results
            </p>
          </div>
          <div className="flex gap-2">
            <select
              className="rounded-lg border border-surface-variant bg-surface-container-lowest px-4 py-2 font-body-md text-body-md text-on-surface focus:border-primary-container focus:ring-0"
              defaultValue={sort}
            >
              <option value="created_at">Sort by: Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="created_at">Newest Arrivals</option>
            </select>
          </div>
        </div>
        {category.description && (
          <div className="mb-8 text-base-regular">
            <p>{category.description}</p>
          </div>
        )}
        {flashDeal ? <div className="relative mb-section-gap flex h-32 w-full items-center justify-between overflow-hidden rounded-xl bg-gradient-to-r from-primary-container to-tertiary-container px-8 shadow-md md:h-48"><div className="relative z-10 max-w-xl text-white"><span className="mb-2 inline-block rounded bg-error px-2 py-1 font-label-bold text-label-bold uppercase tracking-wider text-on-error">{flashDeal.discount_label ?? "Featured offer"}</span><h2 className="mb-1 font-headline-lg text-headline-lg font-bold">{flashDeal.title}</h2><p className="font-body-md text-body-md opacity-90">{flashDeal.description}</p></div>{flashDeal.image_url ? <div className="absolute right-0 top-0 h-full w-1/2 bg-cover bg-center" style={{ backgroundImage: `url(${flashDeal.image_url})` }} /> : null}<div className="absolute inset-0 w-2/3 bg-gradient-to-r from-primary-container via-primary-container/80 to-transparent" /></div> : null}
        <div className="mb-5 flex gap-2 overflow-x-auto small:hidden">
          <input className="min-w-0 flex-1 rounded-lg border border-surface-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md" placeholder={category.name} />
          <button className="rounded-lg border border-surface-variant px-4 text-on-surface">☷</button>
        </div>
        <div className="mb-5 flex gap-2 overflow-x-auto small:hidden">
          <span className="whitespace-nowrap rounded-full border border-surface-variant px-4 py-2 font-body-md text-body-md text-on-surface">Price: Low to High</span>
          <span className="whitespace-nowrap rounded-full border border-primary-container px-4 py-2 font-body-md text-body-md text-on-primary-container">27-inch</span>
          <span className="whitespace-nowrap rounded-full border border-surface-variant px-4 py-2 font-body-md text-body-md text-on-surface">144Hz+</span>
          <span className="whitespace-nowrap rounded-full border border-surface-variant px-4 py-2 font-body-md text-body-md text-on-surface">IPS Panel</span>
        </div>
        {category.category_children && (
          <div className="mb-8 text-base-large">
            <ul className="grid grid-cols-1 gap-2">
              {category.category_children?.map((c) => (
                <li key={c.id}>
                  <InteractiveLink href={`/categories/${c.handle}`}>
                    {c.name}
                  </InteractiveLink>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Suspense
          fallback={
            <SkeletonProductGrid
              numberOfProducts={category.products?.length ?? 8}
            />
          }
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            categoryId={category.id}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
            productsIds={productsIds}
            brand={brand}
            priceMin={priceMin}
            priceMax={priceMax}
          />
        </Suspense>
      </div>
    </div>
  )
}
