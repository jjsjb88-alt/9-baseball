import React,{useEffect,useRef} from 'react';
import redRushAtlas from '../../assets/pitcher-sd-v1/red-rush-pitch-120-atlas.png';
import {hasPitchVisual,redRushFrameAt} from './pitcher-sd.js';

let atlasPromise=null;
function loadAtlas(){
  if(atlasPromise)return atlasPromise;
  if(typeof Image==='undefined')return Promise.resolve(null);
  const img=new Image();
  img.decoding='async';
  img.src=redRushAtlas;
  atlasPromise=(typeof img.decode==='function'
    ? img.decode().catch(()=>new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}))
    : new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}))
    .then(()=>img);
  return atlasPromise;
}

function paint(ctx,img,frame){
  if(!ctx||!img)return;
  const col=frame%10,row=Math.floor(frame/10),cell=256;
  ctx.clearRect(0,0,cell,cell);
  ctx.drawImage(img,col*cell,row*cell,cell,cell,0,0,cell,cell);
}

export default function RedRushCanvasSprite({stage=null,shot=null,playToken=0,pose='idle'}){
  const core=useRef(null),back=useRef(null);
  const reduced=typeof window!=='undefined'&&!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const active=!!stage&&hasPitchVisual(shot)&&!reduced;

  useEffect(()=>{
    let raf=0,alive=true,last=-1;
    const startedAt=performance.now();
    const coreCtx=core.current?.getContext?.('2d',{alpha:true,desynchronized:true})||null;
    const backCtx=back.current?.getContext?.('2d',{alpha:true,desynchronized:true})||null;
    if(coreCtx)coreCtx.imageSmoothingEnabled=false;
    if(backCtx)backCtx.imageSmoothingEnabled=false;
    loadAtlas().then(img=>{
      if(!alive||!img)return;
      const tick=now=>{
        if(!alive)return;
        const frame=active?redRushFrameAt(now-startedAt):0;
        if(frame!==last){
          last=frame;
          paint(coreCtx,img,frame);
          // The pitcher echo is visible only during the short impact beat.
          // Keep it at 20Hz instead of repainting a hidden 256x256 canvas at 60Hz.
          if(stage==='impact'&&frame%3===0)paint(backCtx,img,frame);
          if(core.current)core.current.dataset.frame=String(frame);
        }
        if(active&&frame<119)raf=requestAnimationFrame(tick);
      };
      tick(performance.now());
    }).catch(()=>{});
    return()=>{alive=false;cancelAnimationFrame(raf);};
  },[active,playToken]);

  return <span className={'sprite-stage sprite-pitcher pose-'+pose+' golden-actor red-rush-actor'}>
    <i className="actor-contact-shadow" aria-hidden="true"/>
    <canvas ref={back} width="256" height="256" aria-hidden="true" className="sprite-echo echo-back red-rush-frame"/>
    <canvas ref={core} width="256" height="256" aria-hidden="true" className="duel-sprite red-rush-frame"/>
    <i className="sprite-bloom" aria-hidden="true"/>
  </span>;
}
