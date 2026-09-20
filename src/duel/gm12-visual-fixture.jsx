import React from 'react';
import {createRoot} from 'react-dom/client';
import Duel from './App.jsx';
import {BUILDS} from './cards.js';
import {createV10Duel,enterV10Node,saveV10Duel} from './engine.js';
import oldIdle from './gm12-old-idle.svg';
import newIdle from '../../assets/sprites-v5/batter-idle-hero.svg';
import contact from '../../assets/sprites-v5/batter-contact-hero.svg';
import homer from '../../assets/sprites-v5/batter-homer-hero.svg';
import miss from '../../assets/sprites-v5/batter-miss-hero.svg';

const params=new URLSearchParams(window.location.search);
const sheet=params.get('sheet')==='1';
const before=params.get('before')==='1';

function PoseSheet(){
  const poses=[
    ['BEFORE · GM11 IDLE',oldIdle],
    ['GM12 · IDLE',newIdle],
    ['GM12 · CONTACT',contact],
    ['GM12 · HOMER',homer],
    ['GM12 · MISS',miss],
  ];
  return <main className="qa-pose-sheet">
    <header><b>GM12 BATTER GOLDEN MASTER</b><span>small-screen silhouette / hands / bat path / weight QA</span></header>
    <section>{poses.map(([label,src])=><figure className="qa-pose-card" key={label}>
      <div className="qa-frame"><img src={src} alt="" /></div><figcaption>{label}</figcaption>
    </figure>)}</section>
    <style>{`
      *{box-sizing:border-box}html,body,#root{margin:0;min-height:100%;background:#061216;color:#e9e1c9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
      .qa-pose-sheet{min-height:100vh;padding:16px;background:radial-gradient(circle at 50% 18%,#17343a 0,#0b1d22 38%,#061216 72%)}
      header{display:flex;flex-direction:column;gap:4px;margin-bottom:12px;border-bottom:1px solid #347a73;padding-bottom:10px}
      header b{font-size:15px;letter-spacing:.08em;color:#f0ce83}header span{font-size:10px;color:#9bb8b2}
      section{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .qa-pose-card{margin:0;padding:7px;background:#0b1a1f;border:1px solid #214b50;box-shadow:0 8px 18px #0008}
      .qa-frame{aspect-ratio:1;display:grid;place-items:center;background:linear-gradient(#102a31 0 68%,#102329 68% 76%,#0a171b 76%);overflow:hidden}
      .qa-frame:after{content:"";position:absolute}
      .qa-frame img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}
      figcaption{font-size:9px;letter-spacing:.04em;margin-top:5px;color:#d8c18d;text-align:center}
      @media(min-width:700px){section{grid-template-columns:repeat(5,minmax(0,1fr))}.qa-pose-sheet{padding:24px}.qa-pose-card{padding:10px}figcaption{font-size:11px}}
    `}</style>
  </main>;
}

function seedBattle(){
  localStorage.clear();
  let state=createV10Duel(1);
  state.build='away';
  state.deck=BUILDS.away.cards.map((kind,index)=>({id:'qa'+index,kind}));
  state.nextId=state.deck.length;
  state=enterV10Node(state,'a1-entry');
  state.battle.pending={zone:5,roll:.5,powerRoll:.95};
  saveV10Duel(localStorage,state);
  localStorage.setItem('9zone-zones-tour-v5','done');
}
function bootLive(){
  seedBattle();
  createRoot(document.getElementById('root')).render(<Duel/>);
  const timer=setInterval(()=>{
    const button=[...document.querySelectorAll('button')].find(node=>node.textContent?.trim()==='MAIN RUN 이어하기');
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
if(sheet)createRoot(document.getElementById('root')).render(<PoseSheet/>);
else bootLive();
