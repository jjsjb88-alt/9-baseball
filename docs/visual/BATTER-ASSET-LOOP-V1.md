# Batter Asset Loop V1 — Static Golden Pose Pass

> Branch: `codex/batter-asset-loop-v1`
> Date: 2026-09-21
> Merge status: **DO NOT MERGE — visual QA must pass first**

## Goal

Replace the rejected GM12 procedural/block batter and the temporary non-character `AT BAT` stand-in with authored batter art, validate the art inside the real duel scene, and only then continue into the 60Hz interpolation loop.

The old procedural batter renderer is not a fallback target.

## Impact Analysis

| Axis | Impact | Response |
| --- | --- | --- |
| UI / layout | YES | Reuse the existing Golden Master actor box; only the batter contents change. |
| Input / gestures | NO | No pointer/touch handlers changed. |
| Game logic / balance | NO | No engine, card, HP, pitch or resolve values changed. |
| Save / load | NO | No schema or persisted state changed. |
| Mobile viewport | YES | Explicit portrait and low-height landscape art sizing rules added. |
| Scroll / overflow | LOW | Art is allowed to overflow only inside the actor box; page/root overflow rules are untouched. |
| Existing flow | NO | Title → map → combat → reward flow is unchanged. |
| Tests / regression | YES | Static asset mapping and preservation of V4 playback are locked by regression test. |
| Build / deploy | YES | Four PNG imports are new Vite assets; build/Pages checks required before merge. |

Risk level: **medium**. The change is presentation-only but touches the combat hero actor, so visual regression is the real gate.

Success condition: the authored batter reads as part of the same game as the pitcher at 390×844, 844×390 and 1440×900 without UI collision or perspective break.

## Source anchors and project mapping

The four handoff anchors were normalized to one transparent square canvas, a shared foot baseline, a shared center axis and a shared character scale, then compressed as indexed PNGs for runtime use.

| Handoff anchor | Runtime asset | Role |
| --- | --- | --- |
| `레트로_픽셀_야구_타자_준비_자세.png` | `assets/batter-reboot-v1/batter-ready.png` | idle / ready |
| `픽셀_아트_야구_타자의_스윙_준비_자세.png` | `assets/batter-reboot-v1/batter-trigger.png` | stride / trigger |
| `픽셀_아트_야구_타자의_결정적_스윙.png` | `assets/batter-reboot-v1/batter-contact.png` | contact |
| `야구_타자의_완벽한_스윙_피니시.png` | `assets/batter-reboot-v1/batter-finish.png` | follow-through / finish |

Runtime canvas: **192×192 RGBA** for all four assets.

## Current cinematic mapping

`batterRebootPoseFor(stage, shot)` is intentionally a static-pose bridge, not the final animation system.

- no shot / idle → `ready`
- `windup` → `trigger`
- hit + `impact` / `slowmo` → `contact`
- hit + `release` / `settle` → `finish`
- miss/chase/strikeout after windup → `trigger` until a dedicated miss pose is authored

The protected `V4CanvasSprite`, `v4SheetFor` and V4 sprite sheets remain in the codebase for the next 60Hz pass and for pitcher playback.

## Visual QA gate

Required real captures before merge:

- [ ] 390×844 mobile portrait
- [ ] 844×390 mobile landscape
- [ ] 1440×900 desktop
- [ ] batter idle close-up
- [ ] batter contact close-up
- [ ] batter finish close-up

Answer all of these from the captures:

- [ ] Batter and pitcher look like characters from the same game.
- [ ] Batter silhouette respects stadium perspective.
- [ ] Bat, hands and lower-body weight transfer are readable.
- [ ] Batter does not collide with result UI / Stack UI / pitcher HP.
- [ ] The improvement is obvious without explanation.
- [ ] No old `batter-standin` / `AT BAT` placeholder is visible.

**Tests and build passing do not satisfy this gate.**

## Next 60Hz loop — only after the static pass is approved

Use authored anchors plus intermediate poses rather than hand-authoring 60 unrelated frames.

Proposed sequence:

1. ready / idle
2. load
3. trigger
4. swing start
5. contact
6. early follow-through
7. finish
8. settle

Interpolation should preserve three invariants: feet/grounding, hand-to-bat continuity, and the same character volume. Avoid returning to body-part rectangles or procedural limb construction.

Dedicated miss/foul reactions remain a later authored pose task.
