# GM12 — Batter Golden Master / LOOP 1 reset

Issue: #22  
Branch: `codex/visual-loop1-batter-gm12`

## Current decision

V6 is rejected after browser proof. Its authored SVG silhouettes were readable, but the block-vector rendering reduced character density and looked disconnected from the existing pitcher/world art.

GM12 now uses **V7 raster key poses** built from the existing V4 60-frame pixel sheets. The goal is not to replace 60 fps animation. V4 remains the motion bed; V7 takes ownership only at a few decisive cinematic beats.

## V7 source frames

- idle — `batter-swing-60.png` frame **0**
- contact — `batter-swing-60.png` frame **12**
- homer — `batter-homer-60.png` frame **42**
- miss — `batter-miss-60.png` frame **18**

These frames were selected after visual inspection of the complete 10×6 sheets.

### Why these frames

- **Idle 0:** clean balanced stance, full facial/uniform detail, no ghost trail.
- **Contact 12:** strongest clean horizontal barrel extension with wide lower-body base.
- **Homer 42:** clean two-hand high finish without baked ghosting, chest opened and weight transferred.
- **Miss 18:** unmistakable forward leak and low bat path, clearly different from contact.

## Rendering contract

`V7KeyPose.jsx` draws one exact cell from the original 1920×1152 V4 sheet to a 192×192 canvas with image smoothing disabled.

- No newly generated block-vector character.
- No palette-swapped placeholder.
- No replacement of the V4 60 Hz animation.
- During authored ownership, the V4 canvas remains faintly alive underneath so the transition never reads as a hard animation cut.
- Pitcher art is unchanged; batter now shares the same raster density and world style.

## Ownership timing

- idle: authored frame outside active pitch motion
- contact: impact + selective slowmo for clean/strong contact
- homer: release + settle for homer / grand slam
- miss: slowmo + release for near miss / chase / strikeout family
- all other phases: moving V4 sheet remains primary

## Quality bar

LOOP 1 does not pass because code compiles. It passes only if the captures satisfy all of these:

1. batter and pitcher look like they belong to the same game;
2. face, uniform stripes, shoes and equipment remain readable at live scale;
3. idle/contact/homer/miss are distinguishable by silhouette before reading FX;
4. the 60 fps motion is still visible between key poses;
5. no duplicate batter layer, ghost mannequin, clipped bat, or placeholder rectangle appears;
6. portrait 390×844, landscape 844×390 and desktop 1440×900 all preserve the actor hierarchy.

## Validation

The GM12 workflow now runs:

- V7 contract regression test
- production build
- frozen deterministic pose capture
- before/after screenshots at 390×844, 844×390 and 1440×900
- idle/contact/homer/miss closeups

A successful workflow is evidence generation, not automatic art approval. Captures must still be reviewed visually before LOOP 1 is declared complete.
