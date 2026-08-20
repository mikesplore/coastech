import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { listTrustBadges } from "@lib/data/promotions"
import TrustBadges from "@modules/home/components/trust-badges"

export default async function Footer() {
  const trustBadges = await listTrustBadges()
  return (
    <footer className="mt-section-gap w-full border-t border-surface-variant bg-surface-container-lowest px-margin-mobile py-8">
      <div className="mx-auto max-w-7xl"><TrustBadges ads={trustBadges} compact /></div>
      <div className="mx-auto mt-8 flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="font-headline-sm text-headline-sm text-primary">© {new Date().getFullYear()} Coast Tech. All rights reserved.</div>
        <div className="flex flex-wrap justify-center gap-4 font-label-sm text-label-sm text-on-surface-variant">
        <LocalizedClientLink href="/order-lookup" className="transition-all hover:text-primary">Track Order</LocalizedClientLink>
        <LocalizedClientLink href="/" className="transition-all hover:text-primary">Privacy Policy</LocalizedClientLink>
        <LocalizedClientLink href="/" className="transition-all hover:text-primary">Terms of Service</LocalizedClientLink>
        <LocalizedClientLink href="/" className="transition-all hover:text-primary">Shipping Info</LocalizedClientLink>
        <LocalizedClientLink href="/account" className="transition-all hover:text-primary">Contact Support</LocalizedClientLink>
        </div>
      </div>
    </footer>
  )
}
