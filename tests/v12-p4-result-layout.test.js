import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// V12 P4-1b — result-state layer: scoped, 12px floor, the next step always on screen.
const read=f=>fs.readFileSync(path.resolve(process.cwd(),f),'utf8');
const css=read('src/duel/v12-result.css'),app=read('src/duel/App.jsx'),main=read('src/main.jsx');
const parts=t=>{const out=[];let d=0,cur='';for(const ch of t){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&!d){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out};
const rules=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/@media[^{]*\{/g,'').split('}').map(r=>r.split('{')).filter(r=>r.length===2&&r[0].trim());

describe('V12 P4-1b result layout',()=>{
  it('applies only to the V10 result state without a cinematic',()=>{
    expect(app).toContain("(isV10&&(s.phase==='pitch'||s.phase==='between')&&!fxStage?' v12-result':'')");
    expect(main.indexOf('v12-result.css')).toBeGreaterThan(main.indexOf('v12-board-cover.css'));
    for(const [sel] of rules)for(const p of parts(sel))expect(p.trim()).toMatch(/^\.duel-combat\.v12-result/);
  });
  it('never sets text below 12px',()=>{
    for(const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))expect(Number(m[1])).toBeGreaterThanOrEqual(12);
  });
  it('keeps the next step on screen in every layout',()=>{
    expect(css).toMatch(/orientation:portrait\)\{[\s\S]*?\.next-batter\{position:fixed!important[^}]*bottom:6px/);
    expect(css).toMatch(/max-height:500px\)\{[\s\S]*?\.next-batter\{position:sticky!important;bottom:0/);
    expect(css).toMatch(/min-height:650px\)\{[\s\S]*?\.next-batter\{position:sticky!important;bottom:0/);
  });
});
