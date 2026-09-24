// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Duel from '../src/duel/App.jsx';
import {createV10Duel,enterV10Node,saveV10Duel} from '../src/duel/engine.js';
import {BUILDS,CARDS} from '../src/duel/cards.js';

// V12 P2-3 — prepare cards read as prepare cards (D5): a round silhouette, but the name stays and the
// touch target stays the card's full rectangle. Each shows the uses left this plate appearance, the
// trigger names the action, and a card that cannot be used says why.
beforeEach(()=>{localStorage.clear()});
afterEach(()=>{cleanup()});

function begin(preparations=0){
  let s=createV10Duel(1);
  s.build='away';s.deck=BUILDS.away.cards.filter(k=>CARDS[k].type!=='skill').map((kind,i)=>({id:'c'+i,kind}));
  s.deck.push({id:'p1',kind:'scout'},{id:'p2',kind:'flow'});s.nextId=s.deck.length;
  s=enterV10Node(s,'a1-entry');
  s.battle.hand.push('p1','p2');s.battle.preparations=preparations;
  saveV10Duel(localStorage,s);
  render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
  fireEvent.click(screen.getByRole('button',{name:'준비하기',exact:true}));
}
const prepCards=()=>[...document.querySelectorAll('.duel-hand .duel-card.skill')];

describe('V12 P2-3 prepare cards in the hand',()=>{
  it('keep their names and show the uses left',()=>{
    begin(1);
    const cards=prepCards();
    expect(cards.map(c=>c.querySelector('strong').textContent)).toEqual([CARDS.scout.name,CARDS.flow.name]);
    for(const c of cards)expect(c.querySelector('.card-uses')?.textContent).toBe('준비 1회 남음');
  });
  it('say why a card cannot be used',()=>{
    begin();
    const flow=prepCards().find(c=>c.dataset.cardKind==='flow');
    expect(flow.classList.contains('unavailable')).toBe(true);
    expect(flow.querySelector('.card-rule').textContent).toBe('먼저 베이스에 주자가 필요합니다.');
    expect(flow.dataset.cardProblem).toBe('먼저 베이스에 주자가 필요합니다.');
  });
  it('talk about preparing, not the 9ZONE, before one is chosen',()=>{
    begin();
    const preview=document.querySelector('.decision-preview');
    expect(preview.textContent).toContain('준비 카드를 고르세요.');
    expect(preview.textContent).toContain('남은 준비 2회');
    expect(preview.textContent).not.toContain('9존에 놓으세요');
  });
  it('name the action on the trigger once chosen',()=>{
    begin();
    fireEvent.click(screen.getByRole('button',{name:CARDS.scout.name,exact:true}));
    expect(screen.getByTestId('execute-action').textContent).toBe(CARDS.scout.name+' · 준비 1회');
  });
  it('keep the swing strip copy for swing mode',()=>{
    begin();
    fireEvent.click(screen.getByRole('button',{name:'← 돌아가기'}));
    fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
    expect(document.querySelector('.decision-preview').textContent).toContain('카드를 9존에 놓으세요.');
  });
});

describe('V12 P2-3 round silhouette styles',()=>{
  const file=path.resolve(process.cwd(),'src/duel/v12-card-prepare.css');
  const css=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
  const parts=t=>{const out=[];let d=0,cur='';for(const ch of t){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&!d){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out};
  const rules=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/@media[^{]*\{/g,'').split('}').map(r=>r.split('{')).filter(r=>r.length===2&&r[0].trim());
  it('is loaded after the P1 layers and stays on design-state prepare cards',()=>{
    const main=fs.readFileSync(path.resolve(process.cwd(),'src/main.jsx'),'utf8');
    expect(main.indexOf('v12-card-prepare.css')).toBeGreaterThan(main.indexOf('v12-battle-type.css'));
    expect(rules.length).toBeGreaterThan(4);
    for(const [sel] of rules)for(const p of parts(sel))expect(p.trim()).toMatch(/^\.duel-combat\.v12-design .*\.duel-card\.skill/);
  });
  it('draws the circle without shrinking or reshaping the hit area',()=>{
    for(const [sel,body] of rules){
      const onButton=parts(sel).some(p=>/\.duel-card\.skill(\.[\w-]+|:[\w-]+(\([^)]*\))?)*\s*$/.test(p.trim()));
      if(onButton)expect(body).not.toMatch(/(^|;)\s*(width|height|min-width|min-height|clip-path|border-radius|padding)\s*:/);
    }
    expect(css).toMatch(/::before\{[^}]*border-radius:50%/);
  });
  it('never sets text below 12px',()=>{
    for(const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))expect(Number(m[1])).toBeGreaterThanOrEqual(12);
  });
});

describe('V12 P2-4 upgraded card keeps its + on the trigger',()=>{
  it('names the + card on the execute button',()=>{
    let s=createV10Duel(1);
    s.build='away';s.deck=BUILDS.away.cards.map((kind,i)=>({id:'c'+i,kind,plus:CARDS[kind].type==='attack'}));s.nextId=s.deck.length;
    s=enterV10Node(s,'a1-entry');
    saveV10Duel(localStorage,s);
    render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'스윙하기',exact:true}));
    const card=[...document.querySelectorAll('.duel-hand .duel-card.attack[data-card-plus="1"]')][0];
    fireEvent.click(card);
    expect(screen.getByTestId('execute-action').textContent).toBe(CARDS[card.dataset.cardKind].name+'+ · 단독 스윙 · 피해 효율 100%');
  });
});
