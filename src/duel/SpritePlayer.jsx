import React,{useEffect,useRef,useState} from 'react';
import {spriteAnim,spriteFrames,frameAt,animDurationMs} from './spritebrew-frames.js';

/* Plays a frame array (SpriteBrew raw frames, docs/spritebrew-plan.md) as a pixel-art <img>.
   - `frames` wins; otherwise `character` + `animation` read spritebrew-frames.js (fps/loop too).
   - No frames, or any frame fails to load → renders `fallback` (the current runtime art), so the
     screen never shows an empty actor while assets are missing.
   - `playToken` restarts the animation; `onComplete` fires once per play of a one-shot.
   - reduced motion: a loop holds frame 0, a one-shot jumps to its last frame and completes. */
export default function SpritePlayer({
  frames=null,character=null,animation=null,fps,loop,playing=true,playToken=0,
  onComplete=null,fallback=null,className='',style=null,
}){
  const anim=character&&animation?spriteAnim(character,animation):null;
  const list=frames||(anim?spriteFrames(character,animation):[]);
  const rate=fps??anim?.fps??12,looped=loop??anim?.loop??false;
  const [index,setIndex]=useState(0);
  const [failed,setFailed]=useState(false);
  const done=useRef(onComplete);done.current=onComplete;
  const key=list.join('|');

  useEffect(()=>{setFailed(false);},[key]);

  useEffect(()=>{
    const count=list.length;
    setIndex(0);
    if(!count||!playing||failed)return;
    const reduced=typeof window!=='undefined'&&!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(reduced){
      if(!looped){setIndex(count-1);done.current?.();}
      return;
    }
    const raf=window.requestAnimationFrame,caf=window.cancelAnimationFrame;
    let id=0,start=null,shown=0,finished=false;
    const total=animDurationMs(count,rate);
    const tick=ts=>{
      if(start==null)start=ts;
      const t=ts-start,i=frameAt(t,count,rate,looped);
      if(i!==shown){shown=i;setIndex(i);}
      if(!looped&&t>=total){if(!finished){finished=true;done.current?.();}return;}
      id=raf(tick);
    };
    id=raf(tick);
    return ()=>caf?.(id);
  },[key,rate,looped,playing,playToken,failed]);

  if(!list.length||failed)return fallback;
  return <img
    className={'sprite-player '+className}
    src={list[Math.min(index,list.length-1)]}
    alt=""
    aria-hidden="true"
    draggable={false}
    onError={()=>setFailed(true)}
    style={{imageRendering:'pixelated',pointerEvents:'none',display:'block',width:'100%',height:'100%',objectFit:'contain',objectPosition:'50% 100%',...style}}
  />;
}

/* warm the browser cache so the first play does not flash (call when a battle mounts) */
export function preloadFrames(list){
  if(typeof Image==='undefined')return;
  for(const src of list||[]){const im=new Image();im.decoding='async';im.src=src;}
}
