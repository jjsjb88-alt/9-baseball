# V11 Starter Identity — Precision vs Coverage

Issue: #64  
Follow-up to: #51

## Problem

The V11 stack report found that the starter opening practical policy selected `strike` (밀어치기) in all 80 sampled states.

The cause was structural:

- `place` used 1 zone and `power: -1`
- `strike` used 3 vertical zones and `power: 0`
- both cost one card
- therefore the supposed precision card lost both coverage **and** batted-ball quality

This made `place` a near-strict downgrade instead of a decision.

## Candidate check

The first pass tested only `place.power`:

- -1 → strike won 80/80
- 0 → strike won 80/80
- +1 → strike won 80/80
- +2 → strike won 80/80

Conclusion: ordinary power tuning cannot solve a 1-zone vs 3-zone coverage gap.

## Chosen identity

`place` becomes **정타 노림**:

- shape: point / 1 zone
- power: 0
- role: 정타
- MAIN-card exact contact: **pitcher HP pressure +50%**
- support-only contact: no precision bonus

This turns the starter decision into:

- **정타 노림** — narrow read, high pitcher pressure when correct
- **밀어치기** — wider coverage, safer contact
- later `slug` / `commit` — narrow read with stronger extra-base upside

## 80-state diagnostic

With `place.power = 0`:

| precision bonus | place wins | strike wins | avg best HP place | avg best HP strike |
|---|---:|---:|---:|---:|
| +35% | 47.5% | 52.5% | 5.101 | 6.033 |
| **+50%** | **47.5%** | **52.5%** | **5.570** | **6.033** |
| +65% | 47.5% | 52.5% | 6.039 | 6.033 |

Why +50%:

- +35% already creates situational place wins, but the reward is visually and mechanically weak.
- +65% almost force-equalizes average expected HP and risks over-solving the decision.
- +50% keeps strike slightly safer on average while making precision materially rewarding.

The 47.5/52.5 split is **not** a target win rate. It is evidence that the opening choice is no longer a deterministic one-card answer.

## Engine contract

The precision bonus is applied only when all are true:

1. action is a card swing
2. MAIN card has a `pressure` value
3. result is a hit
4. result is not `assistOnly`
5. actual pitch is inside MAIN coverage

Precision bonus is calculated from:

> base pitcher damage × final stack/relic damageRate × card pressure

It is then added as a separate pitcher HP damage bonus.

This preserves:

- V11 stack damageRate
- CONNECT tuning
- Double Grip tuning
- relic flat bonuses
- support-only hit = single
- preview / actual rules staying explicit

## UI contract

When the MAIN card has precision pressure, StackBoard shows:

> PRECISION MAIN  
> 정확 적중 ×1.5  
> 지원 카드 적중에는 적용되지 않습니다.

## Validation

Feature branch Action `35438930973`:

- starter identity report: success
- full test suite: success
- production build: success

Simulation is a diagnostic only. Human play feedback still decides whether +50% feels clear and satisfying.
