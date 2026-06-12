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
| **Package** | base scene — **distinct camera angle & client pose per package** so the body area reads clearly (seated neck/shoulder vs. full-back lying vs. warm full-body) | generated image | **3 images** |
| **Intensity** | a **pressure glow** on the therapist's hands — an *effect*, never baked into the photo | CSS radial | free |
| **Duration** | global light / time-of-day grade **+** phase timeline rail **+** lit candle count | CSS filter+gradient **+** DOM rail **+** 1 candle sprite | mostly free + 1 image |
| **Add-ons** | discrete physical props in fixed corners | transparent PNG layers | 4 images |

**Why this revision:** the earlier "9 base images (package×intensity)" plan failed in practice — intensity is not legibly different in a photo (gentle vs. medium looked identical), and three packages sharing the *same* face-down upper-body framing could not distinguish the body areas. Fix: **intensity becomes a pure CSS effect**, and each package gets a **deliberately different camera & pose** so the part of the body being worked on is unmistakable.

**Channel separation is the whole trick:** Package owns *composition/pose*, Duration owns *global* light, Intensity owns a *local* glow, Add-ons own *discrete objects*. They never visually collide, so the user always knows which control did what.

### Composite layer stack (bottom → top)
```
z0  base scene            ← package (generated; distinct camera/pose per package)
z1  duration light grade  ← CSS overlay + filter (free)
z2  pressure glow         ← CSS radial on the hands, position per package (free)
z3  add-on prop layers    ← 4 transparent PNGs, fixed screen corners (generated)
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
STUDIO: One single premium wellness massage studio — the SAME room, materials,
furniture finish, lighting style and palette across all images. Treat the first
generated image as the ground truth for room/material/light, and keep that
consistent. (Camera angle and the client's pose DO change per package — they are
specified in each base prompt below. Only the *world* stays constant, not the
framing.)
LIGHT (KEEP NEUTRAL): soft, even, neutral DAYTIME studio light from the upper-
left; gentle shadows; balanced white point. Do NOT bake in warm/orange/candle-
lit grading, color casts, or heavy vignette — the scene must stay neutral so it
can be color-graded later by CSS.
PALETTE: oatmeal, sand, soft sage, warm grey, pale wood, white linen. Muted,
calm, spa-grade.
CLEAR ZONES (leave EMPTY and unobstructed in base scenes so screen-space props
can be overlaid later): (1) upper-left area, (2) lower-left foreground, (3)
lower-center foreground, (4) lower-right foreground, (5) right edge at mid-
height. Keep the subject and action away from these zones.
STYLE: photorealistic editorial wellness photography; clean, quiet, uncluttered;
no text, no logos, no brand marks; no faces in sharp focus; tasteful and modest.
FORMAT: landscape 3:2, 1536×1024.
```

**Generation workflow:** generate `base/stress-reset-massage.png` first to lock the room/material/light, then use it as the **reference image** for the other two ("same room, materials and lighting — change the camera and pose as described"). The props (§5) should also reference a base so their scale/light match.

---

## 4. Base scene prompts — 3 images (one per package, distinct camera & pose)

Each prompt = `[CONTEXT]` + the `<<delta>>`. Files: `package-configurator/base/{package-slug}.png`. Intensity is **not** in the image (it is the CSS glow, §6.4). The cameras and poses are deliberately different so each body area reads at a glance.

```text
base/neck-shoulder-relief.png
[CONTEXT] <<NECK & SHOULDER focus — SEATED. The client sits upright on a low
massage stool / forward-leaning massage chair, facing away, shoulders and upper
back visible, head slightly forward and relaxed; modestly clothed in a soft robe
slipped to the shoulders. The therapist stands behind and works the neck,
trapezius and shoulders with both hands. Closer, upper-body, eye-level 3/4
framing. The body area being treated (neck/shoulders) is unmistakable. Neutral
light; keep the five clear zones empty.>>
```
```text
base/stress-reset-massage.png
[CONTEXT] <<FULL-BACK relaxation — LYING. The client lies face-down on a linen-
covered massage table that runs left-to-right, head toward the left, the whole
back visible and modestly draped at the hips. The therapist, standing to the
side, performs long gliding strokes along the full back. Wider, slightly
elevated 3/4 framing that shows the entire back and table. Calm, serene,
restful. Neutral light; keep the five clear zones empty.>>
```
```text
base/warm-recovery-massage.png
[CONTEXT] <<WARM full-body recovery — LYING, viewed more from the FOOT END /
opposite side so the framing clearly differs from the other two. The client lies
face-down, warm white towels draped over the back and legs (no steam, no warm
color cast — keep light neutral); the therapist works the lower back / legs.
Cozy, restorative, comfortable (not clinical). A lower, lengthwise camera along
the body. Neutral light; keep the five clear zones empty.>>
```

> Intensity is expressed entirely by the CSS pressure glow (§6.4) — no per-intensity images. This is the deliberate result of the revision noted in §1: gentle/medium/deep were not legibly different in a photo, and per-package camera/pose now carries the meaningful visual difference.

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
A `.config-glow` radial overlay centered on the therapist's hands. Because each package has a different camera/pose, the hands sit in a different place — so the glow **center is per package** (tune to the final art):

| Package | approx glow center (x y) |
|---|---|
| neck-shoulder-relief (seated) | `52% 32%` |
| stress-reset-massage (full-back) | `50% 45%` |
| warm-recovery-massage (foot-end) | `48% 52%` |

Intensity then sets the glow's radius/opacity at that center:

| Intensity | radial glow (substitute the package center for `CX CY`) |
|---|---|
| gentle | `radial-gradient(circle 220px at CX CY, rgba(245,205,150,.16), transparent)` |
| medium | `radial-gradient(circle 180px at CX CY, rgba(245,195,130,.26), transparent)` |
| deep | `radial-gradient(circle 140px at CX CY, rgba(240,170,100,.34), transparent)`, plus an inner shadow ring `rgba(60,30,10,.18)` for pressure depth |

---

## 7. Asset manifest

| File | Source | Count |
|---|---|---|
| `assets/package-configurator/base/{package}.png` | generated (§4) | 3 |
| `assets/package-configurator/addons/{hot-stone,aroma-oil,warm-towel,stretching}.png` | generated (§5) | 4 |
| `assets/package-configurator/props/candle.png` | generated (§5) | 1 |
| **Total generated** | | **8** |
| light grade / phase rail / pressure glow | CSS / SVG (§6) | 0 |

**Base-image key convention (no DB image column needed):** the service composes the key as `package-configurator/base/{packageSlug}.png` from the selected package. Intensity does **not** affect the base image (it is the CSS glow, §6.4).

`mc mirror` of `assets/package-configurator/` is recursive, so `base/`, `addons/`, and `props/` subfolders mirror to MinIO automatically — no `docker-compose.yml` change.

> **Revision note:** this supersedes the earlier "9 base images (package×intensity)" plan. Base scenes are now **3** (one per package, distinct camera/pose); intensity is a pure CSS effect. The spec and implementation plan reflect `baseImageKey(packageSlug)` (no intensity) and the per-package glow center.
