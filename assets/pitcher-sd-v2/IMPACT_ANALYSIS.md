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
