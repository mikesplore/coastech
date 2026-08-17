import { MedusaService } from "@medusajs/framework/utils"
import PromotionalAd from "./models/promotional-ad"

class PromotionsModuleService extends MedusaService({ PromotionalAd }) {
  async listLivePromotionalAds() {
    const now = new Date()
    const ads = await this.listPromotionalAds({ is_active: true })
    return ads
      .filter((ad) => (!ad.starts_at || ad.starts_at <= now) && (!ad.ends_at || ad.ends_at >= now))
      .sort((a, b) => b.priority - a.priority)
  }
}

export default PromotionsModuleService
