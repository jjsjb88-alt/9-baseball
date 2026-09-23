// V12 D1 Golden Master — decision-only state.
// Every number and lit cell on the Golden Master comes from the real engine run on the
// P0 fixture (C1~C6). Nothing here is hand-typed coverage, links or efficiency.
//   node docs/design/v12/gm/gm-state.mjs  →  docs/design/v12/gm/gm-state.json
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {previewV10Stack, readLevel, publicProbabilities} from '../../../../src/duel/engine.js';
import {probabilityBounds} from '../../../../src/duel/information.js';
import {CARDS, shadeFor} from '../../../../src/duel/cards.js';

const here = dirname(fileURLToPath(import.meta.url));
const s = JSON.parse(readFileSync(join(here, '../fixtures/p0-1-combat.json'), 'utf8'));

// Representative plan: main 밀어치기 on the outside column, two 정타 노림 supports chained
// back toward the middle. 5→4 and 4→2 are 8-way neighbours, so both links connect (C2).
s.battle.aimZone = 5;
const main = 'c4';
const supports = [{id: 'c0', aimZone: 4}, {id: 'c1', aimZone: 2}];
const preview = previewV10Stack(s, main, supports);
if (preview.problem) throw new Error(preview.problem);

const level = readLevel(s);
const bounds = probabilityBounds(s);
const pub = publicProbabilities(s);
// Level 0 shows only the three allowed shades; exact values never leave this script (C4, C5).
const read = bounds.slice(0, 9).map((b, z) => ({
  zone: z,
  shade: b[0] === 0 && b[1] === 0 ? 0 : level === 0 ? shadeFor(pub[z]) : null,
  bounds: level === 0 ? null : b,
}));

const out = {
  source: 'docs/design/v12/fixtures/p0-1-combat.json',
  readLevel: level,
  intent: s.battle.intent.name,
  count: {balls: s.battle.balls, strikes: s.battle.strikes, outs: s.battle.outs},
  pitcher: {hp: s.pitcher?.hp ?? null, maxHp: s.pitcher?.maxHp ?? null, name: s.pitcher?.name ?? null},
  read,
  steps: preview.stackPlan.steps.map(x => ({id: x.id, order: x.order, main: x.main, aimZone: x.aimZone, name: CARDS[x.kind]?.name, shape: CARDS[x.kind]?.shape})),
  coverage: {main: preview.primaryCoverage, supports: preview.supportCoverages.map(x => ({aimZone: x.aimZone, cells: x.coverage}))},
  links: preview.stackPlan.links,
  connectCount: preview.stackPlan.connectCount,
  cardCount: preview.cardCount,
  damageRate: preview.damageRate,
  hand: s.battle.hand.map(id => {const k = s.deck.find(c => c.id === id).kind; return {id, name: CARDS[k].name, shape: CARDS[k].shape, type: CARDS[k].type};}),
};
writeFileSync(join(here, 'gm-state.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 1));
