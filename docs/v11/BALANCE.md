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

## Result section

This section is intentionally completed only after CI executes the deterministic report against the exact branch under review.
