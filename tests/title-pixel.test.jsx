// @vitest-environment happy-dom
import React from 'react';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {afterEach,describe,it,expect} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import Duel from '../src/duel/App.jsx';

const css=readFileSync(resolve('src/duel/title-pixel.css'),'utf8');
const rules=css.replace(/\/\*[\s\S]*?\*\//g,'').split('}').map(r=>r.split('{')[0].trim()).filter(Boolean);
const decls=css.replace(/\/\*[\s\S]*?\*\//g,'');

describe('title pixel panel (INBOX #10)',()=>{
  afterEach(()=>{cleanup();localStorage.clear();});
  it('scopes every selector to the title screen so other screens keep their contracts',()=>{
    for(const rule of rules)for(const sel of rule.split(','))expect(sel.trim().startsWith('.duel-title')).toBe(true);
  });
  it('drops the generic-AI panel look: no rounding, gradients, blur or glow',()=>{
    expect(decls).not.toMatch(/linear-gradient|radial-gradient|backdrop-filter|blur\(/);
    for(const m of decls.matchAll(/border-radius:([^;}]+)/g))expect(m[1].trim()).toBe('0');
    for(const m of decls.matchAll(/box-shadow:([^;}]+)/g))for(const layer of m[1].split(/,(?![^(]*\))/)){
      const px=layer.trim().replace(/^inset\s+/,'').split(/\s+/).slice(0,3);
      expect(px[2]==='0'||px[2]==='0px'||/^var|^#/.test(px[2]),layer).toBe(true); // 번짐(blur) 반경 0
    }
  });
  it('is loaded after the other global sheets',()=>{
    const main=readFileSync(resolve('src/main.jsx'),'utf8');
    const cssImports=[...main.matchAll(/import "(\.\/duel\/[^"]+\.css)"/g)].map(m=>m[1]);
    expect(cssImports.at(-1)).toBe('./duel/title-pixel.css');
  });
  it('keeps one English brand mark and no stale version footer on the title',()=>{
    render(<Duel/>);
    const title=document.querySelector('.duel-title');
    expect(title.textContent).not.toMatch(/READ → BET → REVEAL → IMPACT|TUTORIAL ·|V9\.2 \/ 4경기/);
    expect(screen.getByText('메인 런')).toBeTruthy();
    expect(screen.getByRole('button',{name:'MAIN RUN 시작 · 투수 HP'}).classList.contains('primary')).toBe(true);
  });
});
