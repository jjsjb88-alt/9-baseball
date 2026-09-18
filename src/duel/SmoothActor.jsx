import React,{useEffect,useMemo,useRef} from 'react';
import './smooth-actor.css';

const pose=(rootX,rootY,rootR,torso,head,fa,ff,ba,bf,ft,fs,bt,bs,bat)=>({rootX,rootY,rootR,torso,head,fa,ff,ba,bf,ft,fs,bt,bs,bat});

const BATTER_SWING=[
  pose(0,0,0,-2,0,-34,-42,-48,-36,6,-8,-5,8,-64),
  pose(-1,0,-1,-4,-1,-36,-45,-50,-38,7,-10,-6,9,-66),
  pose(-3,0,-2,-7,-2,-39,-48,-54,-42,8,-12,-8,11,-69),
  pose(-5,1,-3,-11,-3,-42,-51,-57,-45,10,-14,-10,13,-72),
  pose(-6,2,-3,-15,-4,-44,-53,-60,-47,13,-17,-12,15,-74),
  pose(-5,2,-2,-17,-4,-41,-48,-58,-42,18,-21,-15,18,-68),
  pose(-2,1,1,-13,-2,-30,-34,-48,-31,24,-25,-20,21,-52),
  pose(2,0,4,-6,0,-12,-17,-30,-18,30,-29,-25,24,-28),
  pose(7,-1,8,7,2,16,8,-5,2,36,-31,-31,27,-4),
  pose(10,-2,12,15,4,31,18,13,12,39,-29,-35,30,18),
  pose(12,-2,17,23,7,45,27,31,24,37,-24,-37,31,39),
  pose(13,-1,21,30,10,57,35,45,32,32,-17,-36,28,59),
  pose(12,0,24,35,13,66,42,57,39,26,-10,-32,23,78),
  pose(10,1,24,37,15,72,47,64,44,20,-4,-27,18,94),
  pose(8,1,22,34,14,75,50,67,47,16,0,-22,14,105),
  pose(6,0,18,28,11,70,46,62,43,12,3,-18,12,112),
];

const BATTER_MISS=[
  ...BATTER_SWING.slice(0,7),
  pose(1,1,3,-8,-1,-8,-13,-27,-15,31,-30,-26,25,-22),
  pose(7,2,10,5,1,22,17,2,8,39,-32,-33,30,4),
  pose(12,3,18,18,4,43,28,28,24,42,-28,-38,34,34),
  pose(15,4,27,32,8,64,41,51,39,38,-18,-39,35,65),
  pose(16,5,34,43,12,79,52,69,49,31,-7,-35,30,92),
  pose(15,6,39,50,15,88,58,78,56,24,2,-29,23,114),
  pose(12,7,42,52,16,92,62,83,60,18,8,-23,17,130),
  pose(9,6,39,48,14,88,58,80,57,13,11,-18,13,139),
  pose(6,4,34,41,12,80,51,72,51,10,9,-14,10,145),
];

const BATTER_HOMER=[
  ...BATTER_SWING.slice(0,10),
  pose(12,-3,17,24,8,48,28,34,26,38,-25,-36,30,40),
  pose(13,-4,21,31,12,58,36,47,34,34,-18,-35,27,61),
  pose(12,-5,24,36,17,66,43,58,42,28,-10,-31,22,79),
  pose(10,-6,23,33,22,58,34,51,37,22,-5,-25,17,68),
  pose(8,-7,17,24,28,35,4,42,20,17,0,-20,13,46),
  pose(7,-8,10,15,32,12,-20,32,7,12,3,-16,10,24),
];

