"use client"

import { Component, ComputerDesktop, LaptopMobile } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { usePathname } from "next/navigation"

const menuItems = [
  ["laptop_mac", "Laptops", "/categories/laptops"],
  ["desktop_windows", "Desktops", "/desktops"],
  ["memory", "Components", "/store"],
  ["router", "Networking", "/categories/networking"],
  ["mouse", "Peripherals", "/categories/peripherals"],
]

export default function CoastTechMenu() {
  const pathname = usePathname()

  return (
    <div>
      <h2 className="mb-5 font-headline-sm text-headline-sm font-bold uppercase tracking-[0.18em] text-primary">
        MENU
      </h2>
      <nav className="flex flex-col gap-1">
        {menuItems.map(([icon, label, href]) => {
          const Icon = icon === "laptop_mac" ? LaptopMobile : icon === "desktop_windows" ? ComputerDesktop : Component
          const active = pathname.includes(href.replace("/", "")) || (label === "Desktops" && pathname.includes("desktops-prebuilts"))
          return (
            <LocalizedClientLink
              key={label}
              href={href}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 font-body-lg text-body-lg transition-colors duration-200 ${active ? "border-primary bg-primary-container font-bold text-on-primary-container" : "border-transparent text-on-surface-variant hover:border-surface-variant hover:bg-surface-container"}`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </LocalizedClientLink>
          )
        })}
      </nav>
    </div>
  )
}
