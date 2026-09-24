// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Duel from '../src/duel/App.jsx';
import {createV10Duel,enterV10Node,saveV10Duel,coverageAt} from '../src/duel/engine.js';
import {CARDS,ZONES} from '../src/duel/cards.js';

// V12 P3-1 — the committed cover on the 9ZONE (C1, D2): main cover and support cover drawn apart,
// straight from the engine preview (primaryCoverage / supportCoverages, all coverageAt), overlap kept,
// and each cell tells a screen reader which cover it is under.
beforeEach(()=>{localStorage.clear()});
afterEach(()=>{cleanup()});

let state;
function begin(){
  let s=createV10Duel(1);
  s.build='away';s.deck=['strike','place','place','place','strike','place','place','place'].map((kind,i)=>({id:'c'+i,kind}));s.nextId=s.deck.length;
  s=enterV10Node(s,'a1-entry');state=s;
  saveV10Duel(localStorage,s);
  render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
  fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
}
const cells=()=>[...document.querySelectorAll('.zone-grid .zone-cell')];
const withClass=c=>cells().map((x,i)=>x.classList.contains(c)?i:null).filter(x=>x!=null);
const zoneBtn=z=>screen.getByRole('button',{name:ZONES[z],exact:true});

describe('V12 P3-1 committed cover on the board',()=>{
  it('draws a single card as main cover, from coverageAt',()=>{
    begin();
    const id=state.battle.hand.find(h=>state.deck.find(d=>d.id===h).kind==='strike');
    fireEvent.click(screen.getAllByRole('button',{name:CARDS.strike.name,exact:true})[0]);
    fireEvent.click(zoneBtn(2));
    expect(withClass('cover-main')).toEqual(coverageAt({...state,battle:{...state.battle,aimZone:2}},id,2));
    expect(withClass('cover-support')).toEqual([]);
  });
  it('draws a support apart from the main, and keeps the overlap',()=>{
    begin();
    fireEvent.click(screen.getAllByRole('button',{name:CARDS.strike.name,exact:true})[0]);
    fireEvent.click(zoneBtn(2));
    const add=[...document.querySelectorAll('.stack-candidates > button')].find(b=>!b.disabled);
    fireEvent.click(add);
    expect(withClass('cover-main')).toEqual([2,5,8]);
    expect(withClass('cover-support')).toEqual([2]);
    const both=cells()[2],desc=both.getAttribute('aria-describedby').split(' ').map(id=>document.getElementById(id)?.textContent).join(' ');
    expect(desc).toContain('메인 커버');expect(desc).toContain('지원 커버');
    const onlyMain=cells()[5],d5=onlyMain.getAttribute('aria-describedby').split(' ').map(id=>document.getElementById(id)?.textContent).join(' ');
    expect(d5).toContain('메인 커버');expect(d5).not.toContain('지원 커버');
    expect(cells()[0].getAttribute('aria-describedby')).not.toMatch(/zone-cover-0/);
  });
  it('keeps the zone names as the cells\' accessible names',()=>{
    begin();
    ZONES.forEach((name,z)=>expect(cells()[z].getAttribute('aria-label')).toBe(name));
  });
});

describe('V12 P3-1 board cover styles',()=>{
  const file=path.resolve(process.cwd(),'src/duel/v12-board-cover.css');
  const css=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
  const parts=t=>{const out=[];let d=0,cur='';for(const ch of t){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&!d){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out};
  const rules=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/@media[^{]*\{/g,'').split('}').map(r=>r.split('{')).filter(r=>r.length===2&&r[0].trim());
  it('is scoped to the design-state board and loaded last',()=>{
    const main=fs.readFileSync(path.resolve(process.cwd(),'src/main.jsx'),'utf8');
    expect(main.indexOf('v12-board-cover.css')).toBeGreaterThan(main.indexOf('v12-card-prepare.css'));
    expect(rules.length).toBeGreaterThan(2);
    for(const [sel] of rules)for(const p of parts(sel))expect(p.trim()).toMatch(/^\.duel-combat\.v12-design>\.zone-panel /);
  });
  it('main solid, support dashed, never an opaque fill',()=>{
    expect(css).toMatch(/cover-main[^{]*\{[^}]*solid/);
    expect(css).toMatch(/cover-support[^{]*\{[^}]*dashed/);
    for(const m of css.matchAll(/rgba\([^)]*,\s*([\d.]+)\)/g))expect(Number(m[1])).toBeLessThan(.5);
  });
});
