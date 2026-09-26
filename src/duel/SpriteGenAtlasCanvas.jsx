import React,{useEffect,useRef} from 'react';
import {spriteGenFrameAt,spriteGenStateContract} from './spriteGenAtlas.js';

const cache=new Map();

function loadSheet(src){
  if(!src||typeof Image==='undefined')return Promise.resolve(null);
  if(cache.has(src))return cache.get(src);
  const img=new Image();
  img.decoding='async';
  img.src=src;
  const ready=(typeof img.decode==='function'
    ? img.decode().catch(()=>new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}))
    : new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}))
    .then(()=>img);
  cache.set(src,ready);
  return ready;
}

function drawFrame(ctx,img,frame,width,height){
  const rect=frame?.rect;
  if(!ctx||!img||!rect)return;
  ctx.clearRect(0,0,width,height);
  ctx.globalAlpha=1;
  ctx.drawImage(
    img,
    rect.x,rect.y,rect.w,rect.h,
    0,0,width,height,
  );
}

/**
 * Manifest-driven sprite renderer for Sprite-Gen output.
 *
 * This component intentionally draws one real frame at a time.
 * It does not alpha-blend adjacent frames because rigid pixel-art elements
 * such as a bat, helmet and face can ghost under cross-fading.
 *
 * V1 is infrastructure only and is not wired into App.jsx.
 */
export default function SpriteGenAtlasCanvas({
  sheet,
  manifest,
  state='swing',
  playToken=0,
  className='duel-sprite sprite-gen-canvas',
  width,
  height,
  onFrame,
}){
  const ref=useRef(null);
  const row=spriteGenStateContract(manifest,state);
  const canvasWidth=width||Number(manifest?.frame_layout?.cellWidth)||192;
  const canvasHeight=height||Number(manifest?.frame_layout?.cellHeight)||192;

  useEffect(()=>{
    const canvas=ref.current;
    const ctx=canvas?.getContext?.('2d',{alpha:true,desynchronized:true});
    if(!canvas||!ctx||!sheet||!row||typeof Image==='undefined')return;
    ctx.imageSmoothingEnabled=false;

    let alive=true,raf=0,lastIndex=-1;
    const startedAt=performance.now();

    loadSheet(sheet).then(img=>{
      if(!alive||!img)return;
      const tick=now=>{
        if(!alive)return;
        const elapsed=Math.max(0,now-startedAt);
        const frame=spriteGenFrameAt(manifest,state,elapsed);
        if(frame&&frame.index!==lastIndex){
          lastIndex=frame.index;
          drawFrame(ctx,img,frame,canvas.width,canvas.height);
          canvas.dataset.frame=String(frame.index);
          onFrame?.(frame);
        }

        const done=!row.loop&&elapsed>=row.totalMs;
        if(!done)raf=requestAnimationFrame(tick);
      };
      tick(performance.now());
    }).catch(()=>{});

    return()=>{alive=false;cancelAnimationFrame(raf);};
  },[sheet,manifest,state,playToken,row?.frameCount,row?.totalMs]);

  return <canvas
    ref={ref}
    width={canvasWidth}
    height={canvasHeight}
    className={className}
    aria-hidden="true"
    data-sprite-gen-state={state}
  />;
}