const PITCHER_PITCH=[
  pose(0,0,0,0,0,-2,-5,8,6,1,0,-2,1,0),
  pose(0,0,-1,-2,-1,-4,-7,10,8,2,-1,-3,2,0),
  pose(-1,0,-2,-5,-2,-8,-10,14,11,5,-4,-5,4,0),
  pose(-2,-1,-4,-8,-3,-12,-13,18,14,12,-10,-7,6,0),
  pose(-3,-3,-6,-11,-4,-16,-16,21,17,23,-19,-9,8,0),
  pose(-3,-5,-8,-13,-5,-20,-18,24,20,36,-31,-11,10,0),
  pose(-2,-4,-7,-12,-4,-27,-20,32,25,42,-35,-15,14,0),
  pose(0,-2,-3,-8,-1,-37,-22,47,30,35,-26,-23,20,0),
  pose(4,0,3,-1,2,-52,-28,67,38,24,-15,-31,27,0),
  pose(9,1,10,9,5,-67,-36,86,49,14,-5,-38,33,0),
  pose(14,2,17,18,8,-82,-45,104,58,8,2,-43,36,0),
  pose(18,3,23,27,10,-95,-53,119,65,4,7,-44,35,0),
  pose(20,4,29,34,12,-106,-58,132,70,2,10,-40,31,0),
  pose(20,5,34,39,13,-112,-61,140,73,2,11,-34,25,0),
  pose(18,5,36,41,13,-114,-62,144,74,3,9,-27,19,0),
  pose(14,4,31,35,10,-108,-58,136,70,4,6,-21,14,0),
];

const RANGE={windup:[0,5],impact:[5,9],slowmo:[9,10],release:[10,14],settle:[14,15]};
const lerp=(a,b,t)=>a+(b-a)*t;
const stageDuration=(stage,shot)=>{
  const m=shot?.motion;
  if(!m)return stage==='windup'?260:stage==='impact'?110:stage==='slowmo'?120:stage==='release'?280:180;
  if(stage==='windup')return Math.max(180,m.impactAt);
  if(stage==='impact')return Math.max(90,m.freeze||90);
  if(stage==='slowmo')return Math.max(100,m.slowmo||100);
  if(stage==='release')return Math.max(180,m.settleAt-(m.impactAt+(m.freeze||0)+(m.slowmo||0)));
  if(stage==='settle')return Math.max(120,m.duration-m.settleAt);
  return 200;
};

const tf=(x=0,y=0,r=0,sx=1,sy=1)=>`translate(${x}px,${y}px) rotate(${r}deg) scale(${sx},${sy})`;
const keyframes=(frames,field,mapper)=>frames.map((p,i)=>({transform:mapper(p[field],p),offset:frames.length===1?1:i/(frames.length-1)}));
const jointFrames=(frames,field)=>keyframes(frames,field,v=>`rotate(${v}deg)`);

function animate(el,frames,opts){
  if(!el)return null;
  if(typeof el.animate!=='function'){
    const last=frames[frames.length-1];
    if(last?.transform)el.style.transform=last.transform;
    return null;
  }
  const a=el.animate(frames,{duration:opts.duration,fill:'forwards',easing:'linear'});
  return a;
}

