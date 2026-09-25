// @vitest-environment happy-dom
import React from 'react';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import CardDetailSheet,{cardDetailOf,installCardDetailGestures,LONG_PRESS_MS} from '../src/duel/CardDetailSheet.jsx';
import Duel from '../src/duel/App.jsx';
import {createV10Duel,enterV10Node,saveV10Duel} from '../src/duel/engine.js';
import {BUILDS,CARDS,cardText,upgradeText} from '../src/duel/cards.js';

// V12 P2-1 — card name + detail sheet. D3: the 16 names stay. D4: names stay in the hand; the detail
// gives the original rule, upgrade and conditions, reachable by an explicit button, the keyboard and
// long-press (long-press is only the secondary path).
beforeEach(()=>{localStorage.clear();vi.useFakeTimers()});
afterEach(()=>{cleanup();vi.useRealTimers()});

describe('V12 P2-1 card detail data',()=>{
  it('keeps every card name and its original rule text',()=>{
    for(const kind of Object.keys(CARDS)){
      const d=cardDetailOf(kind,false);
      expect(d.name).toBe(CARDS[kind].name);
      expect(d.rule).toBe(cardText(kind,false));
      expect(d.kindLabel).toBe(CARDS[kind].type==='skill'?'준비 카드':'스윙 카드');
      expect(d.gives).toEqual(CARDS[kind].gives);
      expect(d.needs).toEqual(CARDS[kind].needs);
    }
  });
  it('says what an upgrade does before and after it is taken',()=>{
    expect(cardDetailOf('bunt',false).upgrade).toBe('강화하면 · '+upgradeText('bunt'));
    const plus=cardDetailOf('bunt',true);
    expect(plus.name).toBe(CARDS.bunt.name+'+');
    expect(plus.rule).toBe(cardText('bunt',true));
    expect(plus.upgrade).toBe('강화됨 · '+upgradeText('bunt'));
  });
  it('describes BASIC SWING, which is not a deck card',()=>{
    const d=cardDetailOf('basic',false);
    expect(d.name).toBe('BASIC SWING');
    expect(d.rule).toMatch(/카드 소비 없음/);
    expect(d.upgrade).toBeNull();
  });
  it('carries the reason a card cannot be used',()=>{
    expect(cardDetailOf('flow',false,'주자가 있어야 사용').problem).toBe('주자가 있어야 사용');
  });
});

describe('V12 P2-1 detail sheet',()=>{
  it('is a modal dialog named after the card that closes on Escape',()=>{
    const onClose=vi.fn();
    render(<CardDetailSheet detail={cardDetailOf('bunt',false)} onClose={onClose}/>);
    const dialog=screen.getByRole('dialog',{name:CARDS.bunt.name+' 카드 설명'});
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain(CARDS.bunt.text);
    expect(document.activeElement?.textContent).toBe('닫기');
    fireEvent.keyDown(dialog,{key:'Escape'});
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('keeps Tab inside the sheet and closes from the backdrop',()=>{
    const onClose=vi.fn();
    render(<CardDetailSheet detail={cardDetailOf('scout',true)} onClose={onClose}/>);
    const close=screen.getByRole('button',{name:'닫기'});
    close.focus();
    fireEvent.keyDown(close,{key:'Tab'});
    expect(document.activeElement).toBe(close);
    fireEvent.click(document.querySelector('.card-detail-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

function handCard(kind='bunt',plus=false){
  document.body.innerHTML=`<div class="duel-hand"><button class="duel-card attack" data-card-kind="${kind}" data-card-plus="${plus?1:0}"><strong>${CARDS[kind].name}</strong></button></div>`;
  return document.querySelector('.duel-card');
}
const pointer=(type,el,x=10,y=10)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:1,clientX:x,clientY:y}));

describe('V12 P2-1 detail gestures',()=>{
  it('opens on a still long-press and swallows the click that follows it',()=>{
    const card=handCard('bunt',true),open=vi.fn(),click=vi.fn();
    const off=installCardDetailGestures(window,open);
    document.addEventListener('click',click,true);
    pointer('pointerdown',card);
    vi.advanceTimersByTime(LONG_PRESS_MS-1);
    expect(open).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(open).toHaveBeenCalledWith({kind:'bunt',plus:true,problem:null},card);
    pointer('pointerup',card);card.click();
    expect(click).not.toHaveBeenCalled();
    card.click();
    expect(click).toHaveBeenCalledTimes(1);
    document.removeEventListener('click',click,true);off();
  });
  it('leaves a quick tap, a drag and a scroll alone',()=>{
    const card=handCard(),open=vi.fn(),click=vi.fn();
    const off=installCardDetailGestures(window,open);
    document.addEventListener('click',click,true);
    pointer('pointerdown',card);vi.advanceTimersByTime(200);pointer('pointerup',card);card.click();
    expect(click).toHaveBeenCalledTimes(1);
    pointer('pointerdown',card,10,10);pointer('pointermove',card,10,19);vi.advanceTimersByTime(LONG_PRESS_MS);
    pointer('pointerdown',card);pointer('pointercancel',card);vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(open).not.toHaveBeenCalled();
    document.removeEventListener('click',click,true);off();
  });
  it('opens from the keyboard (i) and from the context menu',()=>{
    const card=handCard('scout'),open=vi.fn();
    const off=installCardDetailGestures(window,open);
    card.dispatchEvent(new KeyboardEvent('keydown',{key:'i',bubbles:true,cancelable:true}));
    expect(open).toHaveBeenCalledWith({kind:'scout',plus:false,problem:null},card);
    const menu=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});
    card.dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);
    expect(open).toHaveBeenCalledTimes(2);
    off();
  });
});

function beginV10(){
  let s=createV10Duel(1);
  s.build='away';s.deck=BUILDS.away.cards.map((kind,i)=>({id:'c'+i,kind}));s.nextId=BUILDS.away.cards.length;
  s=enterV10Node(s,'a1-entry');
  saveV10Duel(localStorage,s);
  render(<Duel/>);fireEvent.click(screen.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}));
  return s;
}

