# Storefront Plan v2 — Marketplace Direction (Jumia/Alibaba-style)

**Supersedes:** `storefront-implementation-plan.md` (v1 was a boutique dark-theme tech-brand look — wrong direction; this replaces it).
**Brief, stated explicitly:** a functional online marketplace, Jumia-like / Alibaba-like — dense, transactional, instantly recognizable as a store, not a brand showcase.
**Backend:** unchanged — still Medusa v2 with categories, `specifications` module, `compatibility` module, inventory/locations, pricing, fulfillment as already built.

The compatibility checker / PC Builder is still your differentiator vs. generic marketplaces — it stays, but repositioned as a tool the store offers, not the entire first impression.

---

## Part A — Design direction (corrected)

**Background/theme:** light. White/very light-gray (`#FFFFFF` / `#F5F5F5`) background throughout. Dark themes read as agency-portfolio or gaming-brand sites — marketplaces are light because density and scanability matter more than mood.

**Color:**
- `--bg` `#FFFFFF`, `--bg-alt` `#F5F6F7` — page and section backgrounds
- `--text` `#1A1A1A` — primary text, near-black not pure black
- `--primary` `#F97316` (orange) or `#E52528` (red) — pick one, used everywhere: every CTA button, every price, every active nav state, sale badges. Consistency here is what makes it read as "one store" across hundreds of product cards.
- `--rating` `#FFB800` — star ratings, used only for that
- `--success` `#1DAA5C` / `--danger` `#E5342B` — stock/compatibility status (function, not brand)

One accent color used everywhere beats a curated palette here — that repetition across thousands of cards is what makes a marketplace feel coherent at scale.

**Type:** a single clean, highly legible sans-serif system font (e.g., Inter, or the system font stack) for everything. No display/body/mono pairing — marketplaces prioritize density and load speed over typographic personality. Reserve tabular/mono figures only for the spec-table rows on PDPs, not headings.

**Layout:** dense, grid-packed, minimal whitespace. Every section fights for attention the way a real marketplace homepage does — this is correct for the brief, not a flaw.

---

## Part B — Page-by-page plan

### 1. Homepage
- **Top promo carousel** — full-width rotating banner (sales, new arrivals, seasonal promos), auto-advancing with manual arrows/dots.
- **Category icon strip** directly below — small icon + label per top-level category (Laptops, Desktops, Components, Peripherals, Networking, Accessories), horizontally scrollable on mobile. This is the primary navigation entry point, not the mega-menu.
- **Flash Deals rail** — horizontal scroll of discounted items with countdown timer and discount-% badges, if the backend price lists support time-bound pricing; otherwise a "Clearance" rail without the timer.
- **"Build your PC" banner** — one promotional strip (not the hero) linking to the PC Builder tool, framed as a service the store offers: "Not sure what fits together? Use our free Build Checker."
- **Multiple product rails** stacked below: "Top Laptops," "Best-Selling Components," "New Arrivals," "Recommended for You" (if account/browsing history is available) — each a horizontal scroll of product cards.
- **Trust strip** near the footer: delivery info, warranty policy, payment methods accepted, pickup location.

### 2. Navigation
- Persistent top bar: logo, dominant central search bar (largest interactive element in the header — this is how people find things on a marketplace), account, cart with item count.
- "Menu"/hamburger or category bar below the search opens the full category tree — keep it fast (flyout or mega-menu), not a slow animated reveal.
- Keep "PC Builder" as its own persistent nav link — it's a tool, same tier as "Shop," "Account," "Cart."

### 3. Category / listing pages
- Left filter sidebar generated dynamically from the `specifications` module per category (this part of v1 was correct and carries over unchanged) — brand, price range, and spec-based facets (socket, capacity, form factor, etc.).
- Dense grid of product cards (4–6 per row on desktop, 2 per row on mobile) — no large imagery, no generous spacing; pack as many products per screen as legibility allows.
- Sort bar: price, popularity, rating, newest.

### 4. Product card (used everywhere: homepage rails, listing grid, search)
- Square product image, white background, consistent crop.
- Discount badge top-left if on sale (e.g., "-15%").
- Product name (truncated to 2 lines).
- Price in `--primary`, bold, large — strikethrough original price beside it if discounted.
- Star rating + review count, small, under the price.
- Stock/delivery badge: "In stock," "Pickup today," or "Out of stock" — using `--success`/`--danger`.
- "Add to cart" button, full-width, `--primary` fill — always visible, not hidden behind hover (mobile-first: most marketplace traffic is mobile).

### 5. Product detail page (PDP)
- Image gallery left (thumbnails + main image), buy box right: price, stock, quantity selector, "Add to cart" and "Buy now," delivery/pickup estimate.
- Spec table below the fold — keep the structured, grouped datasheet layout from v1's Part A (that content decision was sound; only the overall page chrome around it was wrong). Render from `ProductSpecValue` data.
- Ratings & reviews section.
- "Add to Build" secondary button next to "Add to cart" for component categories, linking into the PC Builder session.
- Related/similar products rail at the bottom.

### 6. PC Builder (tool page, not homepage hero)
- Keep the functional core from v1: slot-based flow (CPU → Motherboard → RAM → Storage → GPU → PSU → Case → Cooling), live calls to `/store/build/check-compatibility`, plain-language conflict reasons, running subtotal, "add all to cart."
- Restyle to match the light marketplace theme: compatibility status as a clear colored badge + icon + text per slot ("✓ Compatible" in `--success`, "✕ Conflict: PSU wattage too low" in `--danger`) rather than an animated trace-line signature — keep it functional and fast, not a moment of spectacle.

### 7. Cart & checkout
- Standard marketplace pattern: cart page with quantity editing, then a clear numbered checkout flow (Delivery → Payment → Review), restyled to the light theme with `--primary` for the active step and primary buttons.
- Pickup vs. delivery choice, and whatever payment providers are configured on the backend — same functional requirements as v1, different visual treatment.

### 8. Account area
- Orders, saved builds, wishlist/saved items — standard marketplace account tabs.

### 9. Search results page
- Same dense grid + filter sidebar as category pages.

---

## Part C — What carries over unchanged from v1

- Category taxonomy and mega-menu structure.
- Dynamic filter generation from the `specifications` module (still a blocking dependency — confirm the Store API route for it exists).
- The PC Builder's functional logic and its dependency on `/store/build/check-compatibility`.
- Spec-table grouping and structure on the PDP.
- Fulfillment (pickup/delivery) and payment-provider wiring in checkout.

## What's dropped from v1

- Dark theme, copper/PCB color palette, condensed display typeface.
- The animated "trace-line" hero signature as the homepage centerpiece (its functional idea — visible compatibility status — survives inside the PC Builder tool itself, just restyled as badges).
- Minimalist, whitespace-heavy layout — replaced with dense, marketplace-style packing throughout.

---

## Suggested build order

1. Retheme: swap tokens (color, type, spacing scale) across the existing starter first — fastest way to kill the "boutique brand" feeling.
2. Homepage rebuild: promo carousel, category strip, product rails (B.1).
3. Product card component (B.4) — used everywhere, build once, reuse across rails/grid/search.
4. Category/listing + search pages using the card component (B.3, B.9).
5. PDP (B.5).
6. Restyle PC Builder to match (B.6).
7. Cart/checkout restyle (B.7).
8. Account area (B.8).

## Open question for the owner
- Pick the single primary accent color now (orange vs. red) — it gets used on every price and button across the whole site, so worth confirming before the retheme pass starts.