import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

// V12 P1-1a — D1 Golden Master skeleton for the portrait design state (swing / prepare).
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const cssUrl=new URL('../src/duel/v12-battle-portrait.css',import.meta.url);

describe('V12 P1-1a portrait battle skeleton',()=>{
  it('loads after every legacy layer so it only has to win once',()=>{
    expect(fs.existsSync(cssUrl)).toBe(true);
    const at=main.indexOf('v12-battle-portrait.css');
    expect(at).toBeGreaterThan(main.indexOf('golden-master.css'));
  });

  const css=fs.existsSync(cssUrl)?fs.readFileSync(cssUrl,'utf8'):'';

  it('is scoped to portrait phones and to the design state only',()=>{
    expect(css).toContain('@media (max-width:900px) and (orientation:portrait)');
    expect(css).not.toMatch(/orientation:\s*landscape/);
    // every rule inside the media block targets the battle design state, so hub, watch,
    // pitch results, map, reward and facility screens keep their current layout
    const body=css.slice(css.indexOf('{')+1,css.lastIndexOf('}'));
    const selectors=body.split('}').map(r=>r.split('{')[0].trim()).filter(Boolean).filter(s=>!s.startsWith('/*'));
    // split selector lists on top-level commas only (keep :is(a,b) intact)
    const parts=s=>{const out=[];let depth=0,cur='';for(const ch of s){if(ch==='(')depth++;if(ch===')')depth--;if(ch===','&&!depth){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out};
    for(const s of selectors)for(const part of parts(s))expect(part.trim()).toMatch(/^\.duel-combat\.v12-design/);
  });

  it('puts the 9ZONE over the stadium like the Golden Master and keeps every decision control',()=>{
    expect(css).toContain('.zone-panel{grid-row:3');
    expect(css).toContain('.duel-arena{grid-row:3');
    // nothing that decides the pitch may be hidden to make it fit (spec §3.6, §2.4)
    for(const keep of ['execute-action','.zone-grid','.duel-hand','.drawer-watch','.zone-board-rate','.zone-power-head']){
      expect(css).not.toMatch(new RegExp(keep.replace(/[.[\]]/g,'\\$&')+'[^{]*\\{[^}]*display:\\s*none'));
    }
  });

  it('marks the design state from App state, not from a DOM-watching script',()=>{
    const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
    expect(app).toMatch(/v12-design/);
  });
});
