import React,{useEffect,useRef} from 'react';
import {batterMotionV3Timeline,BATTER_MOTION_V3_HIT_GRADES} from './batterMotionV3.js';
import {redRushBatterShot,redRushFrameAt,hasPitchVisual,RED_RUSH_RELEASE_MS,RED_RUSH_RELEASE_FRAME as RELEASE_FRAME} from './pitcher-sd.js';
import RELEASE from './pitcher-release.json';
import STRIDE from './pitcher-stride.json';

/* V13 C2 — the batter and the pitcher drawn by PixiJS (WebGL) over the CSS stadium.
   The art is the repository's: the pitcher's 120-frame atlas and the batter's ten authored key poses.
   Pixi does not add frames; it makes the ones we have read as motion:
   - both actors sit on the same layout boxes as the DOM actors (.bp-pitcher / .bp-batter), so every
     portrait/landscape layout is kept, and share one ground shadow and one idle breath;
   - the pitch runs on one clock: pitcher frame = redRushFrameAt(t), batter pose = the V3 timeline;
   - the fast part of the swing gets an on-twos smear (the previous pose, fading) and a bat arc;
   - contact holds both actors (hit-stop), flashes the batter and kicks dirt at his front foot;
   - the pitcher (BP-11): dirt where her front foot lands, an arm whip (two fading frames + a swoosh
     from behind her head to the hand) and a glint at release, and a collapse when she is knocked out.
   Without WebGL (old devices, the test DOM) nothing mounts and the DOM actors stay visible. */

export function pixiAvailable(){
  if(typeof window==='undefined'||typeof document==='undefined')return false;
  if(!window.WebGL2RenderingContext&&!window.WebGLRenderingContext)return false;
  try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch{return false;}
}

const HIT_STOP_MS=90;
/* slow-mo: during the 'slowmo' beat the actors' clock runs at SLOW_RATE, then catches up at CATCH_RATE (BP-9) */
export const SLOW_RATE=.35,CATCH_RATE=2;
/* pixel art stays even: whole-number scale when the art is enlarged at least 2x (x3.2 made some
   art pixels 3 screen pixels wide and others 4) */
const crisp=(sc,dpr)=>sc*dpr>=2?Math.max(1,Math.floor(sc*dpr))/dpr:sc;
const IDLE_BREATH_MS=2600;
/* pitcher effects (BP-11): the whip runs from WHIP_FROM frames before release to WHIP_TO after */
export const WHIP_FROM=8,WHIP_TO=3,KO_DELAY_MS=120,KO_FALL_MS=380;

