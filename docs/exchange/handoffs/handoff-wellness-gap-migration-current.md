# Rolling Handoff: Wellness Gap Migration

## Handoff Mode
- Rolling current handoff; this is the only continuation entrypoint.
- Refreshed after protected checkpoint commit on 2026-06-12.

## Current Objective
- Wellness gap migration local issue drafts are implemented, verified, and protected by a local checkpoint commit.
- Owner has authorized the next session to push local `main`, rebase the feature branch onto local `main`, verify, run live-key scenario rerun if the rebase succeeds without decision blockers, push the feature branch, open a draft PR, and comment/close GitHub issues `#2`-`#6`.
- Next session should continue publish/rebase orchestration, not start new migration implementation.

## Fresh Workspace State
- Implementation worktree: `D:\CodeSpace\dbe-cloud-soloproject\.worktrees\wellness-gap-migration-wave1`.
- Main workspace / trunk checkout: `D:\CodeSpace\dbe-cloud-soloproject`.
- Branch: `codex/wellness-gap-migration-wave1`.
- Code checkpoint commit: `c303e44d6bd6abe558feb3c23ae8b9fd09af8007` (`c303e44 feat(wellness): complete gap migration`).
- Latest committed HEAD when this handoff was refreshed: `33df08e1be71b2c2f2fafa6e83e55a5e375add6e` (`33df08e docs(exchange): refresh wellness rebase handoff`).
- Fresh state before the final handoff freshness edit: `git status --short --branch` printed only `## codex/wellness-gap-migration-wave1`.
- Local `main`: `2eaddb07611d67dc21689ab31dc83fdf47db8db0`; worktree branch is `2 12` vs local `main` by `git rev-list --left-right --count HEAD...main`.
- `origin/main`: `ccf6b33484b2ac25844ed8f823c3d6082db502c2`; worktree branch is `4 0` vs `origin/main`.
- Main workspace status: `main...origin/main [ahead 14]`.
- Important: local `main` is the intended rebase base and is newer than `origin/main`; owner explicitly chose "push local main first" before feature PR creation.
- Current handoff source session has one intentional dirty file: `docs/exchange/handoffs/handoff-wellness-gap-migration-current.md`. Child must first run `git status --short --branch` and `git log -1 --oneline`; if only this handoff file is dirty, protect it before rebase with a small docs commit or confirm it is already committed.

## Completed / Not Completed
- Completed Wave 1 local issue drafts:
  - `01-enforce-minio-owned-asset-prefixes.md`
  - `02-restore-valid-package-configurations.md`
  - `04-add-google-weather-provider.md`
  - `06-retheme-cart-review-and-demo-checkout.md`
  - `07-make-visit-context-canonical.md`
  - `08-improve-aftercare-shop-visual-parity.md`
- Completed Wave 2 local issue draft:
  - `03-consume-configurations-in-ui-and-ai-context.md`
- Completed Wave 3 local issue drafts:
  - `05-harden-ai-recommendations.md`
  - `09-clean-browser-js-and-expand-regression-gates.md`
- Each completed issue draft has acceptance checkboxes marked and a completion note with changed files, verification, reviewer result, and risk.
- Not completed: none in the local Wellness gap migration issue set.
- Explicitly not done yet: push local `main`, rebase feature branch, push feature branch, draft PR creation, GitHub issue comments/closes, merge, checkout real-payment/order scope, new func-design docs.

## Verified / Not Verified
- Passed final full service test suite after Issue 09 closure:
  - `npm test --prefix api-gateway`: 15/15 passed.
  - `npm test --prefix services/web-frontend`: 8/8 passed.
  - `npm test --prefix services/web-backend`: 32/32 passed.
  - `npm test --prefix services/package-configurator`: 11/11 passed.
  - `npm test --prefix services/aftercare-shop`: 5/5 passed.
  - `npm test --prefix services/visit-context-service`: 7/7 passed.
  - `npm test --prefix services/ai-feature`: recommendation smoke test passed.
  - `npm test --prefix services/shopping-cart`: 3/3 passed.
