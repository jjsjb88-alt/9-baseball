import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

// V12 P1-2a — battle HUD text at or above the 12px micro floor (spec §3.1) in the design state.
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const cssUrl=new URL('../src/duel/v12-battle-type.css',import.meta.url);
const css=fs.existsSync(cssUrl)?fs.readFileSync(cssUrl,'utf8'):'';
const parts=s=>{const out=[];let depth=0,cur='';for(const ch of s){if(ch==='(')depth++;if(ch===')')depth--;if(ch===','&&!depth){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out};

describe('V12 P1-2a battle HUD type floor',()=>{
  it('loads after the layout layers',()=>{
    expect(fs.existsSync(cssUrl)).toBe(true);
    expect(main.indexOf('v12-battle-type.css')).toBeGreaterThan(main.indexOf('v12-battle-desktop.css'));
  });

  it('is scoped to the design state and never sets a size below 12px',()=>{
    const rules=css.replace(/\/\*[\s\S]*?\*\//g,'').split('}').map(r=>r.split('{')).filter(r=>r.length===2&&r[0].trim());
    expect(rules.length).toBeGreaterThan(5);
    for(const [sel,body] of rules){
      for(const p of parts(sel))expect(p.trim()).toMatch(/^\.duel-combat\.v12-design/);
      for(const m of body.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))expect(Number(m[1])).toBeGreaterThanOrEqual(12);
    }
  });

  it('covers every HUD label that rendered below 12px in the 390x844 audit',()=>{
    for(const need of ['.battle-ribbon','.scoreboard-player','.intent','-nameplate','.ball-read','.zone-cell','.pitch-read','.drawer-back','.drawer-watch','.diamond-events','.pile-buttons','.deck-rule','.v10-hp-count']){
      expect(css).toContain(need);
    }
  });
});
