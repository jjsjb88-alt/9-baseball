import React from 'react';
import {CARDS,ZONES} from './cards.js';
import './result-chain.css';

/*
 * V12 P4-1 — the pitch result as a cause chain, built only from what the engine revealed
 * (battle.revealed + v10.lastCombat): actual pitch → which of my covers it met → the call → HP.
 * Cover membership reads the revealed primary/support coverage (coverageAt at swing time, C1);
 * the HP line reads the engine's damage and multiplier (C3) — nothing here is re-simulated.
 */
const nameOf=kind=>kind==='basic'?'BASIC SWING':CARDS[kind]?.name||'카드';

export function resultChainOf(revealed,combat){
  if(!revealed)return null;
  const zone=revealed.zone,pitch='실제 공 · '+(zone===9||zone==null?'존 밖 볼':ZONES[zone]);
  let cover;
  if(revealed.action==='take')cover={tone:'take',text:'지켜봄 · 스윙 안 함'};
  else if((revealed.primaryCoverage||[]).includes(zone))cover={tone:'main',text:'메인 커버 안 · '+(combat?.choiceLabel?.split(' + ')[0]||nameOf(combat?.choice))};
  else{
    const hit=(revealed.supportCoverages||[]).find(x=>(x.coverage||[]).includes(zone));
    cover=hit?{tone:'support',text:'지원 커버 안 · '+nameOf(hit.kind)}:{tone:'miss',text:'커버 밖'};
  }
  let hp=null;
  // a watched pitch can cost HP too (ball, walk): the HP step always reads the engine's damage
  if(combat){
    const rate=revealed.action==='take'?'':' · 피해 효율 ×'+Math.round((combat.damageRate??1)*100)+'%';
    hp=combat.damage>0?'투수 HP −'+combat.damage+rate+(combat.precisionBonus>0?' · 정확 적중 +'+combat.precisionBonus:''):'투수 HP 변화 없음';
  }
  return {pitch,cover,call:revealed.label,hp};
}

export default function ResultChain({revealed,combat}){
  const c=resultChainOf(revealed,combat);if(!c)return null;
  const main=revealed.primaryCoverage||[],support=(revealed.supportCoverages||[]).flatMap(x=>x.coverage||[]),zone=revealed.zone;
  return <div className={'result-chain tone-'+c.cover.tone}>
    <div className={'result-mini'+(zone===9?' ball-outside':'')} aria-hidden="true">
      {ZONES.map((_,z)=><i key={z} className={[main.includes(z)&&'main',support.includes(z)&&'support',zone===z&&'actual'].filter(Boolean).join(' ')}/>)}
    </div>
    <ol className="result-chain-steps" aria-label="판정 이유">
      <li className="result-chain-step pitch">{c.pitch}</li>
      <li className={'result-chain-step cover '+c.cover.tone}>{c.cover.text}</li>
      <li className="result-chain-step call">{c.call}</li>
      {c.hp&&<li className="result-chain-step hp">{c.hp}</li>}
    </ol>
  </div>;
}
