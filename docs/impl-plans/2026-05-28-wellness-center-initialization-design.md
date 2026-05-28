# Wellness Center Solo Project Initialization Design

Date: 2026-05-28

## 1. Purpose

This design defines how to initialize the solo course project in `D:\CodeSpace\dbe-cloud-soloproject` by reusing the architecture of the group project in `D:\CodeSpace\dbe-cloud-groupproject`.

The project theme is **AI-assisted Wellness Center Web Application**. The product is a professional wellness / massage center platform, not a resort, hotel, clinic, or medical diagnosis system. The core business object is a massage-focused, goal-oriented wellness package.

The P0 priority is architecture compliance. The solo project must preserve the group project's runtime architecture shape:

```text
web frontend
  -> web backend
  -> api gateway
  -> services:
       configurator
       aftercare-shop
       AI feature
       visit-context
       shopping-cart
  -> infrastructure:
       MySQL + Redis + MinIO
```

The implementation may use scaffold content and placeholder assets, but the full infrastructure and request chain must be wired end to end.

## 2. Group Project Findings

The group project is a working BMW-themed multi-service application. Its architecture is suitable as the base for the solo project because it already demonstrates the course requirements:

- browser-facing frontend container
- backend EJS rendering layer
- API gateway
- multiple domain microservices
- service-owned MySQL instances
- Redis session/cart state
- MinIO object storage
- AI integration through Gemini
- map/location integration
- Docker Compose orchestration
- smoke test script for full-stack validation

Important reusable structures:

```text
api-gateway/
services/web-shop-frontend/
services/web-shop-backend/
services/car-configurator/
services/merch-shop/
services/ai-feature/
services/route-service/
services/shopping-cart/
infrastructure/mysql/
assets/
web/views/
scripts/smoke-test.ps1
docker-compose.yml
.env.example
README.md
```

The group project's key request chain is:

```text
Browser
  -> web-shop-frontend
  -> web-shop-backend
  -> api-gateway
  -> domain services
  -> MySQL / Redis / MinIO
```

The solo project should reuse this shape directly, while replacing BMW domain concepts with Wellness Center concepts.

## 3. Approved Migration Approach

Use **Retheme Existing Architecture**.

This means the solo project should be initialized by adapting the working group project structure rather than writing a fresh architecture from scratch. The implementation should preserve the proven container topology, proxy flow, MySQL seed pattern, MinIO image flow, Redis cart behavior, and EJS rendering style.

Domain mapping:

```text
web-shop-frontend    -> web-frontend
web-shop-backend     -> web-backend
api-gateway          -> api-gateway
car-configurator     -> package-configurator
merch-shop           -> aftercare-shop
ai-feature           -> ai-feature
route-service        -> visit-context-service
shopping-cart        -> shopping-cart
```

This approach is preferred because the course grading priority is architectural completeness. Building fresh files would create avoidable risk in the proxy, asset, seed, and infrastructure wiring.

## 4. Runtime Architecture

The solo project runtime topology is fixed:

```text
Browser
  -> web-frontend
  -> web-backend
  -> api-gateway
  -> package-configurator
  -> aftercare-shop
  -> ai-feature
  -> visit-context-service
  -> shopping-cart
  -> infrastructure
```

### web-frontend

Responsibilities:

- expose the browser-facing host port, expected as `localhost:4100`
- serve shared static assets under `/static`
- provide a lightweight `/health` endpoint
- forward non-static browser requests to `web-backend`

It does not render EJS pages and does not call domain services directly.

### web-backend

Responsibilities:

- render EJS pages
- assemble server-side page data when useful
- keep browser routes stable
- forward same-origin `/api/*` requests to `api-gateway`

It does not own business truth and does not connect to MySQL, Redis, or MinIO directly.

### api-gateway

Responsibilities:

- route browser API requests to the correct domain service
- maintain anonymous session cookie behavior for `shopping-cart`
- proxy binary asset responses from owning services
- keep internal service URLs out of browser code

It does not render pages and does not connect to databases.

### domain services

Domain services own business behavior and infrastructure access. Cross-service data access happens through HTTP APIs only.

### infrastructure

The infrastructure layer contains:

- service-owned MySQL containers
- Redis for cart/session state
- MinIO for media object storage

## 5. Service Boundaries

### package-configurator

This service is the source of truth for massage package configuration.

It owns:

- packages
- durations
- intensities
- add-ons
- valid package combinations
- configured prices
- package media object keys

The configurator is a **Package Variant Configurator**. It configures the product, not the appointment. Date, time, and booking context remain outside this service.

Example configured package:

```text
Package: Neck & Shoulder Relief
Duration: 60 min
Intensity: Medium
Add-on: Hot Stone
Price: 89 EUR
```

