import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const js=fs.readFileSync(new URL('../src/duel/combat-readability.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/combat-readability.css',import.meta.url),'utf8');
const hp=fs.readFileSync(new URL('../src/duel/PitcherHpHud.jsx',import.meta.url),'utf8');
const result=fs.readFileSync(new URL('../src/duel/CombatResultSummary.jsx',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

describe('V10 combat readability contract',()=>{
  it('uses player-facing 9-zone likelihood words',()=>{
    expect(js).toContain("['드묾','낮음']");
    expect(js).toContain("['가끔','보통']");
    expect(js).toContain("['자주','높음']");
  });

  it('surfaces actual HP loss and damage efficiency',()=>{
    expect(hp).toContain('v10-hp-impact');
    expect(result).toContain('data-damage-rate');
    expect(result).toContain('투수 HP 피해');
    expect(js).toContain('hp-impact-burst');
    expect(js).toContain('투수 HP 피해 ×');
    expect(css).toContain('.hp-efficiency-chip');
  });

  it('keeps batter and pitcher visually above the field while UI stays out of their silhouettes',()=>{
    expect(css).toContain('.duel-combat>.duel-arena .actor-left');
    expect(css).toContain('.duel-combat>.duel-arena .actor-right');
    expect(css).toContain('scale:1.14');
    expect(css).toContain('.duel-combat>.pitch-read{left:50%');
  });

  it('loads the readability pass after the STS battleboard',()=>{
    expect(main.indexOf('sts-battleboard.css')).toBeLessThan(main.indexOf('combat-readability.css'));
    expect(main.indexOf('sts-battleboard.js')).toBeLessThan(main.indexOf('combat-readability.js'));
  });
});
