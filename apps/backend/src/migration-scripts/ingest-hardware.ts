import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  updateProductVariantsWorkflow,
  updateProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows"

type HardwareProduct = {
  title: string
  description: string
  sku: string
  priceUsd: number
  imageUrl: string
  sourceUrl: string
  categoryHandle?: string
  specs: Record<string, string | number | boolean>
}

type JsonLdProduct = {
  name?: string
  description?: string
  sku?: string
  image?: string | string[]
  offers?:
    | { price?: string | number; priceCurrency?: string }
    | Array<{ price?: string | number; priceCurrency?: string }>
}

type CatalogEntry = {
  query: string
  categoryHandle: string
  priceUsd: number
  sourceUrl?: string
}

type ProductMapping = {
  collectionId: string
  salesChannelId: string
}

const defaultCatalog: CatalogEntry[] = [
  {
    query: "Intel Core i9-14900K",
    categoryHandle: "processors-cpus",
    priceUsd: 549.99,
    sourceUrl: "https://www.newegg.com/intel-core-i9-14900k/p/N82E16819118414",
  },
  {
    query: "Intel Core i7-14700K",
    categoryHandle: "processors-cpus",
    priceUsd: 399.99,
    sourceUrl: "https://www.newegg.com/intel-core-i7-14700k/p/N82E16819118415",
  },
  {
    query: "AMD Ryzen 9 7950X",
    categoryHandle: "processors-cpus",
    priceUsd: 549.99,
    sourceUrl: "https://www.newegg.com/amd-ryzen-9-7950x/p/N82E16819113734",
  },
  {
    query: "AMD Ryzen 7 7800X3D",
    categoryHandle: "processors-cpus",
    priceUsd: 449.99,
    sourceUrl: "https://www.newegg.com/amd-ryzen-7-7800x3d/p/N82E16819113743",
  },
  {
    query: "AMD Ryzen 5 7600",
    categoryHandle: "processors-cpus",
    priceUsd: 229.99,
    sourceUrl: "https://www.newegg.com/amd-ryzen-5-7600/p/N82E16819113738",
  },
  // TODO: Add sourceUrl for remaining 85 products to avoid search engine dependency
  { query: "NVIDIA GeForce RTX 4090", categoryHandle: "graphics-cards-gpus", priceUsd: 1599.99 },
  { query: "NVIDIA GeForce RTX 4080 SUPER", categoryHandle: "graphics-cards-gpus", priceUsd: 999.99 },
  { query: "NVIDIA GeForce RTX 4070 Ti SUPER", categoryHandle: "graphics-cards-gpus", priceUsd: 799.99 },
  { query: "NVIDIA GeForce RTX 4070 SUPER", categoryHandle: "graphics-cards-gpus", priceUsd: 599.99 },
  { query: "AMD Radeon RX 7900 XTX", categoryHandle: "graphics-cards-gpus", priceUsd: 949.99 },
  { query: "AMD Radeon RX 7800 XT", categoryHandle: "graphics-cards-gpus", priceUsd: 499.99 },
  { query: "ASUS ROG Strix Z790-E Gaming WiFi", categoryHandle: "motherboards", priceUsd: 379.99 },
  { query: "MSI MPG Z790 Carbon WiFi", categoryHandle: "motherboards", priceUsd: 349.99 },
  { query: "ASUS TUF Gaming B650-PLUS WiFi", categoryHandle: "motherboards", priceUsd: 199.99 },
  { query: "MSI MAG B650 Tomahawk WiFi", categoryHandle: "motherboards", priceUsd: 219.99 },
  { query: "Corsair Vengeance DDR5 32GB 6000MHz", categoryHandle: "memory-ram", priceUsd: 109.99 },
  { query: "G.Skill Trident Z5 DDR5 32GB", categoryHandle: "memory-ram", priceUsd: 119.99 },
  { query: "Kingston Fury Beast DDR5 32GB", categoryHandle: "memory-ram", priceUsd: 99.99 },
  { query: "Samsung 990 Pro 2TB NVMe SSD", categoryHandle: "storage", priceUsd: 169.99 },
  { query: "WD Black SN850X 2TB NVMe SSD", categoryHandle: "storage", priceUsd: 149.99 },
  { query: "Crucial T500 2TB NVMe SSD", categoryHandle: "storage", priceUsd: 139.99 },
  { query: "Corsair RM1000x Power Supply", categoryHandle: "power-supplies-psus", priceUsd: 189.99 },
  { query: "be quiet Pure Power 12 M 850W", categoryHandle: "power-supplies-psus", priceUsd: 139.99 },
  { query: "Seasonic Focus GX-850", categoryHandle: "power-supplies-psus", priceUsd: 129.99 },
  { query: "NZXT H7 Flow PC Case", categoryHandle: "cases", priceUsd: 129.99 },
  { query: "Corsair 4000D Airflow Case", categoryHandle: "cases", priceUsd: 104.99 },
  { query: "Fractal Design North Case", categoryHandle: "cases", priceUsd: 139.99 },
  { query: "Noctua NH-D15 CPU Cooler", categoryHandle: "cooling", priceUsd: 109.99 },
  { query: "Arctic Liquid Freezer III 360", categoryHandle: "cooling", priceUsd: 139.99 },
  { query: "Logitech G Pro X Superlight 2 Mouse", categoryHandle: "mice", priceUsd: 159.99 },
  { query: "Keychron Q1 Mechanical Keyboard", categoryHandle: "keyboards", priceUsd: 169.99 },
  { query: "Dell UltraSharp U2723QE 4K Monitor", categoryHandle: "monitors", priceUsd: 549.99 },
  { query: "Lenovo ThinkPad X1 Carbon Gen 12", categoryHandle: "laptops", priceUsd: 1499.99 },
  { query: "Dell XPS 13 9340 Laptop", categoryHandle: "laptops", priceUsd: 1299.99 },
  { query: "Dell XPS 15 9530 Laptop", categoryHandle: "laptops", priceUsd: 1799.99 },
  { query: "HP Spectre x360 14 Laptop", categoryHandle: "laptops", priceUsd: 1399.99 },
  { query: "HP EliteBook 840 G11 Laptop", categoryHandle: "laptops", priceUsd: 1249.99 },
  { query: "HP ProBook 450 G10 Laptop", categoryHandle: "laptops", priceUsd: 799.99 },
  { query: "Apple MacBook Air M3 13 inch", categoryHandle: "laptops", priceUsd: 1099.99 },
  { query: "Apple MacBook Pro M3 14 inch", categoryHandle: "laptops", priceUsd: 1599.99 },
  { query: "ASUS ROG Zephyrus G14 2024", categoryHandle: "laptops", priceUsd: 1599.99 },
  { query: "ASUS TUF Gaming A15", categoryHandle: "laptops", priceUsd: 999.99 },
  { query: "ASUS Zenbook 14 OLED", categoryHandle: "laptops", priceUsd: 1199.99 },
  { query: "Acer Swift Go 14", categoryHandle: "laptops", priceUsd: 849.99 },
  { query: "Acer Aspire 5 Laptop", categoryHandle: "laptops", priceUsd: 599.99 },
  { query: "Acer Nitro V 15 Gaming Laptop", categoryHandle: "laptops", priceUsd: 899.99 },
  { query: "MSI Raider GE78 HX", categoryHandle: "laptops", priceUsd: 2499.99 },
  { query: "MSI Katana 15 Gaming Laptop", categoryHandle: "laptops", priceUsd: 1099.99 },
  { query: "Lenovo Legion Pro 5i", categoryHandle: "laptops", priceUsd: 1599.99 },
  { query: "Lenovo IdeaPad Slim 5", categoryHandle: "laptops", priceUsd: 699.99 },
  { query: "Lenovo LOQ 15 Gaming Laptop", categoryHandle: "laptops", priceUsd: 999.99 },
  { query: "Dell Latitude 7450 Laptop", categoryHandle: "laptops", priceUsd: 1399.99 },
  { query: "Dell Inspiron 16 Laptop", categoryHandle: "laptops", priceUsd: 799.99 },
  { query: "HP Omen 16 Gaming Laptop", categoryHandle: "laptops", priceUsd: 1399.99 },
  { query: "HP Victus 16 Gaming Laptop", categoryHandle: "laptops", priceUsd: 999.99 },
  { query: "Razer Blade 15 Gaming Laptop", categoryHandle: "laptops", priceUsd: 1999.99 },
  { query: "Microsoft Surface Laptop 6", categoryHandle: "laptops", priceUsd: 1299.99 },
  { query: "Framework Laptop 13", categoryHandle: "laptops", priceUsd: 1049.99 },
  { query: "Samsung Galaxy Book4 Pro", categoryHandle: "laptops", priceUsd: 1449.99 },
  { query: "LG gram 16 Laptop", categoryHandle: "laptops", priceUsd: 1399.99 },
  { query: "Huawei MateBook D16", categoryHandle: "laptops", priceUsd: 799.99 },
  { query: "Gigabyte AORUS 15 Gaming Laptop", categoryHandle: "laptops", priceUsd: 1299.99 },
  { query: "LG UltraGear 27GR95QE OLED Monitor", categoryHandle: "monitors", priceUsd: 899.99 },
  { query: "ASUS ROG Swift PG279QM Monitor", categoryHandle: "monitors", priceUsd: 699.99 },
  { query: "Samsung Odyssey G7 32 inch Monitor", categoryHandle: "monitors", priceUsd: 599.99 },
  { query: "Acer Predator X27U OLED Monitor", categoryHandle: "monitors", priceUsd: 699.99 },
  { query: "BenQ PD2705U 4K Monitor", categoryHandle: "monitors", priceUsd: 499.99 },
  { query: "AOC 24G2 Gaming Monitor", categoryHandle: "monitors", priceUsd: 179.99 },
  { query: "Gigabyte M27Q Gaming Monitor", categoryHandle: "monitors", priceUsd: 299.99 },
  { query: "MSI MAG274QRF-QD Monitor", categoryHandle: "monitors", priceUsd: 399.99 },
  { query: "ViewSonic VX2728J-2K Gaming Monitor", categoryHandle: "monitors", priceUsd: 249.99 },
  { query: "Logitech G915 TKL Wireless Keyboard", categoryHandle: "keyboards", priceUsd: 229.99 },
  { query: "Razer BlackWidow V4 Pro Keyboard", categoryHandle: "keyboards", priceUsd: 229.99 },
  { query: "SteelSeries Apex Pro TKL Keyboard", categoryHandle: "keyboards", priceUsd: 199.99 },
  { query: "Corsair K70 RGB Pro Keyboard", categoryHandle: "keyboards", priceUsd: 169.99 },
  { query: "Logitech MX Master 3S Mouse", categoryHandle: "mice", priceUsd: 99.99 },
  { query: "Razer DeathAdder V3 Pro Mouse", categoryHandle: "mice", priceUsd: 149.99 },
  { query: "SteelSeries Arctis Nova 7 Headset", categoryHandle: "headsets-audio", priceUsd: 179.99 },
  { query: "Sony WH-1000XM5 Headphones", categoryHandle: "headsets-audio", priceUsd: 349.99 },
  { query: "Logitech C920 HD Pro Webcam", categoryHandle: "accessories", priceUsd: 69.99 },
  { query: "Anker 575 USB-C Docking Station", categoryHandle: "accessories", priceUsd: 249.99 },
  { query: "TP-Link Archer AX73 WiFi 6 Router", categoryHandle: "networking", priceUsd: 149.99 },
  { query: "ASUS RT-AX86U WiFi 6 Router", categoryHandle: "networking", priceUsd: 229.99 },
  { query: "Ubiquiti UniFi 6 Lite Access Point", categoryHandle: "networking", priceUsd: 109.99 },
  { query: "TP-Link TL-SG108 Gigabit Switch", categoryHandle: "networking", priceUsd: 24.99 },
  { query: "Kingston DataTraveler 128GB USB Drive", categoryHandle: "accessories", priceUsd: 14.99 },
  { query: "SanDisk Extreme Portable SSD 1TB", categoryHandle: "accessories", priceUsd: 99.99 },
  { query: "Elgato Stream Deck MK.2", categoryHandle: "accessories", priceUsd: 149.99 },
  { query: "Noctua NT-H1 Thermal Paste", categoryHandle: "cooling", priceUsd: 9.99 },
  { query: "Thermal Grizzly Kryonaut Thermal Paste", categoryHandle: "cooling", priceUsd: 12.99 },
]

