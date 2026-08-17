import { model } from "@medusajs/framework/utils"

/**
 * SpecTemplate defines which specification fields apply to a product category.
 * For example, a "CPU" template would have fields like socket, cores, threads, etc.
 */
const SpecTemplate = model.define("spec_template", {
  id: model.id().primaryKey(),
  name: model.text(), // e.g., "CPU Template", "Motherboard Template"
  category_id: model.text().nullable(), // Product category ID this template applies to
  created_at: model.dateTime().defaultNow(),
  updated_at: model.dateTime().defaultNow(),
})

export default SpecTemplate
