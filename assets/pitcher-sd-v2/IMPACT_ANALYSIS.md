# Remaining pitcher SD roster — impact analysis

Scope: create source pose sheets and 120-frame transparent atlases for all 11 pitchers beyond Red Rush. The existing game integration is left untouched, as requested.

| Axis | Impact | Response |
| --- | --- | --- |
| UI / layout | No impact | No app component or stylesheet changes; a separate local preview page is supplied for review. |
| Input / gestures | No impact | No game input handler changes. |
| Game logic / balance | No impact | Archetypes, HP, pitch probabilities, cards and progression are unchanged. |
| Save / load | No impact | No save schema or encounter assignment change. |
| Mobile viewport | No impact | No game viewport or actor size change; inspect the standalone preview at small sizes. |
| Scroll / overflow | No impact | No application overflow rules change. |
| User flow | No impact | The deployed game keeps its existing title-to-run flow. |
| Tests / regression | Impact | Validate every roster ID, transparent PNG atlas dimensions, frame metadata and source sheet count. Run existing tests. |
| Build / deploy | Impact | 11 PNG atlases are present as assets but not yet imported by Vite. Run production build to catch packaging problems. |

Quality gate: inspect face/throw direction, transparent cutouts, pose boundaries, anticipation/stride/release/follow-through, and game-size readability. The authored poses are the art source; the 120-frame atlases are a deterministic playback package.

## Direction correction (2026-09-25)

Two pitchers, Cobalt Impact and Neon Trick, turn toward screen-right during their windup before releasing left. Normalize only their affected pose silhouettes during atlas assembly, then rebuild their previews and 120-frame packages. This changes no UI, input, game balance, save/load, mobile viewport, scrolling, or existing user flow. The affected surface is the isolated art build output; keep frame dimensions, count, timing, release frame, and transparency unchanged. Regression check the correction list in manifests, visually inspect every affected pose at game size, run the complete test suite, smoke reports, and production build.

## Runtime roster integration (2026-09-25)

The new atlases are currently absent from the game and pushing assets alone cannot make varied pitchers appear. Map each combat node to an authored roster entry of the same tier, keep the initial Red Rush encounter, and select its matching atlas and portrait in combat/map/reward views. UI/layout: existing actor and portrait boxes are reused; inspect PC and narrow landscape. Input/gestures: no changes. Game logic/balance: opponent stats and archetypes remain as generated; only visible name and art ID change. Save/load: old nodes lacking art IDs keep the legacy sprite. Mobile viewport and scrolling: existing CSS footprint reused, verify narrow screens. User flow: map preview, battle and reward use the same opponent identity. Tests/regression: add roster mapping and atlas resolution tests, run full suite and smoke reports. Build/deploy: Vite includes eleven additional transparent atlas imports, so verify production build and bundle output.