Planned API surface:

```text
GET  /packages
GET  /options/durations
GET  /options/intensities
GET  /options/add-ons
GET  /configurations
GET  /configurations/:id
POST /configuration/calculate
GET  /assets/*
```

### aftercare-shop

This service is the source of truth for aftercare product catalog data.

It owns:

- products
- product categories
- prices
- descriptions
- product media object keys

Planned API surface:

```text
GET /products
GET /products/:productId
GET /assets/*
```

### ai-feature

This service owns the AI recommendation workflow. It is an integration/orchestration service and owns no database.

It should:

- accept a consultation prompt
- fetch package/configuration context from `package-configurator`
- fetch product context from `aftercare-shop`
- call Gemini when `GEMINI_API_KEY` is configured
- return structured recommendations

Output should include:

- recommended package configuration
- configurator link or selected option fields
- recommended aftercare product cards/links
- concise rationale

It must not query MySQL directly. Domain truth stays behind service APIs.

### visit-context-service

This service owns Wellness Center visit context. It replaces the group project's route-service in business meaning while preserving the architecture role.

It owns:

- center locations
- address and destination values for maps
- opening/arrival notes
- weather location metadata
- visit preparation summary

Map and weather are intentionally grouped together because both support the user before visiting the center. The implementation can use Google Maps Platform for Maps JavaScript and Weather API integration. P0 may provide weather fallback/mock data if external weather setup is not configured yet.

Planned API surface:

```text
GET /locations
GET /weather/current
GET /visit-summary
```

### shopping-cart

This service remains `shopping-cart` to maximize reuse of the group project architecture and behavior.

It owns Redis-backed anonymous cart state:

- configured package snapshots
- aftercare product items
- quantities
- price snapshots
- image URLs
- details metadata

Example configured package cart item:

```json
{
  "type": "package",
  "name": "Neck & Shoulder Relief",
  "price": 89,
  "imageUrl": "/api/configurator/assets/package-configurator/neck-relief.jpg",
  "quantity": 1,
  "details": {
    "duration": "60 min",
    "intensity": "Medium",
    "addOns": ["Hot Stone"]
  }
}
```

## 6. Data Ownership

The project uses one MySQL container per DB-backed service, matching the group project.

```text
mysql-configurator
  schema: wellness_package_configurator

mysql-aftercare
  schema: wellness_aftercare_shop

mysql-visit-context
  schema: wellness_visit_context
```

`shopping-cart` uses Redis and does not need MySQL for P0.

`ai-feature` owns no database.

Rules:

- no cross-service SQL
- no direct database access from `web-backend`
- no direct database access from `api-gateway`
- no direct database access from `ai-feature`
- service-owned schema names should be fixed architecture constants
- local seed containers should initialize each DB-backed service, following the group project's `seed-service.sh` pattern

## 7. MinIO Asset Boundary

MinIO stores non-relational media objects:

```text
package-configurator/*
aftercare-shop/*
center/*
```

Browser-visible media routes should flow through the application boundary:

```text
Browser
  -> web-frontend
  -> web-backend
  -> api-gateway
  -> owning service
  -> MinIO
```

Planned public API asset routes:

```text
GET /api/configurator/assets/*
GET /api/aftercare/assets/*
GET /api/visit-context/assets/*
```

The browser should not directly use the MinIO API port. The MinIO console/debug port may remain available locally if needed.

## 8. Frontend Pages

The P0 frontend scope is complete page skeleton plus basic interactions. Pages should be functional and API-backed, but visual content may be scaffold-quality and replaceable.

Required routes:

```text
/
/package-configurator
/package-configurator/:package/:duration/:intensity/:addon
/ai-feature
/aftercare-shop
/aftercare-shop/:productId
/shopping-cart
/visit-context
/impressum
```

### Home

Purpose:

- introduce the Wellness Center
- link to consultation, configurator, shop, and visit context
- show selected packages/products and a weather/visit snippet

### Package Configurator

Purpose:

- select package, duration, intensity, and add-ons
- calculate configured package price and image through API
- add configured package snapshot to cart

### AI Feature

Purpose:

- accept consultation-style user input
- return package recommendation plus aftercare product recommendations
- link into configurator and shop/product pages

### Aftercare Shop

Purpose:

- show product catalog from `aftercare-shop`
- allow products to be added to cart

### Product Detail

Purpose:

- render a single aftercare product
- show related/recommended products if available
- allow add-to-cart

### Shopping Cart

Purpose:

- show configured package and product cart items
- update quantities where appropriate
- remove items
- clear cart

### Visit Context

Purpose:

- show center location
- show map/arrival context
- show weather or visit preparation summary

