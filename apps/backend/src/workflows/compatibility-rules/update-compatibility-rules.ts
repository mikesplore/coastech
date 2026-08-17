import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import CompatibilityModuleService from "../../modules/compatibility/service"
import { COMPATIBILITY_MODULE } from "../../modules/compatibility"

export const updateCompatibilityRulesStepId = "update-compatibility-rules-step"

export const updateCompatibilityRulesStep = createStep(
  updateCompatibilityRulesStepId,
  async (
    data: Parameters<CompatibilityModuleService["updateCompatibilityRules"]>[0],
    { container }
  ) => {
    const service: CompatibilityModuleService = container.resolve(COMPATIBILITY_MODULE)
    const updated = await service.updateCompatibilityRules(data)
    return new StepResponse(updated)
  }
)

export const updateCompatibilityRulesWorkflowId = "update-compatibility-rules"

export const updateCompatibilityRulesWorkflow = createWorkflow(
  updateCompatibilityRulesWorkflowId,
  (input: Parameters<CompatibilityModuleService["updateCompatibilityRules"]>[0]) => {
    return new WorkflowResponse(updateCompatibilityRulesStep(input))
  }
)
