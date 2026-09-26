import React,{useEffect,useRef} from 'react';
import {batterMotionV3Timeline,BATTER_MOTION_V3_HIT_GRADES} from './batterMotionV3.js';
import {redRushBatterShot,redRushFrameAt,hasPitchVisual} from './pitcher-sd.js';

/* V13 C2 — the batter and the pitcher drawn by PixiJS (WebGL) over the CSS stadium.
   The art is the repository's: the pitcher's 120-frame atlas and the batter's ten authored key poses.
   Pixi does not add frames; it makes the ones we have read as motion:
   - both actors sit on the same layout boxes as the DOM actors (.bp-pitcher / .bp-batter), so every
     portrait/landscape layout is kept, and share one ground shadow and one idle breath;
   - the pitch runs on one clock: pitcher frame = redRushFrameAt(t), batter pose = the V3 timeline;
   - the fast part of the swing gets an on-twos smear (the previous pose, fading) and a bat arc;
   - contact holds both actors (hit-stop), flashes the batter and kicks dirt at his front foot.
   Without WebGL (old devices, the test DOM) nothing mounts and the DOM actors stay visible. */

export function pixiAvailable(){
  if(typeof window==='undefined'||typeof document==='undefined')return false;
  if(!window.WebGL2RenderingContext&&!window.WebGLRenderingContext)return false;
  try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch{return false;}
}

const HIT_STOP_MS=90;
/* pixel art stays even: whole-number scale when the art is enlarged at least 2x (x3.2 made some
   art pixels 3 screen pixels wide and others 4) */
const crisp=(sc,dpr)=>sc*dpr>=2?Math.max(1,Math.floor(sc*dpr))/dpr:sc;
const IDLE_BREATH_MS=2600;

