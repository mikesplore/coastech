import PromotionsModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PROMOTIONS_MODULE = "promotions"

export default Module(PROMOTIONS_MODULE, {
  service: PromotionsModuleService,
})
