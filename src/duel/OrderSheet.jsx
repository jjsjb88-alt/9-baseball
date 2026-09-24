import React,{useEffect,useRef} from 'react';
import {CARDS,ZONES} from './cards.js';
import './card-detail.css';
import './order-sheet.css';

/*
 * V12 P3-4 — the order rail as a sheet (spec OrderRail: main fixed, supports move, 44px earlier /
 * later / recall buttons kept beside any drag). Every value shown comes from the engine plan the App
 * passes in (stackPlan.steps / links / damageRate / connectCount), re-read after each change.
 * Board-token taps and drags stay the quick path; this is the path that works for everyone.
 */
const CIRCLED=['①','②','③','④'];
const nameOf=(step,plusOf)=>step.kind==='basic'?'BASIC SWING':(CARDS[step.kind]?.name||'카드')+(plusOf(step.id)?'+':'');

export default function OrderSheet({plan,plusOf=()=>false,onMove,onRecall,onClose}){
  const closeRef=useRef(null),sheetRef=useRef(null),refocus=useRef(null);
  const steps=plan?.steps||[],links=plan?.links||[];
  useEffect(()=>{closeRef.current?.focus();},[]);
  // after a move or recall, keep focus on the same control of the same card (or the close button)
  useEffect(()=>{
    const want=refocus.current;if(!want)return;refocus.current=null;
    const row=sheetRef.current?.querySelector(`.order-row[data-step-id="${want.id}"]`);
    const btn=row?.querySelector(`button[data-act="${want.act}"]:not(:disabled)`)||row?.querySelector('button:not(:disabled)');
    (btn||closeRef.current)?.focus();
  });
  if(!plan)return null;
  const act=(id,kind)=>{refocus.current={id,act:kind};if(kind==='recall')onRecall(id);else onMove(id,kind==='earlier'?-1:1);};
  const onKeyDown=e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();return;}
    if(e.key!=='Tab')return;
    const f=[...(sheetRef.current?.querySelectorAll('button:not(:disabled)')||[])];if(!f.length)return;
    if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus();}
    else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus();}
  };
  const supports=steps.filter(x=>!x.main);
  return <div className="card-detail-backdrop" onClick={onClose}>
    <section ref={sheetRef} className="card-detail-sheet attack order-sheet" role="dialog" aria-modal="true" aria-labelledby="order-sheet-title" onClick={e=>e.stopPropagation()} onKeyDown={onKeyDown}>
      <header className="card-detail-head">
        <span className="card-detail-kind">메인 고정 · 지원 카드 순서 · CONNECT {plan.connectCount||0}/{links.length}</span>
        <h2 id="order-sheet-title">스윙 순서 · {steps.length}장</h2>
        <button ref={closeRef} type="button" className="card-detail-close" onClick={onClose}>닫기</button>
      </header>
      <p className="order-rate" role="status">피해 효율 {Math.round((plan.damageRate??1)*100)}% · 이어진 순서는 카드 수로 잃은 효율을 일부 되찾습니다.</p>
      <ol className="order-list">
        {steps.map((step,i)=>{
          const link=i>0?links[i-1]:null,name=nameOf(step,plusOf),support=supports.indexOf(step);
          return <li key={step.id+'-'+i} className={'order-row '+(step.main?'main':'support')} data-step-id={step.id}>
            <span className="order-badge" aria-hidden="true">{CIRCLED[i]||i+1}</span>
            <span className="order-text"><strong>{name}</strong><small>{ZONES[step.aimZone]} · {step.main?'메인 고정':link?.connected?(link.fromZone===link.toZone?'같은 존 · 앞 카드와 연결':'앞 카드와 연결'):'앞 카드와 끊김'}</small></span>
            {!step.main&&<span className="order-actions">
              <button type="button" data-act="earlier" disabled={support<=0} aria-label={name+' 순서를 앞으로'} onClick={()=>act(step.id,'earlier')}>◀</button>
              <button type="button" data-act="later" disabled={support>=supports.length-1} aria-label={name+' 순서를 뒤로'} onClick={()=>act(step.id,'later')}>▶</button>
              <button type="button" data-act="recall" className="recall" aria-label={name+' 회수'} onClick={()=>act(step.id,'recall')}>회수</button>
            </span>}
          </li>;
        })}
      </ol>
      {!supports.length&&<p className="order-empty">지원 카드가 없습니다 · 메인 카드 한 장으로 스윙합니다.</p>}
    </section>
  </div>;
}
