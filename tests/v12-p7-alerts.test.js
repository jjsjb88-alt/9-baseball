import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// V12 P7-2 — the guide card fits a short landscape screen; a save failure never moves the layout.
const css=fs.readFileSync(path.resolve(process.cwd(),'src/duel/v12-help.css'),'utf8');
describe('V12 P7-2 guide and alerts',()=>{
  it('fits the guide card to a short landscape screen with its buttons reachable',()=>{
    expect(css).toMatch(/max-height:500px\)\{[\s\S]*?\.tour-card\{max-height:calc\(100dvh - 16px\)!important;overflow:auto/);
    expect(css).toMatch(/\.tour-card \.tour-actions\{position:sticky!important;bottom:0/);
  });
  it('lays the save-failure alert over the header instead of pushing the screen',()=>{
    expect(css).toMatch(/\.save-error\{position:fixed!important;top:0/);
  });
  it('never sets text below 12px',()=>{
    for(const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))expect(Number(m[1])).toBeGreaterThanOrEqual(12);
  });
});
