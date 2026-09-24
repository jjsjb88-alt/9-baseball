import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// V12 — an overflowing centred reward row keeps its first cards reachable (safe center), landscape only.
const css=fs.readFileSync(path.resolve(process.cwd(),'src/duel/v12-overflow-safe.css'),'utf8');
describe('V12 overflow-safe rows',()=>{
  it('uses safe centring for the reward card row in landscape',()=>{
    expect(css).toMatch(/@media \(orientation:landscape\)\{\s*\.reward-screen \.reward-cards\{justify-content:safe center!important\}/);
  });
  it('is loaded',()=>{
    expect(fs.readFileSync(path.resolve(process.cwd(),'src/main.jsx'),'utf8')).toContain('v12-overflow-safe.css');
  });
});
