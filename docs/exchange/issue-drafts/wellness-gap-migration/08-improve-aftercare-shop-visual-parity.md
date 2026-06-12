# Improve aftercare shop visual parity

## What to build

Bring the aftercare shop closer to the stronger group shop card treatment while preserving the solo Wellness Center product flow, product detail links, and direct add-to-cart behavior.

## Acceptance criteria

- [ ] Product listing still SSR-renders products from `/api/aftercare/products`.
- [ ] Cards use the aftercare API asset path for product images.
- [ ] Each product still supports detail navigation and add-to-cart.
- [ ] The visual treatment uses full-image cards with overlay or hover reveal behavior consistent with the existing UI shell.
- [ ] Browser/backend tests assert product names, image paths, detail links, and add-to-cart controls remain present.
- [ ] Product detail pages remain functional.

## Blocked by

None - can start immediately.

## Ownership Boundary / Out Of Scope

Owns aftercare list/detail presentation. Does not change aftercare product schema, create checkout behavior, or alter cart service contracts.

## Verification

```powershell
npm test --prefix services/web-backend
.\scripts\smoke-test.ps1 -SkipAi
```
