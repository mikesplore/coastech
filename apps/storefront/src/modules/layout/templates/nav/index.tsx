import { Suspense } from "react"

import { MapPin, ShoppingCart } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SearchBar from "@modules/layout/components/search-bar"
import { listPromotionalAds } from "@lib/data/promotions"
import { listRegions } from "@lib/data/regions"
import SideMenu from "@modules/layout/components/side-menu"

export default async function Nav() {
  const [ads, regions] = await Promise.all([listPromotionalAds(), listRegions()])
  const trustMessages = ads.filter((ad) => ad.placement === "homepage_trust").map((ad) => ad.title)
  const trustText = trustMessages.join(" · ")
  const region = regions?.[0]
  const countryCode = region?.countries?.[0]?.iso_2?.toUpperCase() ?? "KE"
  const currencyCode = region?.currency_code?.toUpperCase() ?? "KES"

  return (
    <div className="sticky top-0 z-50">
      {trustText ? <div className="flex h-7 items-center justify-center bg-on-surface px-3 font-label-sm text-label-sm text-white">{trustText}</div> : null}
    <header className="flex h-16 w-full items-center justify-between border-b border-surface-variant bg-surface/95 px-margin-mobile backdrop-blur-md">
      <div className="flex items-center gap-4">
        <SideMenu />
        <LocalizedClientLink
          href="/"
          className="font-headline-lg text-headline-lg font-extrabold tracking-tighter text-on-surface"
          data-testid="nav-store-link"
        >
          COAST TECH
        </LocalizedClientLink>
      </div>
      <div className="mx-8 hidden max-w-2xl flex-1 md:block">
        <SearchBar />
      </div>
      <div className="flex items-center gap-4">
        <nav className="mr-4 hidden items-center gap-6 md:flex">
          <LocalizedClientLink
            className="rounded px-3 py-2 text-secondary transition-opacity duration-150 hover:bg-surface-container active:opacity-80"
            href="/"
          >
            Home
          </LocalizedClientLink>
          <LocalizedClientLink
            className="rounded px-3 py-2 font-bold text-primary transition-opacity duration-150 hover:bg-surface-container active:opacity-80"
            href="/store"
          >
            Categories
          </LocalizedClientLink>
          <LocalizedClientLink
            className="rounded px-3 py-2 text-secondary transition-opacity duration-150 hover:bg-surface-container active:opacity-80"
            href="/builder"
          >
            Build checker
          </LocalizedClientLink>
          <LocalizedClientLink
            className="rounded px-3 py-2 text-secondary transition-opacity duration-150 hover:bg-surface-container active:opacity-80"
            href="/account"
          >
            Account
          </LocalizedClientLink>
        </nav>
        <span
          className="flex items-center gap-1.5 rounded-full border border-surface-variant bg-surface-container px-2.5 py-1.5 font-label-sm text-label-sm font-semibold text-secondary"
          title={`${countryCode} · ${currencyCode}`}
          aria-label={`${countryCode} · ${currencyCode}`}
        >
          <MapPin className="h-4 w-4 text-primary" />
          <span>{currencyCode}</span>
        </span>
        <Suspense
          fallback={
            <LocalizedClientLink
              className="flex gap-2 text-primary"
              href="/cart"
              data-testid="nav-cart-link"
            >
              <ShoppingCart className="h-6 w-6" />
            </LocalizedClientLink>
          }
        >
          <CartButton />
        </Suspense>
      </div>
    </header>
    </div>
  )
}
