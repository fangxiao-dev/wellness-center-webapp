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
| Configurator preview | **Layered compositing** — package base scene + transparent add-on prop layers |
| Visible axes | Package (base layer) and Add-ons (prop layers). Duration & Intensity are non-visual (price + caption only) |
| Prop placement | **Four separate corners/zones** so all add-ons can show at once without colliding |
| Add-on selection | **Multi-select** (Hot Stone *and* Aroma Oil, etc.) |
| Combination matrix | **Removed** — every `package × duration × intensity × add-ons[]` is valid; price computed from deltas (fixes 404s) |
| UI language | **English** (matches the already-English Aftercare shop; remove German + umlaut-repair code) |
| Image set | Regenerate 7 scene-consistent images in gpt-image-2 (3 base scenes + 4 prop layers). Aftercare product images are kept as-is. |

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
- `packages` += `minio_object VARCHAR(255)` — base scene image key (one per package).
- `add_ons` += `minio_object VARCHAR(255)` — transparent prop-layer image key.
- **Drop** tables `configurations`, `configuration_images`, `configuration_addons` and their seed rows. No combination matrix.
- Seed values:
  - packages → `package-configurator/neck-shoulder-relief.png`, `…/stress-reset-massage.png`, `…/warm-recovery-massage.png`
  - add_ons → `package-configurator/addons/hot-stone.png`, `…/aroma-oil.png`, `…/warm-towel.png`, `…/stretching.png`

### Service (`services/package-configurator/src/server.js`)
- `mapPackage` → include `imageUrl = toPublicPackageImageUrl(row.minio_object)`.
- `/options/add-ons` → each add-on includes `imageUrl` (prop layer) + existing `priceDelta`.
- Remove `getConfigurationById` / `mapConfiguration` / `/configurations*` matrix endpoints (or keep `/packages`, `/options/*` only).
- Rewrite `POST /configuration/calculate`:
  - Input: `{ package: slug, duration: minutes, intensity: slug, addOns: [slug...] }`.
  - Validate package/duration/intensity/add-on rows all exist (400/404 with clear message if a slug is unknown — but any *combination* is allowed).
  - `price = base_price + duration.price_delta + intensity.price_delta + Σ addon.price_delta`.
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

### MinIO seeding
`docker-compose.yml` `minio-init` already runs `mc mirror --overwrite ./assets/package-configurator → local/${MINIO_BUCKET}/package-configurator` **recursively**, so `assets/package-configurator/addons/*.png` lands at `package-configurator/addons/*` automatically. **No compose change needed.**

## Feature 3 — Package Configurator: layout & frontend

`web/views/package-configurator.ejs` rewrite.

### Preview = stacked layers
```
z0  package base scene   (full-bleed <img>, swaps when package changes)
z1  add-on layer: hot-stone      (full-frame transparent PNG; fade in/out on toggle)
z2  add-on layer: aroma-oil
z3  add-on layer: warm-towel
z4  add-on layer: stretching
```
Each add-on PNG is a **full-frame transparent overlay** with its prop pre-placed in its own corner/zone, so stacking = compositing (no coordinate math, no collisions). A **caption chip** over the image shows the non-visual choices ("60 min · Medium").

### Controls (single clean panel, no wheel-hijacking)
- **Package** — selectable cards, single-select → swaps base layer.
- **Duration** — segmented `45 / 60 / 90 min (+€)` → updates price + caption only.
- **Intensity** — `Gentle / Medium / Deep (+€)` → price + caption only.
- **Add-ons** — multi-select chips, each with prop thumbnail + name + `+€` → toggles its layer.
- **Summary bar** (fixed, top): Package · Duration · Intensity · Add-ons (list) · Total · **Add package** → `POST /api/cart/items` `type: "package"`.

### Code removal
Delete: `initializeConfigPanelScroll` (wheel/touch panel hijacking), `colorFromName`, `interiorColorFromName`, `displayColorName`, `inferInteriorSlug`, `inferWheelsSlug`, `front/back/interior/wheels` view system, `carImg`, `Lade Vorschau`, German `displayText` umlaut map, legacy URL `?model&color&interior&wheels` parsing.

