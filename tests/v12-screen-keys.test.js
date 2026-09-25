import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// Regression (found in V12 P6): the landscape declutter script injects a READ button into the battle
// screen's .pitch-read div; switching to the reward screen, React reused that div as .reward-actions and
// the stray "READ · …" button stayed in the reward buttons. Every top-level screen now has its own key,
// so a new screen gets a fresh DOM.
const app=fs.readFileSync(path.resolve(process.cwd(),'src/duel/App.jsx'),'utf8');
describe('top-level screens remount',()=>{
  it('gives every non-cinema <main> a distinct key',()=>{
    /* legacy <main> screens (tutorial) and the ballpark screen components */
    const mains=[...app.matchAll(/<(?:main|Ballpark\w+)\b([^>]{0,200})/g)].map(m=>m[1]).filter(a=>!a.includes('cinema-lab'));
    expect(mains.length).toBeGreaterThanOrEqual(8);
    const keys=mains.map(a=>a.match(/key=(?:"([^"]+)"|\{([^}]+)\})/)).map(m=>m?.[1]||m?.[2]);
    expect(keys.every(Boolean)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
