import { MedusaService } from "@medusajs/framework/utils"
import SpecTemplate from "./models/spec-template"
import SpecTemplateField from "./models/spec-template-field"
import ProductSpecValue from "./models/product-spec-value"

class SpecificationsModuleService extends MedusaService({
  SpecTemplate,
  SpecTemplateField,
  ProductSpecValue,
}) {
  /**
   * Get all specification fields for a product based on its category's template
   */
  async getSpecsForProduct(productId: string) {
    const specs = await this.listProductSpecValues({
      product_id: productId,
    })
    
    // Enrich with field metadata
    const enrichedSpecs = await Promise.all(
      specs.map(async (spec) => {
        const field = await this.retrieveSpecTemplateField(spec.field_id)
        return {
          ...spec,
          field,
        }
      })
    )
    
    return enrichedSpecs
  }

  /**
   * Validate specification values against a template
   */
  async validateSpecsAgainstTemplate(
    categoryId: string, 
    values: Record<string, any>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []
    
    // Find template for this category
    const templates = await this.listSpecTemplates({ category_id: categoryId })
    if (templates.length === 0) {
      return { valid: true, errors: [] } // No template means no validation required
    }
    
    const template = templates[0]
    const fields = await this.listSpecTemplateFields({ template_id: template.id })
    
    // Check required fields
    for (const field of fields) {
      if (field.is_required && !values[field.name]) {
        errors.push(`Missing required field: ${field.label}`)
      }
      
      // Validate enum values
      if (field.data_type === "enum" && field.enum_values && values[field.name]) {
        const allowedValues = JSON.parse(field.enum_values)
        if (!allowedValues.includes(values[field.name])) {
          errors.push(`Invalid value for ${field.label}: must be one of ${allowedValues.join(", ")}`)
        }
      }
    }
    
    return { valid: errors.length === 0, errors }
  }
}

export default SpecificationsModuleService
