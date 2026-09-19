import React from 'react';
import {CARDS,ZONES} from './cards.js';
import './stack-resolve.css';

const center=zone=>{
  const z=Number.isInteger(zone)?zone:4;
  return {x:(z%3)*100/3+100/6,y:Math.floor(z/3)*100/3+100/6};
};

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const stackResolveDuration=plan=>{
  const count=plan?.steps?.length||0;
  if(count<=1)return 0;
  return clamp(420+count*55,480,660);
};

const cardName=step=>step?.main?'MAIN':(CARDS[step?.kind]?.name||'SUPPORT');

export default function StackResolve({plan,token=0}){
  const steps=plan?.steps||[],links=plan?.links||[];
  if(steps.length<=1)return null;
  const duration=stackResolveDuration(plan);
  const stepGap=Math.floor((duration-180)/Math.max(1,steps.length));
  return <div
    key={token}
    className={'stack-resolve '+(plan?.perfect?'perfect':'')}
    style={{'--resolve-duration':duration+'ms','--step-gap':stepGap+'ms'}}
    aria-label="스윙 스택 발동"
    role="status"
  >
    <div className="stack-resolve-dim"/>
    <section className="stack-resolve-board">
      <header>
        <span>SWING ROUTE</span>
        <strong>{plan?.perfect?'PERFECT CONNECT':'STACK RESOLVE'}</strong>
        <small>{steps.map(step=>['','①','②','③','④'][step.order]||step.order).join(' → ')}</small>
      </header>
      <div className="stack-resolve-zone">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {links.map((link,i)=>{
            const a=center(link.fromZone),b=center(link.toZone),same=link.fromZone===link.toZone;
            const cls=link.connected?'connected':'broken';
            const style={'--link-index':i};
            return same
              ? <circle key={i} className={cls} style={style} cx={a.x} cy={a.y} r="8"/>
              : <line key={i} className={cls} style={style} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>;
          })}
        </svg>
        {Array.from({length:9},(_,zone)=><div key={zone} className="resolve-cell"><small>{zone+1}</small></div>)}
        {steps.map((step,i)=>{
          const p=center(step.aimZone);
          return <div
            key={step.order}
            className={'resolve-token '+(step.main?'main':'support')+(i===steps.length-1?' final':'')}
            style={{left:p.x+'%',top:p.y+'%','--step-index':i}}
          >
            <b>{step.order}</b>
            <span>{cardName(step)}</span>
            <small>{ZONES[step.aimZone]||((step.aimZone??0)+1)+'존'}</small>
          </div>;
        })}
      </div>
      <div className="stack-resolve-chain">
        {steps.map((step,i)=><React.Fragment key={step.order}>
          {i>0&&<i className={links[i-1]?.connected?'connected':'broken'} style={{'--link-index':i-1}}/>}
          <span className={step.main?'main':'support'} style={{'--step-index':i}}><b>{step.order}</b>{cardName(step)}</span>
        </React.Fragment>)}
      </div>
      <footer>
        <span>{plan?.connectCount||0}/{links.length} CONNECT</span>
        <b>{Math.round((plan?.damageRate??1)*100)}% HP</b>
        <em>SWING →</em>
      </footer>
    </section>
    <i className="stack-resolve-release" aria-hidden="true"/>
  </div>;
}
