import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const js=fs.readFileSync(new URL('../src/duel/combat-readability.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/combat-readability.css',import.meta.url),'utf8');
const hp=fs.readFileSync(new URL('../src/duel/PitcherHpHud.jsx',import.meta.url),'utf8');
const result=fs.readFileSync(new URL('../src/duel/CombatResultSummary.jsx',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

describe('V10 combat readability contract',()=>{
  it('uses instant English likelihood words and English zone axes',()=>{
    expect(js).toContain("['희박','VERY LOW']");
    expect(js).toContain("['드묾','LOW']");
    expect(js).toContain("['가끔','MID']");
    expect(js).toContain("['자주','HIGH']");
    expect(js).toContain("['안 씀','NONE']");
    expect(js).toContain("['몸쪽 높음','IN · HIGH']");
    expect(js).toContain("['한가운데','CENTER']");
    expect(js).toContain("['바깥 낮음','OUT · LOW']");
  });

  it('surfaces actual HP loss and damage efficiency',()=>{
    expect(hp).toContain('v10-hp-impact');
    expect(result).toContain('data-damage-rate');
    expect(result).toContain('투수 HP 피해');
    expect(js).toContain('hp-impact-burst');
    expect(js).toContain('투수 HP 피해 ×');
    expect(css).toContain('.hp-efficiency-chip');
  });

  it('stages batter and pitcher as protagonists instead of background props',()=>{
    expect(js).toContain('character-focus-layer');
    expect(js).toContain("batterTag.textContent='BATTER'");
    expect(js).toContain("pitcherTag.textContent='PITCHER'");
    expect(css).toContain('.duel-combat>.duel-arena .character-focus-layer');
    expect(css).toContain('scale:1.24');
    expect(css).toContain('.duel-combat>.duel-arena .actor-right{right:30%!important}');
    expect(css).toContain('z-index:34!important');
    expect(css).toContain('.duel-combat>.pitch-read{left:50%');
  });

  it('keeps the tiny-landscape safety valve for browser chrome',()=>{
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('scale:1.14');
  });

  it('loads the readability pass after the STS battleboard',()=>{
    expect(main.indexOf('sts-battleboard.css')).toBeLessThan(main.indexOf('combat-readability.css'));
    expect(main.indexOf('sts-battleboard.js')).toBeLessThan(main.indexOf('combat-readability.js'));
  });
});
