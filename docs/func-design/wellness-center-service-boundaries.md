# Wellness Center Service Boundaries

## Purpose

This function design records the approved service boundaries for the Wellness Center initialization milestone.

## Runtime Chain

```text
Browser
  -> web-frontend
  -> web-backend
  -> api-gateway
  -> domain services
  -> MySQL / Redis / MinIO
```

## Services

### package-configurator

Owns massage package configuration.

Data:

- packages
- durations
- intensities
- add-ons
- valid combinations
- configured prices
- package media keys

Main API:

```text
GET  /packages
GET  /options/durations
GET  /options/intensities
GET  /options/add-ons
GET  /configurations
POST /configuration/calculate
GET  /assets/*
```

### aftercare-shop

Owns aftercare product catalog.

Data:

- products
- categories
- descriptions
- prices
- product media keys

Main API:

```text
GET /products
GET /products/:productId
GET /assets/*
```

### ai-feature

Owns recommendation orchestration.

It reads package and product context through service APIs, calls Gemini when configured, and returns structured package plus aftercare recommendations. It owns no database.

### visit-context-service

Owns center visit context.

Data:

- center locations
- map destination values
- opening notes
- arrival tips
- weather fallback/context rows

Main API:

```text
GET /locations
GET /weather/current
GET /visit-summary
```

### shopping-cart

Owns Redis-backed anonymous cart state.

Cart item types:

- `package`
- `aftercare`

## Boundary Rules

- Browser code does not call domain service containers directly.
- `web-backend` does not query MySQL.
- `api-gateway` does not query MySQL.
- `ai-feature` does not query MySQL.
- Owning services stream MinIO-backed assets through API asset routes.
- Cross-service data access is through HTTP APIs.

## Acceptance

This design is satisfied when the implementation plan's smoke test validates home, visit context, configurator, aftercare product detail, cart persistence, and optional AI recommendation flows.
