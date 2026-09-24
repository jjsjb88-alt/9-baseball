// @vitest-environment happy-dom
import React from 'react';
import {render,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect} from 'vitest';
import ResultChain,{resultChainOf} from '../src/duel/ResultChain.jsx';
import {CARDS,ZONES} from '../src/duel/cards.js';

// V12 P4-1 — the result is told as a cause chain built only from what the engine revealed:
// actual pitch → which of my covers (main / support / none) it met → the call → the HP change.
afterEach(()=>cleanup());
const swing=(o={})=>({zone:2,label:'중전안타',kind:'hit',action:'strike',primaryCoverage:[2,5,8],supportCoverages:[],coverage:[2,5,8],...o});
const combat=(o={})=>({choice:'strike',choiceLabel:CARDS.strike.name,damage:12,damageRate:1,hpAfter:60,precisionBonus:0,...o});

describe('V12 P4-1 cause chain data',()=>{
  it('a main-cover hit',()=>{
    const c=resultChainOf(swing(),combat());
    expect(c.pitch).toBe('실제 공 · '+ZONES[2]);
    expect(c.cover).toEqual({tone:'main',text:'메인 커버 안 · '+CARDS.strike.name});
    expect(c.call).toBe('중전안타');
    expect(c.hp).toBe('투수 HP −12 · 피해 효율 ×100%');
  });
  it('a support-cover hit names the support card',()=>{
    const c=resultChainOf(swing({zone:7,primaryCoverage:[2,5,8],supportCoverages:[{kind:'defend',coverage:[5,7,8]}],coverage:[2,5,7,8],label:'겹친 카드 단타'}),combat({damage:8,damageRate:.8}));
    expect(c.cover).toEqual({tone:'support',text:'지원 커버 안 · '+CARDS.defend.name});
    expect(c.hp).toBe('투수 HP −8 · 피해 효율 ×80%');
  });
  it('a pitch outside every cover',()=>{
    const c=resultChainOf(swing({zone:0,label:'헛스윙',kind:'whiff'}),combat({damage:0}));
    expect(c.cover).toEqual({tone:'miss',text:'커버 밖'});
    expect(c.hp).toBe('투수 HP 변화 없음');
  });
  it('a ball outside the zone',()=>{
    const c=resultChainOf(swing({zone:9,label:'헛스윙',kind:'whiff'}),combat({damage:0}));
    expect(c.pitch).toBe('실제 공 · 존 밖 볼');
    expect(c.cover.tone).toBe('miss');
  });
  it('a watched pitch has no cover step',()=>{
    const c=resultChainOf({zone:9,label:'볼',kind:'ball',action:'take',primaryCoverage:[],supportCoverages:[],coverage:[]},null);
    expect(c.cover).toEqual({tone:'take',text:'지켜봄 · 스윙 안 함'});
    expect(c.hp).toBeNull();
  });
  it('shows a precision bonus as its own HP part, from the engine',()=>{
    const c=resultChainOf(swing(),combat({damage:15,precisionBonus:3}));
    expect(c.hp).toBe('투수 HP −15 · 피해 효율 ×100% · 정확 적중 +3');
  });
});

describe('V12 P4-1 ResultChain',()=>{
  it('renders the four steps in order and a mini board from the revealed cover',()=>{
    render(<ResultChain revealed={swing({supportCoverages:[{kind:'defend',coverage:[5,7,8]}]})} combat={combat()}/>);
    const steps=[...document.querySelectorAll('.result-chain-step')].map(s=>s.textContent);
    expect(steps).toHaveLength(4);
    expect(steps[0]).toContain(ZONES[2]);expect(steps[2]).toContain('중전안타');
    const cells=[...document.querySelectorAll('.result-mini i')];
    expect(cells).toHaveLength(9);
    expect(cells.map((c,i)=>c.classList.contains('main')?i:null).filter(x=>x!=null)).toEqual([2,5,8]);
    expect(cells.map((c,i)=>c.classList.contains('support')?i:null).filter(x=>x!=null)).toEqual([5,7,8]);
    expect(cells.map((c,i)=>c.classList.contains('actual')?i:null).filter(x=>x!=null)).toEqual([2]);
    expect(document.querySelector('.result-mini').getAttribute('aria-hidden')).toBe('true');
  });
  it('marks a ball outside the mini board',()=>{
    render(<ResultChain revealed={swing({zone:9,label:'볼',kind:'ball',action:'take',primaryCoverage:[],coverage:[]})} combat={null}/>);
    expect(document.querySelector('.result-mini').classList.contains('ball-outside')).toBe(true);
    expect(document.querySelectorAll('.result-chain-step')).toHaveLength(3);
  });
});
