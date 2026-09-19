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

export const stackResolveTiming=plan=>{
  const count=plan?.steps?.length||0,duration=stackResolveDuration(plan);
  if(!duration)return {duration:0,stepGap:0,commitDelay:0,commitHold:0};
  const stepGap=Math.floor((duration-180)/Math.max(1,count));
  const commitDelay=clamp(173+Math.max(0,count-1)*stepGap,300,duration-105);
  return {duration,stepGap,commitDelay,commitHold:duration-commitDelay};
};

const cardName=step=>step?.main?'MAIN':(CARDS[step?.kind]?.name||'SUPPORT');

export default function StackResolve({plan,token=0}){
  const steps=plan?.steps||[],links=plan?.links||[];
  if(steps.length<=1)return null;
  const {duration,stepGap,commitDelay,commitHold}=stackResolveTiming(plan);
  const connectGain=Math.round((plan?.connectBonus||0)*100);
  return <div
    key={token}
    className={'stack-resolve '+(plan?.perfect?'perfect':'')}
    style={{'--resolve-duration':duration+'ms','--step-gap':stepGap+'ms','--commit-delay':commitDelay+'ms','--commit-hold':commitHold+'ms'}}
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
        <svg className="stack-resolve-route" viewBox="0 0 100 100" aria-hidden="true">
          {links.map((link,i)=>{
            const a=center(link.fromZone),b=center(link.toZone),same=link.fromZone===link.toZone;
            const cls=link.connected?'connected':'broken';
            const style={'--link-index':i};
            return same
              ? <circle key={i} className={cls} style={style} cx={a.x} cy={a.y} r="8"/>
              : <line key={i} className={cls} style={style} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>;
          })}
        </svg>
        <svg className="stack-resolve-lock-route" viewBox="0 0 100 100" aria-hidden="true">
          {links.filter(link=>link.connected).map((link,i)=>{
            const a=center(link.fromZone),b=center(link.toZone),same=link.fromZone===link.toZone;
            return same
              ? <circle key={'lock-'+i} cx={a.x} cy={a.y} r="8"/>
              : <line key={'lock-'+i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>;
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
        <div className="stack-resolve-commit" aria-hidden="true">
          <span>{plan?.perfect?'PATH LOCKED':'STACK COMMITTED'}</span>
          <b>{plan?.connectCount||0} CONNECT</b>
          <small>{connectGain>0?('HP +'+connectGain+'%p'):'ROUTE SET'}</small>
        </div>
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
        <em><i aria-hidden="true"/>SWING →</em>
      </footer>
    </section>
    <i className="stack-resolve-release" aria-hidden="true"/>
  </div>;
}
