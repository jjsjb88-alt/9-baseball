import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

// V12 P1-1c — D1 Golden Master skeleton for the desktop design state.
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const cssUrl=new URL('../src/duel/v12-battle-desktop.css',import.meta.url);
const css=fs.existsSync(cssUrl)?fs.readFileSync(cssUrl,'utf8'):'';
const parts=s=>{const out=[];let depth=0,cur='';for(const ch of s){if(ch==='(')depth++;if(ch===')')depth--;if(ch===','&&!depth){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out};

describe('V12 P1-1c desktop battle skeleton',()=>{
  it('loads after every legacy layer',()=>{
    expect(fs.existsSync(cssUrl)).toBe(true);
    expect(main.indexOf('v12-battle-desktop.css')).toBeGreaterThan(main.indexOf('golden-master.css'));
  });

  it('only touches wide, tall screens in the design state',()=>{
    expect(css).toContain('@media (min-width:1080px) and (min-height:650px)');
    const body=css.slice(css.indexOf('{')+1,css.lastIndexOf('}'));
    const selectors=body.split('}').map(r=>r.split('{')[0].trim()).filter(Boolean).filter(s=>!s.startsWith('/*'));
    for(const s of selectors)for(const p of parts(s))expect(p.trim()).toMatch(/^\.duel-combat\.v12-design/);
  });

  it('follows the Golden Master: batter left, pitcher centre, 9ZONE right of the duel, hand centre, actions right',()=>{
    for(const need of ['.zone-panel{','.actor-right{','.duel-hand{','.drawer-escape{','.decision-preview{'])expect(css).toContain(need);
    for(const keep of ['execute-action','.zone-grid','.duel-hand','.drawer-watch','.zone-board-rate']){
      expect(css).not.toMatch(new RegExp(keep.replace(/[.[\]]/g,'\\$&')+'[^{]*\\{[^}]*display:\\s*none'));
    }
  });
});
