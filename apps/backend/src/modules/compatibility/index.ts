import CompatibilityModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const COMPATIBILITY_MODULE = "compatibility"

export default Module(COMPATIBILITY_MODULE, {
  service: CompatibilityModuleService,
})