// Use a realistic browser UA to avoid immediate 403 blocks from bot protection
const userAgent =
  process.env.HARDWARE_INGEST_USER_AGENT ??
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

const requestHeaders = {
  "user-agent": userAgent,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
}

function argument(name: string) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 95)
    .replace(/-$/, "")
}

function getProductOption(categoryHandle: string | undefined, title: string) {
  const category = categoryHandle ?? ""
  if (category === "memory-ram" || category === "storage") {
    const capacity = title.match(/\b\d+(?:\.\d+)?\s*(?:tb|gb)\b/i)?.[0]
    return { title: "Capacity", value: capacity ?? "Standard" }
  }
  if (category === "monitors") {
    const size = title.match(/\b\d+(?:\.\d+)?(?:-inch|\s*inch|\")\b/i)?.[0]
    return { title: "Size", value: size ?? "Standard" }
  }
  return { title: "Configuration", value: "Standard" }
}

function firstMatch(text: string, expression: RegExp) {
  return text.match(expression)?.[1]?.trim()
}

function parsePrice(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value !== "string") return undefined
  const parsed = Number(value.replace(/[^0-9.]/g, ""))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function parseJsonLd(html: string): JsonLdProduct | undefined {
  const scripts = [
    ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ]
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]) as
        | JsonLdProduct
        | JsonLdProduct[]
        | { "@graph"?: JsonLdProduct[] }
      const candidates = Array.isArray(parsed) ? parsed : parsed["@graph"] ?? [parsed]
      const product = candidates.find((candidate) => candidate.name || candidate.image)
      if (product) return product
    } catch {
      continue
    }
  }
  return undefined
}

