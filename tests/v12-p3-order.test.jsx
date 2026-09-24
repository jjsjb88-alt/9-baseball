// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup,act,within} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Duel from '../src/duel/App.jsx';
import {createV10Duel,enterV10Node,saveV10Duel} from '../src/duel/engine.js';
import {CARDS,ZONES} from '../src/duel/cards.js';

// V12 P3-4 — order rail: the main card stays fixed; each support can move earlier/later or be recalled
// with 44px buttons (keyboard and screen reader reachable, not only board-token taps or drags).
// Links and efficiency are the engine's, re-read after every change. Confirm stays a single action.
beforeEach(()=>{localStorage.clear();vi.useFakeTimers()});
afterEach(()=>{cleanup();vi.useRealTimers()});

function begin(supports=2){
  let s=createV10Duel(1);
  s.build='away';s.deck=['strike','place','strike','place','place','strike','place','place'].map((kind,i)=>({id:'c'+i,kind}));s.nextId=s.deck.length;
  s=enterV10Node(s,'a1-entry');saveV10Duel(localStorage,s);
  render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
  fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
  fireEvent.click(screen.getAllByRole('button',{name:CARDS.strike.name,exact:true})[0]);
  fireEvent.click(screen.getByRole('button',{name:ZONES[2],exact:true}));
  for(let i=0;i<supports;i++){
    const add=[...document.querySelectorAll('.stack-candidates > button')].find(b=>!b.disabled&&!b.classList.contains('picked'));
    fireEvent.click(add);
  }
}
const rows=()=>[...document.querySelectorAll('.order-sheet .order-row')];
const open=()=>{const b=screen.getByRole('button',{name:/스윙 순서 편집/});b.focus();fireEvent.click(b);return b;};

describe('V12 P3-4 order rail',()=>{
  it('is offered only once supports are placed',()=>{
    begin(0);
    expect(screen.queryByRole('button',{name:/스윙 순서 편집/})).toBeNull();
    const add=[...document.querySelectorAll('.stack-candidates > button')].find(b=>!b.disabled);
    fireEvent.click(add);
    expect(screen.getByRole('button',{name:'스윙 순서 편집 · 2장'})).toBeTruthy();
  });
  it('keeps the main fixed and gives each support 44px move and recall buttons',()=>{
    begin(2);open();
    const dialog=screen.getByRole('dialog',{name:'스윙 순서 · 3장'});
    expect(rows()).toHaveLength(3);
    expect(rows()[0].textContent).toContain('메인 고정');
    expect(within(rows()[0]).queryAllByRole('button')).toHaveLength(0);
    for(const r of rows().slice(1)){
      const names=within(r).getAllByRole('button').map(b=>b.getAttribute('aria-label'));
      expect(names.some(n=>/순서를 앞으로/.test(n))).toBe(true);
      expect(names.some(n=>/순서를 뒤로/.test(n))).toBe(true);
      expect(names.some(n=>/회수/.test(n))).toBe(true);
    }
    const first=within(rows()[1]).getByRole('button',{name:/순서를 앞으로/});
    expect(first.disabled).toBe(true);
    const lastLater=within(rows()[2]).getByRole('button',{name:/순서를 뒤로/});
    expect(lastLater.disabled).toBe(true);
    expect(dialog.textContent).toMatch(/피해 효율 \d+%/);
  });
  it('reorders supports and re-reads links from the engine',()=>{
    begin(2);open();
    const before=rows().map(r=>r.dataset.stepId);
    fireEvent.click(within(rows()[1]).getByRole('button',{name:/순서를 뒤로/}));
    const after=rows().map(r=>r.dataset.stepId);
    expect(after).toEqual([before[0],before[2],before[1]]);
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/순서를 뒤로|순서를 앞으로/);
    expect(document.activeElement?.closest('.order-row')?.dataset.stepId).toBe(before[1]);
  });
  it('recalls a support, and the trigger follows',()=>{
    begin(1);open();
    fireEvent.click(within(rows()[1]).getByRole('button',{name:/회수/}));
    expect(rows()).toHaveLength(1);
    expect(screen.getByTestId('execute-action').textContent).toContain('단독 스윙');
  });
  it('closes on Escape and returns focus to the order button',()=>{
    begin(1);const btn=open();
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});
    act(()=>vi.runOnlyPendingTimers());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(btn);
    expect(document.querySelector('.card-drawer')).toBeTruthy();
  });
});

describe('V12 P3-4 order styles',()=>{
  const css=fs.readFileSync(path.resolve(process.cwd(),'src/duel/order-sheet.css'),'utf8');
  it('keeps 44px controls and a 12px floor',()=>{
    expect(css).toMatch(/\.order-row button\{[^}]*min-width:44px[^}]*min-height:44px/);
    expect(css).toMatch(/\.card-order-open\{[^}]*min-height:44px/);
    for(const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))expect(Number(m[1])).toBeGreaterThanOrEqual(12);
  });
});
