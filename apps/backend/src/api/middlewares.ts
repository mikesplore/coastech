import {
  defineMiddlewares,
  authenticate,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

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

async function validatePaystackPaymentSession(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const body = req.body as { provider_id?: string } | undefined
  if (body?.provider_id !== "pp_paystack_paystack") {
    next()
    return
  }

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const [relation] = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "cart_payment_collection",
      variables: {
        filters: { payment_collection_id: req.params.id },
      },
      fields: [
        "cart.id",
        "cart.items.requires_shipping",
        "cart.items.variant_id",
        "cart.shipping_methods.shipping_option_id",
      ],
    })
  )
  const cart = relation?.cart as Record<string, any> | undefined

  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The cart could not be found. Return to checkout and try again."
    )
  }

  const shippingItems = (cart.items ?? []).filter(
    (item: Record<string, any>) => item.requires_shipping
  )
  const shippingMethods = cart.shipping_methods ?? []

  if (shippingItems.length > 0 && shippingMethods.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No shipping method is selected. Select a shipping method before paying."
    )
  }

  const remoteShippingQuery = remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "shipping_option",
      variables: {
        filters: {
          id: shippingMethods
            .map((method: Record<string, any>) => method.shipping_option_id)
            .filter(Boolean),
        },
      },
      fields: ["id", "shipping_profile_id"],
    })
  )
  const remoteVariantQuery = remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "product_variant",
      variables: {
        filters: {
          id: shippingItems
            .map((item: Record<string, any>) => item.variant_id)
            .filter(Boolean),
        },
      },
      fields: ["id", "product.shipping_profile.id"],
    })
  )
  const [shippingOptions, variants] = await Promise.all([
    remoteShippingQuery,
    remoteVariantQuery,
  ])
  const optionProfiles = new Set(
    shippingOptions.map((option: Record<string, any>) => option.shipping_profile_id).filter(Boolean)
  )
  const profileByVariant = new Map(
    variants.map((variant: Record<string, any>) => [
      variant.id,
      variant.product?.shipping_profile?.id,
    ])
  )
  const missingProfiles = shippingItems
    .map((item: Record<string, any>) => profileByVariant.get(item.variant_id))
    .filter((profileId: string | undefined) => !profileId || !optionProfiles.has(profileId))

  if (missingProfiles.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The cart items require shipping profiles that are not satisfied by the current shipping methods. Return to delivery and select a valid shipping method."
    )
  }

  next()
}

async function validateShippingSelection(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const payload = (req.validatedBody ?? req.body) as
    | Record<string, any>
    | Array<Record<string, any>>
  const requestedOptions = Array.isArray(payload) ? payload : [payload]
  const optionIds = requestedOptions.map((option) => option?.option_id).filter(Boolean)
  if (!optionIds.length) {
    next()
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const [{ data: carts }, { data: options }] = await Promise.all([
    query.graph({
      entity: "cart",
      fields: [
        "id",
        "items.requires_shipping",
        "items.variant.product.shipping_profile.id",
        "shipping_methods.id",
        "shipping_methods.shipping_option_id",
      ],
      filters: { id: req.params.id },
    }),
    query.graph({
      entity: "shipping_option",
      fields: ["id", "shipping_profile_id"],
      filters: { id: optionIds },
    }),
  ])
  const cart = carts[0] as Record<string, any> | undefined
  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The cart could not be found. Return to checkout and try again."
    )
  }

  const requiredProfiles = (cart.items ?? [])
    .filter((item: Record<string, any>) => item.requires_shipping)
    .map((item: Record<string, any>) => item.variant?.product?.shipping_profile?.id)
  const selectedOptionIds = [
    ...(cart.shipping_methods ?? []).map(
      (method: Record<string, any>) => method.shipping_option_id
    ),
    ...optionIds,
  ]
  const selectedProfiles = new Set(
    options
      .filter((option: Record<string, any>) => selectedOptionIds.includes(option.id))
      .map((option: Record<string, any>) => option.shipping_profile_id)
      .filter(Boolean)
  )
  const missingProfiles = requiredProfiles.filter(
    (profileId: string | undefined) =>
      !profileId || !selectedProfiles.has(profileId)
  )

  if (missingProfiles.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The cart items require shipping profiles that are not satisfied by the selected shipping method. Select a shipping method that supports every cart item before continuing to payment."
    )
  }

  const cartModule = req.scope.resolve(Modules.CART) as {
    deleteShippingMethods: (ids: string[]) => Promise<unknown>
  }
  const existingMethodIds = (cart.shipping_methods ?? [])
    .map((method: Record<string, any>) => method.id)
    .filter(Boolean)
  if (existingMethodIds.length > 0) {
    await cartModule.deleteShippingMethods(existingMethodIds)
  }

  next()
}

async function logPaymentWebhook(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const payload = (req.body ?? {}) as Record<string, any>
  const data = (payload.data ?? {}) as Record<string, any>
  const provider = req.params.provider
  const reference = data.reference ?? data.trxref ?? null
  const event = payload.event ?? null
  const startedAt = Date.now()

  logger.info(
    `[payment-webhook] received provider=${provider} event=${String(event ?? "unknown")} reference=${String(reference ?? "unknown")}`
  )

  res.once("finish", () => {
    logger.info(
      `[payment-webhook] responded provider=${provider} event=${String(event ?? "unknown")} reference=${String(reference ?? "unknown")} status=${res.statusCode} duration_ms=${Date.now() - startedAt}`
    )
  })

  next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/hooks/payment/:provider",
      method: ["POST"],
      middlewares: [logPaymentWebhook],
    },
    {
      matcher: "/admin/compatibility-rules*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/low-stock",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/products/:id/specs",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/promotional-ads*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/transactions*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/custom",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/store/carts/:id/shipping-methods",
      method: ["POST"],
      middlewares: [validateShippingSelection],
    },
    {
      matcher: "/store/payment-collections/:id/payment-sessions",
      method: ["POST"],
      middlewares: [validatePaystackPaymentSession],
    },
    {
      matcher: "/admin/products/:id",
      method: ["DELETE"],
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
        async (req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) => {
          await removeProductImages(req)
          next()
        },
      ],
    },
  ],
})
