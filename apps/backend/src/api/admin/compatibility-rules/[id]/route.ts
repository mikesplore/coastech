import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import CompatibilityModuleService from "../../../../modules/compatibility/service"
import { COMPATIBILITY_MODULE } from "../../../../modules/compatibility"
import { deleteCompatibilityRulesWorkflow } from "../../../../workflows/compatibility-rules/delete-compatibility-rules"
import { updateCompatibilityRulesWorkflow } from "../../../../workflows/compatibility-rules/update-compatibility-rules"

/**
 * GET /admin/compatibility-rules/:id
 * Get a single compatibility rule by ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const compatibilityService: CompatibilityModuleService = req.scope.resolve(
    COMPATIBILITY_MODULE
  )

  try {
    const rule = await compatibilityService.retrieveCompatibilityRule(req.params.id)

    res.json({
      rule,
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to get compatibility rule",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

/**
 * POST /admin/compatibility-rules/:id
 * Update a compatibility rule
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const compatibilityService: CompatibilityModuleService = req.scope.resolve(
    COMPATIBILITY_MODULE
  )

  try {
    const { result: rule } = await updateCompatibilityRulesWorkflow(req.scope).run({
      input: {
        id: req.params.id,
        ...(req.body as Record<string, unknown>),
      } as any,
    })

    res.json({
      rule,
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to update compatibility rule",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

/**
 * DELETE /admin/compatibility-rules/:id
 * Delete a compatibility rule
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const compatibilityService: CompatibilityModuleService = req.scope.resolve(
    COMPATIBILITY_MODULE
  )

  try {
    await deleteCompatibilityRulesWorkflow(req.scope).run({
      input: {
        id: req.params.id,
      },
    })

    res.json({
      message: "Rule deleted successfully",
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete compatibility rule",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
