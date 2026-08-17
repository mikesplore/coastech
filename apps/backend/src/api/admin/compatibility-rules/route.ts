import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import CompatibilityModuleService from "../../modules/compatibility/service"
import { COMPATIBILITY_MODULE } from "../../modules/compatibility"

/**
 * GET /admin/compatibility-rules
 * List all compatibility rules
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const compatibilityService: CompatibilityModuleService = req.scope.resolve(
    COMPATIBILITY_MODULE
  )

  try {
    const rules = await compatibilityService.listCompatibilityRules()

    res.json({
      rules,
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to list compatibility rules",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

/**
 * POST /admin/compatibility-rules
 * Create a new compatibility rule
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const compatibilityService: CompatibilityModuleService = req.scope.resolve(
    COMPATIBILITY_MODULE
  )

  try {
    const rule = await compatibilityService.createCompatibilityRules(req.body)

    res.json({
      rule,
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to create compatibility rule",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
