import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260817150000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`alter table "promotional_ad" add column if not exists "placement" text not null default 'homepage_carousel';`)
    this.addSql(`alter table "promotional_ad" add column if not exists "cta_label" text null;`)
    this.addSql(`alter table "promotional_ad" add column if not exists "discount_label" text null;`)
    this.addSql(`alter table "promotional_ad" add column if not exists "countdown_ends_at" timestamptz null;`)
    this.addSql(`create index if not exists "IDX_promotional_ad_placement" on "promotional_ad" ("placement", "is_active", "priority");`)
  }

  async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_promotional_ad_placement";`)
    this.addSql(`alter table "promotional_ad" drop column if exists "countdown_ends_at";`)
    this.addSql(`alter table "promotional_ad" drop column if exists "discount_label";`)
    this.addSql(`alter table "promotional_ad" drop column if exists "cta_label";`)
    this.addSql(`alter table "promotional_ad" drop column if exists "placement";`)
  }
}
