# Aftercare Shop & Package Configurator Redesign

Date: 2026-05-29
Status: Approved (brainstorming) — ready for implementation plan

## Context

The solo project was migrated from a group project that is a BMW **car configurator** + **merch shop**. Two pages carry broken migration semantics:

- **`/aftercare-shop`** is a near-verbatim copy of the group `merch-shop`: each card is an `<a href="/aftercare-shop/{slug}">` linking to a detail page (`aftercare-product.ejs`) that still carries clothing semantics (`sizes`, `color`, "Kleidung/Accessoire"). The product image acts as a navigation link, which is wrong for a shop — it should be a product tile with inline add-to-cart.
- **`/package-configurator`** kept the entire car-configurator machinery (4-axis summary "Package / Dauer / Intensität / Add-on", `front/back/interior/wheels` view-swapping, color swatches, dead `carImg` / `colorFromName` / `displayColorName` code, German `Lade Vorschau`) but the data has **one image per package**. Changing duration/intensity/add-on never changes the picture — the configurator's visual promise is fake. Worse, `POST /configuration/calculate` requires a **pre-seeded `(package × duration × intensity)` row**; only 9 of 27 combinations exist, so most selections return **404**.

**Core semantic insight:** a car's color + wheels visually compose into one image; a massage's duration/intensity/add-ons are abstract service parameters. Duration cannot be shown in a photo at all; intensity only subtly. The only axis that visually composes is **add-ons** (they are physical props: hot stones, aroma oil, towels, a band) — these are the analogue of a car's wheels/options.

## Decisions

| Decision | Choice |
|---|---|
| Aftercare cards | Inline add-to-cart; image is **not** a link; **delete** the product detail page |
| Configurator preview | **Layered compositing** — every axis gets its own visual channel (base scene + light grade + glow + props + candles + rail) |
| Visible axes | **All four are visible.** Package + Intensity → base scene (per `package×intensity`). Duration → light grade + phase rail + candle count. Intensity → pressure glow. Add-ons → prop layers. See the image-assets doc. |
| Prop placement | **Four separate corners/zones** so all add-ons can show at once without colliding |
| Add-on selection | **Multi-select** (Hot Stone *and* Aroma Oil, etc.) |
| Combination matrix | **Removed** — every `package × duration × intensity × add-ons[]` is valid; price computed from deltas (fixes 404s) |
| UI language | **English** (matches the already-English Aftercare shop; remove German + umlaut-repair code) |
| Image set | Regenerate **14** scene-consistent images (9 base `package×intensity` + 4 add-on props + 1 candle) + free CSS/SVG channels. **All imagery, prompts, prop-zone map and channel specs live in [`2026-06-11-configurator-image-assets-and-visual-channels.md`](2026-06-11-configurator-image-assets-and-visual-channels.md).** Aftercare product images are kept as-is. |

## Feature 1 — Aftercare Shop: inline add-to-cart

### Card UI
Each grid card becomes a self-contained product tile (standard product-card layout: image on a neutral panel, text below — replacing the full-bleed dark-overlay style):

- product `<img>` — **not** wrapped in a link, not a nav target
- category eyebrow · name · price
- quantity stepper (`− 1 +`, min 1)
- **Add to cart** button → `POST /api/cart/items` with the existing aftercare payload:
  ```json
  { "type": "aftercare", "name", "price", "imageUrl", "quantity", "details": { "productId" } }
  ```
- `aria-live` status line ("Added to cart" / error).

### Card anchor (for deep links)
Card root keeps an `id="product-<slug>"` so existing scroll-to-and-highlight behavior in `aftercare-shop.ejs` still works.

### Deletions & repointing
- Delete `web/views/aftercare-product.ejs`.
- Delete `GET /aftercare-shop/:productId` route in `services/web-backend/src/server.js` and the `aftercare-product` render.
- Repoint deep links to the anchor form `/aftercare-shop#product-<slug>`:
  - `web/views/home.ejs` (aftercare preview tiles)
  - `web/views/ai-feature.ejs` (`safeProductPath`)
  - `services/ai-feature/src/recommendation.js` (`href`)
- Remove dead clothing semantics from `aftercare-shop.ejs`: the `color`/`variants` grouping, `sizes`, `gender`, "Kleidung/Accessoire", the `im Maßstab 1:18` regex. Render a flat product list.

### Tests to update
- `services/ai-feature/test/recommendation.smoke.js` expects `href: "/aftercare-shop/heated-neck-wrap"` → becomes `"/aftercare-shop#product-heated-neck-wrap"`.
- `services/web-backend/test/backend-routing.test.js` and `home-minio-images.test.js` — adjust any assertions referencing the detail route / old link form.
- `services/aftercare-shop/test/product-images.test.js` — unchanged image keys (kept).

## Feature 2 — Package Configurator: data model & backend

### SQL (`infrastructure/mysql/init/02_package_configurator.sql`)
- `add_ons` += `minio_object VARCHAR(255)` — transparent prop-layer image key.
- `packages` does **not** need an image column — the base scene now depends on `package × intensity`, so the service derives the key by convention (below).
- **Drop** tables `configurations`, `configuration_images`, `configuration_addons` and their seed rows. No combination matrix.
- Seed `add_ons.minio_object` → `package-configurator/addons/{hot-stone,aroma-oil,stretching,warm-towel}.png`.