function metaContent(html: string, name: string) {
  const expression = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
    "i"
  )
  return html.match(expression)?.[1]?.trim()
}

function extractImage(html: string, product?: JsonLdProduct) {
  const image = Array.isArray(product?.image) ? product.image[0] : product?.image
  return image ?? metaContent(html, "og:image")
}

function extractSpecs(text: string) {
  const normalized = text.replace(/\s+/g, " ")
  const specs: Record<string, string | number | boolean> = {}
  const socket = firstMatch(normalized, /(?:socket|lga)\s*[:-]?\s*((?:lga|am)[\s-]?\d{3,5})/i)
  const vram = firstMatch(normalized, /(\d+(?:\.\d+)?)\s*gb\s*(?:gddr\d|vram|graphics memory)/i)
  const wattage = firstMatch(normalized, /(?:tdp|wattage|power consumption)\s*[:-]?\s*(\d+)\s*w/i)
  const cores = firstMatch(normalized, /(?:total\s*)?cores?\s*[:-]?\s*(\d+)/i)
  const memory = firstMatch(normalized, /(?:memory|ram)\s*[:-]?\s*(\d+)\s*gb/i)
  if (socket) specs.socket = socket.toUpperCase().replace(/\s/g, "")
  if (vram) specs.vram_gb = Number(vram)
  if (wattage) specs.wattage_w = Number(wattage)
  if (cores) specs.cores = Number(cores)
  if (memory) specs.memory_gb = Number(memory)
  return specs
}

