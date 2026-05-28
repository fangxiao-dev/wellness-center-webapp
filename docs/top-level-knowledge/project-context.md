# Project Context

## Project Summary

- **Name:** AI-assisted Wellness Center Web Application
- **Project type:** Course project for a cloud-based web application class
- **One-sentence purpose:** Build a Wellness Center web app that demonstrates a complete multi-service cloud architecture through package configuration, AI consultation, aftercare shop, visit context, cart, and media flows.
- **Primary audience:** Course evaluator, project author, and demo users acting as wellness center customers
- **Current phase:** Foundation and implementation planning complete; project initialization implementation has not started yet

## Background

This repository is the solo project counterpart to a completed group project in `D:\CodeSpace\dbe-cloud-groupproject`.

The instructor requirement is:

- one project is completed by a group
- one project is completed individually
- the individual project should reuse the group project's architecture as much as possible
- the individual project must use a different theme

The solo project theme is **Wellness Center**, not Wellness Resort. It should feel like a professional massage and body-relief center, not a hotel, tourism platform, clinic, or medical system.

## Product Theme

The product is a massage-focused Wellness Center application. Its core object is a goal-oriented wellness package.

Example packages:

- Neck & Shoulder Relief
- Stress Reset Massage
- Warm Recovery Massage

The product's main business loop is:

```text
Discover -> Consult -> Recommend -> Configure -> Cart -> Extend with Aftercare
```

## Key User Scenarios

### Scenario 1: Configure A Package

A user opens the package configurator, selects a package, duration, intensity, and add-ons, then receives a configured result with price and media. The user can add that configured package snapshot to the cart.

### Scenario 2: Get AI Consultation

A user describes tension or relaxation goals. The AI feature recommends both a package configuration and relevant aftercare products. The user can open the configurator or product detail pages from the recommendation.

### Scenario 3: Prepare For A Visit

A user checks the center location, arrival notes, map context, and weather/visit preparation summary before going to the center.

## Goals And Scope

### Current Milestone

Initialize a full architecture-compliant scaffold of the solo project.

### Success Condition

The project can run locally with Docker Compose and demonstrate this chain:

```text
web frontend -> web backend -> api gateway -> domain services -> MySQL / Redis / MinIO
```

### Minimum Usable Closed Loop

The minimum closed loop is:

```text
Home
  -> Package Configurator
  -> calculate configured package
  -> add to cart
  -> view persisted cart item
```

AI, aftercare shop, visit context, and media routes must also be wired enough for smoke-test validation.

### Required Deliverables

- Docker Compose full stack
- `web-frontend`
- `web-backend`
- `api-gateway`
- `package-configurator`
- `aftercare-shop`
- `ai-feature`
- `visit-context-service`
- `shopping-cart`
- service-owned MySQL containers
- Redis cart/session storage
- MinIO media storage
- EJS page skeletons with basic interactions
- seed data and replaceable scaffold media
- Windows smoke test
- README and architecture documentation

### In Scope

- full architecture reuse from the group project
- Wellness Center retheme
- package variant configurator
- aftercare product catalog
- AI recommendation for package plus aftercare products
- visit context with map/weather preparation
- Redis-backed shopping cart
- MinIO-backed media routes through owning services
- complete page skeletons with basic API-backed interactions

### Out Of Scope

- real payment
- authentication
- medical diagnosis
- treatment prescription
- therapist scheduling optimization
- production CMS
- real appointment availability engine
- final visual polish

## Constraints

- P0 priority is architecture compliance, not feature novelty.
- The service topology must match the group project's architecture shape.
- Browser traffic should enter through `web-frontend`.
- `web-backend`, `api-gateway`, and AI must not query databases directly.
- DB-backed services use separate MySQL containers.
- MinIO should not be exposed as a browser-facing media source.
- Existing user changes to `prd.md` must not be reverted or casually committed.

## Repository Facts

### Current Root Files

- `prd.md` contains the product PRD and has uncommitted user edits.
- `techstack-draft.md` contains an earlier conceptual architecture and technical direction draft.
- `docs/superpowers/specs/2026-05-28-wellness-center-initialization-design.md` contains the approved design.
- `docs/superpowers/plans/2026-05-28-wellness-center-initialization.md` contains the approved implementation plan.

### Planned Runtime Entrypoints

- `docker-compose.yml`
- `services/web-frontend/src/server.js`
- `services/web-backend/src/server.js`
- `api-gateway/src/server.js`
- service `src/server.js` files under `services/*`

### Planned Test Entrypoints

- `npm test --prefix api-gateway`
- `npm test --prefix services/web-frontend`
- `npm test --prefix services/web-backend`
- `npm test --prefix services/package-configurator`
- `npm test --prefix services/aftercare-shop`
- `npm test --prefix services/visit-context-service`
- `npm test --prefix services/ai-feature`
- `.\scripts\smoke-test.ps1 -SkipAi`

## Candidate Technical Direction

The technical direction is fixed by architecture reuse:

- Node.js and Express services
- EJS server-side rendered pages
- Docker Compose local runtime
- MySQL 8.4 service-owned relational stores
- Redis 8 for cart/session state
- MinIO for media object storage
- Gemini for AI consultation
- Google Maps Platform for map/weather context

See [tech-stack.md](./tech-stack.md).

## Confirmed Facts

- The project is a solo course project.
- The theme is Wellness Center.
- The architecture must follow the group project structure closely.
- The configured product is a package variant, not an appointment booking.
- AI recommends package configuration plus aftercare products.
- The cart remains `shopping-cart`.
- MySQL uses separate service-owned containers.
- Frontend P0 requires complete page skeletons with basic interactions.

## Reasonable Inferences

- Implementation should start from the group project skeleton and retheme it.
- Final demo quality depends more on end-to-end architecture proof than polished content.
- Placeholder media and seed data are acceptable if they are replaceable and wired through real MinIO/API paths.

## Open Questions

- Whether the user wants a canonical agent entry file such as `AGENTS.md` after project foundation is complete.
- Whether `GOOGLE_WEATHER_API_KEY` should be separate from `GOOGLE_MAPS_API_KEY` or treated as the same Maps Platform key in implementation.
- Whether the stack should be left running after implementation verification.