### Impressum

Purpose:

- course/project identity page
- avoid BMW or group-project identity leakage

## 9. Main User Flows

### Flow A: Configure then cart

```text
Home
  -> Package Configurator
  -> POST /api/configurator/configuration/calculate
  -> POST /api/cart/items
  -> Shopping Cart
```

### Flow B: AI recommendation

```text
AI Feature
  -> POST /api/ai/recommend
  -> package recommendation link
  -> aftercare product cards
  -> Package Configurator / Aftercare Shop / Product Detail
```

### Flow C: Visit context

```text
Home or Visit Context
  -> GET /api/visit-context/locations
  -> GET /api/visit-context/weather/current
  -> map/weather/arrival summary
```

## 10. Scaffold Content Strategy

The project should initialize with replaceable scaffold content:

```text
assets/package-configurator/
  package preview images
  configured result images

assets/aftercare-shop/
  aftercare product images

web/public/images/
  home hero
  center impression images
  static presentation assets
```

Seed data should include a small but complete set:

- 3 massage packages
- 2-3 durations
- 2-3 intensity levels
- 3-5 add-ons
- several valid package combinations
- 5-8 aftercare products
- 1-2 center locations
- weather/visit context fallback rows

The content should use Wellness Center language and should not leave BMW references in page text, database rows, routes, or README examples.

## 11. Environment And Docker Compose

`.env.example` should include:

```text
MYSQL_PORT

DBE_CLOUDDEV_CONFIGURATOR
DBE_CLOUDDEV_CONFIGURATOR_PASSWORD
DBE_CLOUDDEV_CONFIGURATOR_ROOT_PASSWORD

DBE_CLOUDDEV_AFTERCARE
DBE_CLOUDDEV_AFTERCARE_PASSWORD
DBE_CLOUDDEV_AFTERCARE_ROOT_PASSWORD

DBE_CLOUDDEV_VISIT_CONTEXT
DBE_CLOUDDEV_VISIT_CONTEXT_PASSWORD
DBE_CLOUDDEV_VISIT_CONTEXT_ROOT_PASSWORD

REDIS_HOST
REDIS_PORT

MINIO_ENDPOINT
MINIO_PORT
MINIO_ROOT_USER
MINIO_ROOT_PASSWORD
MINIO_BUCKET

GEMINI_API_KEY
GEMINI_MODEL
GEMINI_FALLBACK_MODEL
GOOGLE_MAPS_API_KEY
GOOGLE_WEATHER_API_KEY
```

`GOOGLE_WEATHER_API_KEY` may be the same Google Maps Platform key as `GOOGLE_MAPS_API_KEY` if the project chooses a single-key setup. The code should tolerate missing external keys with clear fallback states.

Docker Compose should start:

- `web-frontend`
- `web-backend`
- `api-gateway`
- `package-configurator`
- `aftercare-shop`
- `ai-feature`
- `visit-context-service`
- `shopping-cart`
- `mysql-configurator`
- `mysql-configurator-seed`
- `mysql-aftercare`
- `mysql-aftercare-seed`
- `mysql-visit-context`
- `mysql-visit-context-seed`
- `redis`
- `minio`
- `minio-init`

## 12. Validation

The initialized project is not complete until the full stack can be validated.

Minimum verification:

```text
docker compose up --build
```

Then run a Windows-friendly smoke test:

```powershell
.\scripts\smoke-test.ps1 -SkipAi
```

Smoke test should validate:

- home page returns Wellness Center content
- visit-context endpoint returns location data
- visit-context weather endpoint returns current/fallback weather data
- configurator package/options endpoints return data
- configurator calculate endpoint returns a configured result
- aftercare product list returns data
- aftercare product detail returns data
- cart persists a fresh-session item through Redis
- MinIO-backed image URLs use API asset routes

When Gemini is configured:

```powershell
.\scripts\smoke-test.ps1
```

This should additionally validate structured AI recommendation output.

## 13. Non-Goals For Initialization

The initialization should not attempt:

- real payment
- user authentication
- clinical diagnosis
- therapist resource scheduling
- full appointment availability engine
- production-grade CMS
- complex multi-day itinerary planning
- final visual polish

These are outside P0. The goal is a complete, demonstrable, architecture-compliant scaffold.

## 14. Approval Summary

Approved decisions:

- fully preserve group project architecture shape
- use `visit-context-service` for map and weather context
- use Package Variant Configurator
- AI recommends package configuration plus aftercare products
- keep `shopping-cart`
- use one MySQL container per DB-backed service
- build complete page skeleton plus basic interactions
- use Retheme Existing Architecture as the implementation approach

The next step after this design is approved is to write a detailed implementation plan before scaffolding or editing project code.
