import { MedusaService } from "@medusajs/framework/utils"
import CompatibilityRule from "./models/compatibility-rule"

interface CompatibilityResult {
  passed: boolean
  message: string
  ruleName?: string
  sourceProductId?: string
  targetProductId?: string
}

interface BuildCompatibilityResult {
  isCompatible: boolean
  results: CompatibilityResult[]
  warnings: string[]
}

class CompatibilityModuleService extends MedusaService({
  CompatibilityRule,
}) {
  /**
   * Check compatibility between multiple products in a build
   */
  async checkCompatibility(productIds: string[]): Promise<BuildCompatibilityResult> {
    const results: CompatibilityResult[] = []
    const warnings: string[] = []
    
    if (productIds.length < 2) {
      return {
        isCompatible: true,
        results: [],
        warnings: ["Add at least 2 products to check compatibility"],
      }
    }
    
    // Get all active rules
    const rules = await this.listCompatibilityRules({ is_active: true })
    
    // For each pair of products, check against applicable rules
    for (let i = 0; i < productIds.length; i++) {
      for (let j = i + 1; j < productIds.length; j++) {
        const productIdA = productIds[i]
        const productIdB = productIds[j]
        
        // Get specs for both products
        const specsA = await this.getProductSpecs(productIdA)
        const specsB = await this.getProductSpecs(productIdB)
        
        // Get categories for both products
        const categoryA = await this.getProductCategory(productIdA)
        const categoryB = await this.getProductCategory(productIdB)
        
        // Check each rule
        for (const rule of rules) {
          const appliesToPair = 
            (rule.source_category_id === categoryA?.id && rule.target_category_id === categoryB?.id) ||
            (rule.source_category_id === categoryB?.id && rule.target_category_id === categoryA?.id)
          
          if (!appliesToPair) continue
          
          // Normalize so source is always the first category
          const isReversed = rule.source_category_id === categoryB?.id
          const sourceSpecs = isReversed ? specsB : specsA
          const targetSpecs = isReversed ? specsA : specsB
          
          const sourceValue = sourceSpecs.find(s => s.field?.name === rule.source_field_name)?.value_text
          const targetValue = targetSpecs.find(s => s.field?.name === rule.target_field_name)?.value_text
          
          const result = this.evaluateRule(rule, sourceValue, targetValue, productIdA, productIdB)
          results.push(result)
        }
      }
    }
    
    const isCompatible = results.every(r => r.passed)
    
    return {
      isCompatible,
      results,
      warnings,
    }
  }
  
  /**
   * Evaluate a single compatibility rule
   */
  private evaluateRule(
    rule: any,
    sourceValue: any,
    targetValue: any,
    sourceProductId: string,
    targetProductId: string
  ): CompatibilityResult {
    let passed = false
    let message = ""
    
    switch (rule.operator) {
      case "equals":
        passed = sourceValue === targetValue
        message = passed 
          ? `✓ ${sourceProductId} and ${targetProductId} are compatible (${rule.name})`
          : `✗ ${rule.error_message}: ${sourceValue} does not match ${targetValue}`
        break
        
      case "in":
        try {
          const allowedValues = JSON.parse(targetValue || "[]")
          passed = Array.isArray(allowedValues) && allowedValues.includes(sourceValue)
          message = passed
            ? `✓ ${sourceProductId} is compatible with ${targetProductId}`
            : `✗ ${rule.error_message}: ${sourceValue} is not in the allowed list`
        } catch {
          passed = false
          message = `✗ Invalid configuration for rule: ${rule.name}`
        }
        break
        
      case "contains":
        passed = targetValue?.includes(sourceValue)
        message = passed
          ? `✓ ${sourceProductId} fits ${targetProductId}`
          : `✗ ${rule.error_message}`
        break
        
      case "sum_less_than":
        // For PSU wattage calculations
        const sum = (parseFloat(sourceValue) || 0) + (parseFloat(targetValue) || 0)
        // This would need a threshold value stored in the rule
        passed = true // Simplified for now
        message = `⚠ Power calculation needs threshold configuration`
        break
        
      default:
        passed = true
        message = `Unknown operator: ${rule.operator}`
    }
    
    return {
      passed,
      message,
      ruleName: rule.name,
      sourceProductId,
      targetProductId,
    }
  }
  
  /**
   * Helper to get specs for a product (would use Specifications module in production)
   */
  private async getProductSpecs(productId: string) {
    // This would call the Specifications module service
    // For now, return empty - will be implemented via module link
    return []
  }
  
  /**
   * Helper to get product category (would use Product module in production)
   */
  private async getProductCategory(productId: string) {
    // This would call the Product module service
    // For now, return empty - will be implemented via module link
    return null
  }
}

export default CompatibilityModuleService
