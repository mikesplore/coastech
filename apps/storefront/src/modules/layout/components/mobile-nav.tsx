"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { BuildingStorefront, Component, ShoppingCart, User } from "@medusajs/icons"
import { useParams, usePathname } from "next/navigation"

export default function MobileNav() {
  const pathname = usePathname()
  const { countryCode } = useParams<{ countryCode: string }>()
  const countryPath = `/${countryCode}`
  const currentPath =
    pathname.replace(countryPath, "").replace(/\/+$/, "") || "/"
  const links = [
    { Icon: BuildingStorefront, label: "Home", href: "/" },
    { Icon: Component, label: "Categories", href: "/store" },
    { Icon: ShoppingCart, label: "Cart", href: "/cart" },
    { Icon: User, label: "Account", href: "/account" },
  ]

  return (
    <nav
      aria-label="Mobile navigation"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t border-surface-variant bg-surface/95 shadow-[0_-4px_18px_rgba(0,0,0,0.06)] backdrop-blur-md small:hidden"
    >
      {links.map(({ Icon, label, href }) => {
        const active =
          href === "/"
            ? currentPath === "/"
            : currentPath === href || currentPath.startsWith(`${href}/`)

        return (
          <LocalizedClientLink
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${active ? "text-primary" : "text-secondary hover:text-primary"}`}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </LocalizedClientLink>
        )
      })}
    </nav>
  )
}
