import { getLocaleHeader } from "@lib/util/get-locale-header"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

const disableStorefrontCache = process.env.STOREFRONT_DISABLE_CACHE === "true"
const configuredCacheTtl = Number(process.env.STOREFRONT_CACHE_TTL_SECONDS)
const storefrontCacheTtl = Number.isFinite(configuredCacheTtl) && configuredCacheTtl > 0
  ? configuredCacheTtl
  : undefined

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = init?.headers ?? {}
  let localeHeader: Record<string, string | null> | undefined
  try {
    localeHeader = await getLocaleHeader()
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
  } catch {}

  const newHeaders = {
    ...localeHeader,
    ...headers,
  }
  init = {
    ...init,
    headers: newHeaders,
  }

  if (disableStorefrontCache) {
    init = {
      ...init,
      cache: "no-store",
      next: undefined,
    } as FetchArgs
  } else if (storefrontCacheTtl && init?.cache !== "no-store") {
    init = {
      ...init,
      next: {
        ...((init as FetchArgs & { next?: Record<string, unknown> }).next ?? {}),
        revalidate: storefrontCacheTtl,
      },
    } as FetchArgs
  }

  return originalFetch(input, init)
}
