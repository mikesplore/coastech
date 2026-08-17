import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260817140000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "promotional_ad" (
        "id" text not null,
        "title" text not null,
        "eyebrow" text null,
        "description" text null,
        "image_url" text null,
        "href" text not null,
        "starts_at" timestamptz null,
        "ends_at" timestamptz null,
        "priority" integer not null default 0,
        "is_active" boolean not null default true,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "promotional_ad_pkey" primary key ("id")
      );
    `)
    this.addSql(`create index if not exists "IDX_promotional_ad_active" on "promotional_ad" ("is_active", "priority");`)
  }

  async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_promotional_ad_active";`)
    this.addSql(`drop table if exists "promotional_ad";`)
  }
}
