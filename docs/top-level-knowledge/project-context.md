# Project Context

## Project Summary

- **Name:** AI-assisted Wellness Center Web Application
- **Project type:** Solo course project for a Cloud-based Web Application class
- **Purpose:** Build a Wellness Center web application that demonstrates a complete multi-service cloud architecture through guided package configuration, AI consultation, aftercare shopping, visit context, cart/session state, and media delivery.
- **Primary audience:** Course evaluator, project author, and demo users acting as wellness center customers
- **Current phase:** Project foundation, design, and implementation plan are prepared; code initialization is the next step.

## Course Context

The instructor requires two related deliverables:

- a group project
- a solo project

The solo project should reuse the group project's architecture as much as possible while using a different product theme. The reference group project is located at:

```text
D:\CodeSpace\dbe-cloud-groupproject
```

The solo project lives at:

```text
D:\CodeSpace\dbe-cloud-soloproject
```

The main grading priority for this project is architectural completeness and demonstrable cloud-style service decomposition.

## Product Positioning

This project is not a clinic system, medical diagnosis tool, hotel platform, or tourism resort website.

It is a professional **Wellness Center / Massage Center** web application centered on massage-focused, goal-oriented wellness packages.

The product concept:

```text
A user describes body tension, stress, or relaxation goals.
The system guides the user toward a suitable massage package.
The user can configure the package, add it to a cart, and extend the visit with aftercare products.
```

The AI feature is a guided recommendation helper, not a medical authority. It should recommend suitable package options and aftercare products without diagnosing disease or replacing a clinical professional.

## Product Theme

The product should feel like a specialized wellness and massage center:

- massage
- relaxation
- body relief
- recovery support
- aftercare products
- visit preparation

It should not feel like:

- a hotel booking site
- a travel resort platform
- a medical clinic
- a generic webshop

## Core Business Objects

### Treatment

A treatment is a low-level wellness or massage service capability.

Examples:

- Deep Tissue Massage
- Swedish Relaxation Massage
- Hot Stone Massage
- Aroma Massage
- Stretching Add-on

Treatments support package composition but are not the primary object sold in the P0 frontend.

### Package

A package is the core product object. Users browse, configure, receive recommendations for, and add packages to the cart.

Examples:

- Neck & Shoulder Relief
- Stress Reset Massage
- Warm Recovery Massage

Each package has:

- a goal
- a description
- a duration
- an intensity
- optional add-ons
- price information
- media references

### Journey

A journey is the user-facing narrative wrapper around a recommendation. It is not required to be a separate transactional database entity in P0.

Examples:

- Shoulder & Neck Reset Session
- Stress Relief Massage Journey

### Product

A product is an aftercare or lifestyle item sold through the shop.

Examples:

- heated neck wrap
- neck pillow
- essential oil
- stretching band
- recovery accessory

### Cart Item

The cart stores session-scoped snapshots of:

- configured package items
- aftercare product items

## Primary User Groups

### Wellness-oriented massage clients

These users are interested in relaxation or body relief but may not know which massage package fits their needs.

Common intentions:

- "My shoulders are tense. What should I book?"
- "I want a calming after-work session."
- "I do not understand the package differences."

### Direct browsers and package shoppers

These users prefer to browse packages or products directly instead of starting with AI consultation.

They may:

- browse wellness packages
- view center impressions
- check products
- add aftercare items to cart

## User Problems

### Wellness selection is difficult

Users may not understand treatment names or know which package fits their discomfort, time, or intensity preference.

### Standard massage center websites lack guidance

Many sites list services and prices but do not help users translate goals into a suitable package.

### Services feel fragmented

Individual services such as hot stone massage, aroma oil, or stretching can feel disconnected unless packaged into a coherent experience.

### Course modules can become disconnected

Configurator, webshop, media, weather, AI, cart, and storage features should serve one product flow rather than appearing as unrelated course requirements.

## Product Goals

### Goal 1: Guide users toward suitable packages

The system should help users find a suitable massage package instead of forcing them to interpret all service options alone.

### Goal 2: Make the Wellness Center theme distinct

