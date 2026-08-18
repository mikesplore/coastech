"use server"

import { sdk } from "@lib/config"

export type PromotionalAd = {
  id: string
  title: string
  eyebrow?: string | null
  description?: string | null
  image_url?: string | null
  href: string
  placement: string
  cta_label?: string | null
  discount_label?: string | null
  countdown_ends_at?: string | null
}

export async function listPromotionalAds(): Promise<PromotionalAd[]> {
  return sdk.client
    .fetch<{ ads: PromotionalAd[] }>("/store/promotional-ads", {
      method: "GET",
      next: { revalidate: 60 },
    })
    .then(({ ads }) => ads)
    .catch(() => [])
}

export async function listTrustBadges(): Promise<PromotionalAd[]> {
  return (await listPromotionalAds()).filter((ad) => ad.placement === "homepage_trust")
}
