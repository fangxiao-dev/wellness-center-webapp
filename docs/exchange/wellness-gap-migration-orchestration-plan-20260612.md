# Wellness Gap Migration Orchestration Plan

Execution mode: implement the linked issue drafts, not this parent plan, using `superpowers:subagent-driven-development` or the repository's equivalent per-issue execution workflow. This parent plan is the scheduler/integrator surface; implementation detail lives in `docs/impl-plans/2026-06-12-wellness-gap-migration.md` and the issue drafts under `docs/exchange/issue-drafts/wellness-gap-migration/`.

## Goal / Architecture

Close the architecture and theme gaps from `docs/reports/2026-06-12-wellness-solo-architecture-review.md` while preserving:

```text
Browser -> web-frontend -> web-backend -> api-gateway -> services -> infrastructure
```

The project should remain a cloud-style Wellness Center app with EJS SSR, gateway-owned browser API routing, service-owned MySQL, Redis cart state, MinIO media behind owning service APIs, Gemini AI orchestration, and map/weather visit context.

## Prerequisites / Cross-Plan Dependencies

- Source bulk implementation plan: `docs/impl-plans/2026-06-12-wellness-gap-migration.md`.
- Gap source: `docs/reports/2026-06-12-wellness-solo-architecture-review.md`.
- Existing architecture docs remain valid and should be updated only after implementation changes land.
- Owner must provide local `.env` keys for live Gemini and Google Weather verification. The committed fallback path must work without keys.
- No GitHub issues are published yet. Local draft files are temporary execution drafts until the user approves publishing.

## Preflight Gate

Run before assigning Wave 1:

```powershell
git status --short --branch
docker compose config --quiet
```

Confirm:

- Current untracked user files, including the gap report and session archives, are not removed or overwritten.
- `.env` remains untracked and uncommitted.
- API key migration, if needed, is local only.
- `MINIO_BUCKET` remains `wellness-media` unless compose, seeds, docs, and smoke tests are changed together.

## HITL Checkpoints

These owner checkpoints are not worker implementation blockers unless the owner changes scope:

- User approval is required before publishing local issue drafts to GitHub.
- Owner must provide or migrate local Gemini and Google Weather keys for live-key verification.
- Owner may set `GOOGLE_WEATHER_API_KEY` to the same enabled key as `GOOGLE_MAPS_API_KEY`, or keep a separate Weather-enabled key. Default implementation reads `GOOGLE_WEATHER_API_KEY`.
- Checkout remains demo-only unless the owner explicitly asks for a real order/payment scope.

## Source Context

The current stack is already demoable and architecture-shaped. The migration focuses on hardening:

- MinIO ownership prefix enforcement.
- Valid configuration truth.
- Weather provider integration with fallback.
- AI context/output validation.
- Cart, visit context, aftercare, and browser JS cleanup.
- Regression gates that prove the architecture boundary remains intact.

## Current Baseline

- Runtime topology exists in `docker-compose.yml`.
- Smoke test passes without AI according to the gap report.
- Package and aftercare asset routes currently normalize paths but do not enforce owning prefixes.
- `GET /configurations` is documented but missing from current service/gateway implementation.
- Weather returns MySQL fallback only.
- Cart, visit context, aftercare UI, and global JS still have parity/theme gaps.

## Business / Domain Context

Core user loop:

```text
Discover -> Consult -> Recommend -> Configure -> Cart -> Extend with Aftercare -> Prepare Visit
```

Domain ownership stays unchanged:

- Packages and valid package variants belong to `package-configurator`.
- Products belong to `aftercare-shop`.
- Recommendation orchestration belongs to `ai-feature`.
- Location/weather visit context belongs to `visit-context-service`.
- Cart state belongs to `shopping-cart`.

## Issues Table

