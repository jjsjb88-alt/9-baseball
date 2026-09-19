import {useEffect,useRef,useState} from 'react';

export const PERF_TIERS=['high','balanced','low'];
export const PERF_DPR_CAP={high:2,balanced:1.25,low:1};
export const PERF_PARTICLE_SCALE={high:1,balanced:.68,low:.42};

export function lowerPerfTier(tier){
  return tier==='high'?'balanced':tier==='balanced'?'low':'low';
}
export function raisePerfTier(tier){
  return tier==='low'?'balanced':tier==='balanced'?'high':'high';
}

export const hasFakeFrameClock=()=>!!(globalThis.setTimeout?.clock||globalThis.requestAnimationFrame?.clock||globalThis.Date?.clock);
export const canMeasureFrameBudget=()=>!hasFakeFrameClock()&&(typeof navigator==='undefined'||!/happy-dom|jsdom/i.test(navigator.userAgent||''));

export default function useAdaptivePerformance(active=true){
  const [tier,setTier]=useState('high');
  const tierRef=useRef('high');

  useEffect(()=>{
    if(!active||typeof requestAnimationFrame!=='function'||!canMeasureFrameBudget())return;
    let raf=0,last=performance.now(),ema=16.7,badMs=0,goodMs=0,lastShift=last;
    const visible=()=>typeof document==='undefined'||document.visibilityState!=='hidden';
    const commit=next=>{
      if(next===tierRef.current)return;
      tierRef.current=next;setTier(next);lastShift=performance.now();badMs=0;goodMs=0;
    };
    const tick=now=>{
      if(!visible()){last=now;badMs=0;goodMs=0;raf=requestAnimationFrame(tick);return;}
      const dt=now-last;last=now;
      // Ignore tab wakeups and one-off long tasks. We only react to sustained render pressure.
      if(dt>=7&&dt<=50){
        ema=ema*.9+dt*.1;
        if(now-lastShift>1200){
          if(ema>20.5){badMs+=dt;goodMs=Math.max(0,goodMs-dt);}
          else if(ema<17.8){goodMs+=dt;badMs=Math.max(0,badMs-dt*.5);}
          else{badMs=Math.max(0,badMs-dt*.2);goodMs=Math.max(0,goodMs-dt*.25);}
          if(badMs>=720)commit(lowerPerfTier(tierRef.current));
          else if(goodMs>=6000)commit(raisePerfTier(tierRef.current));
        }
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
  },[active]);

  return tier;
}
