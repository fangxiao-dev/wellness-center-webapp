# Technology Stack

## Role Of This Document

This document is the stable technical direction for the Wellness Center solo project. It merges the earlier `techstack-draft.md` conceptual architecture with the approved final architecture decisions.

The current priority is not selecting a novel stack. The priority is to preserve the group project's proven architecture shape while changing the domain to Wellness Center.

## Selection Principles

- **Architecture compliance first:** preserve the group project's frontend, backend, gateway, service, and infrastructure shape.
- **Working local demo first:** every major component should run through Docker Compose and be smoke-testable.
- **Service ownership:** each service owns its own data and exposes data through HTTP APIs.
- **Replaceable content:** seed data and media can be scaffold-quality, but API/storage flows must be real.
- **Avoid premature expansion:** do not add authentication, payment, CMS, or complex scheduling for P0.

## Runtime Stack

### Language And Runtime

- Node.js
- CommonJS modules
- Express services

### Presentation Layer

- EJS server-side rendering
- shared templates under `web/views`
- static assets under `web/public`
- no SPA framework for P0

### Service Layer

Required services:

- `web-frontend`
- `web-backend`
- `api-gateway`
- `package-configurator`
- `aftercare-shop`
- `ai-feature`
- `visit-context-service`
- `shopping-cart`

### Infrastructure

- MySQL 8.4 for service-owned relational data
- Redis 8 for cart/session state
- MinIO for package, product, and center media

### External Integrations

- Gemini through `@google/genai`
- Google Maps Platform for map and weather context

### Build And Local Runtime

- Docker Compose
- service Dockerfiles
- committed `package-lock.json` files
- Windows-friendly PowerShell smoke test

## Runtime Architecture

The required runtime chain is:

```text
Browser
  -> web-frontend
  -> web-backend
  -> api-gateway
  -> domain services
  -> infrastructure
```

### web-frontend

Role:

- browser-facing entry point
- serves `/static`
- exposes `localhost:3000`
- forwards non-static requests to `web-backend`

### web-backend

Role:

- renders EJS pages
- assembles server-side page data where useful
- forwards `/api/*` requests to `api-gateway`

It does not own domain truth and does not query MySQL directly.

### api-gateway

Role:

- owns the same-origin browser API boundary
- routes API calls to domain services
- manages anonymous session cookie behavior for cart
- proxies binary asset responses from owning services

It does not render EJS pages and does not query databases directly.

### package-configurator

Role:

- owns package options
- validates package variant combinations
- calculates configured package price
- resolves package media keys
- streams package media from MinIO

### aftercare-shop

Role:

- owns aftercare product catalog
- returns product list and product detail
- resolves product media keys
- streams product media from MinIO

### ai-feature

Role:

- orchestrates AI consultation
- reads package context through `package-configurator`
- reads product context through `aftercare-shop`
- calls Gemini when configured
- returns structured package and aftercare recommendations

It owns no database.

### visit-context-service

Role:

- owns center location data
- provides map destination values
- provides weather/visit preparation summary
- integrates with Google Maps Platform or fallback weather rows

### shopping-cart

Role:

- stores anonymous cart state in Redis
- supports package and aftercare item snapshots
- supports add/list/update/remove/clear behavior

## Business Module View

The main business modules are:

- **Catalog:** packages, treatments, add-ons, and product metadata
- **Recommendation:** maps user inputs to package and aftercare suggestions
- **Journey flow:** connects consultation, recommendation, configuration, cart, and shop
- **Configurator:** turns package choices into a validated configured result
- **Shop:** offers aftercare products
- **Media:** stores and serves package, product, and center visuals
- **Visit context:** provides center location, map, weather, and arrival guidance
- **Cart:** stores user-selected package and product snapshots

These modules are not all separate deployable services. P0 follows the approved runtime service split rather than over-fragmenting every business concept.

## Data Ownership

### MySQL

Separate service-owned MySQL containers:

```text
mysql-configurator
  schema: wellness_package_configurator

mysql-aftercare
  schema: wellness_aftercare_shop

mysql-visit-context
  schema: wellness_visit_context
```

Rules:

- no cross-service SQL
- no direct SQL from `web-backend`
- no direct SQL from `api-gateway`
- no direct SQL from `ai-feature`

### Redis

Redis stores:

- anonymous session cart state
- cart item snapshots
- short-lived cart data

### MinIO

MinIO stores:

```text
package-configurator/*
aftercare-shop/*
center/*
```

Browser-visible image paths should go through:

```text
Browser -> web-frontend -> web-backend -> api-gateway -> owning service -> MinIO
```

## Main Data Flows

### Configure Package

```text
Browser
  -> web-frontend
  -> web-backend
  -> api-gateway
  -> package-configurator
  -> MySQL / MinIO
```

### AI Recommendation

```text
Browser
  -> web-frontend
  -> web-backend
  -> api-gateway
  -> ai-feature
  -> package-configurator
  -> aftercare-shop
  -> Gemini
```

### Add To Cart

```text
Browser
  -> web-frontend
  -> web-backend
  -> api-gateway
  -> shopping-cart
  -> Redis
```

### Visit Context

```text
Browser
  -> web-frontend
  -> web-backend
  -> api-gateway
  -> visit-context-service
  -> MySQL
  -> Google Maps Platform or fallback weather data
```

## Why These Choices Fit

The stack mirrors the working group project, which is the central instructor requirement. It keeps delivery risk low while still demonstrating the required cloud architecture concepts:

- service decomposition
- gateway routing
- server-rendered frontend
- service-owned databases
- cache/session storage
- object storage
- external AI integration
- external map/weather integration

## Alternatives Rejected

- **Single service / monolith:** rejected because P0 is architecture compliance.
- **One MySQL container with multiple schemas:** rejected because separate containers make service ownership clearer.
- **SPA frontend:** rejected because the group project uses EJS SSR and the solo project should reuse that architecture.
- **Fresh rewrite from scratch:** rejected because retheming the working architecture is lower-risk and better aligned with the assignment.

## Current Status

Confirmed:

- Node.js / Express
- EJS SSR
- Docker Compose
- MySQL + Redis + MinIO
- Gemini AI integration
- Google Maps Platform visit context
- service-owned MySQL topology
- Package Variant Configurator
- AI recommends package plus aftercare products

Open:

- exact Google Weather API request shape during implementation
- whether AI should provide a local fallback response when `GEMINI_API_KEY` is not configured
