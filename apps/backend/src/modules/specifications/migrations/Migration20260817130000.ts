import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260817130000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "spec_template" (
        "id" text not null,
        "name" text not null,
        "category_id" text null,
        "warranty_months" integer null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "spec_template_pkey" primary key ("id")
      );
    `)

    this.addSql(`
      create table if not exists "spec_template_field" (
        "id" text not null,
        "template_id" text not null,
        "name" text not null,
        "label" text not null,
        "data_type" text not null,
        "unit" text null,
        "enum_values" text null,
        "is_filterable" boolean not null default false,
        "is_required" boolean not null default false,
        "sort_order" integer not null default 0,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "spec_template_field_pkey" primary key ("id")
      );
    `)

    this.addSql(`
      create table if not exists "product_spec_value" (
        "id" text not null,
        "product_id" text not null,
        "field_id" text not null,
        "value_text" text null,
        "value_number" double precision null,
        "value_boolean" boolean null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "product_spec_value_pkey" primary key ("id")
      );
    `)

    this.addSql(`alter table "spec_template" add column if not exists "warranty_months" integer null;`)

    this.addSql(`
      create unique index if not exists "IDX_spec_template_field_template_name" on "spec_template_field" ("template_id", "name")
      where deleted_at is null;
    `)

    this.addSql(`
      create unique index if not exists "IDX_product_spec_value_product_field" on "product_spec_value" ("product_id", "field_id")
      where deleted_at is null;
    `)

    this.addSql(`create index if not exists "IDX_product_spec_value_product" on "product_spec_value" ("product_id");`)
    this.addSql(`create index if not exists "IDX_product_spec_value_field" on "product_spec_value" ("field_id");`)
  }

  async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_product_spec_value_field";`)
    this.addSql(`drop index if exists "IDX_product_spec_value_product";`)
    this.addSql(`drop index if exists "IDX_product_spec_value_product_field";`)
    this.addSql(`drop index if exists "IDX_spec_template_field_template_name";`)
    this.addSql(`drop table if exists "product_spec_value";`)
    this.addSql(`drop table if exists "spec_template_field";`)
    this.addSql(`drop table if exists "spec_template";`)
  }
}

