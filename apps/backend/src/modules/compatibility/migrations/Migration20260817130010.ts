import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260817130010 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "compatibility_rule" (
        "id" text not null,
        "name" text not null,
        "description" text null,
        "source_category_id" text not null,
        "source_field_name" text not null,
        "target_category_id" text not null,
        "target_field_name" text not null,
        "operator" text not null,
        "error_message" text not null,
        "config" jsonb null,
        "is_active" boolean not null default true,
        "priority" integer not null default 0,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "compatibility_rule_pkey" primary key ("id")
      );
    `)

    this.addSql(`alter table "compatibility_rule" add column if not exists "config" jsonb null;`)
    this.addSql(`create index if not exists "IDX_compatibility_rule_active" on "compatibility_rule" ("is_active");`)
    this.addSql(`create index if not exists "IDX_compatibility_rule_priority" on "compatibility_rule" ("priority");`)
  }

  async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_compatibility_rule_priority";`)
    this.addSql(`drop index if exists "IDX_compatibility_rule_active";`)
    this.addSql(`drop table if exists "compatibility_rule";`)
  }
}

