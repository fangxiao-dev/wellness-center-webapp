# AI-assisted Wellness Center Web Application

Solo Cloud-based Web Application course project. The app demonstrates a cloud-style Wellness Center stack with massage package configuration, AI consultation, aftercare products, visit preparation, Redis cart state, service-owned MySQL data, service-owned media APIs, and a homepage-only presentation video proxy.

## Runtime Architecture

```text
Browser -> web-frontend -> web-backend -> api-gateway -> services -> infrastructure
```

Services:

- `web-frontend`: browser entry point, `/static` assets, proxy to `web-backend`
- `web-backend`: EJS pages and `/api/*` forwarding
- `api-gateway`: same-origin API routing, anonymous session cookie, binary asset proxying
- `package-configurator`: package catalog, options, valid combinations, price calculation, package media
- `aftercare-shop`: product list/detail and product media
- `ai-feature`: Gemini-backed recommendation orchestration
- `visit-context-service`: center locations, arrival context, weather fallback
- `shopping-cart`: Redis-backed anonymous cart snapshots

Infrastructure:

- MySQL 8.4 per data-owning service
- Redis 8 for cart/session state
- MinIO for package, aftercare, center business media, and the homepage video exception

## Directory Structure

```text
api-gateway/
assets/
infrastructure/
scripts/
services/
web/
docs/
docker-compose.yml
```

## Local Setup

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Open:

```text
http://localhost:4100
```

Accepted SSR pages include `/`, `/package-configurator`, `/package-configurator/:package/:duration/:intensity/:addon`, `/ai-feature`, `/aftercare-shop`, `/aftercare-shop/:productId`, `/shopping-cart`, `/visit-context`, and `/impressum`.

Run the smoke test without live AI:

```powershell
.\scripts\smoke-test.ps1 -SkipAi
```

Run with Gemini configured:

```powershell
.\scripts\smoke-test.ps1
```

## Test Commands

Run all service tests with this verification sequence:

```powershell
npm test --prefix api-gateway
npm test --prefix services/web-frontend
npm test --prefix services/web-backend
npm test --prefix services/package-configurator
npm test --prefix services/aftercare-shop
npm test --prefix services/visit-context-service
npm test --prefix services/ai-feature
npm test --prefix services/shopping-cart
```

Focused media-boundary verification:

```powershell
npm test --prefix services/web-frontend -- test/frontend-proxy.test.js
npm test --prefix services/web-backend -- test/home-minio-images.test.js
```

## Browser Media Boundary

The browser has three media paths:

- Presentation images: `/static/images/*`
- Homepage video exception: `/media/home/*.mp4`
- Business media: `/api/*/assets/*`

Presentation images are static frontend files under `web/public/images` and are served by `web-frontend` through `/static/images/*`. They are not mirrored to MinIO and are not read through package configurator asset routes.

The `/media/home/*.mp4` path is a homepage-only presentation video exception. `web-frontend` may proxy those MP4 requests to the MinIO `home/*.mp4` objects, but `/media/home` must not become a generic bucket proxy for images, package media, product media, center media, nested paths, or non-MP4 files.

Browser-visible package and aftercare business media uses `/api/*/assets/*`, routed through `web-frontend`, `web-backend`, `api-gateway`, and then the owning service. Center media is seeded for the stack but is not currently exposed through a browser asset route; if it becomes browser-visible, it must stay behind an owning-service API rather than `/static`, `/media/home`, or direct MinIO. MinIO is not directly exposed to the browser.

## MinIO Media Prefixes

- `package-configurator/*`
- `aftercare-shop/*`
- `center/*`
- `home/*.mp4` for the homepage-only presentation video exception

## Scaffold Asset Slots

The restored group-style frontend keeps its media positions and now uses Wellness Center media. Replace these filenames later with improved Wellness Center media using the same browser paths or service-owned object prefixes:

- `web/public/images/wellness-stage-loop.png`
- `web/public/images/wellness-ai-hero.png`
- `web/public/images/aftercare-preview.png`
- `web/public/images/package-relief.png`
- `web/public/images/package-recovery.png`
- `assets/package-configurator/*.png`
- `assets/aftercare-shop/*.png`

## Notes

The AI feature returns `503` when `GEMINI_API_KEY` is missing or left as `replace_me`. Use `-SkipAi` for local smoke tests without credentials.