describe('V12 P2-1 in the ballpark battle',()=>{
  it('marks every hand card with its kind so the detail can find it',()=>{
    beginV10();
    const cards=[...document.querySelectorAll('.bp-hand [data-card-kind]')];
    expect(cards.length).toBeGreaterThan(1);
    expect(document.querySelector('.bp-hand .bp-card.basic').dataset.cardKind).toBe('basic');
  });
  it('opens the selected card from an explicit button and returns focus when closed',()=>{
    beginV10();
    const card=document.querySelector('.bp-hand .bp-card:not(.basic)'),name=CARDS[card.dataset.cardKind].name;
    fireEvent.click(card);
    const open=screen.getByRole('button',{name:name+' 카드 설명'});
    open.focus();fireEvent.click(open);
    const dialog=screen.getByRole('dialog',{name:name+' 카드 설명'});
    fireEvent.keyDown(dialog,{key:'Escape'});
    act(()=>vi.runOnlyPendingTimers());
    expect(screen.queryByRole('dialog',{name:name+' 카드 설명'})).toBeNull();
    expect(document.activeElement).toBe(open);
  });
});

describe('V12 P2-1 sheet styles',()=>{
  const css=fs.readFileSync(path.resolve(process.cwd(),'src/duel/card-detail.css'),'utf8');
  it('never sets text below 12px and keeps 44px controls',()=>{
    for(const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))expect(Number(m[1])).toBeGreaterThanOrEqual(12);
    expect(css).toMatch(/\.card-detail-close\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.card-detail-open\{[^}]*min-height:44px/);
  });
  it('only styles its own sheet and button',()=>{
    const sels=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/@keyframes[^{]*\{[\s\S]*?\}\}/g,'').replace(/@media[^{]*\{/g,'').split('}').map(r=>r.split('{')[0].trim()).filter(Boolean);
    for(const sel of sels)for(const p of sel.split(','))expect(p.trim()).toMatch(/^(\.card-detail-|\.duel-combat \.card-detail-open)/);
  });
});

describe('V12 P2-4 role rules in the detail',()=>{
  it('says bunt never stacks, in the engine words',()=>{
    expect(cardDetailOf('bunt',false).stack).toBe('겹치기 불가 · 희생 번트에는 다른 카드를 겹칠 수 없고, 겹치기 카드로도 쓸 수 없습니다.');
    expect(cardDetailOf('strike',false).stack).toBe('겹치기 가능 · 메인 또는 지원 카드로 놓을 수 있습니다.');
    expect(cardDetailOf('scout',false).stack).toBeNull();
    expect(cardDetailOf('basic',false).stack).toBe('메인 전용 · 다른 카드를 놓으면 BASIC SWING이 교체됩니다.');
  });
  it('shows the stack rule in the sheet',()=>{
    render(<CardDetailSheet detail={cardDetailOf('bunt',false)} onClose={()=>{}}/>);
    expect(document.querySelector('.card-detail-stack').textContent).toContain('겹치기 불가');
  });
});
