import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import CompatibilityModuleService from "../../modules/compatibility/service"
import { COMPATIBILITY_MODULE } from "../../modules/compatibility"

export const createCompatibilityRulesStepId = "create-compatibility-rules-step"

export const createCompatibilityRulesStep = createStep(
  createCompatibilityRulesStepId,
  async (data: Parameters<CompatibilityModuleService["createCompatibilityRules"]>[0], { container }) => {
    const service: CompatibilityModuleService = container.resolve(COMPATIBILITY_MODULE)
    const created = await service.createCompatibilityRules(data)
    return new StepResponse(created)
  }
)

export const createCompatibilityRulesWorkflowId = "create-compatibility-rules"

export const createCompatibilityRulesWorkflow = createWorkflow(
  createCompatibilityRulesWorkflowId,
  (input: Parameters<CompatibilityModuleService["createCompatibilityRules"]>[0]) => {
    return new WorkflowResponse(createCompatibilityRulesStep(input))
  }
)
