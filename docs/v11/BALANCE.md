# V11 Stack Balance

Source: `docs/V11-9ZONE-STACK-SYSTEM.md`  
Issue: #51

## Purpose

This report is a **diagnostic tool**, not a claim that automated play equals human fun.

It answers five narrower questions:

- How much HP pressure does 1/2/3/4-card stacking create?
- How often does a random 9ZONE path naturally CONNECT?
- Does ordering create enough reward to justify the extra cognitive load?
- Does any relic or card-count rule erase the value of order?
- Do sampled legal opening hands show one stack size or one card signature dominating every reasonable objective?

## Report method

Run:

`node scripts/report-v11-stack.mjs 80 140`

The report uses deterministic opening V10 battle states across seeds.

For each legal card count it samples real attack cards from the current hand, real `previewV10Stack` probabilities, random legal aim zones, and an intentionally connected path.

Estimated pitcher HP pressure is:

> preview outcome probability × V10 pitcher HP damage table × final stack damageRate

Normal foul damage is used for the preview approximation. Flat relic damage bonuses are excluded so the stack mechanic itself can be read separately.

Three selection policies are reported:

- **pressure**: maximize expected pitcher HP per pitch.
- **economy**: maximize expected pitcher HP per card spent.
- **practical**: maximize expected pitcher HP minus 1.5 HP-equivalent for each extra card.

These are lenses, not player models.

## Current mechanical observations to verify in CI

Before the report is run, the current code has two obvious properties worth measuring:

1. Base HP rates are `100 / 80 / 65 / 50%`, with CONNECT worth `+5%p` per link.
2. Therefore a fully connected four-card route reaches **65%**, exactly the same raw HP multiplier as an unconnected three-card stack.
3. The `Double Grip` relic currently forces every two-card stack to **100%**, which means CONNECT vs BREAK produces the same final multiplier while that relic is owned.

Those are not automatically bugs. The report is intended to decide whether they create weak ordering incentives or practical dominance.

## Guardrails

Any tuning proposed after this report must keep:

- solo swing at 100% HP efficiency.
- perfect four-card stack below solo.
- more cards never becoming a free upgrade.
- support-only coverage hits remaining singles in V11.1/V11.2 unless separately redesigned.
- preview and actual pitcher HP using the same final multiplier.
- card scarcity remaining meaningful.
- human playtest feedback taking priority over simulated policy choice.

## CI result — 80 opening battles / 37,520 sampled plans

Action: `35437518980`  
All report tests and the production build passed.

### Exact 9ZONE route space

| cards | perfect CONNECT share | average CONNECT | average HP rate | perfect HP rate |
|---|---:|---:|---:|---:|
| 1 | — | 0.000 | 100.00% | 100% |
| 2 | 60.49% | 0.605 | 83.02% | 85% |
| 3 | 39.64% | 1.210 | 71.05% | 75% |
| 4 | 25.62% | 1.815 | 59.07% | 65% |

Important consequence: a **perfect four-card chain is 65%**, exactly equal to the raw unconnected three-card rate. The biggest and most expensive route puzzle currently has almost no cross-tier payoff.

### Sampled legal opening-hand plans

| cards | avg hit | avg coverage | avg final rate | avg expected HP / pitch | expected HP / card |
|---|---:|---:|---:|---:|---:|
| 1 | 10.72% | 1.399 | 100.00% | 2.355 | 2.355 |
| 2 | 19.97% | 2.607 | 83.05% | 2.762 | 1.381 |
| 3 | 27.88% | 3.636 | 71.07% | **2.958** | 0.986 |
| 4 | 34.66% | 4.501 | 59.10% | 2.889 | 0.722 |

Interpretation:

- More cards successfully buy coverage: average hit chance rises from 10.72% to 34.66%.
- Per-card economy falls sharply, so stacking is not a free upgrade.
- Raw pitcher pressure peaks at **three cards**, then falls at four cards despite the extra card and larger board puzzle.
- This is evidence that the fourth-card / perfect-route reward is weak, not that four cards should always be strongest.

### Diagnostic policy choice

Pressure-only policy:
- 1 card: 52.5%
- 2 cards: 10.0%
- 3 cards: 30.0%
- 4 cards: 7.5%

Economy policy: 1 card 100%.

Practical policy with a 1.5 HP-equivalent tax per extra card: 1 card 100%.

These are **not human usage predictions**. They show that cards remain a very expensive resource under the current formula; a player needs a strong situational reason to spend multiple cards.

The practical opening-hand signature was `strike` (밀어치기) in all 80 sampled states. This mostly reflects the starter deck and the value of a single three-zone column card, so it should not be “fixed” by nerfing Stack Order alone. It is a useful signal for a later starter-deck pass.

### Relic conflict

`Double Grip` currently produces:

- 2-card BREAK: 100%
- 2-card CONNECT: 100%

Therefore the relic **erases ordering value entirely** for two-card stacks. That conflicts with V11's representative mechanic.

## Tuning decision for the Integrator pass

Keep:
- base rates `100 / 80 / 65 / 50%`
- solo at 100%
- support-only hits as singles
- card scarcity / card consumption

Change:
1. `CONNECT` reward from **+5%p → +7%p per link**.
   - perfect 2-card: 87%
   - perfect 3-card: 79%
   - perfect 4-card: 71%
   - perfect 4-card remains well below solo, but now beats an unconnected 3-card stack (65%).
2. `Double Grip` from “2-card stack = 100%” to **“2-card stack +10%p, cap 100%”**.
   - with the new CONNECT rule: BREAK 90%, CONNECT 97%.
   - the relic stays valuable while order still matters.

Why +7 instead of a more aggressive +8~10:
- It lifts the weak fourth-card payoff without turning the system into “always stack more”.
- It preserves a meaningful gap from solo.
- It keeps the base card-count penalty unchanged, so the balance identity remains coverage vs resource/pressure.
- The report should be rerun after the tuning patch; simulation informs the next playtest but does not replace it.
