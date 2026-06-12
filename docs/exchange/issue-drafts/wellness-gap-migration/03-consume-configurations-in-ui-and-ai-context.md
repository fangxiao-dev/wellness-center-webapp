# Consume valid configurations in UI and AI context

## What to build

Make the browser configurator and AI recommendation context use the valid configurations endpoint as the source of allowed choices. The UI should guide users to valid combinations, and AI should only be prompted with valid package variants.

## Acceptance criteria

- [ ] Configurator browser code fetches `/api/configurator/configurations`.
- [ ] Package, duration, intensity, and add-on controls are filtered by enabled valid combinations.
- [ ] Invalid initial route selections fall back to a valid combination without breaking page rendering.
- [ ] AI context fetches valid configurations from `package-configurator`.
- [ ] AI tests confirm the recommendation prompt/context includes valid configuration choices.

## Blocked by

- Restore valid package configurations.

## Ownership Boundary / Out Of Scope

Owns consumer behavior in the existing EJS/browser configurator and AI context loading. This issue may fetch valid configurations and include them in the AI prompt/context, but AI output validation against that context belongs to the AI hardening issue. Does not change the underlying configuration schema or add a new frontend framework.

## Verification

```powershell
npm test --prefix services/web-backend
npm test --prefix services/ai-feature
```
