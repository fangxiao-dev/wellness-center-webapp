# Harden AI recommendation context and output validation

## What to build

Make the AI recommendation service fail clearly when context endpoints fail and validate Gemini output against live package configuration and aftercare product context before returning links to the browser.

## Acceptance criteria

- [x] Every context fetch checks `response.ok` before parsing JSON.
- [x] Failed package, configuration, option, or product context returns a clear service error instead of malformed recommendations.
- [x] Unknown package slugs, invalid durations, invalid intensities, disallowed add-ons, and unknown product ids are rejected or repaired deterministically.
- [x] Returned `packageLink` and `aftercareLinks` only reference live context values.
- [x] Local AI tests pass without requiring a live Gemini key.

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

## Completion note

Completed locally in Wave 3.

Changed files:

- `services/ai-feature/src/server.js`
- `services/ai-feature/src/recommendation.js`
- `services/ai-feature/test/recommendation.smoke.js`

Behavior:

- AI context fetches now use a shared JSON context loader that checks `response.ok` before parsing and returns clear `context fetch failed: <name> returned <status>` service errors.
- Gemini package recommendations are validated against live valid configurations before response links are built.
- Unknown package slugs, unknown durations, unknown intensities, and disallowed add-ons are rejected with a deterministic service error after both configured Gemini model attempts fail.
- Finite integral string durations such as `"60"` are repaired to integer `60`; unknown repaired durations still fail against live context.
- Aftercare recommendations are validated against live product ids and must contain one to three products after dedupe.

Verification:

- Red gate observed by worker before implementation: `npm test --prefix services/ai-feature` failed for failed context fetch, unknown package, invalid duration, invalid intensity, disallowed add-on, and unknown product id cases.
- Code-quality rework red gates observed by worker: empty aftercare was accepted before the count fix; numeric string duration returned `500` before deterministic repair.
- Main-session verification after implementation and rework: `npm test --prefix services/ai-feature` passed with `recommendation smoke test passed`.
- Main-session diff check: `git diff --check -- services/ai-feature/src/server.js services/ai-feature/src/recommendation.js services/ai-feature/test/recommendation.smoke.js` exited 0 with only LF-to-CRLF warnings.
- Spec reviewer result: compliant.
- Code-quality reviewer result after rework: ready to proceed; no remaining Critical or Important issues.
- Optional live-key gate `npm run smoke:ai --prefix services/ai-feature` was not run in this issue pass.

Risk / follow-up:

- Live Gemini behavior remains covered by the later optional live-key gate, not by local unit tests.