- Passed final integration gates:
  - `docker compose config --quiet`
  - `docker compose -p dbe-cloud-soloproject up -d --build web-backend web-frontend`
  - `.\scripts\smoke-test.ps1 -SkipAi`
  - In-app Browser sanity: `/package-configurator` and `/ai-feature` load; AI page has aftercare copy, no stale `merch` copy; console errors empty.
  - `git diff --check` exited 0; output only CRLF normalization warnings.
- Earlier Wave 1 live-key gates passed:
  - `.\scripts\smoke-test.ps1` with Weather provider reporting `google` and AI recommendation passing.
  - `$env:AI_RECOMMEND_URL='http://localhost:4100/api/ai/recommend'; node services\ai-feature\test\recommendation.live-smoke.js`
- Live-key state:
  - `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_WEATHER_API_KEY`, and `SERENITY_MAPS_KEY` were synchronized to the solo project `.env` and worktree `.env`.
  - `GOOGLE_WEATHER_API_KEY` and `SERENITY_MAPS_KEY` were derived from the group project's `GOOGLE_MAPS_API_KEY`; the group env had no separate Weather key.
  - `.env` files are ignored and uncommitted.
- Not verified:
  - Optional final live-key gate was not rerun after Issue 09 cleanup; required no-AI smoke passed after final rebuild.
  - No GitHub/PR CI exists for this local dirty checkpoint because no push/PR was authorized.

## What Changed
- Asset boundary: package and aftercare owning services plus gateway now reject cross-prefix and `home/*` media keys before the wrong MinIO read.
- Configurator contract: package-configurator now has seeded valid configuration tables, `GET /configurations`, gateway proxy `GET /api/configurator/configurations`, and calculate-time valid-combination enforcement.
- Weather: visit-context-service uses Google Weather current conditions when a real server-side key succeeds, otherwise deterministic MySQL fallback; provider is included on `/weather/current` and `/visit-summary`.
- Cart: shopping cart page uses wellness package/aftercare item semantics and demo review copy, with CRUD regression for package and aftercare snapshots.
- Visit context: `/visit-context` is now the canonical SSR route for location/weather/map fallback; home is a teaser link.
- Aftercare UI: shop cards now use image-led overlay treatment while preserving SSR products, API image paths, detail links, quantity controls, and direct add-to-cart.
- Issue 03: package configurator UI and AI context now consume canonical valid configurations from `GET /api/configurator/configurations`.
- Issue 05: AI recommendation context and model output are validated against canonical packages, durations, intensities, add-ons, products, and aftercare count limits.
- Issue 09: stale browser handlers removed, shared browser helper scope isolated with an IIFE, smoke/regression gates expanded, homepage MP4 replaced to remove old group identity strings, `web/public/styles.css` removed, and docs updated for final migration state.

## Pitfalls / Do Not Repeat
- Do not run default `docker compose up` from the worktree while `dbe-cloud-soloproject` is running; it creates a `wellness-gap-migration-wave1` project and collides with MinIO console port `9001`.
- For runtime verification, use `docker compose -p dbe-cloud-soloproject up -d --build` from the implementation worktree, then smoke `http://localhost:4100`.
- `npm run smoke:ai --prefix services/ai-feature` wraps default `docker compose up`; it collided with `9001`. Use the underlying live script against the rebuilt app URL instead, or adjust compose project handling before using the wrapper.
- Google Weather `unitsSystem` must be `METRIC`, not lowercase. This was fixed after diff review.
- Worktree was created from `941fbbc` while local `main` moved ahead; do not assume the feature branch includes local main's later docs/changes.

