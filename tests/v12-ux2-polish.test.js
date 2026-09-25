import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

// V12 UX-2 — the shared-screen polish that outlived the legacy main-run battle (V13).
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const main=read('../src/main.jsx');
const polish=read('../src/duel/v12-polish.css');
const strip=css=>css.replace(/\/\*[\s\S]*?\*\//g,'');
const fontSizes=css=>[...strip(css).matchAll(/font-size:\s*([\d.]+)px/g)].map(m=>+m[1]);

describe('V12 UX-2 polish layer',()=>{
  it('loads after the screen layers, with the title layer still last',()=>{
    const at=main.indexOf('v12-polish.css');
    for(const before of ['landscape-declutter.css','pitcher-portrait.css'])expect(at).toBeGreaterThan(main.indexOf(before));
    const cssImports=[...main.matchAll(/import "(\.\/duel\/[^"]+\.css)"/g)].map(m=>m[1]);
    expect(cssImports.at(-1)).toBe('./duel/title-pixel.css');
  });
  it('raises text to the 12px floor and never below',()=>{
    for(const s of fontSizes(polish))expect(s).toBeGreaterThanOrEqual(12);
    expect(polish).toMatch(/\.duel-header nav button\{font-size:12px/);
  });
  it('only touches the header and the title',()=>{
    const sels=[...strip(polish).matchAll(/([^{}]+)\{[^{}]*\}/g)].map(m=>m[1].replace(/^[\s\S]*@media[^{]*\{?/,'').trim()).filter(Boolean);
    for(const s of sels)expect(s).toMatch(/^(\.duel-header|\.duel-title)/);
  });
  it('keeps the title start button inside a short landscape screen',()=>{
    expect(polish).toMatch(/@media \(orientation:landscape\) and \(max-height:500px\)\{[^@]*\.duel-title \.title-copy h1\{font-size:34px/);
  });
});
