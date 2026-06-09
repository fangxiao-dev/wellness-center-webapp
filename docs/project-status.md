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

Media boundary status:

- Presentation images are served through `/static/images/*`.
- `/media/home/*.mp4` is a homepage-only presentation video exception and must not become a generic bucket proxy.
- Package and aftercare business media use `/api/*/assets/*` behind owning-service APIs. Center media is seeded but is not currently browser-exposed; if exposed later, it must also remain behind an owning-service API.
- MinIO is not directly exposed to the browser.

Verification status:

- Service unit and route tests are expected to pass before merge.
- Focused media-boundary checks: `npm test --prefix services/web-frontend -- test/frontend-proxy.test.js` and `npm test --prefix services/web-backend -- test/home-minio-images.test.js`.
- Full Docker Compose smoke verification should be run with `.\scripts\smoke-test.ps1 -SkipAi`.
- Live AI verification requires a configured Gemini API key.