function PlayerArt({who,variant,refs}){
  const pitcher=who==='pitcher';
  return <svg className={'smooth-actor-svg '+(pitcher?'pitcher':'batter')} viewBox="0 0 180 220" aria-hidden="true">
    <defs>
      <linearGradient id="jersey" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fff8df"/><stop offset=".58" stopColor="#e8dcc0"/><stop offset="1" stopColor="#cbbf9f"/></linearGradient>
      <linearGradient id="navy" x1="0" x2="1"><stop offset="0" stopColor="#0a2530"/><stop offset=".6" stopColor="#123d49"/><stop offset="1" stopColor="#07171d"/></linearGradient>
      <linearGradient id="skin" x1="0" x2="1"><stop offset="0" stopColor="#f1bd88"/><stop offset="1" stopColor="#b86d45"/></linearGradient>
      <linearGradient id="bat" x1="0" x2="1"><stop offset="0" stopColor="#6f351d"/><stop offset=".45" stopColor="#d88b3f"/><stop offset=".78" stopColor="#ffc66f"/><stop offset="1" stopColor="#6b321b"/></linearGradient>
      <filter id="actorShadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="7" stdDeviation="3" floodColor="#02090b" floodOpacity=".76"/></filter>
      <filter id="rimGlow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="-1" dy="0" stdDeviation="1" floodColor="#7ce4d8" floodOpacity=".42"/></filter>
    </defs>
    <ellipse className="smooth-ground-shadow" cx="91" cy="201" rx="47" ry="8"/>
    <g ref={refs.root} className="rig-root" filter="url(#actorShadow)">
      <g className="rear-leg rig-joint" transform="translate(82 137)">
        <g ref={refs.bt} className="rig-joint thigh"><path d="M-10 0h19l7 42-18 3-12-33z" fill="url(#jersey)" stroke="#061116" strokeWidth="5"/>
          <g ref={refs.bs} className="rig-joint shin" transform="translate(1 39)"><path d="M-4 0h18l5 31-20 2z" fill="url(#navy)" stroke="#061116" strokeWidth="5"/><path d="M-5 29h28l5 11H-9z" fill="#071820" stroke="#061116" strokeWidth="4"/></g>
        </g>
      </g>
      <g className="front-leg rig-joint" transform="translate(103 137)">
        <g ref={refs.ft} className="rig-joint thigh"><path d="M-9 0h19l5 42-18 3-10-33z" fill="url(#jersey)" stroke="#061116" strokeWidth="5"/>
          <g ref={refs.fs} className="rig-joint shin" transform="translate(1 39)"><path d="M-4 0h18l5 31-20 2z" fill="url(#navy)" stroke="#061116" strokeWidth="5"/><path d="M-5 29h28l5 11H-9z" fill="#071820" stroke="#061116" strokeWidth="4"/></g>
        </g>
      </g>
      <g ref={refs.torso} className="rig-joint" transform="translate(90 112)">
        <path d="M-31-34Q-20-49 0-50Q24-49 33-31L29 18Q9 32-22 23L-34-6z" fill="url(#jersey)" stroke="#061116" strokeWidth="5"/>
        <path d="M-24-31Q-6-20 27-28M-3-47V20" fill="none" stroke="#0d5260" strokeWidth="5"/>
        <path d="M-34-24l-14 10 9 20 16-8M32-23l15 9-8 20-16-8" fill="url(#navy)" stroke="#061116" strokeWidth="5"/>
        <rect x="-26" y="17" width="53" height="8" rx="3" fill="#071820"/>
      </g>
      <g ref={refs.ba} className="rig-joint arm back-arm" transform="translate(63 86)">
        <rect x="-7" y="-2" width="15" height="33" rx="7" fill="url(#navy)" stroke="#061116" strokeWidth="4"/>
        <g ref={refs.bf} className="rig-joint forearm" transform="translate(1 29)"><rect x="-6" y="0" width="13" height="31" rx="6" fill="url(#skin)" stroke="#061116" strokeWidth="4"/><circle cx="1" cy="30" r="7" fill="#efe6ce" stroke="#061116" strokeWidth="3"/></g>
      </g>
      <g ref={refs.fa} className="rig-joint arm front-arm" transform="translate(118 86)">
        <rect x="-7" y="-2" width="15" height="33" rx="7" fill="url(#navy)" stroke="#061116" strokeWidth="4"/>
        <g ref={refs.ff} className="rig-joint forearm" transform="translate(1 29)"><rect x="-6" y="0" width="13" height="31" rx="6" fill="url(#skin)" stroke="#061116" strokeWidth="4"/><circle cx="1" cy="30" r="7" fill="#efe6ce" stroke="#061116" strokeWidth="3"/></g>
      </g>
      {pitcher&&<g ref={refs.glove} className="pitcher-glove" transform="translate(73 107)"><path d="M-13-11Q-3-20 10-13L17 1 7 16-12 11-19-1z" fill="#70411f" stroke="#061116" strokeWidth="4"/><path d="M-9-7L8 10M-2-12L13 5" stroke="#b97937" strokeWidth="3"/></g>}
      {!pitcher&&<g ref={refs.bat} className="bat-rig" transform="translate(126 69) rotate(-64)"><path d="M0-4h70l16 4-16 4H0z" fill="url(#bat)" stroke="#061116" strokeWidth="4"/><rect x="-8" y="-5" width="13" height="10" rx="3" fill="#ecdfc4" stroke="#061116" strokeWidth="3"/></g>}
      <g ref={refs.head} className="rig-joint head" transform="translate(90 55)">
        <circle cx="0" cy="0" r="20" fill="url(#skin)" stroke="#061116" strokeWidth="5"/>
        <path d="M-22-4Q-19-29 3-29Q24-27 27-8L9-4 1-11-21-8z" fill="url(#navy)" stroke="#061116" strokeWidth="5"/>
        <path d="M9-4h24v7H11z" fill="#0d3f4d" stroke="#061116" strokeWidth="3"/>
        <circle cx="8" cy="1" r="2.5" fill="#061116"/>
      </g>
      {pitcher&&<circle className="pitch-ball-rig" cx="134" cy="91" r="5.5" fill="#fff5dd" stroke="#a83b32" strokeWidth="2"/>}
    </g>
  </svg>;
}

