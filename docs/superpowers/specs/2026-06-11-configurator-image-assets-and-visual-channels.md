# Package Configurator — Image Assets & Visual Channels

Date: 2026-06-11
Status: Design reference (single source of truth for all configurator imagery)
Related: `2026-05-29-wellness-shop-configurator-redesign-design.md` (spec), `../plans/2026-05-29-wellness-shop-configurator-redesign.md` (plan)

This document owns **everything image-related** for the package configurator: the visual-channel model, the gpt-image-2 Context prompt, every per-image prompt, the free CSS/SVG layer specs, the prop-zone map, and the asset manifest. The spec and implementation plan reference this file and do **not** duplicate image descriptions.

---

## 1. Goal — make every option visually expressible

A car configurator works because **every option changes a visible variable**. Massage options split into physical props (visible) and abstract service parameters (not directly photographable). We make every axis visible by assigning each one its **own, non-competing visual channel**:

| Option axis | Visual channel | Implementation | Asset cost |
|---|---|---|---|
| **Package** | base scene (body area) | generated image | shared with intensity below |
| **Intensity** | hand gesture / pressure depth in the base scene **+** a pressure glow on the hands | base image (per package×intensity) **+** CSS radial | base images + free CSS |
| **Duration** | global light / time-of-day grade **+** phase timeline rail **+** lit candle count | CSS filter+gradient **+** DOM rail **+** 1 candle sprite | mostly free + 1 image |
| **Add-ons** | discrete physical props in fixed corners | transparent PNG layers | 4 images |

**Channel separation is the whole trick:** Duration owns *global* light (whole frame), Intensity owns *local* light (a glow on the hands) + gesture, Add-ons own *discrete objects*. They never visually collide, so the user always knows which control did what.

### Composite layer stack (bottom → top)
```
z0  base scene            ← package × intensity (generated)
z1  duration light grade  ← CSS overlay + filter (free)
z2  pressure glow         ← CSS radial on the hands (free)
z3  add-on prop layers    ← 4 transparent PNGs, fixed corners (generated)
z4  candle sprites        ← 1 candle PNG, rendered ×1/2/3 by duration (generated)
z5  phase rail (chrome)   ← DOM/SVG under the preview (free)
```

---

## 2. Prop-zone map (keep these EMPTY in base scenes)

Five non-overlapping zones so every prop can show at once without colliding:

```
┌─────────────────────────────────────────────┐
│ [① upper-left shelf: CANDLES]                │
│                                              │
│            (therapist hands / glow)       [⑤ │
│         ════ massage table ════           right
│                                            edge:
│                                          STRETCH]│
│ [② lower-left ] [③ lower-center] [④ lower-right]│
│   HOT STONES      AROMA OIL       WARM TOWEL  │
└─────────────────────────────────────────────┘
```

| Zone | Prop | Layer file |
|---|---|---|
| ① upper-left shelf/windowsill | lit candles (timing) | `props/candle.png` (×1/2/3 by duration) |
| ② lower-left foreground | hot stones | `addons/hot-stone.png` |
| ③ lower-center foreground | aroma oil | `addons/aroma-oil.png` |
| ④ lower-right foreground | warm towel | `addons/warm-towel.png` |
| ⑤ right edge, mid-height | stretching band | `addons/stretching.png` |

---

## 3. CONTEXT prompt (consistency anchor — prepend to EVERY image)

```text
WORLD BIBLE — reuse for EVERY image in this set.
SCENE: One single, fixed premium wellness massage studio. Every image is the
SAME room, SAME furniture, SAME camera position and framing. Treat earlier
images in this set as the ground truth and match them exactly.
CAMERA: slightly elevated 3/4 angle, ~35mm look, fixed framing. The linen-
covered massage table runs left-to-right across the lower-middle of the frame;
the client lies face-down, head toward the left, modestly draped with a towel.
Shallow depth of field, soft background.
LIGHT (KEEP NEUTRAL): soft, even, neutral DAYTIME studio light from the upper-
left; gentle shadows; balanced white point. Do NOT bake in warm/orange/candle-
lit grading, color casts, or heavy vignette — the scene must stay neutral so it
can be color-graded later.
PALETTE: oatmeal, sand, soft sage, warm grey, pale wood, white linen. Muted,
calm, spa-grade.
CLEAR ZONES (leave EMPTY and unobstructed in base scenes so props can be added
later): (1) upper-left shelf/windowsill, (2) lower-left foreground surface,
(3) lower-center foreground, (4) lower-right foreground, (5) right edge at mid-
height.
STYLE: photorealistic editorial wellness photography; clean, quiet, uncluttered;
no text, no logos, no brand marks; no faces in sharp focus; tasteful and modest.
FORMAT: landscape 3:2, 1536×1024.
```

