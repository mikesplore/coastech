# Medusa Backend Plan — Computer & Computer Parts Shop

**Audience:** a coding agent implementing this in a fresh Medusa v2 install (`create-medusa-app`).
**Store type:** local computer shop — laptops, desktops, motherboards, CPUs, GPUs, RAM, storage, PSUs, cases, cooling, keyboards, mice, monitors, networking gear, cables/accessories.
**Key requirement:** a PC compatibility / build-checker feature is essential.
**Open decision:** online-only vs. online + in-store POS. The plan below is written so this decision can be made later without rework — see Phase 4.

> **Status legend:** `[x]` = implemented, `[ ]` = not implemented, `[~]` = partially implemented. Last reviewed: 2026-08-17.

---

## 0. Assumptions & scope

- Medusa v2 (module architecture: modules + workflows + `MedusaService` factory, per current docs).
- Single shop, single currency to start (confirm with the owner — likely KES if based in Kenya), VAT-registered tax region.
- Storefront is out of scope here; this plan covers backend/admin only, but API routes are designed so any storefront (Next.js starter or custom) can consume them.

---

## Phase 1 — Project setup

- [x] 1. Scaffold: `npx create-medusa-app@latest`, choose PostgreSQL + Redis (required for workflows/events at production scale; SQLite is fine for local dev only).
- [x] 2. Set up `.env` for DB, Redis, CORS, JWT/cookie secrets.
- [x] 3. Confirm admin dashboard boots (`medusa develop`, admin at `/app`).
- [~] 4. Set default region, currency, and tax settings for the shop's country in admin.
  - Kenya region with KES currency and KE tax region are seeded, but there are **two stores** in the DB (`Default Store` = eur/usd, `Computer Parts Shop` = kes/usd). The default store is still the EUR one — KES is not the shop-wide default until the stores are consolidated or the default store is switched.

---

## Phase 2 — Product taxonomy

Use Medusa's built-in **Product Category** module (hierarchical) rather than inventing a parallel system.

Top-level categories:

- [x] Laptops
- [x] Desktops / Pre-builts
- [x] Components
  - [x] Motherboards
  - [x] Processors (CPUs)
  - [x] Graphics Cards (GPUs)
  - [x] Memory (RAM)
  - [x] Storage (SSD / HDD / NVMe)
  - [x] Power Supplies (PSUs)
  - [x] Cases
  - [x] Cooling (Air / AIO / Fans)
- [x] Peripherals
  - [x] Keyboards
  - [x] Mice
  - [x] Monitors
  - [x] Headsets/Audio
- [x] Networking (routers, switches, adapters, cables)
- [x] Accessories (cables, adapters, mounts)

- [ ] Use **Product Tags** for cross-cutting labels (`gaming`, `refurbished`, `clearance`, `office`).
- [~] Use Medusa **Product Variants + Options** only for true purchasable variations of one SKU (e.g., a laptop's RAM/storage configuration, a keyboard's color). Don't try to force every spec into options — that's what the specifications module (Phase 3) is for.
  - Products currently have a single "Default" option/variant; no real purchasable variations exist yet.

---

## Phase 3 — Technical specifications (custom module)

Medusa's product `metadata` (jsonb) is too unstructured for filterable, validated specs across categories with very different attributes (a CPU and a monitor share almost no fields). Build a dedicated module instead.

**Module: `specifications`**

- [x] Data models (DML, in `src/modules/specifications/models/`):
  - [x] `SpecTemplate` — defines which fields apply to a category (e.g., CPU template: `socket`, `cores`, `threads`, `base_clock_ghz`, `tdp_watts`).
  - [x] `SpecTemplateField` — field name, data type (string/number/enum/boolean), unit, whether it's filterable/facetable.
  - [x] `ProductSpecValue` — links a `product_id` to a `SpecTemplate` field with a value.
