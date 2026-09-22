// Read-only reproduction of the V12 document review. Run from any working directory.
import { readdirSync, readFileSync } from 'node:fs';
import { startBattle, createDuel, coverageAt, v11StackZonesConnect } from '../../../src/duel/engine.js';
import { cardPower } from '../../../src/duel/cards.js';

const cssDirectory = new URL('../../../src/duel/', import.meta.url);
const css = readdirSync(cssDirectory)
  .filter(name => name.endsWith('.css'))
  .map(name => readFileSync(new URL(name, cssDirectory), 'utf8'));
const source = css.join('\n');
const colors = source.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/g) || [];
const sizes = [...source.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(match => Number(match[1]));
const state = startBattle(createDuel(1, 'contact'));
const cardId = state.deck.find(entry => entry.kind === 'defend').id;
const links = sequence => sequence.slice(1).map((zone, index) => v11StackZonesConnect(sequence[index], zone));

console.log(JSON.stringify({
  scope: 'src/duel/*.css; source counts include comments, duplicates, and unused rules',
  static: {
    files: css.length,
    newlines: css.reduce((sum, text) => sum + text.split('\n').length - 1, 0),
    importantOccurrences: (source.match(/!important/g) || []).length,
    importantLines: source.split('\n').filter(line => line.includes('!important')).length,
    colorOccurrences: colors.length,
    distinctColorStrings: new Set(colors.map(color => color.toLowerCase())).size,
    fixedPxFontSizesBelow11: sizes.filter(size => size < 11).length,
    fixedPxFontSizesBelow12: sizes.filter(size => size < 12).length,
  },
  engine: {
    crossAtCorner: coverageAt(state, cardId, 0),
    crossAtEdge: coverageAt(state, cardId, 1),
    crossAtCenter: coverageAt(state, cardId, 4),
    expandedCrossAtCorner: coverageAt({ ...state, battle: { ...state.battle, expanded: true } }, cardId, 0),
    sameZoneConnects: v11StackZonesConnect(4, 4),
    diagonalConnects: v11StackZonesConnect(0, 4),
    sequence_0_4_8: links([0, 4, 8]),
    sequence_0_8_4: links([0, 8, 4]),
    upgradedCommitPower: cardPower({ kind: 'commit', plus: true }),
  },
}, null, 2));
