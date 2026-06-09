# Media Boundary Orchestration Plan

Created: 2026-06-09

## Issue Set

- #8 Move presentation images off owning-service asset routes
- #9 Add narrow homepage mp4 MinIO proxy
- #10 Replace YouTube hero with local homepage video
- #11 Document and lock the media boundary

## Dispatch Order

1. Start #8 and #9 in parallel.
2. Start #10 only after #8 and #9 are merged or integrated into the same worktree.
3. Start #11 last, after #8, #9, and #10 have landed.

## Dependency Rules

- #8 and #9 are independent.
- #10 depends on #8 and #9 because the page consumes `/media/home/home-video.mp4` and uses `/static/images/home-hero.png` as the poster.
- #11 depends on #8, #9, and #10 because documentation should describe the final boundary, not an intermediate state.

## Boundary Rules

- Presentation images stay browser-local under `/static/images/*`.
- Homepage video is the only `web-frontend -> MinIO` presentation-media exception, exposed as `/media/home/*.mp4`.
- Package, aftercare, and center business media stay behind owning-service routes under `/api/*/assets/*` when exposed to the browser.
- Do not introduce or restore a browser-visible `/minio/*` route.
- Do not widen `/media/home` into a generic bucket proxy.
- Do not keep mirroring all home presentation images into MinIO; `minio-init` should sync only homepage `.mp4` objects to the `home/` prefix.

## Coordination Notes

- Existing open issues #3 and #4 also touch `web/views/home.ejs`; treat them as same-file conflict risks, not blockers.
- If #3 or #4 lands first, rebase #8/#10 and keep their media-boundary intent unchanged.
- If #8 lands first, #10 should use `/static/images/home-hero.png` as the video poster.
- If #9 lands first, do not update the homepage to consume the video until #10.
- #9 must configure `web-frontend` with MinIO environment variables and register the `/media/home` proxy before the backend catch-all.
- #9 must copy `D:\Downloads\home-video.mp4` to `web/public/images/home-video.mp4` and seed only `.mp4` home media into MinIO.
- #11 should not restate issue implementation details; it should document final behavior and verification commands.

## Verification Gate

- `npm test` in `services/web-frontend`
  - covers Range/header preservation, `HEAD`, `405`, invalid path `400`, and non-home media fallthrough for `/media/home/*.mp4`
- `npm test` in `services/web-backend`
  - covers local native `<video>` usage, absence of YouTube references, `/static/images/*` presentation images, and no `/minio/` browser URL
- Documentation verification confirms README/architecture/status docs describe static images, homepage video, and owning-service business media separately
- `.\scripts\smoke-test.ps1 -SkipAi` after integration
