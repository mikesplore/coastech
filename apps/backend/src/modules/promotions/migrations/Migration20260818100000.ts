import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260818100000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`alter table "promotional_ad" add column if not exists "target_type" text not null default 'url';`)
    this.addSql(`alter table "promotional_ad" add column if not exists "target_id" text null;`)
    this.addSql(`create index if not exists "IDX_promotional_ad_target" on "promotional_ad" ("target_type", "target_id");`)
  }

  async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_promotional_ad_target";`)
    this.addSql(`alter table "promotional_ad" drop column if exists "target_id";`)
    this.addSql(`alter table "promotional_ad" drop column if exists "target_type";`)
  }
}
