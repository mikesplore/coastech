import { model } from "@medusajs/framework/utils"

/**
 * SpecTemplate defines which specification fields apply to a product category.
 * For example, a "CPU" template would have fields like socket, cores, threads, etc.
 */
const SpecTemplate = model.define("spec_template", {
  id: model.id().primaryKey(),
  name: model.text(), // e.g., "CPU Template", "Motherboard Template"
  category_id: model.text().nullable(), // Product category ID this template applies to
  warranty_months: model.number().nullable(), // Optional default warranty for this category
})

export default SpecTemplate
