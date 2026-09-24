import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// V12 P5-1 — map: the picked stop's scouting report and "이 원정으로 간다" stay on screen at every size
// (they sat 1100–1300px down on phones), and the map text is never below 12px (it was 6–11px).
const read=f=>fs.readFileSync(path.resolve(process.cwd(),f),'utf8');
const css=read('src/duel/v12-map.css'),main=read('src/main.jsx');
const parts=t=>{const out=[];let d=0,cur='';for(const ch of t){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&!d){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out};
const rules=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/@media[^{]*\{/g,'').split('}').map(r=>r.split('{')).filter(r=>r.length===2&&r[0].trim());

describe('V12 P5-1 map layer',()=>{
  it('is loaded and stays on the run-map screen',()=>{
    expect(main).toContain('v12-map.css');
    expect(rules.length).toBeGreaterThan(5);
    for(const [sel] of rules)for(const p of parts(sel))expect(p.trim()).toMatch(/^\.v10-run-map-screen/);
  });
  it('never sets text below 12px',()=>{
    for(const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))expect(Number(m[1])).toBeGreaterThanOrEqual(12);
  });
  it('pins the report to the bottom on phones and beside the map on short landscape',()=>{
    expect(css).toMatch(/orientation:portrait\)\{[\s\S]*?\.v10-map-preview\{position:fixed!important[^}]*bottom:0/);
    expect(css).toMatch(/max-height:500px\)\{[\s\S]*?\.v10-map\{[^}]*grid-template-columns:minmax\(0,1fr\) [^}]*\}[\s\S]*?\.v10-map-preview\{position:sticky!important/);
  });
});
