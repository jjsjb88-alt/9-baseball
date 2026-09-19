import React from 'react';
import {CARDS,ZONES} from './cards.js';
import './v11-stack.css';

const center=zone=>{
  const z=Number.isInteger(zone)?zone:4;
  return {x:(z%3)*100/3+100/6,y:Math.floor(z/3)*100/3+100/6};
};

const cardName=(kind,main)=>main?'MAIN SWING':(CARDS[kind]?.name||'SUPPORT');
const zoneLabel=zone=>ZONES[zone]||('ZONE '+(Number(zone)+1));

export default function StackBoard({
  plan,
  activeId=null,
  onSelect=()=>{},
  onMove=()=>{},
  damageRate=1,
  baseDamageRate=1,
  connectBonus=0,
  precisionPressure=0,
}){
  const steps=plan?.steps||[],links=plan?.links||[];
  const connectCount=plan?.connectCount||0;
  const perfect=!!plan?.perfect&&links.length>0;
  const slots=new Map();
  for(const step of steps){
    const list=slots.get(step.aimZone)||[];
    list.push(step);
    slots.set(step.aimZone,list);
  }

  return <section className={'stack-board '+(perfect?'perfect-route ':'')+(steps.length>1?'has-route':'solo-route')} aria-label="9존 스윙 경로 설계">
    <header className="stack-board-head">
      <div className="stack-board-title">
        <span>SWING ROUTE / 9ZONE</span>
        <strong>{steps.length>1?(perfect?'경로 완성 · 전부 이어졌다':'순서를 바꿔 연결을 만든다'):'메인 스윙에서 시작'}</strong>
        <small>{steps.length>1?'①부터 마지막 카드까지 하나의 배트 궤도로 연결합니다.':'지원 카드를 추가하면 경로 설계가 시작됩니다.'}</small>
      </div>
      <div className="stack-board-chain" aria-label={'커넥트 '+connectCount+'개'}>
        <b>{connectCount}</b>
        <span>CONNECT</span>
        <small>/ {Math.max(0,steps.length-1)}</small>
      </div>
    </header>

    <div className="stack-board-stage">
      <div className="stack-board-zone" aria-label="3x3 스택 보드">
        <svg className="stack-route-lines" viewBox="0 0 100 100" aria-hidden="true">
          {links.map((link,i)=>{
            const a=center(link.fromZone),b=center(link.toZone);
            const same=link.fromZone===link.toZone;
            return same
              ? <circle key={i} className={link.connected?'connected':'broken'} cx={a.x} cy={a.y} r="8"/>
              : <line key={i} className={link.connected?'connected':'broken'} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>;
          })}
        </svg>

        {Array.from({length:9},(_,zone)=>{
          const here=slots.get(zone)||[];
          const occupied=here.length>0;
          return <button
            key={zone}
            type="button"
            className={'stack-zone-cell '+(occupied?'occupied ':'')+(here.some(x=>x.main)?'main-cell ':'')+(here.some(x=>x.id===activeId)?'active-cell':'')}
            aria-label={(zone+1)+'번 '+zoneLabel(zone)+(occupied?' · '+here.map(x=>x.order+'번째').join(', '):'')}
            onClick={()=>here.length&&onSelect(here[here.length-1].id)}
            disabled={!here.length}
          >
            <small>{zone+1}</small>
            <div className="stack-zone-tokens">
              {here.map((step,idx)=><i
                key={step.order}
                className={(step.main?'main ':'support ')+(step.id===activeId?'active':'')}
                style={{'--token-index':idx}}
                title={step.order+' · '+cardName(step.kind,step.main)}
              >{step.order}</i>)}
            </div>
            {occupied&&<em>{here.some(x=>x.main)?'MAIN':zoneLabel(zone)}</em>}
          </button>;
        })}
      </div>

      <aside className="stack-board-readout" aria-label="스택 결과">
        <div className="stack-route-status">
          <span>{perfect?'ROUTE LOCKED':steps.length>1?'ROUTE CHECK':'SOLO'}</span>
          <strong>{perfect?'PERFECT CONNECT':steps.length>1?connectCount+' / '+links.length+' CONNECT':'100% POWER'}</strong>
          <small>{perfect?'모든 지원 카드가 앞 카드와 이어집니다.':'끊긴 링크는 피해 효율을 회복하지 못합니다.'}</small>
        </div>
        <div className="stack-damage-flow" aria-label="HP 피해 효율 계산">
          <div><span>BASE</span><b>{Math.round(baseDamageRate*100)}%</b></div>
          <i>+</i>
          <div className="bonus"><span>CONNECT</span><b>{Math.round(connectBonus*100)}%</b></div>
          <i>=</i>
          <div className="final"><span>FINAL</span><b>{Math.round(damageRate*100)}%</b></div>
        </div>
        {precisionPressure>0&&<div className="stack-precision-note"><span>PRECISION MAIN</span><strong>정확 적중 ×{(1+precisionPressure).toFixed(1)}</strong><small>지원 카드 적중에는 적용되지 않습니다.</small></div>}
        <div className="stack-link-list">
          {links.length?links.map(link=><div key={link.toOrder} className={link.connected?'connected':'broken'}>
            <b>{link.fromOrder} → {link.toOrder}</b>
            <span>{link.connected?'CONNECTED':'BREAK'}</span>
            <small>{zoneLabel(link.fromZone)} → {zoneLabel(link.toZone)}</small>
          </div>):<div className="solo"><b>① MAIN</b><span>FULL POWER</span><small>카드 1장 · 피해 감소 없음</small></div>}
        </div>
      </aside>
    </div>

    {steps.length>1&&<div className="stack-order-rail" aria-label="스윙 순서 변경">
      <span className="rail-label">SWING ORDER</span>
      <div className="rail-cards">
        {steps.map((step,i)=><React.Fragment key={step.order}>
          {i>0&&<i className={links[i-1]?.connected?'connected':'broken'} aria-hidden="true"/>}
          <div className={(step.main?'main ':'support ')+(step.id===activeId?'active':'')}>
            <b>{step.order}</b>
            <span>{cardName(step.kind,step.main)}</span>
            <small>{zoneLabel(step.aimZone)}</small>
            {!step.main&&<div className="rail-actions">
              <button type="button" aria-label={cardName(step.kind,false)+' 순서를 앞으로'} disabled={i===1} onClick={()=>onMove(step.id,-1)}>←</button>
              <button type="button" aria-label={cardName(step.kind,false)+' 순서를 뒤로'} disabled={i===steps.length-1} onClick={()=>onMove(step.id,1)}>→</button>
            </div>}
          </div>
        </React.Fragment>)}
      </div>
    </div>}
  </section>;
}