The application should highlight massage, relaxation, body relief, visit context, and aftercare instead of hotel or resort features.

### Goal 3: Demonstrate a coherent business loop

The core loop is:

```text
Discover -> Consult -> Recommend -> Configure -> Cart -> Extend with Aftercare
```

### Goal 4: Give technical architecture a business reason

Each infrastructure component should have a clear product role:

- MySQL stores structured domain data.
- Redis stores session/cart state.
- MinIO stores package, product, and center media.
- AI recommends packages and products.
- Visit context connects map/weather data to the center visit.

## Current Milestone

Initialize the full architecture-compliant scaffold.

The initialized project should include:

- complete directory structure
- Docker Compose runtime
- all service containers
- service-owned MySQL containers and seeds
- Redis
- MinIO
- EJS frontend pages
- basic API-backed interactions
- smoke test
- documentation

The content can be scaffold-quality and replaceable. The architecture and runtime chain must be real.

## Required Runtime Architecture

The solo project must preserve this architecture shape:

```text
Browser
  -> web-frontend
  -> web-backend
  -> api-gateway
  -> services:
       package-configurator
       aftercare-shop
       ai-feature
       visit-context-service
       shopping-cart
  -> infrastructure:
       MySQL + Redis + MinIO
```

## Required Pages

P0 pages:

- `/`
- `/package-configurator`
- `/package-configurator/:package/:duration/:intensity/:addon`
- `/ai-feature`
- `/aftercare-shop`
- `/aftercare-shop/:productId`
- `/shopping-cart`
- `/visit-context`
- `/impressum`

Each primary page should be reachable and backed by real API calls where relevant.

## User Flows

### Flow 1: AI-assisted recommendation

1. User opens the AI consultation page.
2. User describes body discomfort, stress, intensity, or time preference.
3. AI returns a recommended package configuration and aftercare products.
4. User opens the configurator or product detail page from the recommendation.

### Flow 2: Configure package

1. User opens the package configurator.
2. User chooses package, duration, intensity, and add-ons.
3. Backend calculates a configured result.
4. User adds the configured package snapshot to the cart.

### Flow 3: Shop extension

1. User browses aftercare products.
2. User opens product detail.
3. User adds a product to the cart.

### Flow 4: Visit preparation

1. User opens visit context.
2. System displays center location, arrival note, map context, and weather/visit summary.

## In Scope

- Wellness Center product framing
- massage-focused package catalog
- package variant configurator
- AI recommendation for package plus aftercare products
- aftercare product catalog and product detail
- cart backed by Redis
- service-owned MySQL containers
- MinIO-backed media
- visit context with map/weather support
- complete page skeletons with basic interactions
- Docker Compose and smoke-test validation

## Out Of Scope

- medical diagnosis
- treatment prescriptions
- real payment
- authentication
- complex appointment availability
- therapist scheduling optimization
- staff portal
- CMS
- user reviews or community
- production-grade frontend polish
- arbitrary build-your-own treatment engine

## Success Criteria

The project is successful for the current milestone when:

- the application starts with Docker Compose
- `http://localhost:3000` serves the Wellness Center app
- the gateway routes to all domain services
- MySQL, Redis, and MinIO are all used in the running stack
- smoke test passes without AI
- AI smoke test can run when Gemini credentials are configured
- no BMW runtime identity remains in pages, routes, seed data, or README examples

## Repository Facts

Current durable docs:

- [Technology stack](./tech-stack.md)
- [Initialization epic](../epic-plans/wellness-center-initialization-epic.md)
- [Service boundaries](../func-design/wellness-center-service-boundaries.md)
- [Initialization design](../impl-plans/2026-05-28-wellness-center-initialization-design.md)
- [Implementation plan](../impl-plans/2026-05-28-wellness-center-initialization.md)

The former root-level `prd.md` content has been merged into this file.

## Open Questions

- Whether Google Weather API should use the same key variable as Google Maps or remain separate as `GOOGLE_WEATHER_API_KEY`.
- Whether the stack should be left running after implementation verification.
