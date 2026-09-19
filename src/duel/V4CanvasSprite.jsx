import React,{useEffect,useRef} from 'react';

const cache=new Map();
let touch=0;

function loadSheet(src){
  const hit=cache.get(src);
  if(hit){hit.touch=++touch;return hit.promise;}
  const img=new Image();
  img.decoding='async';
  img.src=src;
  const promise=(typeof img.decode==='function'
    ? img.decode().catch(()=>new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}))
    : new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}))
    .then(()=>img);
  cache.set(src,{promise,touch:++touch});
  if(cache.size>3){
    const old=[...cache.entries()].sort((a,b)=>a[1].touch-b[1].touch)[0]?.[0];
    if(old&&old!==src)cache.delete(old);
  }
  return promise;
}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);

function frameAt(who,shot,elapsed){
  const m=shot?.motion;
  if(!m)return 0;
  const duration=Math.max(1,m.duration||900);
  const impact=Math.max(110,m.impactAt||240);
  const strikeout=shot?.grade==='strikeout'||shot?.grade?.endsWith?.('-k');
  const anchor=who==='pitcher'?(strikeout?20:23):18;
  const anchorAt=who==='pitcher'?Math.max(90,impact-78):impact;
  const postSpan=who==='pitcher'?620:700;
  const finishAt=Math.min(duration,anchorAt+postSpan);

  if(elapsed<=anchorAt){
    const p=smooth(clamp(elapsed/anchorAt,0,1));
    return anchor*p;
  }
  if(elapsed<=finishAt){
    const p=smooth(clamp((elapsed-anchorAt)/Math.max(1,finishAt-anchorAt),0,1));
    return anchor+(59-anchor)*p;
  }
  return 59;
}

function drawCell(ctx,img,index,alpha){
  const cols=10,rows=6;
  const sw=img.naturalWidth/cols,sh=img.naturalHeight/rows;
  const col=index%cols,row=Math.floor(index/cols);
  ctx.globalAlpha=alpha;
  ctx.drawImage(img,col*sw,row*sh,sw,sh,0,0,ctx.canvas.width,ctx.canvas.height);
}

export default function V4CanvasSprite({sheet,who,shot,playToken=0}){
  const ref=useRef(null);

  useEffect(()=>{
    const canvas=ref.current;
    const ctx=canvas?.getContext?.('2d',{alpha:true,desynchronized:true});
    if(!canvas||!ctx||!sheet||!shot||typeof Image==='undefined')return;
    ctx.imageSmoothingEnabled=false;

    let raf=0,cancelled=false;
    const startedAt=performance.now();

    loadSheet(sheet).then(img=>{
      if(cancelled)return;
      const tick=now=>{
        if(cancelled)return;
        const elapsed=Math.max(0,now-startedAt);
        const f=frameAt(who,shot,elapsed);
        const lo=Math.floor(f),hi=Math.min(59,lo+1),mix=f-lo;

        ctx.clearRect(0,0,canvas.width,canvas.height);
        drawCell(ctx,img,lo,1-mix);
        if(hi!==lo&&mix>.001)drawCell(ctx,img,hi,mix);
        ctx.globalAlpha=1;
        canvas.style.opacity='1';

        if(elapsed<(shot.motion?.duration||900)+34)raf=requestAnimationFrame(tick);
      };
      raf=requestAnimationFrame(tick);
    }).catch(()=>{});

    return()=>{cancelled=true;cancelAnimationFrame(raf);};
  },[
    sheet,who,playToken,shot?.grade,
    shot?.motion?.duration,shot?.motion?.impactAt,
  ]);

  return <canvas ref={ref} className="duel-sprite v4-canvas" width="192" height="192" aria-hidden="true"/>;
}

export {frameAt};