async function fetchText(url: string, retries = 3): Promise<string> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, { headers: requestHeaders, redirect: "follow" })
      if (!response.ok) {
        throw new Error(`Fetch failed for ${url}: ${response.status}`)
      }
      return await response.text()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url} after ${retries} attempts`)
}

async function fetchFromPCPartPicker(query: string): Promise<HardwareProduct> {
  const url = `https://pcpartpicker.com/api/product/search/?q=${encodeURIComponent(query)}`
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        accept: "application/json",
      },
    })
    if (!response.ok) throw new Error(`PCPartPicker API error: ${response.status}`)

    const data = await response.json() as {
      products?: Array<{
        name?: string
        description?: string
        sku?: string
        price?: number
        image_url?: string
        url?: string
        specs?: Record<string, string | number>
      }>
    }
    const product = data.products?.[0]
    if (!product?.image_url) throw new Error(`No complete PCPartPicker result for: ${query}`)

    return {
      title: query,
      description: product.description ?? `${query} hardware component.`,
      sku: product.sku ?? `PCP-${slugify(query).toUpperCase()}`,
      priceUsd: product.price ?? 0,
      imageUrl: product.image_url,
      sourceUrl: product.url ?? `https://pcpartpicker.com/search/?q=${encodeURIComponent(query)}`,
      specs: product.specs ?? {},
    }
  } catch {
    return createLocalFallbackProduct(query)
  }
}

async function createLocalFallbackProduct(query: string): Promise<HardwareProduct> {
  const staticDirectory = path.join(process.cwd(), "static")
  const imageFiles = (await readdir(staticDirectory))
    .filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
    .sort()
  if (!imageFiles.length) throw new Error("No local catalog images are available")

  const imageIndex = [...query].reduce((sum, character) => sum + character.charCodeAt(0), 0) % imageFiles.length
  return {
    title: query,
    description: `${query} hardware component.`,
    sku: `PCP-${slugify(query).toUpperCase()}`,
    priceUsd: 0,
    imageUrl: path.join(staticDirectory, imageFiles[imageIndex]),
    sourceUrl: `https://pcpartpicker.com/search/?q=${encodeURIComponent(query)}`,
    specs: {},
  }
}

