import { model } from "@medusajs/framework/utils"

/**
 * CompatibilityRule defines rules for checking compatibility between product specifications.
 * Rules compare fields between products (e.g., CPU socket must match motherboard socket).
 */
const CompatibilityRule = model.define("compatibility_rule", {
  id: model.id().primaryKey(),
  name: model.text(), // Human-readable name, e.g., "CPU-Motherboard Socket Match"
  description: model.text().nullable(), // Explanation of what this rule checks
  
  // Source side of the rule
  source_category_id: model.text(), // Product category ID (e.g., CPUs)
  source_field_name: model.text(), // Spec field name on source (e.g., "socket")
  
  // Target side of the rule
  target_category_id: model.text(), // Product category ID (e.g., Motherboards)
  target_field_name: model.text(), // Spec field name on target (e.g., "socket")
  
  // Comparison logic
  operator: model.text(), // equals, in, contains, sum_less_than, sum_greater_than
  error_message: model.text(), // Message shown when rule fails
  
  is_active: model.boolean().default(true),
  priority: model.number().default(0), // Higher priority rules are checked first
  created_at: model.dateTime().defaultNow(),
  updated_at: model.dateTime().defaultNow(),
})

export default CompatibilityRule
