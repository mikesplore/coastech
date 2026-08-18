import {
  defineMiddlewares,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

function cloudinaryFileKey(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== "res.cloudinary.com") return undefined
    const pathParts = parsed.pathname.split("/").filter(Boolean)
    const uploadIndex = pathParts.indexOf("upload")
    if (uploadIndex < 0) return undefined
    const folderParts = (process.env.CLOUDINARY_FOLDER ?? "coastech/products").split("/").filter(Boolean)
    const publicIdStart = pathParts.findIndex((_, index) => {
      return index > uploadIndex && folderParts.every((part, offset) => pathParts[index + offset] === part)
    })
    if (publicIdStart < 0) return undefined
    return pathParts.slice(publicIdStart).join("/").replace(/\.[a-z0-9]+$/i, "")
  } catch {
    return undefined
  }
}

async function removeProductImages(req: MedusaRequest) {
  const productId = req.params.id
  if (!productId) return
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "thumbnail", "images.url"],
    filters: { id: productId },
  })
  const product = data[0] as { thumbnail?: string | null; images?: Array<{ url?: string | null }> } | undefined
  if (!product) return
  const urls = [product.thumbnail, ...(product.images ?? []).map((image) => image.url)]
  const fileKeys = [...new Set(urls.filter((url): url is string => Boolean(url)).map(cloudinaryFileKey).filter(Boolean))] as string[]
  if (!fileKeys.length) return
  const fileModuleService = req.scope.resolve(Modules.FILE)
  await fileModuleService.deleteFiles(fileKeys)
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/products/:id",
      method: ["DELETE"],
      middlewares: [async (req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) => {
        await removeProductImages(req)
        next()
      }],
    },
  ],
})