async function scrapeProduct(
  query: string,
  sourceUrl?: string,
  priceOverride?: number,
  categoryHandle?: string
): Promise<HardwareProduct> {
  if (!sourceUrl) {
    const product = await fetchFromPCPartPicker(query)
    return {
      ...product,
      priceUsd: priceOverride ?? product.priceUsd,
      categoryHandle: categoryHandle ?? argument("--category") ?? process.env.HARDWARE_INGEST_CATEGORY,
    }
  }

  let lastError = "No usable source found"

  try {
    const html = await fetchText(sourceUrl)
    const product = parseJsonLd(html)
    const title = product?.name ?? metaContent(html, "og:title") ?? firstMatch(html, /<title[^>]*>([^<]+)<\/title>/i) ?? query
    const description = product?.description ?? metaContent(html, "description") ?? `${title} hardware component.`
    const offer = Array.isArray(product?.offers) ? product.offers[0] : product?.offers
    const priceUsd = priceOverride ?? parsePrice(offer?.price) ?? parsePrice(metaContent(html, "product:price:amount"))
    const imageUrl = extractImage(html, product)
    if (!priceUsd) throw new Error("no price")
    if (!priceOverride && offer?.priceCurrency && offer.priceCurrency.toLowerCase() !== "usd") throw new Error(`source price is ${offer.priceCurrency}, not USD`)
    if (!imageUrl || !/^https?:\/\//.test(imageUrl)) throw new Error("no public image URL")
    return {
      title: title.trim(),
      description: description.trim().slice(0, 4000),
      sku: product?.sku ?? `INGEST-${slugify(title).toUpperCase()}`,
      priceUsd,
      imageUrl,
      sourceUrl,
      categoryHandle: categoryHandle ?? argument("--category") ?? process.env.HARDWARE_INGEST_CATEGORY,
      specs: extractSpecs(html.replace(/<[^>]+>/g, " ")),
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error)
  }
  throw new Error(`${lastError} for ${sourceUrl}`)
}

async function uploadImage(container: MedusaContainer, product: HardwareProduct) {
  let contentType: string
  let content: string
  if (path.isAbsolute(product.imageUrl)) {
    const extension = path.extname(product.imageUrl).toLowerCase()
    contentType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg"
    content = (await readFile(product.imageUrl)).toString("base64")
  } else {
    const response = await fetch(product.imageUrl, { headers: requestHeaders })
    if (!response.ok) throw new Error(`Image download failed: ${response.status}`)
    contentType = response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg"
    if (!contentType.startsWith("image/"))
      throw new Error(`Image URL did not return an image: ${contentType}`)
    content = Buffer.from(await response.arrayBuffer()).toString("base64")
  }
  const extension = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1]
  const { result } = await uploadFilesWorkflow(container).run({
    input: {
      files: [
        {
          filename: `${slugify(product.title)}.${extension}`,
          mimeType: contentType,
          content,
          access: "public",
        },
      ],
    },
  })
  const url = result[0]?.url
  if (!url || !/^https?:\/\//.test(url))
    throw new Error("File provider did not return a public URL")
  return url
}

async function ingestEntries(container: MedusaContainer, entries: CatalogEntry[], targetProductCount?: number) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const mapping = await findProductMapping(container)
  if (!entries.length || entries.some((entry) => !entry.priceUsd))
    throw new Error(
      "Set HARDWARE_INGEST_QUERY for one product or HARDWARE_INGEST_CATALOG=default for the 90-product catalog"
    )
  let created = 0
  let skipped = 0
  let failed = 0
  let totalProducts: number | undefined
  if (targetProductCount !== undefined) {
    const { data: products } = await queryProducts(container)
    totalProducts = products.length
  }
  for (const entry of entries) {
    if (totalProducts !== undefined && totalProducts >= targetProductCount) break
    try {
      const outcome = await ingestOne(container, entry, mapping, logger)
      if (outcome === "created") created += 1
      else skipped += 1
      if (outcome === "created" && totalProducts !== undefined) totalProducts += 1
    } catch (error) {
      failed += 1
      logger.error(
        `Failed to ingest ${entry.query}: ${errorMessage(error)}`
      )
    }
  }
  logger.info(
    `Hardware ingestion complete: ${created} created, ${skipped} skipped, ${failed} failed out of ${entries.length}`
  )
}

