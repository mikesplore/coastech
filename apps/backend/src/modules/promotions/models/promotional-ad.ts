import { model } from "@medusajs/framework/utils"

const PromotionalAd = model.define("promotional_ad", {
  id: model.id().primaryKey(),
  title: model.text(),
  eyebrow: model.text().nullable(),
  description: model.text().nullable(),
  image_url: model.text().nullable(),
  href: model.text(),
  placement: model.text().default("homepage_carousel"),
  cta_label: model.text().nullable(),
  discount_label: model.text().nullable(),
  countdown_ends_at: model.dateTime().nullable(),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
  priority: model.number().default(0),
  is_active: model.boolean().default(true),
  metadata: model.json().nullable(),
})

export default PromotionalAd
