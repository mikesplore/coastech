import SpecificationsModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const SPECIFICATIONS_MODULE = "specifications"

export default Module(SPECIFICATIONS_MODULE, {
  service: SpecificationsModuleService,
})