**Generation workflow (critical for a 14-image set):** generate `base/neck-shoulder-relief-medium.png` first, pick the best room+camera, then use it as the **reference image** for the other 13 ("same room and camera, change only …"). The consistency of the whole set depends on this step.

---

## 4. Base scene prompts — 9 images (package × intensity, neutral light)

Each prompt = `[CONTEXT]` + the `<<delta>>`. Files: `package-configurator/base/{package-slug}-{intensity-slug}.png`.

**Package body-area** (set by package) and **gesture** (set by intensity) are the only deltas.

```text
base/neck-shoulder-relief-gentle.png
[CONTEXT] <<Framing tightens on the UPPER BACK, shoulders and neck. The
therapist's hands rest with flat, relaxed palms and soft fingers, light surface
contact only, no skin compression — a calm, feather-light touch. Neutral light;
all five clear zones empty.>>
```
```text
base/neck-shoulder-relief-medium.png
[CONTEXT] <<Upper back, shoulders and neck. Engaged palms and thumbs at the
shoulders with moderate, purposeful pressure; slight skin compression visible
under the hands. Neutral light; clear zones empty.>>
```
```text
base/neck-shoulder-relief-deep.png
[CONTEXT] <<Upper back, shoulders and neck. Deeper pressure using the thumb and
heel of the hand on the shoulder muscles; clear muscle compression and a deeper
contact shadow where pressure is applied — focused and therapeutic, not painful.
Neutral light; clear zones empty.>>
```
```text
base/stress-reset-massage-gentle.png
[CONTEXT] <<Calmer, restful FULL-BACK relaxation scene. Flat relaxed palms
gliding lightly along the mid-back, soft long strokes, feather-light contact.
Serene and quiet. Neutral light; clear zones empty.>>
```
```text
base/stress-reset-massage-medium.png
[CONTEXT] <<Full-back relaxation. Palms and thumbs gliding along the mid and
lower back with moderate pressure, slight compression under the hands. Balanced,
restful. Neutral light; clear zones empty.>>
```
```text
base/stress-reset-massage-deep.png
[CONTEXT] <<Full-back relaxation. Deeper gliding pressure with the heel of the
hand / forearm along the back muscles, clear compression and deeper shadow.
Focused but still calm. Neutral light; clear zones empty.>>
```
```text
base/warm-recovery-massage-gentle.png
[CONTEXT] <<Full-back warmth-focused recovery scene; a soft white towel draped
over the lower back (no steam, no warm color cast — keep light neutral). Flat
relaxed palms resting lightly on the back, soft contact. Neutral light; clear
zones empty.>>
```
```text
base/warm-recovery-massage-medium.png
[CONTEXT] <<Full-back warm recovery; soft towel over the lower back. Palms and
thumbs with moderate pressure on the back, slight compression. Neutral light;
clear zones empty.>>
```
```text
base/warm-recovery-massage-deep.png
[CONTEXT] <<Full-back warm recovery; soft towel over the lower back. Deeper
pressure with heel of hand / forearm, clear muscle compression and deeper
shadow. Neutral light; clear zones empty.>>
```

> **Cost escape hatch:** the gesture difference between intensities is subtle in a photo and 9 consistent images are demanding. The CSS pressure glow (§6) already expresses intensity on its own — if the 9-image set proves too costly/inconsistent, drop to 3 base scenes (`base/{package}.png`, neutral, medium gesture) and let the glow carry intensity. The frontend key convention below degrades cleanly (fall back to `base/{package}.png` when the intensity-specific file 404s).

---

## 5. Prop layer prompts — 5 images (transparent background)

All are full-frame **transparent PNGs** with the object pre-placed in its zone, lit from upper-left to match the base scenes. Generate against a chosen base as reference so scale/light match.

