import React,{useState} from 'react';
import {CARDS,ZONES} from './cards.js';
import {v11StackZonesConnect} from './engine.js';
import './v11-stack.css';

const center=zone=>{
  const z=Number.isInteger(zone)?zone:4;
  return {x:(z%3)*100/3+100/6,y:Math.floor(z/3)*100/3+100/6};
};

const cardName=(kind,main)=>main?'MAIN SWING':(CARDS[kind]?.name||'SUPPORT');
const zoneLabel=zone=>ZONES[zone]||('ZONE '+(Number(zone)+1));

const stackLinks=steps=>(steps||[]).slice(1).map((step,i)=>({
  fromOrder:i+1,
  toOrder:i+2,
  fromZone:steps[i]?.aimZone,
  toZone:step?.aimZone,
  connected:v11StackZonesConnect(steps[i]?.aimZone,step?.aimZone),
}));
const stackConnectCount=steps=>stackLinks(steps).filter(link=>link.connected).length;

export function stackReorderPreview(steps,fromIndex,toIndex){
  const list=Array.isArray(steps)?steps:[];
  if(fromIndex<1||toIndex<1||fromIndex>=list.length||toIndex>=list.length)return null;
  const before=stackConnectCount(list);
  const moved=[...list];
  if(fromIndex!==toIndex){
    const [item]=moved.splice(fromIndex,1);
    moved.splice(toIndex,0,item);
  }
  const ordered=moved.map((step,i)=>({...step,order:i+1}));
  const links=stackLinks(ordered),connectCount=links.filter(link=>link.connected).length;
  return {steps:ordered,links,connectCount,delta:connectCount-before,perfect:links.length>0&&connectCount===links.length};
}

export function stackMoveConnectDelta(steps,index,delta){
  const preview=stackReorderPreview(steps,index,index+delta);
  return preview?preview.delta:null;
}

export function stackAimConnectPreview(steps,id,aimZone){
  const list=Array.isArray(steps)?steps:[];
  const index=list.findIndex(step=>step?.id===id);
  if(index<1||!Number.isInteger(aimZone)||aimZone<0||aimZone>8)return null;
  const before=stackConnectCount(list);
  const aimed=list.map((step,i)=>i===index?{...step,aimZone}:step);
  const links=stackLinks(aimed),connectCount=links.filter(link=>link.connected).length;
  const local=[links[index-1],links[index]].filter(Boolean);
  const localConnected=local.filter(link=>link.connected).length;
  return {
    connectCount,
    delta:connectCount-before,
    localConnected,
    localTotal:local.length,
    localPerfect:local.length>0&&localConnected===local.length,
  };
}
const impactClass=delta=>delta>0?'improves':delta<0?'worsens':'neutral';
const impactText=delta=>delta>0?('+'+delta):String(delta);

