import React,{useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import Duel from './App.jsx';
import {createV10Duel,enterV10Node,saveV10Duel} from './engine.js';
import {renderGoldenBatter} from './V4CanvasSprite.jsx';
import oldIdle from './gm12-old-idle.svg';
import newIdle from '../../assets/sprites-v6/batter-idle-hero.png';
import contact from '../../assets/sprites-v6/batter-contact-hero.png';
import homer from '../../assets/sprites-v6/batter-homer-hero.png';
import miss from '../../assets/sprites-v6/batter-miss-hero.png';

/* Keep this fixture visually identical to src/main.jsx.
   It deliberately mounts Duel itself, so main.jsx cannot be imported directly. */
import './stack-direct-tap.js';
import './landscape-first.css';
import './landscape-scroll-fix.css';
import './character-master.css';
import './responsive-master.css';
import './sts-battleboard.js';
import './sts-battleboard.css';
import './combat-readability.js';
import './combat-readability.css';
import './v10-relic-ui.js';
import './v10-relic-ui.css';
import './landscape-declutter.js';
import './landscape-declutter.css';
import './golden-master.css';

const params=new URLSearchParams(window.location.search);
const sheet=params.get('sheet')==='1';
const rig=params.get('rig')==='1';
const compare=params.get('compare')==='1';
const before=params.get('before')==='1';

const QA_STYLE=`
  *{box-sizing:border-box}html,body,#root{margin:0;min-height:100%;background:#061216;color:#e9e1c9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  .qa-pose-sheet{min-height:100vh;padding:16px;background:radial-gradient(circle at 50% 18%,#17343a 0,#0b1d22 38%,#061216 72%)}
  .qa-pose-sheet header{display:flex;flex-direction:column;gap:4px;margin-bottom:12px;border-bottom:1px solid #347a73;padding-bottom:10px}
  .qa-pose-sheet header b{font-size:15px;letter-spacing:.08em;color:#f0ce83}.qa-pose-sheet header span{font-size:10px;color:#9bb8b2}
  .qa-pose-sheet section{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
  .qa-pose-card{margin:0;padding:7px;background:#0b1a1f;border:1px solid #214b50;box-shadow:0 8px 18px #0008}
  .qa-frame{aspect-ratio:1;display:grid;place-items:center;background:linear-gradient(#102a31 0 68%,#102329 68% 76%,#0a171b 76%);overflow:hidden;position:relative}
  .qa-frame img,.qa-frame canvas{width:100%;height:100%;object-fit:contain;image-rendering:pixelated;image-rendering:crisp-edges}
  .qa-pose-card figcaption{font-size:9px;letter-spacing:.04em;margin-top:5px;color:#d8c18d;text-align:center}
  .qa-rig-sheet section{grid-template-columns:repeat(2,minmax(0,1fr))}
  .qa-rig-sheet .qa-pose-card{border-color:#286b64}
  .qa-rig-sheet .qa-frame{background:linear-gradient(#102a31 0 66%,#0e272c 66% 76%,#08171b 76%)}
  @media(min-width:700px){
    .qa-pose-sheet section{grid-template-columns:repeat(5,minmax(0,1fr))}
    .qa-rig-sheet section{grid-template-columns:repeat(4,minmax(0,1fr))}
    .qa-pose-sheet{padding:24px}.qa-pose-card{padding:10px}.qa-pose-card figcaption{font-size:11px}
  }
`;

function PoseSheet(){
  const poses=[
    ['BEFORE · GM11 IDLE',oldIdle],
    ['GM12 V6 · IDLE',newIdle],
    ['GM12 V6 · CONTACT',contact],
    ['GM12 V6 · HOMER',homer],
    ['GM12 V6 · MISS',miss],
  ];
  return <main className="qa-pose-sheet">
    <header><b>GM12 BATTER GOLDEN MASTER</b><span>small-screen silhouette / hands / bat path / weight QA</span></header>
    <section>{poses.map(([label,src])=><figure className="qa-pose-card" key={label}>
      <div className="qa-frame"><img src={src} alt="" /></div><figcaption>{label}</figcaption>
    </figure>)}</section>
    <style>{QA_STYLE}</style>
  </main>;
}

function RigFrame({label,action='swing',frame=0}){
  const ref=useRef(null);
  useEffect(()=>{
    const ctx=ref.current?.getContext?.('2d',{alpha:true});
    if(!ctx)return;
    ctx.imageSmoothingEnabled=false;
    const grade=action==='homer'?'homer':action==='miss'?'near-miss':'single';
    renderGoldenBatter(ctx,{grade},frame);
  },[action,frame]);
  return <figure className="qa-pose-card" data-action={action} data-frame={frame}>
    <div className="qa-frame"><canvas ref={ref} width="96" height="96" aria-label={label}/></div>
    <figcaption>{label}</figcaption>
  </figure>;
}

function ContinuitySheet(){
  const pairs=[
    ['IDLE',newIdle,'swing',0],
    ['CONTACT',contact,'swing',18],
    ['HOMER',homer,'homer',59],
    ['MISS',miss,'miss',59],
  ];
  return <main className="qa-pose-sheet qa-continuity-sheet">
    <header><b>GM12 · HERO ↔ 60HZ CONTINUITY</b><span>same silhouette / body mass / head scale / hands / bat ownership must survive the handoff</span></header>
    <section>{pairs.flatMap(([label,src,action,frame])=>[
      <figure className="qa-pose-card" key={label+'-hero'}>
        <div className="qa-frame"><img src={src} alt="" /></div><figcaption>{label} · V6 HERO</figcaption>
      </figure>,
      <RigFrame key={label+'-rig'} label={label+' · 60HZ RIG'} action={action} frame={frame}/>,
    ])}</section>
    <style>{QA_STYLE+`
      .qa-continuity-sheet section{grid-template-columns:repeat(2,minmax(0,1fr));max-width:760px}
      .qa-continuity-sheet .qa-pose-card:nth-child(4n+1),.qa-continuity-sheet .qa-pose-card:nth-child(4n+2){border-color:#478c82}
      @media(min-width:700px){.qa-continuity-sheet section{grid-template-columns:repeat(4,minmax(0,1fr))}}
    `}</style>
  </main>;
}

function RigSheet(){
  const poses=[
    ['01 · IDLE','swing',0],
    ['02 · LOAD','swing',6],
    ['03 · TRIGGER','swing',11],
    ['04 · SWING START','swing',15],
    ['05 · CONTACT','swing',18],
    ['06 · FOLLOW THROUGH','swing',34],
    ['07 · HOMER FINISH','homer',59],
    ['08 · MISS FINISH','miss',59],
  ];
  return <main className="qa-pose-sheet qa-rig-sheet">
    <header><b>GM12 · FULL-MOTION 60HZ BATTER RIG</b><span>authored 96×96 key poses · continuous interpolation · no legacy batter sheet during motion</span></header>
    <section>{poses.map(([label,action,frame])=><RigFrame key={label} label={label} action={action} frame={frame}/>)}</section>
    <style>{QA_STYLE}</style>
  </main>;
}

function seedBattle(){
  localStorage.clear();
  let state=createV10Duel(1);
  state=enterV10Node(state,'a1-entry');
  state.battle.pending={zone:5,roll:.5,powerRoll:.95};
  saveV10Duel(localStorage,state);
  localStorage.setItem('9zone-zones-tour-v5','done');
}
function bootLive(){
  seedBattle();
  createRoot(document.getElementById('root')).render(<Duel/>);
  const timer=setInterval(()=>{
    const button=[...document.querySelectorAll('button')].find(node=>['이어하기','MAIN RUN 이어하기'].includes(node.textContent?.trim()));
    if(button){button.click();clearInterval(timer);}
  },40);
  setTimeout(()=>clearInterval(timer),3000);
  if(before){
    const replace=()=>{
      const actor=document.querySelector('.golden-master-stage .sprite-batter.v5-hero-pose');
      if(!actor)return;
      actor.querySelectorAll('img').forEach(img=>{img.src=oldIdle;});
    };
    const observer=new MutationObserver(replace);
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>{replace();observer.disconnect();},2400);
  }
}
if(compare)createRoot(document.getElementById('root')).render(<ContinuitySheet/>);
else if(rig)createRoot(document.getElementById('root')).render(<RigSheet/>);
else if(sheet)createRoot(document.getElementById('root')).render(<PoseSheet/>);
else bootLive();
