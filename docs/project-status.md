# Project Status

Date: 2026-05-28

The Wellness Center initialization scaffold is implemented on the `codex/wellness-center-initialization` branch.

Implemented:

- Docker Compose topology for all required services and infrastructure
- service-owned MySQL seed data
- Redis-backed shopping cart service
- MinIO media seed flow
- package configurator, aftercare shop, AI feature, visit context, and API gateway services
- EJS pages for home, packages, AI consultation, aftercare shop, cart, visit context, and impressum
- Windows smoke test for the non-AI flow
- media boundary for `/static/images/*`, homepage-only `/media/home/*.mp4`, and service-owned `/api/*/assets/*`
- package configuration endpoint `GET /api/configurator/configurations`, consumed by the package UI and AI recommendation flow
- visit weather endpoint that reports `provider: "fallback"` for seeded local data or `provider: "google"` for live Google Weather responses
- demo checkout flow for reviewing cart state without creating payment, order, or fulfillment records

Media boundary status:

- Presentation images are served through `/static/images/*`.
- `/media/home/*.mp4` is a homepage-only presentation video exception and must not become a generic bucket proxy.
- Package and aftercare business media use `/api/*/assets/*` behind owning-service APIs. Center media is seeded but is not currently browser-exposed; if exposed later, it must also remain behind an owning-service API.
- MinIO is not directly exposed to the browser.
- MinIO ownership is limited to object storage for `package-configurator/*`, `aftercare-shop/*`, `center/*`, and homepage `home/*.mp4` video objects. Browser code must keep using the runtime chain `Browser -> web-frontend -> web-backend -> api-gateway -> services -> infrastructure`, not direct MinIO bucket URLs.

Configuration status:

- Local API key migration is exact: copy same-name `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GOOGLE_MAPS_API_KEY`, and `GOOGLE_WEATHER_API_KEY`.
- Map `DBE_CLOUDDEV_MERCH*` to `DBE_CLOUDDEV_AFTERCARE*`.
- Map `DBE_CLOUDDEV_ROUTE*` to `DBE_CLOUDDEV_VISIT_CONTEXT*`.
- Keep `MINIO_BUCKET=wellness-media`.
- Do not commit `.env`.
- DB-backed domain service scaffold defaults remain intentional for the course demo unless a runtime worker separately changes service env behavior. They keep `docker compose up --build` usable from `.env.example`; credentialed integrations still fail closed or fall back where implemented, including AI `503` for missing or placeholder Gemini keys and Weather fallback for missing or placeholder Google Weather keys.

Verification status:

- Service unit and route tests are expected to pass before merge.
- Focused media-boundary checks: `npm test --prefix services/web-frontend -- test/frontend-proxy.test.js` and `npm test --prefix services/web-backend -- test/home-minio-images.test.js`.
- Full Docker Compose smoke verification should be run with `.\scripts\smoke-test.ps1 -SkipAi`.
- Live AI verification requires a configured Gemini API key.
