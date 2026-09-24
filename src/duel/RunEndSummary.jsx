import React from 'react';
import {CARDS} from './cards.js';
import {V10_RELICS} from './v10-relics.js';
import ResultChain from './ResultChain.jsx';
import './v12-run-end.css';

/*
 * V12 P8-1 — the end of a run, told from its records only (no estimate, no aggregate "cause"):
 * the pitch that ended it (battle.revealed + v10.lastCombat as a cause chain), the opponent's HP left,
 * and each cleared stop with the choice actually recorded there (rewards / utilityHistory).
 */
const cardName=kind=>CARDS[kind]?.name||kind;
function choiceText(entry){
  if(!entry)return null;
  const a=entry.action||entry;
  if(a.type==='add')return cardName(a.kind)+' 추가';
  if(a.type==='remove')return (a.name||cardName(a.kind))+' 제거';
  if(a.type==='upgrade')return (a.name||cardName(a.kind))+' 강화';
  if(a.type==='relic')return '유물 · '+(V10_RELICS[a.relic]?.name||a.relic);
  if(a.type==='rest')return '휴식 · 다음 전투 타격 +8';
  if(a.type==='skip')return null;
  return null;
}

export function runEndOf(s){
  if(!s)return null;
  const p=s.pitcher,lost=s.phase==='lost';
  const opponent=p?p.name+' · HP '+p.hp+' / '+p.maxHp+(lost?' 남음':p.hp===0?' · 강판':''):null;
  const byNode=new Map((s.runMap?.nodes||[]).map(n=>[n.id,n]));
  const rewards=new Map((s.rewards||[]).filter(r=>r?.nodeId).map(r=>[r.nodeId,r]));
  const utils=new Map((s.v10?.utilityHistory||[]).map(u=>[u.nodeId,u]));
  const path=(s.runMap?.completedNodeIds||[]).map(id=>{
    const node=byNode.get(id),combat=['battle','elite','boss'].includes(node?.type);
    const choice=choiceText(rewards.get(id)||utils.get(id));
    const did=combat?'승리 · '+(choice||'보상 건너뜀'):choice||'그냥 지나감';
    return {name:node?.name||id,did};
  });
  if(lost&&s.v10?.nodeId){
    const node=byNode.get(s.v10.nodeId);
    path.push({name:node?.name||s.v10.nodeId,did:'삼아웃'+(p?' · '+p.name+' HP '+p.hp+' 남김':''),ended:true});
  }
  return {opponent,path};
}

export default function RunEndSummary({s}){
  const e=runEndOf(s);if(!e)return null;
  const revealed=s.battle?.revealed,combat=s.v10?.lastCombat||null;
  return <section className="run-end" aria-label="런 기록">
    {revealed&&<div className="run-end-last"><h2>{s.phase==='lost'?'마지막 공 · 세 번째 아웃':'마지막 공'}</h2><ResultChain revealed={revealed} combat={combat}/></div>}
    {e.opponent&&<p className="run-end-opponent">{e.opponent}</p>}
    {e.path.length>0&&<ol className="run-end-path" aria-label="지나온 길">
      {e.path.map((x,i)=><li key={i} className={x.ended?'ended':''}><strong>{x.name}</strong><span>{x.did}</span></li>)}
    </ol>}
  </section>;
}
