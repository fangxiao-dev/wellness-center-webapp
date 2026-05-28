# Technology Stack

## Role Of This Document

This document records the technical direction for the Wellness Center solo project. It supports the project context in [project-context.md](./project-context.md) and the approved implementation plan in `docs/superpowers/plans/`.

The stack is intentionally conservative because the course priority is a complete cloud-style multi-service architecture.

## Selection Principles

- **Architecture compliance first:** preserve the group project's frontend, backend, gateway, service, and infrastructure shape.
- **Working local demo first:** use Docker Compose and stable service contracts so the evaluator can run and inspect the stack.
- **Replaceable content:** seed data and media can be scaffold-quality, but storage and API flows must be real.

## Confirmed Stack

### Runtime / Language

- Node.js
- CommonJS modules
- Express services

### UI / Frontend

- EJS server-side rendering
- shared templates under `web/views`
- static assets under `web/public`
- no SPA framework for P0

### Backend / Services

- `web-frontend` as browser-facing static/proxy entry
- `web-backend` as EJS rendering and same-origin `/api` forwarder
- `api-gateway` as browser API boundary and session cookie owner
- `package-configurator`
- `aftercare-shop`
- `ai-feature`
- `visit-context-service`
- `shopping-cart`

### Data Storage

- MySQL 8.4 for service-owned relational data
- Redis 8 for cart/session state
- MinIO for package, product, and center media

### External Integrations

- Gemini through `@google/genai`
- Google Maps Platform for map and weather context

### Build / Packaging / Deployment

- Docker Compose local stack
- service Dockerfiles using supported Node images
- committed `package-lock.json` files
- PowerShell smoke test for Windows-friendly validation

## Why These Choices Fit The Project

The stack mirrors the group project, which is the main instructor requirement. It keeps the solo project within a proven implementation pattern while allowing the domain to change from BMW to Wellness Center.

The service-owned database topology makes architecture boundaries visible in both code and Docker Compose. Redis and MinIO provide clear infrastructure roles that can be explained during the course demo.

## Alternatives Considered

- A smaller service count was rejected because P0 is architecture compliance.
- A fresh implementation from scratch was rejected because it increases risk without improving the course objective.
- A single MySQL container with multiple schemas was rejected because separate containers better mirror the group architecture.
- A frontend SPA was rejected because the group project uses EJS SSR and the solo project should reuse that pattern.

## Status

### Confirmed Choices

- Node.js / Express
- EJS SSR
- Docker Compose
- MySQL + Redis + MinIO
- Gemini AI integration
- Google Maps Platform visit context

### Open Technical Questions

- Exact Google Weather API call shape can be finalized during implementation.
- AI behavior may use a local/fallback response when `GEMINI_API_KEY` is not configured.
