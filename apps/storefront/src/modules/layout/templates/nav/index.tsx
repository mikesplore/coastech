import { Suspense } from "react"

import { ShoppingCart } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SearchBar from "@modules/layout/components/search-bar"
import { listPromotionalAds } from "@lib/data/promotions"

export default async function Nav() {
  const trustMessages = (await listPromotionalAds()).filter((ad) => ad.placement === "homepage_trust").map((ad) => ad.title)
  const trustText = trustMessages.join(" · ")

  return (
    <div className="sticky top-0 z-50">
      {trustText ? <div className="flex h-7 items-center justify-center bg-on-surface px-3 font-label-sm text-label-sm text-white">{trustText}</div> : null}
    <header className="flex h-16 w-full items-center justify-between border-b border-surface-variant bg-surface/95 px-margin-mobile backdrop-blur-md">
      <div className="flex items-center gap-4">
        <span className="hidden rounded bg-surface-container px-2 py-1 font-label-sm text-label-sm text-secondary md:inline-flex">Kenya · KES</span>
        <span aria-hidden="true" className="grid h-8 w-8 place-items-center text-primary">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </span>
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
