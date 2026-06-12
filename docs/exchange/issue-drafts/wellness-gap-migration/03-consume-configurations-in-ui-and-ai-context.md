# Consume valid configurations in UI and AI context

## What to build

Make the browser configurator and AI recommendation context use the valid configurations endpoint as the source of allowed choices. The UI should guide users to valid combinations, and AI should only be prompted with valid package variants.

## Acceptance criteria

- [x] Configurator browser code fetches `/api/configurator/configurations`.
- [x] Package, duration, intensity, and add-on controls are filtered by enabled valid combinations.
- [x] Invalid initial route selections fall back to a valid combination without breaking page rendering.
- [x] AI context fetches valid configurations from `package-configurator`.
- [x] AI tests confirm the recommendation prompt/context includes valid configuration choices.

## Blocked by

- Restore valid package configurations.

## Ownership Boundary / Out Of Scope

Owns consumer behavior in the existing EJS/browser configurator and AI context loading. This issue may fetch valid configurations and include them in the AI prompt/context, but AI output validation against that context belongs to the AI hardening issue. Does not change the underlying configuration schema or add a new frontend framework.

## Verification

```powershell
npm test --prefix services/web-backend
npm test --prefix services/ai-feature
```

## Completion note

Completed locally in Wave 2.

Changed files:

- `web/views/package-configurator.ejs`
- `services/ai-feature/src/server.js`
- `services/web-backend/test/browser-interactions.test.js`
- `services/ai-feature/test/recommendation.smoke.js`

Behavior:

- The inline configurator now fetches `/api/configurator/configurations`, normalizes enabled combinations, derives available package/duration/intensity/add-on controls from those combinations, and reconciles invalid route selections to a valid configuration before rendering and calculation.
- The AI recommendation service now fetches `${CONFIGURATOR_URL}/configurations` plus aftercare products and includes valid package configurations in the Gemini system prompt instead of independent package/option lists.
- AI output validation against the valid configuration context remains out of scope for Issue 05.

Verification:

- Red gate observed by worker before implementation: `npm test --prefix services/web-backend` failed because the configurator did not fetch `/api/configurator/configurations`; `npm test --prefix services/ai-feature` failed because AI still fetched old configurator option endpoints.
- Main-session verification after implementation: `npm test --prefix services/web-backend` passed 28/28 tests.
- Main-session verification after implementation: `npm test --prefix services/ai-feature` passed with `recommendation smoke test passed`.
- Spec reviewer result: compliant.
- Code-quality reviewer result: ready to proceed, with only a minor residual note that browser configurator tests are source/regex-level rather than a full browser execution harness.

Risk / follow-up:

- Full browser execution of configurator fallback behavior is not covered yet; final Issue 09 regression work can decide whether to add a behavioral browser-script harness.
