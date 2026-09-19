import React from 'react';
import {CARDS} from './cards.js';
import './battle-readout.css';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const pct=n=>Math.round((Number(n)||0)*100);

function coachLine({kind,cardCount,precisionPressure}){
  if(cardCount>1)return '커버를 더 샀습니다. 대신 HP 효율은 낮아지고, CONNECT가 잃은 효율을 일부 되찾습니다.';
  if(kind==='place'||precisionPressure>0)return '한 칸을 정확히 읽는 선택. 맞히면 범위 대신 투수 HP 압박으로 보상받습니다.';
  if(kind==='strike')return '세로 3칸을 한 번에 커버하는 안정 선택. 정타 보너스 대신 적중 범위를 삽니다.';
  if(kind==='slug'||kind==='commit')return '한 칸에 크게 거는 장타 선택. 읽기가 맞으면 타구 질이 크게 올라갑니다.';
  if(kind==='basic')return '카드를 쓰지 않는 1존 승부. 덱을 아끼고 확신 있는 코스에만 휘두릅니다.';
  return '커버와 압박, 카드 소비를 비교해 이번 공의 값을 정하세요.';
}

export default function BattleReadout({
  choice,
  kind='basic',
  cardCount=1,
  coach=false,
}){
  if(!choice||choice.problem||choice.hit==null)return null;
  const coverage=choice.coverage?.length||0;
  const damageRate=choice.damageRate??1;
  const precisionPressure=choice.precisionPressure||0;
  const connectCount=choice.connectCount||0;
  const maxLinks=Math.max(0,cardCount-1);
  const pressureLabel=precisionPressure>0
    ? '적중 시 ×'+(1+precisionPressure).toFixed(1)
    : pct(damageRate)+'% HP';
  const role=kind==='basic'?'BASIC':(CARDS[kind]?.role||'SWING').toUpperCase();

  return <aside className={'battle-readout '+(coach?'coach':'')} aria-label="선택 전투 피드백">
    <header>
      <div><span>BATTLE READOUT</span><strong>{CARDS[kind]?.name||'BASIC SWING'}</strong></div>
      <em>{role}</em>
    </header>

    <div className="battle-readout-meters">
      <div className="readout-meter cover">
        <div><span>COVER</span><b>{coverage}<i>/9</i></b></div>
        <u><i style={{'--meter':clamp(coverage/9,0,1)}}/></u>
        <small>{coverage<=1?'좁고 정확':coverage<=3?'안정 커버':'넓은 안전망'}</small>
      </div>
      <div className={'readout-meter pressure '+(precisionPressure?'precision':'')}>
        <div><span>PRESSURE</span><b>{pressureLabel}</b></div>
        <u><i style={{'--meter':clamp(damageRate*(1+precisionPressure),0,1)}}/></u>
        <small>{precisionPressure?'MAIN 정확 적중 보너스':cardCount>1?'카드 수로 효율 감소':'기본 HP 효율'}</small>
      </div>
      <div className="readout-meter cost">
        <div><span>COST</span><b>{cardCount}<i>/4</i></b></div>
        <u><i style={{'--meter':clamp(cardCount/4,0,1)}}/></u>
        <small>{cardCount===1?'카드 1장':connectCount+'/'+maxLinks+' CONNECT'}</small>
      </div>
    </div>

    {coach&&<p className="battle-readout-coach"><span>COACH</span>{coachLine({kind,cardCount,precisionPressure})}</p>}
    {cardCount>1&&<div className="battle-readout-trade">
      <span>커버 <b>↑</b></span><i/>
      <span>카드 소비 <b>↑</b></span><i/>
      <span>HP 효율 <b>↓</b></span>
      {connectCount>0&&<em>CONNECT +{connectCount}</em>}
    </div>}
  </aside>;
}
