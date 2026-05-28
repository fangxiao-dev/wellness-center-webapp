# AGENTS.md

## Scope

This repository is the solo Wellness Center course project at `D:\CodeSpace\dbe-cloud-soloproject`.

The main goal is to initialize and maintain a cloud-style multi-service web application that reuses the group project's architecture while using a Wellness Center theme.

## Read First

- Project context: `docs/top-level-knowledge/project-context.md`
- Technology stack: `docs/top-level-knowledge/tech-stack.md`
- Service boundaries: `docs/func-design/wellness-center-service-boundaries.md`
- Active implementation plan: `docs/impl-plans/2026-05-28-wellness-center-initialization.md`

## Key Rules

- Preserve the required architecture: `web-frontend -> web-backend -> api-gateway -> services -> infrastructure`.
- Do not collapse services to simplify implementation.
- Keep domain data behind owning service APIs; do not add cross-service SQL.
- Do not expose MinIO as a direct browser media source.
- Keep P0 focused on architecture, scaffold content, and smoke-testable flows.
- Avoid committing unrelated user changes.

## Windows Search Rule

In Windows PowerShell inside Codex Desktop, do not default to bundled `rg.exe`; it may fail from the WindowsApps sandbox path.

Use this order:

1. For Git-tracked files, use `git grep -n -F "search text"`.
2. For multiple fixed strings, use `git grep -n -F -e "foo" -e "bar"`.
3. When untracked files must be included, use PowerShell `Get-ChildItem ... | Select-String -SimpleMatch`.
