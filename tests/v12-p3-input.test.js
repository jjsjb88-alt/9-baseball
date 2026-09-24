// @vitest-environment happy-dom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {installSwingStackDirectTap} from '../src/duel/stack-direct-tap.js';
import {installCardDetailGestures,LONG_PRESS_MS} from '../src/duel/CardDetailSheet.jsx';

// V12 P3-5 — input: the hand's native horizontal scroll comes first (a mostly-sideways touch never
// becomes a drag), a drag toward the board still works, cancel restores, and a press held between a
// tap and a long-press is never a dead zone.
const tick=()=>new Promise(r=>setTimeout(r,45));
function pointer(target,type,x,y,kind='touch'){
  const e=new Event(type,{bubbles:true,cancelable:true});
  Object.defineProperties(e,{clientX:{value:x},clientY:{value:y},pointerId:{value:1},pointerType:{value:kind},button:{value:0}});
  target.dispatchEvent(e);return e;
}
function fixture(){
  document.body.innerHTML=`<main class="duel-combat"><section class="zone-panel" aria-label="9존 타격 계획"><div class="zone-grid">${Array.from({length:9},(_,i)=>`<button class="zone-cell" aria-label="존${i+1}" aria-pressed="${i===0}"><span>존${i+1}</span></button>`).join('')}</div></section>
  <section class="card-drawer" aria-label="스윙 카드 선택"><div class="duel-hand"><button class="duel-card attack selected" data-card-kind="strike"><strong>밀어치기</strong></button><button class="duel-card attack" data-card-kind="place"><strong>정타 노림</strong></button><button class="duel-card attack basic-card" data-card-kind="basic"><strong>BASIC SWING</strong></button></div>
  <section class="swing-stack"><div class="stack-candidates"><button><span>+ 겹치기</span><strong>정타 노림</strong></button></div></section><div class="decision-preview"><button data-testid="execute-action">스윙</button></div></section></main>`;
  return document.querySelectorAll('.duel-hand .duel-card')[1];
}
afterEach(()=>{document.body.innerHTML='';vi.useRealTimers();});
const ghost=()=>document.querySelector('.zone-card-drag-ghost');

describe('V12 P3-5 hand scroll before drag',()=>{
  it('leaves a mostly sideways touch to the native hand scroll',async()=>{
    const card=fixture(),off=installSwingStackDirectTap(document);await tick();
    pointer(card,'pointerdown',100,320);pointer(card,'pointermove',124,316);pointer(card,'pointermove',150,312);
    expect(ghost()).toBeNull();
    expect(card.classList.contains('board-drag-source')).toBe(false);
    pointer(card,'pointerup',150,312);off();
  });
  it('still drags a touch that heads for the board',async()=>{
    const card=fixture(),off=installSwingStackDirectTap(document);await tick();
    pointer(card,'pointerdown',100,320);pointer(card,'pointermove',108,300);
    expect(ghost()).not.toBeNull();
    pointer(card,'pointercancel',108,300);await new Promise(r=>setTimeout(r,200));
    expect(ghost()).toBeNull();
    expect(card.classList.contains('board-drag-source')).toBe(false);
    off();
  });
  it('drags with a mouse in any direction (no native pan to protect)',async()=>{
    const card=fixture(),off=installSwingStackDirectTap(document);await tick();
    pointer(card,'pointerdown',100,320,'mouse');pointer(card,'pointermove',130,318,'mouse');
    expect(ghost()).not.toBeNull();
    pointer(card,'pointercancel',130,318,'mouse');off();
  });
});

describe('V12 P3-5 no dead press',()=>{
  it('a 300ms press is still a tap, a long press opens the detail',()=>{
    vi.useFakeTimers();
    // outside the swing drawer: the direct-tap layer (installed on import) owns clicks on swing cards there
    const card=fixture(),open=vi.fn(),click=vi.fn(),off=installCardDetailGestures(window,open);
    document.querySelector('.card-drawer').setAttribute('aria-label','준비 카드 선택');
    document.addEventListener('click',click,true);
    const pe=(t,x=10,y=10)=>card.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,pointerId:1,clientX:x,clientY:y}));
    pe('pointerdown');vi.advanceTimersByTime(300);pe('pointerup');card.click();
    expect(open).not.toHaveBeenCalled();expect(click).toHaveBeenCalledTimes(1);
    pe('pointerdown');vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(open).toHaveBeenCalledTimes(1);
    document.removeEventListener('click',click,true);off();
  });
});
