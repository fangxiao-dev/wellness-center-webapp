# Project Status

Date: 2026-05-28

The Wellness Center initialization scaffold is implemented on the `codex/wellness-center-initialization` branch.

Implemented:

- Docker Compose topology for all required services and infrastructure
- service-owned MySQL seed data
- Redis-backed shopping cart service
- MinIO media seed flow
- package configurator, aftercare shop, AI feature, visit context, and API gateway services
- EJS pages for home, packages, AI consultation, aftercare shop, cart, visit context, and impressum
- Windows smoke test for the non-AI flow

Verification status:

- Service unit and route tests are expected to pass before merge.
- Full Docker Compose smoke verification should be run with `.\scripts\smoke-test.ps1 -SkipAi`.
- Live AI verification requires a configured Gemini API key.
