import { model } from "@medusajs/framework/utils"

/**
 * ProductSpecValue stores the actual specification values for a product.
 * Links a product to a spec template field with a specific value.
 */
const ProductSpecValue = model.define("product_spec_value", {
  id: model.id().primaryKey(),
  product_id: model.text(), // References product.id from Product module
  field_id: model.text(), // References spec_template_field.id
  value_text: model.text().nullable(), // For string values
  value_number: model.number().nullable(), // For numeric values
  value_boolean: model.boolean().nullable(), // For boolean values
  // enum values are stored as text in value_text
  created_at: model.dateTime().defaultNow(),
  updated_at: model.dateTime().defaultNow(),
})

export default ProductSpecValue
