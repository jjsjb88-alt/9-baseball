import React from 'react';
import {CARDS,cardText,upgradeText,DECK_MIN,DECK_MAX} from './cards.js';
import {V10_RELICS} from './v10-relics.js';
import './v12-rewards.css';

/*
 * V12 P6-1 — what a reward / facility choice will change, stated before it is confirmed.
 * Built only from the option the engine offers and the current deck: the card or relic, the deck
 * count before → after with its limit, and for an upgrade the card rule before and after
 * (cardText plain vs plus). Nothing here is estimated.
 */
export function choiceOutcomeOf(s,option){
  if(!option)return null;
  const n=s?.deck?.length||0,name=kind=>CARDS[kind]?.name||kind;
  if(option.type==='add')return {title:'추가 · '+name(option.kind),lines:['덱 '+n+'장 → '+(n+1)+'장 (최대 '+DECK_MAX+'장)',cardText(option.kind,false)]};
  if(option.type==='remove'){
    const same=(s?.deck||[]).filter(c=>c.kind===option.kind).length-1;
    return {title:'제거 · '+name(option.kind),lines:['덱 '+n+'장 → '+(n-1)+'장 (최소 '+DECK_MIN+'장)',same>0?'같은 카드 '+same+'장 남음':'이 카드는 덱에서 사라집니다']};
  }
  if(option.type==='upgrade')return {title:'강화 · '+name(option.kind)+' → '+name(option.kind)+'+',lines:['강화 효과 · '+upgradeText(option.kind)],
    before:cardText(option.kind,false),after:cardText(option.kind,true)};
  if(option.type==='relic'){const r=V10_RELICS[option.relic];return r?{title:'유물 · '+r.name,lines:[r.text]}:null;}
  if(option.type==='rest')return {title:'휴식',lines:['다음 전투에서 타격 기술 +8']};
  return null;
}

export default function ChoiceOutcome({s,option,prompt=''}){
  const o=choiceOutcomeOf(s,option);
  return <div className={'choice-outcome'+(o?'':' is-empty')} role="status" aria-live="polite">
    {o?<>
      <strong className="choice-title">{o.title}</strong>
      {o.lines.map((l,i)=><span key={i} className="choice-line">{l}</span>)}
      {o.before&&<div className="choice-compare"><p className="choice-before"><b>지금</b>{o.before}</p><p className="choice-after"><b>강화 후</b>{o.after}</p></div>}
    </>:prompt}
  </div>;
}
