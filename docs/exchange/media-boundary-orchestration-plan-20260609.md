# Media Boundary Orchestration Plan

Created: 2026-06-09

## Issue Set

- #8 Move presentation images off owning-service asset routes
- #9 Add narrow homepage mp4 MinIO proxy
- #10 Replace YouTube hero with local homepage video
- #11 Document and lock the media boundary

## Dispatch Order

1. Start #8 and #9 in parallel.
2. Start #10 only after #9 is merged or integrated into the same worktree.
3. Start #11 last, after #8, #9, and #10 have landed.

## Dependency Rules

- #8 and #9 are independent.
- #10 depends on #9 because the page consumes `/media/home/home-video.mp4`.
- #11 depends on #8, #9, and #10 because documentation should describe the final boundary, not an intermediate state.

## Boundary Rules

- Presentation images stay browser-local under `/static/images/*`.
- Homepage video is the only `web-frontend -> MinIO` presentation-media exception, exposed as `/media/home/*.mp4`.
- Package and aftercare business media stay behind owning-service routes under `/api/*/assets/*`.
- Do not introduce or restore a browser-visible `/minio/*` route.
- Do not widen `/media/home` into a generic bucket proxy.

## Coordination Notes

- Existing open issues #3 and #4 also touch `web/views/home.ejs`; treat them as same-file conflict risks, not blockers.
- If #3 or #4 lands first, rebase #8/#10 and keep their media-boundary intent unchanged.
- If #8 lands first, #10 should use `/static/images/home-hero.png` as the video poster.
- If #9 lands first, do not update the homepage to consume the video until #10.
- #11 should not restate issue implementation details; it should document final behavior and verification commands.

## Verification Gate

- `npm test` in `services/web-frontend`
- `npm test` in `services/web-backend`
- `.\scripts\smoke-test.ps1 -SkipAi` after integration

