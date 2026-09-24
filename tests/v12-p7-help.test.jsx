// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import Duel from '../src/duel/App.jsx';
import {helpFacts} from '../src/duel/help-facts.js';
import {CARDS,GLOSSARY} from '../src/duel/cards.js';
import {V10_SWING_DAMAGE_RATES,V11_STACK_CONNECT_BONUS,V10_SWING_STACK_MAX} from '../src/duel/engine.js';

// V12 P7-1 — help says only what is verified, with numbers read from the engine: card count, stack
// efficiency (incl. the connect bonus), plate-appearance endings seen in the P4-2 audit, and the input
// paths verified in P2–P5. It used a hard-coded "13종", no connect bonus, no sacrifice bunt ending, and
// the glossary called the width penalty "per card" when the engine counts covered cells.
beforeEach(()=>localStorage.clear());
afterEach(()=>cleanup());

describe('V12 P7-1 help facts',()=>{
  const f=helpFacts();
  it('counts cards and states stack efficiency from the engine',()=>{
    expect(f.cardCount).toBe(Object.keys(CARDS).length);
    expect(f.stack).toBe(V10_SWING_DAMAGE_RATES.slice(0,V10_SWING_STACK_MAX).map((r,i)=>(i+1)+'장 '+Math.round(r*100)+'%').join(' · ')
      +' · 이어진 순서 한 번마다 +'+Math.round(V11_STACK_CONNECT_BONUS*100)+'%p');
  });
  it('lists the plate-appearance endings, sacrifice bunt included',()=>{
    expect(f.endsAtBat).toEqual(['안타','인플레이 아웃','희생 번트','삼진','볼넷']);
    expect(f.continuesAtBat).toEqual(['볼','스트라이크','헛스윙','파울']);
  });
  it('names each verified input path',()=>{
    const text=f.controls.map(c=>c.join(' ')).join('\n');
    for(const s of ['카드 → 칸','끌어','Enter','ⓘ 설명','i 키','길게 누르기','순서','회수','스카우팅 리포트'])expect(text).toContain(s);
  });
  it('the glossary counts covered cells, not cards, for the width penalty',()=>{
    const g=GLOSSARY.find(([t])=>t==='범위와 파워의 상충')[1];
    expect(g).toContain('커버 칸 수−1 당 −7');
    expect(g).not.toContain('커버 장수');
  });
});

describe('V12 P7-1 help modal',()=>{
  it('renders the facts, not hard-coded numbers',()=>{
    render(<Duel/>);
    fireEvent.click(screen.getByRole('button',{name:'?'}));
    const dialog=screen.getByRole('dialog',{name:'플레이 방법'});
    expect(dialog.textContent).toContain('카드 도감 · '+Object.keys(CARDS).length+'종');
    expect(dialog.textContent).not.toContain('13종');
    expect(dialog.textContent).toContain(helpFacts().stack);
    expect(dialog.textContent).toContain('희생 번트');
    expect(dialog.querySelector('.help-controls')).toBeTruthy();
  });
});
