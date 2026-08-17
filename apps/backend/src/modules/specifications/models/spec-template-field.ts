import { model } from "@medusajs/framework/utils"

/**
 * SpecTemplateField defines individual fields within a specification template.
 * For example, a CPU template might have fields: socket, cores, threads, base_clock_ghz, etc.
 */
const SpecTemplateField = model.define("spec_template_field", {
  id: model.id().primaryKey(),
  template_id: model.text(), // References spec_template.id
  name: model.text(), // e.g., "socket", "cores", "base_clock_ghz"
  label: model.text(), // Human-readable label, e.g., "CPU Socket"
  data_type: model.text(), // string, number, enum, boolean
  unit: model.text().nullable(), // e.g., "GHz", "W", "mm" (for display purposes)
  enum_values: model.text().nullable(), // JSON array of allowed values for enum type
  is_filterable: model.boolean().default(false), // Whether this field can be used for filtering
  is_required: model.boolean().default(false), // Whether this field must be filled
  sort_order: model.number().default(0), // Order to display fields
})

export default SpecTemplateField
