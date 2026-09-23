import React,{useEffect,useRef} from 'react';
import {CARDS,AXIS_NAMES,cardText,upgradeText} from './cards.js';
import './card-detail.css';

/*
 * V12 P2-1 — the card detail sheet (D3: names stay, D4: names stay in the hand, detail = original rule).
 * Three ways in, none of which replaces another:
 *   - an explicit button for the selected card (App renders it in the execute strip)
 *   - the keyboard: `i` on a focused hand card
 *   - long-press / context menu on a hand card — secondary only, never the one path
 * The gestures run in the window capture phase so they see the pointer before the swing stack
 * direct-tap layer (document capture) and can swallow the click that ends a long-press.
 */
export const LONG_PRESS_MS=480;
// under stack-direct-tap's 9px drag start, so a drag or a hand scroll never turns into a detail
const LONG_PRESS_SLOP=8;
const HAND_CARD='.duel-hand .duel-card[data-card-kind]';

const STACK={
  none:null,
  bunt:'겹치기 불가 · 희생 번트에는 다른 카드를 겹칠 수 없고, 겹치기 카드로도 쓸 수 없습니다.',
  basic:'메인 전용 · 다른 카드를 놓으면 BASIC SWING이 교체됩니다.',
  attack:'겹치기 가능 · 메인 또는 지원 카드로 놓을 수 있습니다.',
};
const BASIC={name:'BASIC SWING',kindLabel:'스윙 카드',role:'기본',axis:'1존',rule:'선택한 1존을 칩니다. 카드 소비 없음 — 카드가 없어도 승부할 수 있습니다.',gives:['항상 사용'],needs:[],flavor:null};

export function cardDetailOf(kind,plus=false,problem=null){
  if(kind==='basic')return {...BASIC,kind,plus:false,upgrade:null,problem:problem||null,stack:STACK.basic};
  const c=CARDS[kind];if(!c)return null;
  const up=upgradeText(kind);
  return {
    kind,plus:!!plus,name:c.name+(plus?'+':''),kindLabel:c.type==='skill'?'준비 카드':'스윙 카드',
    role:c.role,axis:c.axis?AXIS_NAMES[c.axis]:'타석 준비',rule:cardText(kind,plus),
    upgrade:up?(plus?'강화됨 · ':'강화하면 · ')+up:null,
    gives:c.gives,needs:c.needs,flavor:c.flavor||null,problem:problem||null,
    stack:c.type==='skill'?STACK.none:kind==='bunt'?STACK.bunt:STACK.attack,
  };
}

const read=card=>({kind:card.dataset.cardKind,plus:card.dataset.cardPlus==='1',problem:card.dataset.cardProblem||null});

export function installCardDetailGestures(win,open){
  let press=null,swallowNextClick=false;
  const clear=()=>{if(press){win.clearTimeout(press.timer);press=null;}};
  const down=e=>{
    clear();if(e.button>0)return;
    const card=e.target?.closest?.(HAND_CARD);if(!card)return;
    press={id:e.pointerId,x:e.clientX,y:e.clientY,timer:win.setTimeout(()=>{press=null;swallowNextClick=true;open(read(card),card);},LONG_PRESS_MS)};
  };
  const move=e=>{if(press&&e.pointerId===press.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>LONG_PRESS_SLOP)clear();};
  const end=e=>{if(press&&e.pointerId===press.id)clear();};
  const click=e=>{
    if(!swallowNextClick)return;swallowNextClick=false;
    if(e.target?.closest?.(HAND_CARD)){e.preventDefault();e.stopImmediatePropagation();}
  };
  const menu=e=>{const card=e.target?.closest?.(HAND_CARD);if(!card)return;e.preventDefault();clear();open(read(card),card);};
  const key=e=>{
    if(e.key!=='i'&&e.key!=='I')return;
    const card=e.target?.closest?.(HAND_CARD);if(!card)return;
    e.preventDefault();open(read(card),card);
  };
  const opts={capture:true};
  win.addEventListener('pointerdown',down,opts);win.addEventListener('pointermove',move,{capture:true,passive:true});
  win.addEventListener('pointerup',end,opts);win.addEventListener('pointercancel',end,opts);
  win.addEventListener('scroll',clear,opts);win.addEventListener('click',click,opts);
  win.addEventListener('contextmenu',menu,opts);win.addEventListener('keydown',key,opts);
  return ()=>{
    clear();
    win.removeEventListener('pointerdown',down,opts);win.removeEventListener('pointermove',move,opts);
    win.removeEventListener('pointerup',end,opts);win.removeEventListener('pointercancel',end,opts);
    win.removeEventListener('scroll',clear,opts);win.removeEventListener('click',click,opts);
    win.removeEventListener('contextmenu',menu,opts);win.removeEventListener('keydown',key,opts);
  };
}

export default function CardDetailSheet({detail,onClose}){
  const closeRef=useRef(null),sheetRef=useRef(null);
  useEffect(()=>{closeRef.current?.focus();},[detail?.kind,detail?.plus]);
  if(!detail)return null;
  const titleId='card-detail-title';
  const onKeyDown=e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();return;}
    if(e.key!=='Tab')return;
    const focusable=[...(sheetRef.current?.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])')||[])];
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  };
  return <div className="card-detail-backdrop" onClick={onClose}>
    <section ref={sheetRef} className={'card-detail-sheet '+(detail.kindLabel==='준비 카드'?'skill':'attack')} role="dialog" aria-modal="true" aria-labelledby={titleId}
      onClick={e=>e.stopPropagation()} onKeyDown={onKeyDown}>
      <header className="card-detail-head">
        <span className="card-detail-kind">{detail.kindLabel} · {detail.role} · {detail.axis}</span>
        <h2 id={titleId}>{detail.name}<span className="card-detail-sr"> 카드 설명</span></h2>
        <button ref={closeRef} type="button" className="card-detail-close" onClick={onClose}>닫기</button>
      </header>
      {detail.problem&&<p className="card-detail-problem" role="note">지금 사용할 수 없음 · {detail.problem}</p>}
      <p className="card-detail-rule">{detail.rule}</p>
      {(detail.gives.length>0||detail.needs.length>0)&&<ul className="card-detail-tags" aria-label="효과와 조건">
        {detail.gives.map(g=><li key={'g'+g}>{g}</li>)}
        {detail.needs.map(n=><li key={'n'+n} className="need">조건 · {n}</li>)}
      </ul>}
      {detail.stack&&<p className="card-detail-stack">{detail.stack}</p>}
      {detail.upgrade&&<p className="card-detail-upgrade">{detail.upgrade}</p>}
      {detail.flavor&&<p className="card-detail-flavor">{detail.flavor}</p>}
    </section>
  </div>;
}
