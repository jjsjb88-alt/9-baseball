# GM12 — Batter Golden Master / LOOP 1 reset

Issue: #22  
Branch: `codex/visual-loop1-batter-gm12`

## Why GM11 was rejected

GM11 added four 192×192 authored SVG inserts, but the four poses reused nearly the same body mass and proportion. At live actor size this produced a blocky mannequin read rather than a baseball hitter with a clear kinetic chain.

Concrete failures found before implementation:

- head / shoulder / pelvis relationship barely changed between poses;
- lower-body load, front-side brace, rear-foot pivot and post-contact imbalance were weak;
- hands and bat line did not clearly describe swing phase;
- the V5 hero layer had no complete ownership contract in the common actor CSS and relied on Golden Master rules written for the earlier insert;
- idle / contact / homer / miss were different drawings, but not different enough silhouettes.

## Impact Analysis

### Change target

- `assets/sprites-v6/batter-*-hero.svg`
- `src/duel/App.jsx` authored-pose selection and layer class
- `src/duel/golden-master.css` key-pose ownership / responsive sizing
- GM12 regression test

### 1. UI / layout — 영향 있음

The batter can grow to 106–110% only while an authored hero pose owns the actor. The wrapper remains inside the existing actor box and Golden Master arena clipping contract.

### 2. Input / gesture — 영향 없음

No pointer, touch, swipe, scroll, card, zone or button handlers change.

### 3. Game logic / balance — 영향 없음

No engine, probability, card, HP, stack, damage or state-transition code changes.

### 4. Save / load — 영향 없음

No save schema or serialized state changes.

### 5. Mobile viewport — 영향 있음

A dedicated <=700px rule increases hero-pose presence to 110%. A separate low-height landscape rule uses 108% to preserve the one-screen combat layout.

### 6. Scroll / overflow — 영향 없음

No global overflow, viewport-height, fixed or sticky contract changes. Golden Master arena keeps its existing clipping boundary.

### 7. Existing user flow — 영향 없음

Title → route → combat → reward → facility → next route flow is unchanged.

### 8. Tests / regression — 영향 있음

GM11 pose tests are superseded by GM12 tests that lock V6 asset density, pose ownership, V4 coexistence and responsive contracts.

### 9. Build / deploy — 확인 필요

SVG imports and CSS are standard Vite inputs. Full test, smoke and production build must pass before merge.

## Implementation

### Pose language

- **Idle:** wide grounded base, quiet torso, hands high, rear-side bat line.
- **Contact:** pelvis opens before shoulders, front leg braces, rear foot pivots, hands extend through the ball, bat goes nearly horizontal.
- **Homer:** chest fully opens, weight finishes forward, bat wraps high across the rear shoulder instead of reusing contact.
- **Miss:** center of mass leaks forward, head comes off the line, hands finish late and the bat sweeps low/right.

### Art density

All four poses use a 192×192 crisp-edge authored SVG with separate outline, deep shadow, uniform shadow/base/highlight, skin shadow/base/highlight, equipment accents and readable bat/glove treatment. V6 is not a color swap of V5.

### Motion ownership

The existing V4 Canvas 60-frame rig remains the motion bed.

- idle: authored pose outside active motion
- contact: authored ownership at impact and selective slowmo
- homer: authored ownership at release / settle
- miss: authored ownership at slowmo / release
- other motion phases: V4 remains primary

No new particles, blur layers or camera shake were added.

## Validation gate

Required before merge:

- [ ] full `pnpm test`
- [ ] zone / V9 / growth / deck smoke reports
- [ ] production `pnpm run build`
- [ ] 390×844 actual battle capture
- [ ] 844×390 actual battle capture
- [ ] 1440×900 actual battle capture
- [ ] idle / contact / homer / miss close-up comparison
- [ ] compare against Visual Reboot reference bar and list remaining gaps

## Visual QA status

Static asset review is materially better than GM11: the four silhouettes no longer share the same pose skeleton, the bat line changes by phase, and lower-body weight transfer is explicit.

This is **not** a declaration that LOOP 1 is complete. Required browser captures and three-viewport comparison remain the final visual gate.
