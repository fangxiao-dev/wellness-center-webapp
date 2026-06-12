# Retheme cart review and demo checkout

## What to build

Remove old cart semantics from the cart page and make checkout copy match the Wellness Center demo scope. The cart must remain Redis-backed and continue to support package and aftercare item snapshots.

## Acceptance criteria

- [ ] Runtime cart view no longer contains `item--car`, `item--merch`, German checkout copy, or old color/size labels.
- [ ] Package cart items use `item--package`; aftercare items use `item--aftercare`.
- [ ] Checkout is labeled as demo review/confirmation and does not imply real payment or order persistence.
- [ ] Cart add, update, remove, and clear behavior still works.
- [ ] Smoke test still validates fresh-session cart persistence.

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