| Draft | Type | Blocked by | Execution owner | Coverage |
| --- | --- | --- | --- | --- |
| `01-enforce-minio-owned-asset-prefixes.md` | AFK | None | Media boundary worker | C1, N2 |
| `02-restore-valid-package-configurations.md` | AFK | None | Configurator contract worker | I1 |
| `03-consume-configurations-in-ui-and-ai-context.md` | AFK | 02 | Configurator consumer worker | I1, I4 |
| `04-add-google-weather-provider.md` | AFK | None | Visit context worker | I2 |
| `05-harden-ai-recommendations.md` | AFK | 02, 03 | AI worker | I4 |
| `06-retheme-cart-review-and-demo-checkout.md` | AFK | None | Cart UX worker | I5, N3 |
| `07-make-visit-context-canonical.md` | AFK | None | Visit UI worker | I6 |
| `08-improve-aftercare-shop-visual-parity.md` | AFK | None | Aftercare UI worker | I7 |
| `09-clean-browser-js-and-expand-regression-gates.md` | AFK | 01-08 | Integrator/validator | I8, N1, N2, N3 |

## Parallel Assignment Plan

Wave 1 can run in parallel:

- Issue 01 media boundary.
- Issue 02 valid configurations.
- Issue 04 weather provider.
- Issue 06 cart retheme.
- Issue 07 canonical visit context.
- Issue 08 aftercare visual parity.

Wave 2 can run after its blockers:

- Issue 03 after Issue 02.

Wave 3 is sequential:

- Issue 05 after Issues 02 and 03.
- Issue 09 after Issues 01 through 08.

## Slice / Issue Ownership Boundaries

- Media worker must not change configurator pricing or aftercare product schema.
- Configurator contract worker must keep domain truth inside `package-configurator`.
- AI worker must not query MySQL or invent local package/product truth.
- Visit context worker must not expose API keys to browser code.
- Cart worker must not add payment/order scope.
- UI workers must preserve SSR and existing route names.
- Integrator must not replace service-specific tests with only smoke testing.

## Handoff Contracts

Each issue handoff must include:

- Files changed.
- Tests run and exact command results.
- Any changed API response shape.
- Whether Docker Compose was restarted or only unit tests ran.
- Any local key assumptions.
- Remaining risk for final integration.

Workers must not revert unrelated user changes. If a shared file such as `web/public/app.js`, `scripts/smoke-test.ps1`, or `api-gateway/src/server.js` has changed since issue assignment, re-read it before editing.

## Seaming / Integration Seams To Watch

- Asset-prefix validation occurs in both public path normalization and owning service normalization. The owning service rule is the durable business boundary.
- Valid configurations affect SQL seed data, service endpoints, gateway routes, browser controls, AI context, and smoke tests.
- Weather provider mapping must keep fallback deterministic for no-key demos.
- AI validation must use current context values and avoid returning stale links.
- Visit context UI and global JS cleanup may touch the same browser code.
- Aftercare card styling must not break add-to-cart data attributes.
- Smoke test expansion should not require live Gemini or Google Weather keys unless explicitly running live-key gates.

## Guardrails

- Keep `web-frontend -> web-backend -> api-gateway -> services -> infrastructure`.
- No direct service container calls from browser code.
- No direct MySQL access from `web-backend`, `api-gateway`, or `ai-feature`.
- No direct browser MinIO source except `/media/home/*.mp4`.
- No cross-service SQL.
- No committed `.env`.
- No new func-design document for this migration.
- Keep checkout demo-only unless owner explicitly expands scope.

## Verification Policy / Final Gate

Focused gates are defined in each issue draft. Final integration gate:

```powershell
npm test --prefix api-gateway
npm test --prefix services/web-frontend
npm test --prefix services/web-backend
npm test --prefix services/package-configurator
npm test --prefix services/aftercare-shop
npm test --prefix services/visit-context-service
npm test --prefix services/ai-feature
npm test --prefix services/shopping-cart
docker compose config --quiet
.\scripts\smoke-test.ps1 -SkipAi
```

Optional live-key gate:

```powershell
.\scripts\smoke-test.ps1
npm run smoke:ai --prefix services/ai-feature
```

Final status should be "ready for execution" only after review approves the parent plan and issue drafts and the user approves the breakdown.

## Execution Status Update

Updated at: 2026-06-12 after local execution.

- Local issue drafts `01` through `09` are complete in the implementation worktree.
- Required final service test suite, compose config, no-AI smoke, browser sanity, and `git diff --check` passed.
- Optional final live-key gate was not rerun after Issue 09 cleanup; earlier Wave 1 live-key Weather/AI verification passed.
- No GitHub issue publishing, push, PR, merge, or commit was performed.
- The next action is owner-directed integration: checkpoint commit, optional live-key rerun, branch/main integration strategy, or stop with the verified dirty worktree preserved.
