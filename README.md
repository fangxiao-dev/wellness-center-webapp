# AI-assisted Wellness Center Web Application

Solo course project for a cloud-based web application class.

The project is a Wellness Center / Massage Center web application that reuses the architecture of the group project while changing the domain. Its main product flow guides users from consultation to package recommendation, package configuration, cart, aftercare shop, and visit preparation.

## Architecture

The required runtime chain is:

```text
Browser
  -> web-frontend
  -> web-backend
  -> api-gateway
  -> services
  -> infrastructure
```

Planned services:

- `web-frontend` — browser-facing static/proxy entry
- `web-backend` — EJS page rendering and `/api/*` forwarding
- `api-gateway` — API routing, session cookie, and asset proxying
- `package-configurator` — massage package variant configuration
- `aftercare-shop` — wellness aftercare product catalog
- `ai-feature` — package and aftercare recommendation
- `visit-context-service` — center location, map, weather, and arrival context
- `shopping-cart` — Redis-backed anonymous cart

Infrastructure:

- MySQL for service-owned relational data
- Redis for cart/session state
- MinIO for package, product, and center media

## Port Allocation

Application service ports start at `4100`:

| Service | Port |
|---|---:|
| `web-frontend` | `4100` |
| `api-gateway` | `4101` |
| `web-backend` | `4102` |
| `package-configurator` | `4103` |
| `aftercare-shop` | `4104` |
| `ai-feature` | `4105` |
| `shopping-cart` | `4106` |
| `visit-context-service` | `4107` |

Infrastructure services keep their standard internal ports unless the implementation plan says otherwise.

## Documentation

- Project context: [docs/top-level-knowledge/project-context.md](docs/top-level-knowledge/project-context.md)
- Technology stack: [docs/top-level-knowledge/tech-stack.md](docs/top-level-knowledge/tech-stack.md)
- Epic plan: [docs/epic-plans/wellness-center-initialization-epic.md](docs/epic-plans/wellness-center-initialization-epic.md)
- Service boundaries: [docs/func-design/wellness-center-service-boundaries.md](docs/func-design/wellness-center-service-boundaries.md)
- Initialization design: [docs/impl-plans/2026-05-28-wellness-center-initialization-design.md](docs/impl-plans/2026-05-28-wellness-center-initialization-design.md)
- Implementation plan: [docs/impl-plans/2026-05-28-wellness-center-initialization.md](docs/impl-plans/2026-05-28-wellness-center-initialization.md)

## Current Status

The repository currently contains planning and foundation documentation. The application scaffold has not been initialized yet.

Next step: execute the implementation plan in `docs/impl-plans/2026-05-28-wellness-center-initialization.md`.

## Intended Local Development Flow

After implementation, the stack should run with:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Open:

```text
http://localhost:4100
```

Run the Windows smoke test:

```powershell
.\scripts\smoke-test.ps1 -SkipAi
```

When Gemini is configured, run:

```powershell
.\scripts\smoke-test.ps1
```

## Scope

In scope:

- complete multi-service architecture scaffold
- package configurator
- aftercare shop
- AI recommendation
- visit context
- Redis cart
- MySQL seed data
- MinIO media flow
- EJS page skeletons

Out of scope for P0:

- authentication
- payment
- clinical diagnosis
- therapist scheduling
- production CMS
- final visual polish
