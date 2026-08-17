"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { usePathname } from "next/navigation"

export default function MobileNav() {
  const pathname = usePathname()
  const links = [
    ["⌂", "Home", "/"],
    ["▦", "Categories", "/store"],
    ["♧", "Cart", "/cart"],
    ["♙", "Account", "/account"],
  ]
  return <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t border-gray-200 bg-white small:hidden">{links.map(([icon, label, href]) => <LocalizedClientLink key={label} href={href} className={`flex flex-col items-center justify-center gap-1 text-[11px] ${pathname.endsWith(href) ? "text-orange-600" : "text-gray-500"}`}><span className="text-xl leading-none">{icon}</span>{label}</LocalizedClientLink>)}</nav>
}