export default function SmoothActor({who,stage=null,shot=null,variant='outside'}){
  const root=useRef(null),torso=useRef(null),head=useRef(null),fa=useRef(null),ff=useRef(null),ba=useRef(null),bf=useRef(null),ft=useRef(null),fs=useRef(null),bt=useRef(null),bs=useRef(null),bat=useRef(null),glove=useRef(null);
  const refs={root,torso,head,fa,ff,ba,bf,ft,fs,bt,bs,bat,glove};
  const track=useMemo(()=>{
    if(who==='pitcher'){
      const adjust=variant==='sinker'?{y:4,r:3}:variant==='high'?{y:-4,r:-2}:variant==='closer'?{x:-4,r:-4}:{};
      return PITCHER_PITCH.map(p=>({...p,rootX:p.rootX+(adjust.x||0),rootY:p.rootY+(adjust.y||0),rootR:p.rootR+(adjust.r||0)}));
    }
    const g=shot?.grade||'';
    if(g==='homer'||g==='grand-slam')return BATTER_HOMER;
    if(['near-miss','near-miss-k','chase','chase-k','fooled','strikeout'].includes(g))return BATTER_MISS;
    return BATTER_SWING;
  },[who,variant,shot?.grade]);

  useEffect(()=>{
    const range=RANGE[stage]||[0,0],frames=track.slice(range[0],range[1]+1),duration=stage?stageDuration(stage,shot):1;
    const reduced=typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const opts={duration:reduced?1:duration};
    const anis=[];
    anis.push(animate(root.current,keyframes(frames,'rootX',(_,p)=>tf(p.rootX,p.rootY,p.rootR)),opts));
    anis.push(animate(torso.current,jointFrames(frames,'torso'),opts));
    anis.push(animate(head.current,jointFrames(frames,'head'),opts));
    anis.push(animate(fa.current,jointFrames(frames,'fa'),opts));
    anis.push(animate(ff.current,jointFrames(frames,'ff'),opts));
    anis.push(animate(ba.current,jointFrames(frames,'ba'),opts));
    anis.push(animate(bf.current,jointFrames(frames,'bf'),opts));
    anis.push(animate(ft.current,jointFrames(frames,'ft'),opts));
    anis.push(animate(fs.current,jointFrames(frames,'fs'),opts));
    anis.push(animate(bt.current,jointFrames(frames,'bt'),opts));
    anis.push(animate(bs.current,jointFrames(frames,'bs'),opts));
    if(bat.current)anis.push(animate(bat.current,keyframes(frames,'bat',v=>`rotate(${v}deg)`),opts));
    if(glove.current)anis.push(animate(glove.current,keyframes(frames,'rootX',(_,p)=>tf(0,0,p.ba*.16)),opts));
    return ()=>anis.forEach(a=>a?.cancel?.());
  },[track,stage,shot?.motion?.duration,shot?.motion?.impactAt,shot?.motion?.settleAt]);

  return <span className={'smooth-actor smooth-'+who+' variant-'+variant+(stage?' stage-'+stage:' idle')}><PlayerArt who={who} variant={variant} refs={refs}/></span>;
}
