# Retheme cart review and demo checkout

## What to build

Remove old cart semantics from the cart page and make checkout copy match the Wellness Center demo scope. The cart must remain Redis-backed and continue to support package and aftercare item snapshots.

## Acceptance criteria

- [x] Runtime cart view no longer contains `item--car`, `item--merch`, German checkout copy, or old color/size labels.
- [x] Package cart items use `item--package`; aftercare items use `item--aftercare`.
- [x] Checkout is labeled as demo review/confirmation and does not imply real payment or order persistence.
- [x] Cart add, update, remove, and clear behavior still works.
- [x] Smoke test still validates fresh-session cart persistence.

## Blocked by

None - can start immediately.

## Ownership Boundary / Out Of Scope

Owns cart page presentation and cart CRUD regression coverage. Does not create an order service, payment flow, authentication, or appointment booking.

## Verification

```powershell
npm test --prefix services/shopping-cart
npm test --prefix services/web-backend
.\scripts\smoke-test.ps1 -SkipAi
```

## Completion note

Files changed:
- `services/shopping-cart/test/cart-validation.test.js`
- `services/web-backend/test/backend-routing.test.js`
- `web/views/shopping-cart.ejs`
- `docs/exchange/issue-drafts/wellness-gap-migration/06-retheme-cart-review-and-demo-checkout.md`

Test results:
- `npm test --prefix services/shopping-cart` passed.
- `npm test --prefix services/web-backend` passed.
- `.\scripts\smoke-test.ps1 -SkipAi` passed after rebuilding the running `dbe-cloud-soloproject` compose project from this worktree with `docker compose -p dbe-cloud-soloproject up -d --build`.

Remaining risks:
- Checkout remains demo-only by design; no order/payment persistence was added.
- `.env` remains ignored and uncommitted.