export default function StackBoard({
  plan,
  activeId=null,
  onSelect=()=>{},
  onMove=()=>{},
  onAim=null,
  damageRate=1,
  baseDamageRate=1,
  connectBonus=0,
  precisionPressure=0,
}){
  const steps=plan?.steps||[],links=plan?.links||[];
  const connectCount=plan?.connectCount||0;
  const perfect=!!plan?.perfect&&links.length>0;
  const [drag,setDrag]=useState(null);
  const dragPreview=drag?stackReorderPreview(steps,drag.fromIndex,drag.targetIndex):null;
  const viewSteps=dragPreview?.steps||steps,viewLinks=dragPreview?.links||links;
  const viewConnectCount=dragPreview?.connectCount??connectCount,viewPerfect=dragPreview?.perfect??perfect;
  const dragDelta=dragPreview?.delta||0;
  const activeSupport=viewSteps.find(step=>step.id===activeId&&!step.main)||null;
  const aimEditing=!!activeSupport&&!drag&&typeof onAim==='function';
  const slots=new Map();
  for(const step of viewSteps){
    const list=slots.get(step.aimZone)||[];
    list.push(step);
    slots.set(step.aimZone,list);
  }

  const beginDrag=(e,step,index)=>{
    if(step.main||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({id:step.id,fromIndex:index,targetIndex:index,pointerId:e.pointerId});
    onSelect(step.id);
  };
  const moveDrag=e=>{
    if(!drag||drag.pointerId!==e.pointerId)return;
    const el=globalThis.document?.elementFromPoint?.(e.clientX,e.clientY);
    const target=el?.closest?.('[data-stack-index]');
    const next=Number(target?.dataset?.stackIndex);
    if(!Number.isInteger(next)||next<1||next>=steps.length||next===drag.targetIndex)return;
    setDrag({...drag,targetIndex:next});
  };
  const finishDrag=(e,cancel=false)=>{
    if(!drag||drag.pointerId!==e.pointerId)return;
    e.preventDefault();e.stopPropagation();
    if(!cancel&&drag.targetIndex!==drag.fromIndex)onMove(drag.id,drag.targetIndex-drag.fromIndex);
    setDrag(null);
  };

  return <section className={'stack-board '+(viewPerfect?'perfect-route ':'')+(steps.length>1?'has-route ':'solo-route ')+(drag?'dragging ':'')+(aimEditing?'aim-editing':'')} aria-label="9존 스윙 경로 설계">
    <header className="stack-board-head">
      <div className="stack-board-title">
        <span>SWING ROUTE / 9ZONE</span>
        <strong>{drag?('놓으면 '+viewConnectCount+'/'+Math.max(0,viewSteps.length-1)+' CONNECT'):aimEditing?(activeSupport.order+'번 카드 코스 편집 · 9존을 눌러 이동'):steps.length>1?(perfect?'경로 완성 · 전부 이어졌다':'순서를 바꿔 연결을 만든다'):'메인 스윙에서 시작'}</strong>
        <small>{drag?'손을 떼면 미리 본 순서로 확정됩니다.':aimEditing?'각 존의 LINK 수와 CONNECT 변화량을 보고 직접 고릅니다.':steps.length>1?'①부터 마지막 카드까지 하나의 배트 궤도로 연결합니다.':'지원 카드를 추가하면 경로 설계가 시작됩니다.'}</small>
      </div>
      <div className="stack-board-chain" aria-label={'커넥트 '+connectCount+'개'}>
        <b>{viewConnectCount}</b>
        <span>CONNECT</span>
        <small>/ {Math.max(0,steps.length-1)}</small>
      </div>
    </header>

    <div className="stack-board-stage">
      <div className="stack-board-zone" aria-label="3x3 스택 보드">
        <svg className="stack-route-lines" viewBox="0 0 100 100" aria-hidden="true">
          {viewLinks.map((link,i)=>{
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
          const aimPreview=aimEditing?stackAimConnectPreview(steps,activeId,zone):null;
          const aimClass=!aimPreview?'':aimPreview.localPerfect?'aim-full ':aimPreview.localConnected?'aim-partial ':'aim-break ';
          const aimDelta=aimPreview?impactText(aimPreview.delta):'';
          const aimLabel=aimPreview?(aimPreview.localConnected+'/'+aimPreview.localTotal+' LINK · CONNECT '+aimDelta):'';
          return <button
            key={zone}
            type="button"
            className={'stack-zone-cell '+(occupied?'occupied ':'')+(here.some(x=>x.main)?'main-cell ':'')+(here.some(x=>x.id===activeId)?'active-cell ':'')+(aimEditing?'aim-candidate ':'')+aimClass}
            aria-label={(zone+1)+'번 '+zoneLabel(zone)+(aimEditing?' · 이동 시 '+aimLabel:occupied?' · '+here.map(x=>x.order+'번째').join(', '):'')}
            onClick={()=>aimEditing?onAim(activeId,zone):here.length&&onSelect(here[here.length-1].id)}
            disabled={!here.length&&!aimEditing}
          >
            <small>{zone+1}</small>
            {aimPreview&&<span className="stack-aim-hint"><b>{aimPreview.localConnected}/{aimPreview.localTotal}</b><small>{aimPreview.delta===0?'±0':aimDelta}</small></span>}
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
          <span>{drag?'DRAG PREVIEW':viewPerfect?'ROUTE LOCKED':steps.length>1?'ROUTE CHECK':'SOLO'}</span>
          <strong>{drag?('CONNECT '+impactText(dragDelta)):viewPerfect?'PERFECT CONNECT':steps.length>1?viewConnectCount+' / '+viewLinks.length+' CONNECT':'100% POWER'}</strong>
          <small>{drag?'현재 위치에 놓았을 때의 경로입니다.':viewPerfect?'모든 지원 카드가 앞 카드와 이어집니다.':'끊긴 링크는 피해 효율을 회복하지 못합니다.'}</small>
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
          {viewLinks.length?viewLinks.map(link=><div key={link.toOrder} className={link.connected?'connected':'broken'}>
            <b>{link.fromOrder} → {link.toOrder}</b>
            <span>{link.connected?'CONNECTED':'BREAK'}</span>
            <small>{zoneLabel(link.fromZone)} → {zoneLabel(link.toZone)}</small>
          </div>):<div className="solo"><b>① MAIN</b><span>FULL POWER</span><small>카드 1장 · 피해 감소 없음</small></div>}
        </div>
      </aside>
    </div>

    {steps.length>1&&<div className="stack-order-rail" aria-label="스윙 순서 변경">
      <div className="rail-heading">
        <span className="rail-label">SWING ORDER</span>
        <small>≡ 손잡이로 끌거나 버튼으로 이동 · 같은 존·8방향 인접 = CONNECT</small>
      </div>
      <div className="rail-cards">
        {viewSteps.map((step,i)=>{
          const actualIndex=steps.findIndex(x=>x.id===step.id);
          const earlier=step.main?null:stackMoveConnectDelta(steps,actualIndex,-1);
          const later=step.main?null:stackMoveConnectDelta(steps,actualIndex,1);
          const dragSource=drag?.id===step.id,dragTarget=!!drag&&drag.targetIndex===i;
          return <React.Fragment key={step.id||step.order}>
            {i>0&&<i className={viewLinks[i-1]?.connected?'connected':'broken'} aria-hidden="true"/>}
            <div data-stack-index={i} className={(step.main?'main ':'support ')+(step.id===activeId?'active ':'')+(dragSource?'drag-source ':'')+(dragTarget?'drag-target':'')}>
              <b>{step.order}</b>
              <span>{cardName(step.kind,step.main)}</span>
              <small>{zoneLabel(step.aimZone)}</small>
              {!step.main&&<button
                type="button"
                className="rail-drag-handle"
                aria-label={cardName(step.kind,false)+' 끌어서 순서 변경'}
                onPointerDown={e=>beginDrag(e,step,actualIndex)}
                onPointerMove={moveDrag}
                onPointerUp={e=>finishDrag(e,false)}
                onPointerCancel={e=>finishDrag(e,true)}
              ><span>≡</span><small>DRAG</small></button>}
              {!step.main&&<div className="rail-actions">
                <button type="button" className={earlier==null?'':impactClass(earlier)} aria-label={cardName(step.kind,false)+' 순서를 앞으로 · CONNECT '+(earlier==null?'변경 불가':impactText(earlier))} disabled={earlier==null||!!drag} onClick={()=>onMove(step.id,-1)}><span>← 앞</span>{earlier!=null&&<b>{impactText(earlier)}</b>}</button>
                <button type="button" className={later==null?'':impactClass(later)} aria-label={cardName(step.kind,false)+' 순서를 뒤로 · CONNECT '+(later==null?'변경 불가':impactText(later))} disabled={later==null||!!drag} onClick={()=>onMove(step.id,1)}><span>뒤 →</span>{later!=null&&<b>{impactText(later)}</b>}</button>
              </div>}
            </div>
          </React.Fragment>;
        })}
      </div>
    </div>}
  </section>;
}
