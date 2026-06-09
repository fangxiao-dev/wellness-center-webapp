# Wellness Center Initialization Epic

## Goal

Initialize the solo project as a complete, architecture-compliant Wellness Center application scaffold.

## Strategy

Use the approved **Retheme Existing Architecture** approach:

```text
copy working group architecture
  -> rename services
  -> replace BMW data and pages
  -> wire Wellness Center services
  -> validate with Docker Compose and smoke test
```

## Milestone Acceptance

The milestone is accepted when:

- `docker compose up --build -d` starts the full stack
- `http://localhost:4100` serves the Wellness Center app
- package configurator endpoints use MySQL and MinIO
- aftercare shop endpoints use MySQL and MinIO
- visit context endpoints use MySQL and weather fallback or Google Maps Platform data
- shopping cart persists session state in Redis
- AI recommendation endpoint returns structured package/product recommendations when configured
- `.\scripts\smoke-test.ps1 -SkipAi` passes

## Delivery Slices

1. Architecture skeleton and root runtime configuration
2. Wellness seed data and scaffold media
3. Domain services
4. Gateway and web routing
5. EJS pages and browser interactions
6. Documentation and full-stack verification

## Higher-Level References

- [Project context](../top-level-knowledge/project-context.md)
- [Technology stack](../top-level-knowledge/tech-stack.md)
- Approved design: `docs/impl-plans/2026-05-28-wellness-center-initialization-design.md`
- Detailed implementation plan: `docs/impl-plans/2026-05-28-wellness-center-initialization.md`
