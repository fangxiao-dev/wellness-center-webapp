# Harden AI recommendation context and output validation

## What to build

Make the AI recommendation service fail clearly when context endpoints fail and validate Gemini output against live package configuration and aftercare product context before returning links to the browser.

## Acceptance criteria

- [ ] Every context fetch checks `response.ok` before parsing JSON.
- [ ] Failed package, configuration, option, or product context returns a clear service error instead of malformed recommendations.
- [ ] Unknown package slugs, invalid durations, invalid intensities, disallowed add-ons, and unknown product ids are rejected or repaired deterministically.
- [ ] Returned `packageLink` and `aftercareLinks` only reference live context values.
- [ ] Local AI tests pass without requiring a live Gemini key.

## Blocked by

- Restore valid package configurations.
- Consume valid configurations in UI and AI context.

## Ownership Boundary / Out Of Scope

Owns AI context loading and response validation in `ai-feature`. Does not change Gemini model selection policy, add local fake recommendations, or query databases directly.

## Verification

Contract tests must cover:

- failed context endpoint response
- unknown package slug
- invalid duration
- invalid intensity
- disallowed add-on
- unknown aftercare product id

```powershell
npm test --prefix services/ai-feature
```

Live-key optional gate:

```powershell
npm run smoke:ai --prefix services/ai-feature
```
