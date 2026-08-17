import { MedusaService } from "@medusajs/framework/utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import CompatibilityRule from "./models/compatibility-rule"
import SpecificationsModuleService from "../specifications/service"
import { SPECIFICATIONS_MODULE } from "../specifications"

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

type ProductSummary = {
  id: string
  title?: string
  categories?: { id: string; handle?: string; name?: string }[]
}

type SpecValue = {
  field?: { name?: string }
  value_text?: string | null
  value_number?: number | null
  value_boolean?: boolean | null
}

function normalizeSpecValue(spec: SpecValue) {
  if (spec.value_number !== null && spec.value_number !== undefined) {
    return spec.value_number
  }

  if (spec.value_boolean !== null && spec.value_boolean !== undefined) {
    return spec.value_boolean
  }

  const text = spec.value_text ?? null
  if (text === null) {
    return null
  }

  const trimmed = text.trim()
  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return text
    }
  }

  return text
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
    
    const query = this.__container__[ContainerRegistrationKeys.QUERY]
    const specificationsService: SpecificationsModuleService =
      this.__container__[SPECIFICATIONS_MODULE]

    // Load products (title + category) once
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "categories.id", "categories.handle", "categories.name"],
      filters: { id: productIds },
    })

    const productById = new Map<string, ProductSummary>(products.map((p: ProductSummary) => [p.id, p]))
    const categoryIdByProductId = new Map<string, string | null>(
      productIds.map((id) => [id, productById.get(id)?.categories?.[0]?.id ?? null])
    )

    // Preload specs for each product once
    const specsByProductId = new Map<string, Map<string, unknown>>()
    for (const productId of productIds) {
      const enriched: SpecValue[] = await specificationsService.getSpecsForProduct(productId)
      const byName = new Map<string, unknown>()
      for (const spec of enriched) {
        const name = spec.field?.name
        if (!name) continue
        byName.set(name, normalizeSpecValue(spec))
      }
      specsByProductId.set(productId, byName)
    }

    // Get all active rules
    const rules = await this.listCompatibilityRules(
      { is_active: true },
      { order: { priority: "DESC" } as any }
    )

    const buildLevelRules = rules.filter((r: any) => r.operator === "sum_less_than")
    const pairRules = rules.filter((r: any) => r.operator !== "sum_less_than")

    // Pair rules
    for (let i = 0; i < productIds.length; i++) {
      for (let j = i + 1; j < productIds.length; j++) {
        const productIdA = productIds[i]
        const productIdB = productIds[j]

        const categoryA = categoryIdByProductId.get(productIdA)
        const categoryB = categoryIdByProductId.get(productIdB)
        if (!categoryA || !categoryB) continue

        const specsA = specsByProductId.get(productIdA) ?? new Map()
        const specsB = specsByProductId.get(productIdB) ?? new Map()

        for (const rule of pairRules) {
          const appliesToPair =
            (rule.source_category_id === categoryA && rule.target_category_id === categoryB) ||
            (rule.source_category_id === categoryB && rule.target_category_id === categoryA)

          if (!appliesToPair) continue

          const isReversed = rule.source_category_id === categoryB
          const sourceSpecs = isReversed ? specsB : specsA
          const targetSpecs = isReversed ? specsA : specsB

          const sourceValue = sourceSpecs.get(rule.source_field_name)
          const targetValue = targetSpecs.get(rule.target_field_name)

          const sourceTitle = productById.get(productIdA)?.title ?? productIdA
          const targetTitle = productById.get(productIdB)?.title ?? productIdB

          results.push(
            this.evaluateRule(rule, sourceValue, targetValue, sourceTitle, targetTitle, productIdA, productIdB)
          )
        }
      }
    }

    // Build-level rules (sum/count comparisons)
    for (const rule of buildLevelRules) {
      results.push(this.evaluateBuildRule(rule, productIds, categoryIdByProductId, specsByProductId, productById))
    }

    const isCompatible = results.every((r) => r.passed)
    
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
    sourceProductTitle: string,
    targetProductTitle: string,
    sourceProductId: string,
    targetProductId: string
  ): CompatibilityResult {
    let passed = false
    let message = ""
    
    switch (rule.operator) {
      case "equals":
        passed = sourceValue === targetValue
        message = passed 
          ? `✓ ${sourceProductTitle} and ${targetProductTitle} are compatible (${rule.name})`
          : `✗ ${rule.error_message}: ${sourceValue} does not match ${targetValue}`
        break
        
      case "in":
        if (Array.isArray(targetValue)) {
          passed = targetValue.includes(sourceValue)
        } else if (typeof targetValue === "string") {
          try {
            const parsed = JSON.parse(targetValue)
            passed = Array.isArray(parsed) && parsed.includes(sourceValue)
          } catch {
            passed = false
          }
        }
        message = passed
          ? `✓ ${sourceProductTitle} is compatible with ${targetProductTitle} (${rule.name})`
          : `✗ ${rule.error_message}`
        break
        
      case "contains":
        if (Array.isArray(targetValue)) {
          passed = targetValue.includes(sourceValue)
        } else if (typeof targetValue === "string") {
          passed = targetValue.includes(String(sourceValue))
        } else {
          passed = false
        }
        message = passed
          ? `✓ ${sourceProductTitle} fits ${targetProductTitle} (${rule.name})`
          : `✗ ${rule.error_message}`
        break
        
      case "less_than_equal":
        passed = (Number(sourceValue) || 0) <= (Number(targetValue) || 0)
        message = passed
          ? `✓ ${sourceProductTitle} fits ${targetProductTitle} (${rule.name})`
          : `✗ ${rule.error_message}`
        break

      case "greater_than_equal":
        passed = (Number(sourceValue) || 0) >= (Number(targetValue) || 0)
        message = passed
          ? `✓ ${sourceProductTitle} is compatible with ${targetProductTitle} (${rule.name})`
          : `✗ ${rule.error_message}`
        break
        
      default:
        passed = false
        message = `✗ Unknown operator: ${rule.operator}`
    }
    
    return {
      passed,
      message,
      ruleName: rule.name,
      sourceProductId,
      targetProductId,
    }
  }

  private evaluateBuildRule(
    rule: any,
    productIds: string[],
    categoryIdByProductId: Map<string, string | null>,
    specsByProductId: Map<string, Map<string, unknown>>,
    productById: Map<string, ProductSummary>
  ): CompatibilityResult {
    const config = (rule.config ?? {}) as any
    const mode: "sum" | "count" = config.mode ?? "sum"

    const targetCategoryId: string | undefined = config.target?.category_id
    const targetFieldName: string | undefined = config.target?.field_name

    const targetProductId = productIds.find((pid) => categoryIdByProductId.get(pid) === targetCategoryId)
    const targetProductTitle = targetProductId
      ? productById.get(targetProductId)?.title ?? targetProductId
      : "Target product"

    const targetValue =
      targetProductId && targetFieldName
        ? specsByProductId.get(targetProductId)?.get(targetFieldName)
        : null

    if (!targetProductId || targetValue === null || targetValue === undefined) {
      return {
        passed: true,
        message: `⚠ ${rule.name}: missing target product/spec in this build`,
        ruleName: rule.name,
      }
    }

    if (mode === "sum") {
      const sumCategoryIds: string[] = config.sum?.category_ids ?? []
      const sumFieldName: string | undefined = config.sum?.field_name
      const headroomPercent: number = Number(config.headroom_percent ?? 0)

      const sum = productIds.reduce((acc, pid) => {
        if (!sumCategoryIds.includes(categoryIdByProductId.get(pid) ?? "")) return acc
        if (!sumFieldName) return acc
        const val = specsByProductId.get(pid)?.get(sumFieldName)
        return acc + (typeof val === "number" ? val : Number(val) || 0)
      }, 0)

      const threshold = sum * (1 + headroomPercent / 100)
      const targetNumeric = typeof targetValue === "number" ? targetValue : Number(targetValue) || 0

      const passed = targetNumeric >= threshold
      return {
        passed,
        message: passed
          ? `✓ ${rule.name}: ${targetProductTitle} meets power requirements`
          : `✗ ${rule.error_message}: required ≥ ${Math.ceil(threshold)}W, got ${targetNumeric}W`,
        ruleName: rule.name,
        targetProductId: targetProductId,
      }
    }

    const countCategoryIds: string[] = config.count?.category_ids ?? []
    const predicateFieldName: string | undefined = config.count?.field_name
    const includes: string | undefined = config.count?.includes

    const count = productIds.reduce((acc, pid) => {
      if (!countCategoryIds.includes(categoryIdByProductId.get(pid) ?? "")) return acc
      if (!predicateFieldName) return acc + 1
      const val = specsByProductId.get(pid)?.get(predicateFieldName)
      if (includes && typeof val === "string") {
        return val.includes(includes) ? acc + 1 : acc
      }
      return acc + 1
    }, 0)

    const targetNumeric = typeof targetValue === "number" ? targetValue : Number(targetValue) || 0
    const passed = count <= targetNumeric

    return {
      passed,
      message: passed
        ? `✓ ${rule.name}: within available slots`
        : `✗ ${rule.error_message}: need ${count}, have ${targetNumeric}`,
      ruleName: rule.name,
      targetProductId: targetProductId,
    }
  }
}

export default CompatibilityModuleService
