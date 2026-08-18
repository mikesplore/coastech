import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow, uploadFilesWorkflow } from "@medusajs/medusa/core-flows"

type ProductRow = { id: string; title: string; handle: string; thumbnail?: string | null; images?: Array<{ url?: string | null }> }

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function imageDirectory() {
  return path.resolve(process.env.HARDWARE_LOCAL_IMAGE_DIRECTORY ?? path.join(process.cwd(), "static"))
}

export default async function syncLocalProductImages({ container }: { container: MedusaContainer }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({ entity: "product", fields: ["id", "title", "handle", "thumbnail", "images.url"] })
  const files = (await readdir(imageDirectory())).filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
  const dryRun = process.env.HARDWARE_LOCAL_IMAGES_DRY_RUN !== "false"
  let matched = 0
  let updated = 0

  for (const product of products as ProductRow[]) {
    if (product.thumbnail || product.images?.some((image) => image.url)) continue
    const handle = slugify(product.handle || product.title)
    const matches = files.filter((file) => slugify(path.basename(file, path.extname(file))).includes(handle))
    if (!matches.length) continue
    matched += 1
    console.log(`${dryRun ? "Would sync" : "Syncing"} ${product.handle}: ${matches[0]}`)
    if (dryRun) continue

    const filename = matches[0]
    const extension = path.extname(filename).toLowerCase()
    const mimeType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg"
    const { result } = await uploadFilesWorkflow(container).run({
      input: {
        files: [{ filename, mimeType, content: (await readFile(path.join(imageDirectory(), filename))).toString("base64"), access: "public" }],
      },
    })
    const url = result[0]?.url
    if (!url) throw new Error(`File provider returned no URL for ${filename}`)
    await updateProductsWorkflow(container).run({ input: { products: [{ id: product.id, thumbnail: url, images: [{ url }] }] } })
    updated += 1
  }
  console.log(`Local product image sync complete: ${matched} matched, ${updated} updated`)
}
