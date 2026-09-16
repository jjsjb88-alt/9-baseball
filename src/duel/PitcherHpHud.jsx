import React from 'react';
import {HP_MARKS,PHASES,normalizePhase,phaseFor,useReducedMotion} from './v10-copy.js';
import './v10-ui.css';

const clamp=(value,max)=>Math.max(0,Math.min(max,Number(value)||0));

export default function PitcherHpHud({name='투수',hp=0,maxHp=0,phase,lastDamage=0}){
  const reduced=useReducedMotion();
  const max=Math.max(0,Number(maxHp)||0),cur=clamp(hp,max),damage=Math.max(0,Number(lastDamage)||0);
  const before=Math.min(max,cur+damage),state=normalizePhase(phase)||phaseFor(cur,max),info=PHASES[state];
  const fill=max?cur/max*100:0,ghost=max?before/max*100:0;
  return (
    <section className={`v10-hp v10-hp-${state}${reduced?' v10-reduced':''}`} data-phase={state} data-reduced={reduced?'true':'false'} aria-label="투수 체력">
      <header className="v10-hp-head">
        <strong className="v10-hp-name">{name}</strong>
        <b className="v10-hp-phase" data-testid="v10-hp-phase">{info.label}</b>
      </header>
      <div className="v10-hp-bar" aria-hidden="true">
        {damage>0&&<i className="v10-hp-ghost" data-testid="v10-hp-ghost" style={{width:`${ghost}%`}}/>}
        <i
          key={`${cur}-${damage}`}
          className={`v10-hp-fill${damage>0?' is-draining':''}`}
          data-testid="v10-hp-fill"
          style={{width:`${fill}%`,'--v10-hp-from':`${ghost}%`}}
        />
        {HP_MARKS.map(mark=><u key={mark} className="v10-hp-mark" data-mark={mark} style={{left:`${mark*100}%`}}/>)}
      </div>
      <p className="v10-hp-count" aria-hidden="true"><b>{cur}</b><span>/ {max}</span>
        {damage>0&&<em className="v10-hp-damage" data-testid="v10-hp-damage">-{damage}</em>}
      </p>
      <small className="v10-hp-note" aria-hidden="true">{info.note}</small>
      <p className="v10-sr-only" role="status" data-testid="v10-hp-sr">{name} 투수 HP {cur} / {max}, {info.label}</p>
    </section>
  );
}