### Service (`services/package-configurator/src/server.js`)
- **Base image key convention** (no DB column): `package-configurator/base/{packageSlug}-{intensitySlug}.png`, with fallback to `package-configurator/base/{packageSlug}.png` if the intensity-specific object is missing. See the image-assets doc §7.
- `/options/add-ons` → each add-on includes `imageUrl` (prop layer) + existing `priceDelta`.
- Remove `getConfigurationById` / `mapConfiguration` / `/configurations*` matrix endpoints (or keep `/packages`, `/options/*` only).
- Rewrite `POST /configuration/calculate`:
  - Input: `{ package: slug, duration: minutes, intensity: slug, addOns: [slug...] }`.
  - Validate package/duration/intensity/add-on rows all exist (400/404 with clear message if a slug is unknown — but any *combination* is allowed).
  - `price = base_price + duration.price_delta + intensity.price_delta + Σ addon.price_delta`.
  - `baseImageUrl` composed from `package + intensity` per the convention above.
  - `summary` built from a template, e.g. *"A 60-minute Stress Reset Massage at medium pressure with Aroma Oil and Warm Towel Finish."*
  - Response:
    ```json
    {
      "package":  { "slug", "name", "baseImageUrl" },
      "duration": { "minutes", "label" },
      "intensity":{ "slug", "label" },
      "addOns":   [ { "slug", "name", "imageUrl", "priceDelta" } ],
      "price": 0,
      "summary": ""
    }
    ```
- Note: the free CSS/SVG channels (duration light grade, phase rail, candle count, intensity glow) are **client-side**, derived from the returned `duration.minutes` / `intensity.slug` — no extra backend fields.

### MinIO seeding
`docker-compose.yml` `minio-init` already runs `mc mirror --overwrite ./assets/package-configurator → local/${MINIO_BUCKET}/package-configurator` **recursively**, so the `base/`, `addons/`, and `props/` subfolders mirror automatically. **No compose change needed.**

## Feature 3 — Package Configurator: layout & frontend

`web/views/package-configurator.ejs` rewrite.

### Preview = stacked channels (full spec in the image-assets doc §1, §6)
```
z0  base scene            ← package × intensity (<img>, swaps on either change)
z1  duration light grade  ← CSS overlay + filter (free)
z2  pressure glow         ← CSS radial on the hands, by intensity (free)
z3  add-on prop layers    ← 4 transparent PNGs, fixed corners, toggle on select
z4  candle sprites        ← props/candle.png ×1/2/3 by duration (free, 1 image)
z5  phase rail (chrome)   ← DOM/SVG strip under the preview, lit by duration (free)
```
Each axis owns a non-competing channel, so every option is visible. Channel values (filter/gradient per duration, glow radius/opacity per intensity, lit-segment and candle counts) are the contract in the image-assets doc §6.

### Controls (single clean panel, no wheel-hijacking)
- **Package** — selectable cards, single-select → swaps base layer.
- **Duration** — segmented `45 / 60 / 90 min (+€)` → price + light grade + phase rail + candle count.
- **Intensity** — `Gentle / Medium / Deep (+€)` → price + base scene (gesture) + pressure glow.
- **Add-ons** — multi-select chips, each with prop thumbnail + name + `+€` → toggles its layer.
- **Summary bar** (fixed, top): Package · Duration · Intensity · Add-ons (list) · Total · **Add package** → `POST /api/cart/items` `type: "package"`.

### Code removal
Delete: `initializeConfigPanelScroll` (wheel/touch panel hijacking), `colorFromName`, `interiorColorFromName`, `displayColorName`, `inferInteriorSlug`, `inferWheelsSlug`, `front/back/interior/wheels` view system, `carImg`, `Lade Vorschau`, German `displayText` umlaut map, legacy URL `?model&color&interior&wheels` parsing.

### Routing
- Keep `GET /package-configurator`. Replace the 4-segment legacy path `/:package/:duration/:intensity/:addon` with a clean optional deep-link form (e.g. `/package-configurator?package=<slug>`), or drop deep-linking if unused by AI recommendations. Confirm `getInitialPackageSelection` consumers during planning.

## Image generation

All imagery — the gpt-image-2 Context prompt, the 14 per-image prompts (9 base `package×intensity`, 4 add-on props, 1 candle), the prop-zone map, and the free CSS/SVG channel specs — lives in its own document:

➡ **[`2026-06-11-configurator-image-assets-and-visual-channels.md`](2026-06-11-configurator-image-assets-and-visual-channels.md)**

This spec and the implementation plan do not duplicate prompts; they reference that file.

## Out of scope
Payment, booking, new services, home-page video, regenerating aftercare/home/center imagery, visit-context changes.

## Verification
- `docker compose up --build` starts all services; MinIO seeds `package-configurator/{base,addons,props}/*`.
- `/aftercare-shop`: image not clickable; quantity + Add to cart posts to cart; no detail route (`/aftercare-shop/<slug>` no longer renders a detail page); deep links scroll-highlight the card.
- `/package-configurator`: any package × duration × intensity × add-on(s) computes a price (no 404); base image swaps per `package×intensity`; duration changes the light grade + phase rail + candle count; intensity changes the pressure glow; each active add-on shows its prop layer in its corner; Add package posts to cart.
- AI recommendation aftercare links land on the shop anchor.
- Affected unit/smoke tests updated and green; `.\scripts\smoke-test.ps1 -SkipAi` passes.
- No visible German labels or car/BMW scaffold identity on these two pages.
