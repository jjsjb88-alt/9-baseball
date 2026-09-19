import React from 'react';
import './stack-route-echo.css';

const point=zone=>{
  const z=Number.isInteger(zone)?zone:4;
  return {x:(z%3)*100/3+100/6,y:Math.floor(z/3)*100/3+100/6};
};

export function stackEchoData(revealed){
  const steps=Array.isArray(revealed?.stackSteps)?revealed.stackSteps:[];
  const links=Array.isArray(revealed?.stackLinks)?revealed.stackLinks:[];
  if(steps.length<=1)return null;
  const connectCount=Number.isInteger(revealed?.stackConnectCount)
    ?revealed.stackConnectCount
    :links.filter(link=>link?.connected).length;
  return {
    steps,
    links,
    connectCount,
    linkCount:links.length,
    perfect:links.length>0&&connectCount===links.length,
  };
}

export default function StackRouteEcho({revealed}){
  const data=stackEchoData(revealed);
  if(!data)return null;
  const {steps,links,perfect}=data;
  return <div className={'stack-route-echo '+(perfect?'perfect':'')} aria-hidden="true">
    <svg viewBox="0 0 100 100">
      {links.map((link,i)=>{
        const a=point(link.fromZone),b=point(link.toZone),same=link.fromZone===link.toZone;
        const cls=link.connected?'connected':'broken',style={'--echo-link':i};
        return same
          ?<circle key={'link-'+i} className={cls} style={style} cx={a.x} cy={a.y} r="8"/>
          :<line key={'link-'+i} className={cls} style={style} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>;
      })}
    </svg>
    {steps.map((step,i)=>{
      const p=point(step.aimZone);
      return <span
        key={step.id||step.order||i}
        className={'stack-echo-token '+(step.main?'main':'support')}
        style={{left:p.x+'%',top:p.y+'%','--echo-step':i}}
      >{step.order||i+1}</span>;
    })}
  </div>;
}