```text
addons/hot-stone.png
[CONTEXT] <<TRANSPARENT BACKGROUND PNG, single-object layer. A neat stack of
smooth dark basalt hot stones with a faint wisp of steam, resting on a pale-wood
surface in the LOWER-LEFT foreground zone, lit from upper-left. Only the stones
and their soft contact shadow are visible; everything else fully transparent.>>
```
```text
addons/aroma-oil.png
[CONTEXT] <<TRANSPARENT BACKGROUND PNG, single-object layer. A small amber glass
aroma-oil bottle with a dropper and a sprig of lavender, resting on a pale-wood
surface in the LOWER-CENTER foreground zone, lit from upper-left. Only the
bottle, lavender and contact shadow are visible; everything else transparent.>>
```
```text
addons/warm-towel.png
[CONTEXT] <<TRANSPARENT BACKGROUND PNG, single-object layer. A neatly rolled warm
white spa towel with a faint wisp of steam, resting on a pale-wood surface in the
LOWER-RIGHT foreground zone, lit from upper-left. Only the towel and contact
shadow are visible; everything else transparent.>>
```
```text
addons/stretching.png
[CONTEXT] <<TRANSPARENT BACKGROUND PNG, single-object layer. A soft sage-green
fabric stretching band, loosely coiled/draped along the RIGHT EDGE at mid-height
of the frame, lit from upper-left. Only the band and contact shadow are visible;
everything else transparent.>>
```
```text
props/candle.png
[CONTEXT] <<TRANSPARENT BACKGROUND PNG, single-object sprite, tightly framed. ONE
lit pale pillar candle with a soft warm flame, standing on a pale-wood shelf
surface, lit from upper-left to match the studio. Only the single candle and its
soft contact shadow are visible; everything else fully transparent. (The app
duplicates this sprite 1–3 times along the upper-left shelf to indicate session
length.)>>
```

---

## 6. Free CSS / SVG channels (no images)

These are implemented in the configurator view; values below are the design contract.

### 6.1 Duration → light / time-of-day grade
A `.config-grade` overlay `<div>` over the preview, plus a `filter` on the base layer. Interpolate by selected minutes:

| Duration | base-layer `filter` | `.config-grade` background |
|---|---|---|
| 45 min | `brightness(1.05) saturate(1.0)` | transparent |
| 60 min | `saturate(1.06) brightness(0.99)` | `linear-gradient(180deg, rgba(245,205,140,.10), rgba(245,190,120,.18))` |
| 90 min | `saturate(1.05) brightness(0.90) contrast(1.04)` | `linear-gradient(180deg, rgba(235,175,95,.16), rgba(120,70,30,.22))`, plus a `radial-gradient` vignette `rgba(25,15,5,.30)` at the edges |

Transition `filter` and overlay over ~0.5s for a smooth "light deepening" feel.

### 6.2 Duration → phase timeline rail
A DOM/SVG strip under the preview with three labeled segments — **Warm-up · Deep work · Cool-down**. Lit segment count by duration:

| Duration | lit segments |
|---|---|
| 45 min | 1 (Deep work) |
| 60 min | 2 (Warm-up + Deep work) |
| 90 min | 3 (all) |

Lit fill `#2F7A66` (sage); unlit `rgba(120,120,120,.30)`.

### 6.3 Duration → candle count
Render `props/candle.png` N times along the upper-left shelf zone: 45 → 1, 60 → 2, 90 → 3. Space copies ~36px apart horizontally.

### 6.4 Intensity → pressure glow
A `.config-glow` radial overlay centered on the therapist's hands. Approx center **46% x / 40% y** (tune to the chosen base framing).

| Intensity | radial glow |
|---|---|
| gentle | `radial-gradient(circle 220px at 46% 40%, rgba(245,205,150,.16), transparent)` |
| medium | `radial-gradient(circle 180px at 46% 40%, rgba(245,195,130,.26), transparent)` |
| deep | `radial-gradient(circle 140px at 46% 40%, rgba(240,170,100,.34), transparent)`, plus an inner shadow ring `rgba(60,30,10,.18)` for pressure depth |

---

## 7. Asset manifest

| File | Source | Count |
|---|---|---|
| `assets/package-configurator/base/{package}-{intensity}.png` | generated (§4) | 9 |
| `assets/package-configurator/addons/{hot-stone,aroma-oil,warm-towel,stretching}.png` | generated (§5) | 4 |
| `assets/package-configurator/props/candle.png` | generated (§5) | 1 |
| **Total generated** | | **14** |
| light grade / phase rail / pressure glow | CSS / SVG (§6) | 0 |

**Base-image key convention (no DB image column needed):** the service composes the key as `package-configurator/base/{packageSlug}-{intensitySlug}.png` from the selected package + intensity, with fallback to `package-configurator/base/{packageSlug}.png` if the intensity-specific object is missing.

`mc mirror` of `assets/package-configurator/` is recursive, so `base/`, `addons/`, and `props/` subfolders mirror to MinIO automatically — no `docker-compose.yml` change.

> **Note:** this design supersedes the original "7-image, single-base-per-package" image plan. The implementation plan's data-model tasks reflect the `package × intensity` base keying and the extra free CSS/SVG channels.
