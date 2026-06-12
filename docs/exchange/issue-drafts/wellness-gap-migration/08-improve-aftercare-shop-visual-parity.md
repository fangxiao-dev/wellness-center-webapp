# Improve aftercare shop visual parity

## What to build

Bring the aftercare shop closer to the stronger group shop card treatment while preserving the solo Wellness Center product flow, product detail links, and direct add-to-cart behavior.

## Acceptance criteria

- [x] Product listing still SSR-renders products from `/api/aftercare/products`.
- [x] Cards use the aftercare API asset path for product images.
- [x] Each product still supports detail navigation and add-to-cart.
- [x] The visual treatment uses full-image cards with overlay or hover reveal behavior consistent with the existing UI shell.
- [x] Browser/backend tests assert product names, image paths, detail links, and add-to-cart controls remain present.
- [x] Product detail pages remain functional.

## Blocked by

None - can start immediately.

## Ownership Boundary / Out Of Scope

Owns aftercare list/detail presentation. Does not change aftercare product schema, create checkout behavior, or alter cart service contracts.

## Verification

```powershell
npm test --prefix services/web-backend
.\scripts\smoke-test.ps1 -SkipAi
```

## Completion note

Files changed:
- `web/views/aftercare-shop.ejs`
- `web/views/aftercare-product.ejs`
- `services/web-backend/test/backend-routing.test.js`

Test results:
- `npm test --prefix services/web-backend` passed.
- `.\scripts\smoke-test.ps1 -SkipAi` passed.
- Browser check against `http://localhost:4100/aftercare-shop` and `/aftercare-shop/heated-neck-wrap` confirmed API-backed images, detail links, add-to-cart controls, overlay cards, and detail-page slug metadata.

Remaining risks:
- Visual verification was limited to the running local stack and DOM/style checks; no screenshot artifact was committed.
