import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function Footer() {
  return (
    <footer className="mt-section-gap flex w-full flex-col items-center justify-between gap-4 border-t border-surface-variant bg-surface-container-lowest px-margin-mobile py-8 md:flex-row">
      <div className="font-headline-sm text-headline-sm text-primary">© 2024 Coast Tech. All rights reserved.</div>
      <div className="flex flex-wrap justify-center gap-4 font-label-sm text-label-sm text-on-surface-variant">
        <LocalizedClientLink href="/" className="transition-all hover:text-primary">Privacy Policy</LocalizedClientLink>
        <LocalizedClientLink href="/" className="transition-all hover:text-primary">Terms of Service</LocalizedClientLink>
        <LocalizedClientLink href="/" className="transition-all hover:text-primary">Shipping Info</LocalizedClientLink>
        <LocalizedClientLink href="/account" className="transition-all hover:text-primary">Contact Support</LocalizedClientLink>
      </div>
    </footer>
  )
}