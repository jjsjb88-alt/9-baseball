import React,{useEffect,useRef} from 'react';

const cache=new Map();

function loadSheet(src){
  if(cache.has(src))return cache.get(src);
  const img=new Image();
  img.decoding='async';
  img.src=src;
  const promise=(typeof img.decode==='function'
    ? img.decode().catch(()=>new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}))
    : new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}))
    .then(()=>img);
  cache.set(src,promise);
  return promise;
}

export default function V7KeyPose({hero}){
  const ref=useRef(null);
  useEffect(()=>{
    const canvas=ref.current;
    const ctx=canvas?.getContext?.('2d',{alpha:true,desynchronized:true});
    if(!canvas||!ctx||!hero?.sheet||typeof Image==='undefined')return;
    let cancelled=false;
    ctx.imageSmoothingEnabled=false;
    loadSheet(hero.sheet).then(img=>{
      if(cancelled)return;
      const frame=Math.max(0,Math.min(59,hero.frame|0));
      const sw=img.naturalWidth/10,sh=img.naturalHeight/6;
      const sx=(frame%10)*sw,sy=Math.floor(frame/10)*sh;
      ctx.clearRect(0,0,192,192);
      ctx.drawImage(img,sx,sy,sw,sh,0,0,192,192);
      canvas.style.opacity='1';
    }).catch(()=>{});
    return()=>{cancelled=true;};
  },[hero?.sheet,hero?.frame]);
  return <canvas ref={ref} className="duel-sprite v7-hero-layer" width="192" height="192" aria-hidden="true"/>;
}
