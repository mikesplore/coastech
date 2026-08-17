"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import { Component, ComputerDesktop, LaptopMobile } from "@medusajs/icons"

import {
  OPTION_VALUE_QUERY_KEY,
  parseOptionValueIds,
} from "@lib/util/product-option-filters"
import OptionsPicker from "./options-picker"
import SortProducts, { SortOptions } from "./sort-products"
import SpecFields from "./spec-fields"
import { SpecFilterField } from "@lib/data/specification-filters"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type RefinementListProps = {
  sortBy: SortOptions
  search?: boolean
  hideOptionsPicker?: boolean
  "data-testid"?: string
  specFields?: SpecFilterField[]
}

const RefinementList = ({
  sortBy,
  hideOptionsPicker = false,
  "data-testid": dataTestId,
  specFields = [],
}: RefinementListProps) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateQueryParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      updater(params)

      params.delete("page")

      const queryString = params.toString()
      const currentQuery = searchParams.toString()
      const nextPath = queryString ? `${pathname}?${queryString}` : pathname
      const currentPath = currentQuery
        ? `${pathname}?${currentQuery}`
        : pathname

      if (nextPath !== currentPath) {
        router.push(nextPath)
      }
    },
    [pathname, router, searchParams]
  )

  const setQueryParams = (name: string, value: string) =>
    updateQueryParams((params) => params.set(name, value))

  const selectedOptionValueIds = useMemo(
    () => parseOptionValueIds(searchParams),
    [searchParams]
  )

  const setOptionValueIds = (valueIds: string[]) =>
    updateQueryParams((params) => {
      params.delete(OPTION_VALUE_QUERY_KEY)
      valueIds.forEach((valueId) =>
        params.append(OPTION_VALUE_QUERY_KEY, valueId)
      )
    })

  return (
    <>
      <button onClick={() => setMobileOpen((open) => !open)} className="mb-4 rounded-full border border-on-surface bg-transparent px-5 py-2 font-label-bold text-label-bold text-on-surface transition-colors hover:bg-surface-container md:hidden">☷ &nbsp; Filter & Sort</button>
      <aside className={`${mobileOpen ? "flex" : "hidden"} mb-5 flex-col gap-6 rounded-r-xl border-r border-surface-variant bg-surface p-4 shadow-xl md:flex md:h-[calc(100vh-5.75rem)] md:w-72 md:shrink-0 md:sticky md:top-[5.75rem] md:overflow-y-auto`}>
        <div className="mb-2">
          <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">COAST TECH MENU</h2>
          <nav className="flex flex-col gap-2">
            {[
              ["laptop_mac", "Laptops", "/categories/laptops"],
              ["desktop_windows", "Desktops", "/categories/desktops"],
              ["memory", "Components", "/store"],
              ["router", "Networking", "/categories/networking"],
              ["mouse", "Peripherals", "/categories/peripherals"],
            ].map(([icon, label, href]) => <LocalizedCategoryLink key={label} icon={icon} label={label} href={href} active={label.toLowerCase() === "laptops" && pathname.includes("laptop")} />)}
          </nav>
        </div>
        <div className="mt-4 border-t border-surface-variant pt-6">
          <h3 className="mb-4 font-label-bold text-label-bold uppercase tracking-wider text-on-surface">Filters</h3>
          <div className="mb-6">
            <h4 className="mb-2 font-body-md text-on-surface-variant">Price Range</h4>
            <div className="flex items-center gap-2">
              <input placeholder="Min" className="h-8 w-full rounded border border-surface-variant bg-surface-container-lowest px-2 font-body-md text-body-md focus:border-primary-container focus:ring-0" />
              <span className="text-secondary">-</span>
              <input placeholder="Max" className="h-8 w-full rounded border border-surface-variant bg-surface-container-lowest px-2 font-body-md text-body-md focus:border-primary-container focus:ring-0" />
            </div>
          </div>
          <div className="mb-6">
            <h4 className="mb-2 font-body-md text-on-surface-variant">Brand</h4>
            <div className="flex flex-col gap-2">
              {["TechPro", "Nexus", "Aero"].map((brand, index) => (
                <label key={brand} className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" defaultChecked={index === 0} className="rounded border-surface-variant text-primary-container focus:ring-primary-container" />
                  <span className="font-body-md text-on-surface">{brand}</span>
                </label>
              ))}
            </div>
          </div>
          <button className="w-full rounded-lg border border-on-surface bg-surface-container py-2 font-label-bold text-label-bold text-on-surface transition-colors hover:bg-surface-container-high">Apply Filters</button>
        </div>
        <div><h3 className="mb-3 font-label-bold text-label-bold text-on-surface">Sort by</h3><SortProducts sortBy={sortBy} setQueryParams={setQueryParams} data-testid={dataTestId} /></div>
        {!hideOptionsPicker && <OptionsPicker selectedValueIds={selectedOptionValueIds} setOptionValueIds={setOptionValueIds} />}
        {specFields.length > 0 && <SpecFields fields={specFields} />}
      </aside>
    </>
  )
}

function LocalizedCategoryLink({ icon, label, href, active }: { icon: string; label: string; href: string; active: boolean }) {
  const Icon = icon === "laptop_mac" ? LaptopMobile : icon === "desktop_windows" ? ComputerDesktop : Component
  return <LocalizedClientLink href={href} className={`flex items-center gap-3 rounded-lg p-3 font-body-lg text-body-lg transition-colors duration-200 ${active ? "bg-primary-container font-bold text-on-primary-container hover:bg-surface-container-high" : "text-on-surface-variant hover:bg-surface-container-high"}`}><Icon className="h-5 w-5 shrink-0" /><span>{label}</span></LocalizedClientLink>
}

export default RefinementList