export default function BallparkActors({sceneRef,pitcherAtlas,artId=null,batterPoses,shot,fxStage,playToken,pitchZone=null,knockedOut=false,onReady}){
  const hostRef=useRef(null),live=useRef({});
  live.current={shot,fxStage,playToken,pitchZone,artId,knockedOut};

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
      const pGhosts=pitchFrames?[0,1].map(()=>{const g=new PIXI.Sprite(pitchFrames[0]);g.anchor.set(.5,1);g.alpha=0;g.blendMode='add';world.addChild(g);return g;}):[];
      const pitcher=pitchFrames?new PIXI.Sprite(pitchFrames[0]):null;
      if(pitcher){pitcher.anchor.set(.5,1);world.addChild(pitcher);}
      const whip=new PIXI.Graphics();world.addChild(whip);
      const ghosts=[0,1].map(()=>{const g=new PIXI.Sprite(poseTex.ready);g.anchor.set(.5,1);g.alpha=0;world.addChild(g);return g;});
      const batter=new PIXI.Sprite(poseTex.ready);batter.anchor.set(.5,1);world.addChild(batter);
      const flash=new PIXI.Sprite(poseTex.ready);flash.anchor.set(.5,1);flash.blendMode='add';flash.alpha=0;world.addChild(flash);
      const arc=new PIXI.Graphics();world.addChild(arc);
      const dust=new PIXI.Container();world.addChild(dust);
      const ball=new PIXI.Graphics();world.addChild(ball);
      let trail=[];
      const dustPool=[];

      /* layout: read the DOM actor boxes, so CSS keeps owning where the actors stand */
      const boxes={b:null,p:null};
      const measure=()=>{
        const scene=sceneRef.current;if(!scene)return;
        const sr=scene.getBoundingClientRect(),rel=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.left-sr.left,y:r.top-sr.top,w:r.width,h:r.height};};
        boxes.b=rel(scene.querySelector('.bp-batter'));boxes.p=rel(scene.querySelector('.bp-pitcher'));
        boxes.cells=[...scene.querySelectorAll('.bp-cell')].map(rel);boxes.zone=rel(scene.querySelector('.bp-zone'));
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
      let token=null,start=0,timeline=[{pose:'ready',at:0}],swing=false,hit=false,impactAt=0,stopUntil=0,stopAt=0,vclock=0,lastNow=0,debt=0,rate=1,koFrame=null,dusted={},prevPose='ready',prevPoses=[];
      const begin=now=>{
        const {shot:sh}=live.current;
        const eff=sh&&pitchFrames?redRushBatterShot(sh,reduced):sh;
        timeline=sh&&!reduced?batterMotionV3Timeline(eff):[{pose:'ready',at:0}];
        swing=timeline.some(k=>k.pose==='swing-mid');
        hit=swing&&BATTER_MOTION_V3_HIT_GRADES.has(sh?.grade);
        impactAt=timeline.find(k=>k.pose==='contact')?.at??timeline.find(k=>k.pose==='follow-through-early')?.at??0;
        start=now;vclock=0;lastNow=now;debt=0;koFrame=null;stopUntil=0;stopAt=0;dusted={};prevPoses=[];shownIndex=0;trail=[];measure();
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
        let t=0;
        if(active){
          const dt=now-lastNow;lastNow=now;
          rate=reduced?1:stage==='slowmo'?SLOW_RATE:debt>0?CATCH_RATE:1;
          vclock+=dt*rate;debt=Math.max(0,debt+dt*(1-rate));t=vclock;
        }else rate=1;
        // hit-stop: the clock stands still for a beat at contact
        if(active&&hit&&!reduced){
          if(!stopAt&&t>=impactAt){stopAt=now;stopUntil=now+HIT_STOP_MS;}
          if(stopAt){t=now<stopUntil?impactAt:t-HIT_STOP_MS;}
        }
        const {b,p}=boxes;
        const breath=reduced?0:Math.sin(now/IDLE_BREATH_MS*Math.PI*2);
        shadows.clear();

        whip.clear();
        if(pitcher&&p){
          const fi=active?redRushFrameAt(t):0,{artId:aid0,knockedOut:ko}=live.current;
          pitcher.texture=pitchFrames[fi];
          const sc=crisp(p.h/pitcher.texture.height,app.renderer.resolution);
          const px=p.x+p.w/2,py=p.y+p.h,tw=pitcher.texture.width*sc,th=pitcher.texture.height*sc;
          pitcher.scale.set(sc,sc*(active?1:1+breath*.008));
          pitcher.position.set(px,py);pitcher.rotation=0;pitcher.alpha=1;pitcher.tint=0xffffff;
          let shadowW=p.w*.26;
          // stride: dirt where the front foot lands
          const st=STRIDE[aid0]||[51,.05,.95];
          if(active&&!dusted.plant&&fi>=st[0]){dusted.plant=1;if(!reduced)spawnDust(px-tw/2+st[1]*tw,py-th+st[2]*th,7,p.h*1.4);}
          // arm whip: the two frames before trail in warm light, a swoosh from behind her head to the hand
          const w0=RELEASE_FRAME-WHIP_FROM,w1=RELEASE_FRAME+WHIP_TO,whipOn=active&&!reduced&&fi>=w0&&fi<=w1;
          pGhosts.forEach((g,i)=>{
            if(whipOn&&fi-(i+1)*2>=0){g.texture=pitchFrames[fi-(i+1)*2];g.scale.copyFrom(pitcher.scale);g.position.copyFrom(pitcher.position);g.alpha=i?.14:.26;g.tint=0xffd9a0;}
            else g.alpha=0;
          });
          if(whipOn){
            const rp=RELEASE[aid0]||[.05,.35],k=Math.min(1,(fi-w0)/WHIP_FROM),fade=fi>RELEASE_FRAME?1-(fi-RELEASE_FRAME)/(WHIP_TO+1):1;
            const ax=px-tw/2+.62*tw,ay=py-th+.12*th,cx=px-tw/2+.3*tw,cy=py-th-.06*th,hx=px-tw/2+rp[0]*tw,hy=py-th+rp[1]*th;
            const q=u=>[(1-u)*(1-u)*ax+2*(1-u)*u*cx+u*u*hx,(1-u)*(1-u)*ay+2*(1-u)*u*cy+u*u*hy];
            const from=Math.max(0,k-.55),N=10,wd=Math.max(2,p.h*.035);
            for(let i=0;i<N;i++){const u0=from+(k-from)*i/N,u1=from+(k-from)*(i+1)/N,[x0,y0]=q(u0),[x1,y1]=q(u1);
              whip.moveTo(x0,y0).lineTo(x1,y1).stroke({width:wd*(.35+.65*(i+1)/N),color:i>N-3?0xffffff:0xffe08a,alpha:.55*fade*(i+1)/N,cap:'round'});}
            if(fi>=RELEASE_FRAME&&fi<=RELEASE_FRAME+1){const r=p.h*.06;whip.circle(hx,hy,r).fill({color:0xffffff,alpha:.5});whip.circle(hx,hy,r*2).fill({color:0xffc861,alpha:.18});}
          }
          // knockout: after the hit lands she flinches (white), staggers, and sinks back off the mound
          if(active&&ko&&!reduced){
            const since=t-impactAt-HIT_STOP_MS-KO_DELAY_MS;
            if(since>0){
              // her pose freezes where the hit found her; she leans back, crumples and goes dark (not transparent)
              if(koFrame==null)koFrame=fi;
              pitcher.texture=pitchFrames[koFrame];
              const f=Math.min(1,since/KO_FALL_MS),e=1-Math.pow(1-f,3);
              const shake=since<180?Math.sin(since/18)*p.h*.02*(1-since/180):0;
              pitcher.position.set(px+shake+e*p.w*.08,py+e*p.h*.06);
              pitcher.rotation=e*.26;pitcher.scale.y=pitcher.scale.x*(1-e*.14);
              const dim=Math.round(255-e*(255-150));pitcher.tint=since<90?0xffb0a0:(dim<<16)|(Math.round(dim*.92)<<8)|Math.round(dim*1.0);
              shadowW=p.w*(.26+e*.1);
              if(!dusted.ko&&since>KO_FALL_MS*.7){dusted.ko=1;spawnDust(px,py-p.h*.02,12,p.h*1.6);}
            }
          }
          shadows.ellipse(px,py-p.h*.03,shadowW,p.h*.035).fill({color:0x000000,alpha:.35});
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
        const host=hostRef.current;if(host){host.dataset.pose=prevPose;host.dataset.frame=pitcher?String(active?redRushFrameAt(t):0):'';host.dataset.stop=stopAt&&now<stopUntil?'1':'0';host.dataset.rate=String(rate);host.dataset.whip=whip.visible&&pGhosts.some(g=>g.alpha>0)?'1':'0';host.dataset.ko=pitcher&&pitcher.rotation>0?'1':'0';}
        /* the pitch: out of the hand on the release frame, toward the camera (it grows), onto its cell at
           contact; a hit leaves into the field, anything else carries on into the catcher */
        ball.clear();
        const {pitchZone:pz,artId:aid}=live.current;
        if(active&&pitcher&&p&&pz!=null&&boxes.zone&&!reduced&&t>=RED_RUSH_RELEASE_MS){
          const rp=RELEASE[aid]||[.05,.35],tw=pitcher.texture.width*pitcher.scale.x,th=pitcher.texture.height*pitcher.scale.y;
          const hx=pitcher.position.x-tw/2+rp[0]*tw,hy=pitcher.position.y-th+rp[1]*th;
          /* side view, like the actors: the ball crosses from her hand to the bat's contact point in front of
             the batter (row = height, column = a little in/out), it does not fly at the camera. The zone
             overlay shows where it crossed with its own mark. Outside the zone (9) it passes wide and low. */
          const z=boxes.zone,bb=b||{x:z.x-z.w,y:z.y,w:z.h,h:z.h},bh=bb.h,bxc=bb.x+bb.w/2,byb=bb.y+bb.h;
          const row=pz<9?Math.floor(pz/3):2.4,col=pz<9?pz%3:2.6;
          const tx=bxc+bh*(.39-(col-1)*.03),ty=byb-bh*(.53-row*.07);
          const unit=bh/100,span=Math.max(1,impactAt-RED_RUSH_RELEASE_MS),k=(t-RED_RUSH_RELEASE_MS)/span;
          let bx,by,r,a=1;
          if(k<=1){const e=Math.pow(k,1.1);bx=hx+(tx-hx)*e;by=hy+(ty-hy)*e-Math.sin(Math.PI*k)*unit*3;r=unit*(1.3+.4*e);}
          else{
            const u=Math.min(1,(t-impactAt)/(hit?650:160));a=1-u;
            if(hit){const g=sh?.grade||'',high=/homer|grand/.test(g),deep=/extra/.test(g);
              bx=tx+u*(high?bh*3.2:deep?bh*2.6:bh*1.8);by=ty-u*(high?bh*2:deep?bh*.8:bh*.2)+(high?0:u*u*bh*.45);r=unit*1.7*(1-u*.5);}
            else{bx=tx-u*bh*.55;by=ty+u*bh*.06;r=unit*1.7;}
          }
          if(a>0){
            trail.unshift({x:bx,y:by,r});trail=trail.slice(0,7);
            trail.forEach((q,i)=>{if(i)ball.circle(q.x,q.y,q.r*(1-i*.1)).fill({color:hit&&k>1?0xffe08a:0xffffff,alpha:a*(.32-i*.045)});});
            ball.circle(bx,by,r+1.5).fill({color:0x07080d,alpha:.6*a});
            ball.circle(bx,by,r).fill({color:0xffffff,alpha:a});
            ball.rect(bx-r*.5,by-r*.15,r*.5,Math.max(1,r*.3)).fill({color:0xd23a3a,alpha:.8*a});
          }
        } else trail=[];
        if(host)host.dataset.ball=trail.length?'1':'0';
        for(const d of [...dust.children]){d.x+=d.vx;d.y+=d.vy;d.vy+=.25;d.life-=.03;d.alpha=Math.max(0,d.life);if(d.life<=0){dust.removeChild(d);dustPool.push(d);}}
      });
    })().catch(()=>{onReady?.(null);});
    return ()=>{alive=false;ro?.disconnect();cleanup.forEach(f=>f());onReady?.(null);try{app?.destroy(true,{children:true});}catch{}};
  },[pitcherAtlas]);

  return <div ref={hostRef} className="bp-pixi bp-cam" aria-hidden="true"/>;
}
