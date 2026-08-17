import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: "Coast Tech | Build with confidence",
  description: "PC components, peripherals, and compatibility-first builds.",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body className="bg-pcb text-ink antialiased">
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
