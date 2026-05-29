# AI-assisted Wellness Center Web Application

Solo Cloud-based Web Application course project. The app demonstrates a cloud-style Wellness Center stack with massage package configuration, AI consultation, aftercare products, visit preparation, Redis cart state, service-owned MySQL data, and MinIO media delivery.

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
- MinIO for package, aftercare, center, and home media

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

Run the smoke test without live AI:

```powershell
.\scripts\smoke-test.ps1 -SkipAi
```

Run with Gemini configured:

```powershell
.\scripts\smoke-test.ps1
```

## MinIO Media Prefixes

- `package-configurator/*`
- `aftercare-shop/*`
- `center/*`
- `home/*`

Browser-visible media is served through `/api/*/assets/*` routes and never by exposing MinIO directly. Home display media is seeded from `web/public/images` into the MinIO `home/*` prefix and read through the configurator asset proxy.

## Scaffold Asset Slots

The restored group-style frontend keeps its media positions and now uses PNG Wellness Center media. Replace these filenames later with improved Wellness Center media using the same paths or prefixes:

- `web/public/images/wellness-stage-loop.png`
- `web/public/images/wellness-ai-hero.png`
- `web/public/images/aftercare-preview.png`
- `web/public/images/package-relief.png`
- `web/public/images/package-recovery.png`
- `assets/package-configurator/*.png`
- `assets/aftercare-shop/*.png`

## Notes

The AI feature returns `503` when `GEMINI_API_KEY` is missing or left as `replace_me`. Use `-SkipAi` for local smoke tests without credentials.
