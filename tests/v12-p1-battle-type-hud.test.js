import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

// V12 P1-2b — 12px floor for the HUD in every battle state.
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const cssUrl=new URL('../src/duel/v12-battle-type-hud.css',import.meta.url);
const css=fs.existsSync(cssUrl)?fs.readFileSync(cssUrl,'utf8'):'';
const parts=s=>{const out=[];let depth=0,cur='';for(const ch of s){if(ch==='(')depth++;if(ch===')')depth--;if(ch===','&&!depth){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out};
const rules=css.replace(/\/\*[\s\S]*?\*\//g,'').split('}').map(r=>r.split('{')).filter(r=>r.length===2&&r[0].trim());

describe('V12 P1-2b battle HUD type floor, all states',()=>{
  it('loads before the design-state type layer so the design state can refine it',()=>{
    expect(fs.existsSync(cssUrl)).toBe(true);
    const at=main.indexOf('v12-battle-type-hud.css');
    expect(at).toBeGreaterThan(main.indexOf('v12-battle-desktop.css'));
    expect(at).toBeLessThan(main.indexOf('v12-battle-type.css'));
  });

  it('stays on the battle screen root and never sets a size below 12px',()=>{
    expect(rules.length).toBeGreaterThan(10);
    for(const [sel,body] of rules){
      for(const p of parts(sel))expect(p.trim()).toMatch(/^\.duel-combat\.release-combat/);
      for(const m of body.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))expect(Number(m[1])).toBeGreaterThanOrEqual(12);
    }
  });

  it('leaves the result/debrief panels (P4) alone',()=>{
    for(const [sel] of rules)expect(sel).not.toMatch(/pa-result|decision-debrief/);
  });
});