export default function BallparkActors({sceneRef,pitcherAtlas,batterPoses,shot,fxStage,playToken,onReady}){
  const hostRef=useRef(null),live=useRef({});
  live.current={shot,fxStage,playToken};

  useEffect(()=>{
    if(!pixiAvailable())return;
    let app=null,alive=true,ro=null;const cleanup=[];
    const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    (async()=>{
      const PIXI=await import('pixi.js');
      if(!alive)return;
      app=new PIXI.Application();
      await app.init({backgroundAlpha:0,antialias:false,resolution:Math.min(2,window.devicePixelRatio||1),autoDensity:true,resizeTo:hostRef.current,roundPixels:true,
        preserveDrawingBuffer:new URLSearchParams(window.location.search).get('qa')==='1'});
      if(!alive){app.destroy(true);return;}
      hostRef.current.appendChild(app.canvas);
      PIXI.TextureSource.defaultOptions.scaleMode='nearest';

      /* textures */
      const poseNames=Object.keys(batterPoses);
      const poseTex={};
      await Promise.all(poseNames.map(async n=>{poseTex[n]=await PIXI.Assets.load(batterPoses[n]);poseTex[n].source.scaleMode='nearest';}));
      let pitchFrames=null;
      if(pitcherAtlas){
        const atlas=await PIXI.Assets.load(pitcherAtlas);atlas.source.scaleMode='nearest';
        const fw=atlas.width/10,fh=atlas.height/12;
        pitchFrames=Array.from({length:120},(_,k)=>new PIXI.Texture({source:atlas.source,frame:new PIXI.Rectangle((k%10)*fw,Math.floor(k/10)*fh,fw,fh)}));
      }
      if(!alive){app.destroy(true);return;}

      /* scene graph: shadows, smear ghosts, actors, arc, flash, dust */
      const world=new PIXI.Container();app.stage.addChild(world);
      const shadows=new PIXI.Graphics();world.addChild(shadows);
      const pitcher=pitchFrames?new PIXI.Sprite(pitchFrames[0]):null;
      if(pitcher){pitcher.anchor.set(.5,1);world.addChild(pitcher);}
      const ghosts=[0,1].map(()=>{const g=new PIXI.Sprite(poseTex.ready);g.anchor.set(.5,1);g.alpha=0;world.addChild(g);return g;});
      const batter=new PIXI.Sprite(poseTex.ready);batter.anchor.set(.5,1);world.addChild(batter);
      const flash=new PIXI.Sprite(poseTex.ready);flash.anchor.set(.5,1);flash.blendMode='add';flash.alpha=0;world.addChild(flash);
      const arc=new PIXI.Graphics();world.addChild(arc);
      const dust=new PIXI.Container();world.addChild(dust);
      const dustPool=[];

      /* layout: read the DOM actor boxes, so CSS keeps owning where the actors stand */
      const boxes={b:null,p:null};
      const measure=()=>{
        const scene=sceneRef.current;if(!scene)return;
        const sr=scene.getBoundingClientRect(),rel=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.left-sr.left,y:r.top-sr.top,w:r.width,h:r.height};};
        boxes.b=rel(scene.querySelector('.bp-batter'));boxes.p=rel(scene.querySelector('.bp-pitcher'));
      };
      measure();
      ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
      ro?.observe(sceneRef.current);
      window.addEventListener('resize',measure);cleanup.push(()=>window.removeEventListener('resize',measure));

      const spawnDust=(x,y,n,s)=>{
        for(let i=0;i<n;i++){
          const d=dustPool.pop()||new PIXI.Graphics().rect(0,0,1,1).fill(0xd9b98a);
          d.x=x+(Math.random()-.5)*s*.3;d.y=y-Math.random()*s*.05;d.scale.set(Math.max(2,Math.round(s/120)));
          d.vx=(Math.random()-.3)*s*.012;d.vy=-Math.random()*s*.018;d.life=1;dust.addChild(d);
        }
      };

      /* one clock per pitch */
      let token=null,start=0,timeline=[{pose:'ready',at:0}],swing=false,hit=false,impactAt=0,stopUntil=0,stopAt=0,dusted={},prevPose='ready',prevPoses=[];
      const begin=now=>{
        const {shot:sh}=live.current;
        const eff=sh&&pitchFrames?redRushBatterShot(sh,reduced):sh;
        timeline=sh&&!reduced?batterMotionV3Timeline(eff):[{pose:'ready',at:0}];
        swing=timeline.some(k=>k.pose==='swing-mid');
        hit=swing&&BATTER_MOTION_V3_HIT_GRADES.has(sh?.grade);
        impactAt=timeline.find(k=>k.pose==='contact')?.at??timeline.find(k=>k.pose==='follow-through-early')?.at??0;
        start=now;stopUntil=0;stopAt=0;dusted={};prevPoses=[];shownIndex=0;
      };
      /* a key pose is never skipped: on a slow frame the timeline may jump two poses, but the screen
         advances one authored pose per rendered frame, so every silhouette is seen */
      let shownIndex=0;
      const poseAt=t=>{let i=0;for(let j=0;j<timeline.length;j++){if(timeline[j].at>t)break;i=j;}
        if(i<shownIndex)shownIndex=i;else if(i>shownIndex+1)shownIndex+=1;else shownIndex=i;
        return timeline[shownIndex].pose;};

      onReady?.({batter:true,pitcher:!!pitcher});
      app.ticker.add(()=>{
        const now=performance.now(),{fxStage:stage,playToken:tok,shot:sh}=live.current;
        const active=!!stage&&!!sh&&hasPitchVisual(sh);
        if(active&&tok!==token){token=tok;begin(now);}
        if(!active)token=null;
        let t=active?now-start:0;
        // hit-stop: the clock stands still for a beat at contact
        if(active&&hit&&!reduced){
          if(!stopAt&&t>=impactAt){stopAt=now;stopUntil=now+HIT_STOP_MS;}
          if(stopAt){t=now<stopUntil?impactAt:t-HIT_STOP_MS;}
        }
        const {b,p}=boxes;
        const breath=reduced?0:Math.sin(now/IDLE_BREATH_MS*Math.PI*2);
        shadows.clear();

        if(pitcher&&p){
          pitcher.texture=pitchFrames[active?redRushFrameAt(t):0];
          const sc=crisp(p.h/pitcher.texture.height,app.renderer.resolution);
          pitcher.scale.set(sc,sc*(active?1:1+breath*.008));
          pitcher.position.set(p.x+p.w/2,p.y+p.h);
          shadows.ellipse(p.x+p.w/2,p.y+p.h-p.h*.03,p.w*.26,p.h*.035).fill({color:0x000000,alpha:.35});
        }
        if(b){
          // hit-stop always holds the contact pose (the no-skip rule may still be a pose behind)
          const inStop=active&&hit&&stopAt&&now<stopUntil;
          if(inStop){const ci=timeline.findIndex(k=>k.pose==='contact');if(ci>=0)shownIndex=ci;}
          const pose=active?(inStop?'contact':poseAt(t)):(shownIndex=0,'ready');
          if(pose!==prevPose){prevPoses.unshift({pose:prevPose,at:now});prevPoses=prevPoses.slice(0,2);prevPose=pose;}
          const tex=poseTex[pose]||poseTex.ready;
          batter.texture=tex;flash.texture=tex;
          const sc=crisp(b.h/tex.height,app.renderer.resolution),x=Math.round(b.x+b.w/2),y=Math.round(b.y+b.h);
          batter.scale.set(sc,sc*(active?1:1+breath*.006));batter.position.set(x,y);
          flash.scale.copyFrom(batter.scale);flash.position.copyFrom(batter.position);
          shadows.ellipse(x,y-b.h*.04,b.w*.3,b.h*.035).fill({color:0x000000,alpha:.35});
          // smear: during the fast part of the swing the last poses trail behind, on twos
          const fast=active&&swing&&t>=(timeline.find(k=>k.pose==='swing-start')?.at??1e9)&&t<impactAt+160;
          ghosts.forEach((g,i)=>{
            const src=prevPoses[i];
            if(fast&&src&&!reduced){g.texture=poseTex[src.pose]||poseTex.ready;g.scale.copyFrom(batter.scale);g.position.copyFrom(batter.position);g.alpha=Math.max(0,(i?.16:.32)*(1-(now-src.at)/180));g.tint=0xfff1c4;}
            else g.alpha=0;
          });
          // bat arc: from the load shoulder over the plate, drawn while the bat is moving
          arc.clear();
          const ss=timeline.find(k=>k.pose==='swing-start')?.at;
          if(active&&swing&&!reduced&&ss!=null&&t>=ss&&t<impactAt+220){
            const k=Math.min(1,(t-ss)/Math.max(60,impactAt-ss)),fade=t>impactAt?1-(t-impactAt)/220:1;
            const cx=x+b.w*.08,cy=y-b.h*.48,r=b.h*.33,a0=-1.9,a1=a0+(0.3+1.9)*k;
            arc.arc(cx,cy,r,a0,a1).stroke({width:Math.max(3,b.h*.025),color:hit?0xffe08a:0xffffff,alpha:.45*fade,cap:'round'});
            arc.arc(cx,cy,r*.93,a0+.2,a1).stroke({width:Math.max(2,b.h*.012),color:0xffffff,alpha:.35*fade,cap:'round'});
          }
          // contact flash + dirt
          flash.alpha=active&&hit&&stopAt&&now<stopUntil+60?Math.max(0,.4-(now-stopAt)/300):0;
          if(active&&!dusted.stride&&t>=(timeline.find(k=>k.pose==='trigger')?.at??1e9)){dusted.stride=1;if(!reduced)spawnDust(x+b.w*.28,y-b.h*.02,10,b.h);}
          if(active&&hit&&!dusted.hit&&stopAt){dusted.hit=1;if(!reduced)spawnDust(x+b.w*.3,y-b.h*.02,16,b.h);}
        }
        // what is on screen, for QA and tests
        const host=hostRef.current;if(host){host.dataset.pose=prevPose;host.dataset.frame=pitcher?String(active?redRushFrameAt(t):0):'';host.dataset.stop=stopAt&&now<stopUntil?'1':'0';}
        for(const d of [...dust.children]){d.x+=d.vx;d.y+=d.vy;d.vy+=.25;d.life-=.03;d.alpha=Math.max(0,d.life);if(d.life<=0){dust.removeChild(d);dustPool.push(d);}}
      });
    })().catch(()=>{onReady?.(null);});
    return ()=>{alive=false;ro?.disconnect();cleanup.forEach(f=>f());onReady?.(null);try{app?.destroy(true,{children:true});}catch{}};
  },[pitcherAtlas]);

  return <div ref={hostRef} className="bp-pixi" aria-hidden="true"/>;
}