## External State
- No new GitHub issues were created or published.
- No GitHub issue comments or closes were performed.
- No PR was created.
- No push, merge, or issue/comment external action was performed.
- Docker local runtime was rebuilt under project name `dbe-cloud-soloproject` and was running from the worktree-built images when this handoff was written. Re-check container state before relying on it.
- GitHub facts from `gh`:
  - Repo: `fangxiao-dev/wellness-center-webapp`
  - Default branch: `main`
  - `gh` is installed and authenticated as `fangxiao-dev`.
  - No open PRs were found.
  - Open issues `#2`-`#6` exist and should be commented/closed after verified publish.

## Open Issues
- No local migration issue drafts remain open.
- Rebase is still pending. Feature branch must catch up to local `main` before PR.
- Expected overlap/conflict areas:
  - `infrastructure/mysql/init/02_package_configurator.sql`
  - `services/package-configurator/src/server.js`
  - `services/package-configurator/test/package-configurator.test.js`
  - `web/views/package-configurator.ejs`
  - `web/views/aftercare-shop.ejs`
  - `web/views/aftercare-product.ejs`
  - `services/web-backend/src/server.js`
  - `services/web-backend/test/backend-routing.test.js`
  - exchange docs and issue drafts.
- Rebase policy chosen by owner:
  - Architecture/service boundaries from migration branch.
  - Configurator UI/functionality optimizations from local `main`.
  - Keep the aftercare product detail page while porting compatible main shop-grid UI improvements.
  - Preserve migration asset-prefix, configurations, AI validation, visit-context, smoke, and docs closure work.
- If a conflict requires product decisions outside that policy, stop and ask owner.

## Collaboration Contract
- Main/new session is an orchestration runner: split bounded implementation/review/verification work to subagents where useful; main session handles slicing, seaming, gate execution, checkpoint state, and handoff.
- Before editing any issue, read the relevant issue draft, related code, and related tests.
- Prefer test-first changes; add or update focused tests before implementation when feasible.
- After each issue, run and record that issue's verification gate in the issue draft completion note.
- Preserve architecture chain: Browser -> web-frontend -> web-backend -> api-gateway -> services -> infrastructure.
- Do not collapse services, do not add cross-service SQL, do not expose MinIO as direct browser media except existing `/media/home/*.mp4`, do not add new func-design docs, do not commit `.env`.
- Checkout remains demo-only unless owner explicitly expands scope.
- If existing user changes appear, read and preserve them; do not revert unrelated changes.
- Preserve unrelated untracked docs/reports/session archives, especially main workspace `docs/reports/2026-06-12-wellness-solo-architecture-review.md` and `docs/exchange/session-archives/`.
- Auto-handoff trigger: session context auto compact, or after a large quality gate when session work time exceeds 90 minutes.
- Authorized external actions for the next session only: push local `main`, push feature branch, create draft PR, comment and close GitHub issues `#2`-`#6`. Do not merge PR and do not create new GitHub issues.

## Next Action
- Read the handoff skill and auto-handoff rule, then verify workspace with `git status --short --branch` and `git log -1 --oneline`.
- Continue in `D:\CodeSpace\dbe-cloud-soloproject\.worktrees\wellness-gap-migration-wave1`.
- If the only dirty file is this rolling handoff, protect the freshness edit with a small docs commit before rebase.
- Use subagents before mutating rebase/publish state:
  - Have a reviewer/explorer inspect rebase risk and exact current git state.
  - Have a reviewer inspect conflict resolution before final verification if conflicts occur.
  - Have a reviewer inspect PR body and issue update text before GitHub writes.
- Push local `main` to `origin/main` first.
- Rebase `codex/wellness-gap-migration-wave1` onto local `main`, resolving expected conflicts by the owner policy above.
- Run required full verification gate, then live-key scenario rerun from `D:\CodeSpace\dbe-cloud-soloproject\docs\reports\2026-06-12-wellness-test-scenarios-gap-report.md` if rebase succeeds without decision blockers.
- Push feature branch with upstream, open a draft PR titled `[codex] Complete Wellness gap migration`, then comment and close GitHub issues `#2`-`#6`.