- [x] Service: extend `MedusaService` factory over these models to get CRUD for free; add custom methods like `getSpecsForProduct(productId)` and `validateSpecsAgainstTemplate(categoryId, values)`.
- [ ] Seed one `SpecTemplate` per category with the fields that matter for compatibility and filtering (see Phase 5 for which fields the compatibility engine reads — those fields must exist here).
  - Products carry spec data in `metadata` only; no `SpecTemplate`/`SpecTemplateField`/`ProductSpecValue` rows are seeded.
- [x] Link module to `Product` module via a **module link** (Medusa v2 pattern for cross-module relations) rather than a foreign key, keeping specifications decoupled from core commerce.
- [ ] Admin UI: build an **Admin Widget** injected into the product detail page that renders the right fields based on the product's category's `SpecTemplate`, so staff fill in structured specs instead of free-text metadata.

---

## Phase 4 — Inventory, sales channels, locations

Build this correctly from day one regardless of the POS decision — it costs nothing extra now and avoids rework later:

- [x] 1. Create at least one **Stock Location** (the shop's physical address) even if selling online-only — Medusa's inventory module requires a location to hold stock against.
- [x] 2. Create a **Sales Channel** for the online store (default one is fine).
- [ ] 3. If POS is added later, it's simply a second sales channel pointing at the same stock location, or a separate location if stock is to be kept physically distinct — no data model changes needed. *(Deferred — depends on the open POS decision.)*
- [x] 4. Track inventory at the **variant** level (each laptop config, each RAM stick capacity, etc.) via the Inventory module — do not disable inventory management on components; parts shops need accurate stock more than most retailers.
- [ ] 5. Set low-stock thresholds per SKU so restocking is flagged.

**Action item for the owner (not the agent):** decide POS before go-live if possible, since it affects whether a POS-facing client app needs to be built against the Admin/Store API — but it does not affect backend data modeling, so it's safe to defer.

---

## Phase 5 — Compatibility / build-checker engine (essential)

This is the standout feature. Build it as its own module + workflow + API route, reading data from the `specifications` module.

**Module: `compatibility`**

- [x] Data models:
  - [x] `CompatibilityRule` — a structured rule between two categories/fields, e.g. `{ field_a: "cpu.socket", field_b: "motherboard.socket", operator: "equals" }`, or `{ field_a: "ram.type", field_b: "motherboard.supported_ram_types", operator: "in" }`.
  - [~] Support at least these rule types for a v1: socket match (CPU↔Motherboard), RAM type match (RAM↔Motherboard), form factor fit (Motherboard↔Case), PSU wattage vs. estimated GPU+CPU draw (sum check), M.2/SATA slot availability (Storage↔Motherboard).
    - Service implements `equals`, `in`, `contains`, `sum_less_than` operators, but no rules are seeded and `sum_less_than` is a stub.
- [~] Service method: `checkCompatibility(productIds: string[])` → returns per-pair pass/fail with a human-readable reason, plus overall build status.
  - Method exists, but `getProductSpecs()` and `getProductCategory()` are stubs returning empty data — it does not yet read from the specifications module.
- [ ] Expose via a **Store API route**: `POST /store/build/check-compatibility` accepting a list of variant/product IDs, returning compatibility results — this is what a "PC builder" page on the storefront would call live as a customer adds parts.
- [x] Expose an **Admin API route** for staff to manage rules without redeploying code: `GET/POST /admin/compatibility-rules` (plus `GET/POST/DELETE /admin/compatibility-rules/:id`).
- [ ] Seed the initial rule set from the spec fields defined in Phase 3 — the two phases must be designed together (agent should implement Phase 3 and 5 in the same pass, since rules reference spec fields directly).

Keep the rule engine generic (field comparisons) rather than hardcoding "CPU vs Motherboard" logic in code, so staff can add new rule types (e.g., cooler height vs. case clearance) later through data, not deployments.

---

## Phase 6 — Pricing, tax, payments

- [ ] 1. Configure the **Price List** module for cost-plus retail pricing; add a separate price list for trade/bulk buyers if the shop sells to other small businesses.
- [~] 2. Set tax region/rate for the shop's jurisdiction.
  - KE tax region is seeded, but no tax rate is configured.
- [~] 3. Payment providers: use a Medusa payment plugin matching what the shop can actually process locally (card gateway, and if in Kenya, an M-Pesa-compatible payment provider — check the Medusa plugin registry for current, maintained options at implementation time rather than assuming one, since third-party plugin support changes).
  - Only `pp_system_default` (manual) is configured on the Kenya region.
- [x] 4. Add a manual/"pay on pickup" payment provider for in-store purchases if POS ends up being needed.

---

## Phase 7 — Fulfillment

- [x] 1. Configure a **manual fulfillment provider** for local delivery (no need for a shipping-rate API for a single-town shop).
- [x] 2. Add an explicit **"in-store pickup"** fulfillment option — very common for parts shops (customer orders online, picks up same day).
- [x] 3. Skip international shipping/carrier integrations unless the owner asks for them.

---

## Phase 8 — Search & filtering

Category browsing alone won't let a customer filter "AM5 motherboards under a certain price with at least 4 RAM slots." Two options, pick based on team's ops capacity:

- [ ] **Simpler:** query `ProductSpecValue` directly with Postgres filters for faceted search — fine at small-to-medium catalog size, no extra infra.
- [ ] **Scales better:** integrate a search engine (e.g., MeiliSearch) synced via a Medusa subscriber that pushes product + spec data on create/update, giving instant faceted filtering. Recommended once the catalog exceeds a few hundred SKUs.

Start with the Postgres approach; document the sync-event hook points so swapping in a search engine later doesn't require touching the compatibility or specifications modules.

---

## Phase 9 — Warranty / RMA (optional but common for this vertical)

Parts shops routinely handle warranty claims and serial-number tracking.

- [ ] Add a `warranty_months` field to the `SpecTemplate` (or a shop-wide default per category) so it shows on the product page.
- [ ] Optional: a lightweight `warranty` module tracking serial numbers per sold unit and RMA status, linked to `Order` via module link. Only build this if the owner confirms they need serial-level tracking — otherwise a warranty duration on the product is enough for v1.

---

## Phase 10 — Admin customization

- [ ] 1. Product detail page widget (Phase 3) for spec entry.
- [ ] 2. Compatibility rules management screen (Phase 5) — table CRUD over `CompatibilityRule`. *(API routes exist; no admin UI yet.)*
- [ ] 3. Low-stock dashboard widget using existing Inventory module data.

---

## Suggested build order for the agent

1. Phase 1 (setup) → 2 (categories) → 3 (specifications module) → 5 (compatibility module, since it depends on 3) → 4 (inventory/locations) → 6 (pricing/tax/payments) → 7 (fulfillment) → 8 (search) → 10 (admin widgets) → 9 (warranty, if confirmed).
2. Seed a small realistic dataset after Phase 3+5 (a handful of CPUs, motherboards, RAM kits) to test the compatibility engine end-to-end before building further.
   - [~] 10 products are seeded (CPUs, motherboards, RAM, GPU, PSU, case, SSD) with spec data in `metadata`, but **no spec templates and no compatibility rules** are seeded, so the compatibility engine cannot be exercised end-to-end yet.

---

## Open questions to confirm with the shop owner before/while building

- Country/currency/tax region (affects Phase 6 setup values). *(KES/Kenya assumed and seeded, but the default store still uses EUR — needs confirmation.)*
- Whether trade/bulk (B2B-style) pricing is needed now or later.
- POS timeline (doesn't block backend work per Phase 4, but affects whether a POS client needs to be scoped).
- Whether serial-number-level warranty tracking (Phase 9) is needed at launch.