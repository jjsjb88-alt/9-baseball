import React,{useEffect,useRef} from 'react';
import {batterMotionV3Timeline} from './batterMotionV3.js';
import {redRushBatterShot} from './pitcher-sd.js';

const cache=new Map();

function preload(src){
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

export function batterPoseAt(timeline,elapsedMs){
  const elapsed=Math.max(0,Number(elapsedMs)||0);
  let pose=timeline?.[0]?.pose||'ready';
  for(const keyframe of timeline||[]){
    if(keyframe.at>elapsed)break;
    pose=keyframe.pose;
  }
  return pose;
}

function setPose(host,img,poses,pose,lastPose){
  const next=poses[pose]||poses.ready;
  if(!host||!img||!next)return pose;
  if(lastPose&&lastPose!==pose)host.classList.remove('reboot-pose-'+lastPose);
  host.classList.add('reboot-pose-'+pose);
  host.dataset.batterPose=pose;
  if(img.src!==next)img.src=next;
  return pose;
}

export default function BatterV3Sprite({poses,shot=null,playToken=0,syncRedRush=false}){
  const hostRef=useRef(null);
  const imgRef=useRef(null);

  useEffect(()=>{
    const host=hostRef.current,img=imgRef.current;
    if(!host||!img)return;
    let raf=0,alive=true,lastPose='ready';
    const reduced=typeof window!=='undefined'&&!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const params=typeof window!=='undefined'?new URLSearchParams(window.location.search):null;
    const qaPose=params?.get('cinema')==='1'?params.get('batterPose'):null;

    if(qaPose&&poses[qaPose]){
      setPose(host,img,poses,qaPose,lastPose);
      return;
    }
    if(!shot||reduced){
      setPose(host,img,poses,'ready',lastPose);
      return;
    }

    const effective=syncRedRush?redRushBatterShot(shot,false):shot;
    const timeline=batterMotionV3Timeline(effective);
    const required=[...new Set(timeline.map(x=>poses[x.pose]).filter(Boolean))];
    const startedAt=performance.now();

    Promise.all(required.map(preload)).then(()=>{
      if(!alive)return;
      const tick=now=>{
        if(!alive)return;
        const elapsed=Math.max(0,now-startedAt);
        const pose=batterPoseAt(timeline,elapsed);
        if(pose!==lastPose)lastPose=setPose(host,img,poses,pose,lastPose);
        const end=timeline[timeline.length-1]?.at||0;
        if(elapsed<end+34)raf=requestAnimationFrame(tick);
      };
      raf=requestAnimationFrame(tick);
    }).catch(()=>{});

    return()=>{alive=false;cancelAnimationFrame(raf);};
  },[
    playToken,syncRedRush,shot?.grade,shot?.motion?.duration,shot?.motion?.impactAt,
    shot?.motion?.settleAt,shot?.motion?.freeze,shot?.motion?.slowmo,
  ]);

  return <span ref={hostRef} data-batter-pose="ready" className="sprite-stage sprite-batter golden-actor batter-reboot-v3 reboot-pose-ready">
    <i className="actor-contact-shadow" aria-hidden="true"/>
    <img ref={imgRef} aria-hidden="true" className="duel-sprite batter-reboot-art" src={poses.ready}/>
  </span>;
}