### Routing
- Keep `GET /package-configurator`. Replace the 4-segment legacy path `/:package/:duration/:intensity/:addon` with a clean optional deep-link form (e.g. `/package-configurator?package=<slug>`), or drop deep-linking if unused by AI recommendations. Confirm `getInitialPackageSelection` consumers during planning.

## Image generation prompts (gpt-image-2)

**Shared style anchor — prepend to every prompt:**
> Calm, premium wellness-studio photography. Soft natural daylight from the upper-left, gentle shadows, shallow depth of field. Warm neutral palette: oatmeal, sand, soft sage, pale wood. Quiet, uncluttered, spa-grade. Slightly elevated 3/4 camera angle. Photorealistic, no text, no logos, no faces in focus. Landscape 3:2, 1536×1024.

**Base scenes** (opaque; keep the **lower foreground band and right edge uncluttered** so corner props can be added):

1. `package-configurator/neck-shoulder-relief.png` — [ANCHOR] A serene massage treatment room. On a linen-covered table, a close upper-back and shoulder massage in progress, therapist's hands on the shoulders, framed from the upper body only. Lower foreground and right edge kept clear and uncluttered. Folded towels, a eucalyptus sprig. Focused, professional.
2. `package-configurator/stress-reset-massage.png` — [ANCHOR] The same room, same camera angle and lighting, calmer/dimmer mood. A relaxation massage scene — candle glow, person resting face-down fully relaxed, soft towel over the lower back. Lower foreground and right edge kept clear. Evening calm.
3. `package-configurator/warm-recovery-massage.png` — [ANCHOR] The same room, same angle and lighting, warmer golden tone. A warm-recovery scene suggesting heat therapy — warm towels, a hint of steam, cozy amber light. Lower foreground and right edge kept clear. Restorative, not clinical.

**Add-on prop layers** (PNG, **fully transparent background**, prop in its assigned corner, matching base angle/scale/light — generate base first and instruct gpt-image-2 to match its lighting):

4. `package-configurator/addons/hot-stone.png` — [ANCHOR] Transparent background PNG. A neat stack of smooth dark basalt hot stones with slight steam, resting on a pale-wood surface in the **lower-left** corner of the frame, lit from upper-left. Only the stones + contact shadow visible; everything else fully transparent.
5. `package-configurator/addons/aroma-oil.png` — [ANCHOR] Transparent background PNG. A small amber glass aroma-oil bottle with dropper and a lavender sprig in the **lower-center** of the frame, lit from upper-left. Only the bottle, lavender + contact shadow visible; everything else fully transparent.
6. `package-configurator/addons/warm-towel.png` — [ANCHOR] Transparent background PNG. A neatly rolled warm white spa towel with a faint wisp of steam in the **lower-right** corner of the frame, lit from upper-left. Only the towel + contact shadow visible; everything else fully transparent.
7. `package-configurator/addons/stretching.png` — [ANCHOR] Transparent background PNG. A soft sage-green fabric stretching band, loosely coiled/draped, along the **right edge at mid-height** of the frame, lit from upper-left. Only the band + contact shadow visible; everything else fully transparent.

**Notes:** matching transparent-prop scale/light to the base is the fiddly part — expect a couple of regenerations. The 4 corners (lower-left / lower-center / lower-right / right-mid) keep all props non-overlapping when shown together.

## Out of scope
Payment, booking, new services, home-page video, regenerating aftercare/home/center imagery, visit-context changes.

## Verification
- `docker compose up --build` starts all services; MinIO seeds `package-configurator/addons/*`.
- `/aftercare-shop`: image not clickable; quantity + Add to cart posts to cart; no detail route (`/aftercare-shop/<slug>` no longer renders a detail page); deep links scroll-highlight the card.
- `/package-configurator`: any package × duration × intensity × add-on(s) computes a price (no 404); base image swaps per package; each active add-on shows its prop layer in its corner; caption shows duration/intensity; Add package posts to cart.
- AI recommendation aftercare links land on the shop anchor.
- Affected unit/smoke tests updated and green; `.\scripts\smoke-test.ps1 -SkipAi` passes.
- No visible German labels or car/BMW scaffold identity on these two pages.
