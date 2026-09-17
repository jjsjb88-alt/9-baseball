import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../src/duel/character-v3.css',import.meta.url),'utf8');
const batter=fs.readFileSync(new URL('../assets/sprites-v3/batter-master-sheet.svg',import.meta.url),'utf8');
const pitcher=fs.readFileSync(new URL('../assets/sprites-v3/pitcher-master-sheet.svg',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

describe('V10 v3 pixel actors',()=>{
  it('loads the v3 actor layer after the character master layer',()=>{
    expect(main).toContain('character-v3.css');
    expect(main.indexOf('character-v3.css')).toBeGreaterThan(main.indexOf('character-master.css'));
  });

  it('ships six authored key poses for batter and pitcher',()=>{
    expect((batter.match(/<g transform="translate\(/g)||[]).length).toBe(6);
    expect((pitcher.match(/<g transform="translate\(/g)||[]).length).toBe(6);
    expect(batter).toContain('0 IDLE');
    expect(batter).toContain('4 HOMER');
    expect(pitcher).toContain('2 LEG KICK');
    expect(pitcher).toContain('3 RELEASE');
  });

  it('maps every existing pose class to an authored sheet frame',()=>{
    for(const pose of ['idle','load','contact','follow','homer','miss'])expect(css).toContain(`.actor-left .sprite-stage.pose-${pose}::before`);
    for(const pose of ['idle','set','legkick','release','follow','strikeout'])expect(css).toContain(`.actor-right .sprite-stage.pose-${pose}::before`);
  });

  it('removes the old actor art while preserving the existing VFX DOM',()=>{
    expect(css).toContain('.actor-left .duel-sprite,.actor-right .duel-sprite,.actor-left .sprite-echo,.actor-right .sprite-echo{opacity:0!important}');
    expect(css).toContain("batter-master-sheet.svg");
    expect(css).toContain("pitcher-master-sheet.svg");
    expect(css).toContain('.fx-stage-impact .actor-left .sprite-stage::before');
  });
});