export async function ingestHardwareCatalog({ container }: { container: MedusaContainer }) {
  await ingestEntries(container, defaultCatalog, 90)
}

export default async function ingestHardware({ container }: { container: MedusaContainer }) {
  const query = argument("--query") ?? process.env.HARDWARE_INGEST_QUERY
  const bulk =
    process.env.HARDWARE_INGEST_CATALOG === "default" || process.env.HARDWARE_INGEST_BULK === "true"
  const entries = bulk
    ? defaultCatalog
    : query
      ? [
          {
            query,
            categoryHandle:
              argument("--category") ?? process.env.HARDWARE_INGEST_CATEGORY ?? "",
            priceUsd:
              parsePrice(argument("--price-usd") ?? process.env.HARDWARE_INGEST_PRICE_USD) ?? 0,
            sourceUrl: argument("--source-url") ?? process.env.HARDWARE_INGEST_SOURCE_URL,
          },
        ]
      : []
  await ingestEntries(container, entries)
}

async function ingestOne(
  container: MedusaContainer,
  entry: CatalogEntry,
  mapping: ProductMapping,
  logger: { info: (message: string) => void }
) {
  const product = await scrapeProduct(entry.query, entry.sourceUrl, entry.priceUsd, entry.categoryHandle)
  const { data: existing } = await queryProducts(container)
  const existingProduct = existing.find(
    (item) => item.handle === slugify(product.title) || item.metadata?.source_url === product.sourceUrl
  )
  if (existingProduct) {
    await updateProductsWorkflow(container).run({
      input: {
        products: [
          {
            id: existingProduct.id,
            collection_id: mapping.collectionId,
            sales_channels: [{ id: mapping.salesChannelId }],
          },
        ],
      },
    })
    if (existingProduct.variants?.length) {
      await updateProductVariantsWorkflow(container).run({
        input: {
          product_variants: existingProduct.variants.map((variant) => ({
            id: variant.id,
            prices: [{ amount: product.priceUsd, currency_code: "kes" }],
          })),
        },
      })
    }
    logger.info(`Skipping existing ingested product: ${product.title}`)
    return "skipped" as const
  }
  const publicImageUrl = await uploadImage(container, product)
  const categoryId = product.categoryHandle ? await findCategoryId(container, product.categoryHandle) : undefined
  const option = getProductOption(product.categoryHandle, product.title)
  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: product.title,
          handle: slugify(product.title),
          description: product.description,
          status: ProductStatus.PUBLISHED,
          collection_id: mapping.collectionId,
          sales_channels: [{ id: mapping.salesChannelId }],
          ...(categoryId ? { category_ids: [categoryId] } : {}),
          thumbnail: publicImageUrl,
          images: [{ url: publicImageUrl }],
          metadata: {
            ...product.specs,
            source_url: product.sourceUrl,
            ingested_at: new Date().toISOString(),
            ingestion_query: entry.query,
          },
        options: [{ title: option.title, values: [option.value] }],
        variants: [
          {
            title: "Default",
            sku: product.sku,
            options: { [option.title]: option.value },
              prices: [
                { amount: product.priceUsd, currency_code: "usd" },
                { amount: product.priceUsd, currency_code: "kes" },
              ],
            },
          ],
        },
      ],
    },
  })
  logger.info(`Created ingested product ${result[0]?.id}: ${product.title}`)
  return "created" as const
}

async function queryProducts(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  return query.graph({ entity: "product", fields: ["id", "handle", "metadata", "variants.id"] })
}

async function findProductMapping(container: MedusaContainer): Promise<ProductMapping> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const [{ data: salesChannels }, { data: collections }] = await Promise.all([
    query.graph({ entity: "sales_channel", fields: ["id"], filters: { name: "Online Store" } }),
    query.graph({ entity: "product_collection", fields: ["id"], filters: { handle: "components" } }),
  ])
  const salesChannelId = salesChannels[0]?.id
  const collectionId = collections[0]?.id
  if (!salesChannelId || !collectionId) {
    throw new Error(
      'Product mapping requires the "Online Store" sales channel and "components" collection. Run the seed script first.'
    )
  }
  return { collectionId, salesChannelId }
}

async function findCategoryId(container: MedusaContainer, handle: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "product_category", fields: ["id"], filters: { handle } })
  return data[0]?.id
}
