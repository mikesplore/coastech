import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import CompatibilityModuleService from "../../modules/compatibility/service"
import { COMPATIBILITY_MODULE } from "../../modules/compatibility"

export const deleteCompatibilityRulesStepId = "delete-compatibility-rules-step"

export const deleteCompatibilityRulesStep = createStep(
  deleteCompatibilityRulesStepId,
  async (
    data: Parameters<CompatibilityModuleService["deleteCompatibilityRules"]>[0],
    { container }
  ) => {
    const service: CompatibilityModuleService = container.resolve(COMPATIBILITY_MODULE)
    await service.deleteCompatibilityRules(data)
    return new StepResponse(undefined)
  }
)

export const deleteCompatibilityRulesWorkflowId = "delete-compatibility-rules"

export const deleteCompatibilityRulesWorkflow = createWorkflow(
  deleteCompatibilityRulesWorkflowId,
  (input: Parameters<CompatibilityModuleService["deleteCompatibilityRules"]>[0]) => {
    return new WorkflowResponse(deleteCompatibilityRulesStep(input))
  }
)
