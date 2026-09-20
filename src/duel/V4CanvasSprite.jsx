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
const lerp=(a,b,t)=>a+(b-a)*t;
const pt=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t)];

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

/*
 * GM12 Batter Golden Master rig.
 * This replaces the old low-density batter sheet during motion without touching
 * the 60Hz RAF timeline. Geometry is authored on a 96x96 logical pixel canvas,
 * then enlarged 2x with smoothing disabled so silhouette, hands, bat path and
 * lower-body weight stay readable on the smallest viewport.
 */
const BATTER_GM={
  idle:{head:[47,18],neck:[46,27],sb:[39,31],sf:[51,31],hb:[41,50],hf:[52,50],eb:[36,39],hbnd:[52,38],ef:[50,39],hfnd:[56,39],kb:[35,64],fb:[27,80],kf:[58,64],ff:[67,80],knob:[56,38],tip:[75,11]},
  load:{head:[44,18],neck:[44,27],sb:[35,31],sf:[49,30],hb:[38,50],hf:[50,50],eb:[30,39],hbnd:[49,36],ef:[46,39],hfnd:[53,37],kb:[32,64],fb:[25,80],kf:[56,62],ff:[64,78],knob:[52,36],tip:[70,8]},
  trigger:{head:[45,19],neck:[45,28],sb:[36,32],sf:[50,31],hb:[39,50],hf:[52,49],eb:[31,39],hbnd:[49,39],ef:[48,38],hfnd:[55,40],kb:[34,63],fb:[26,80],kf:[57,61],ff:[68,77],knob:[54,39],tip:[76,14]},
  swingStart:{head:[47,20],neck:[47,29],sb:[38,33],sf:[53,32],hb:[43,50],hf:[55,48],eb:[37,41],hbnd:[54,42],ef:[51,40],hfnd:[60,43],kb:[38,62],fb:[31,79],kf:[61,59],ff:[72,77],knob:[59,42],tip:[82,26]},
  contact:{head:[49,21],neck:[49,30],sb:[40,34],sf:[56,32],hb:[46,51],hf:[59,48],eb:[47,41],hbnd:[61,43],ef:[57,39],hfnd:[66,43],kb:[43,63],fb:[38,80],kf:[64,60],ff:[75,79],knob:[65,43],tip:[92,40]},
  follow:{head:[50,21],neck:[49,30],sb:[42,33],sf:[57,35],hb:[49,50],hf:[61,50],eb:[49,37],hbnd:[59,31],ef:[59,38],hfnd:[64,31],kb:[47,63],fb:[44,80],kf:[64,61],ff:[75,80],knob:[63,30],tip:[36,13]},
  homer:{head:[51,18],neck:[50,28],sb:[42,31],sf:[57,33],hb:[49,49],hf:[61,49],eb:[46,33],hbnd:[54,26],ef:[56,35],hfnd:[61,26],kb:[47,62],fb:[45,80],kf:[64,61],ff:[76,80],knob:[59,25],tip:[31,10]},
  miss:{head:[51,23],neck:[50,31],sb:[44,35],sf:[58,38],hb:[50,51],hf:[62,52],eb:[52,43],hbnd:[65,48],ef:[61,44],hfnd:[70,49],kb:[50,64],fb:[48,80],kf:[66,65],ff:[78,79],knob:[69,49],tip:[89,61]},
  missFollow:{head:[51,24],neck:[50,32],sb:[45,36],sf:[58,40],hb:[51,52],hf:[63,54],eb:[55,44],hbnd:[64,53],ef:[63,46],hfnd:[69,54],kb:[52,65],fb:[50,80],kf:[67,66],ff:[80,79],knob:[68,54],tip:[83,73]},
};
const BATTER_POINT_KEYS=['head','neck','sb','sf','hb','hf','eb','hbnd','ef','hfnd','kb','fb','kf','ff','knob','tip'];
const BATTER_TIMELINES={
  swing:[[0,'idle'],[6,'load'],[11,'trigger'],[15,'swingStart'],[18,'contact'],[34,'follow'],[59,'follow']],
  homer:[[0,'idle'],[6,'load'],[11,'trigger'],[15,'swingStart'],[18,'contact'],[32,'follow'],[44,'homer'],[59,'homer']],
  miss:[[0,'idle'],[6,'load'],[11,'trigger'],[15,'swingStart'],[18,'miss'],[34,'missFollow'],[59,'missFollow']],
};
const BATTER_PALETTE={
  outline:'#071216',deep:'#102a31',helmet:'#17343a',helmetHi:'#4b8780',
  skinShadow:'#a8644c',skin:'#d99a70',skinHi:'#f1c294',
  jerseyShadow:'#a4a38e',jersey:'#e5e0cb',jerseyHi:'#f7f1d8',
  tealDark:'#215a58',teal:'#53b5a8',tealHi:'#7ddac9',
  pantsShadow:'#a1a393',pants:'#dcd9c6',shoe:'#0b262c',shoeHi:'#356f6b',
  batShadow:'#9d7546',bat:'#d6b977',batHi:'#f0d89b',
  glove:'#efc670',gloveHi:'#ffe3a0',
};

function batterAction(shot){
  const grade=shot?.grade||'';
  if(['homer','grand-slam'].includes(grade))return 'homer';
  if(['near-miss','near-miss-k','chase','chase-k','fooled','strikeout'].includes(grade))return 'miss';
  return 'swing';
}

function batterPoseAt(action,frame){
  const keys=BATTER_TIMELINES[action]||BATTER_TIMELINES.swing;
  let a=keys[0],b=keys[keys.length-1];
  for(let i=0;i<keys.length-1;i++){
    if(frame>=keys[i][0]&&frame<=keys[i+1][0]){a=keys[i];b=keys[i+1];break;}
  }
  if(frame<=keys[0][0])return BATTER_GM[keys[0][1]];
  if(frame>=keys[keys.length-1][0])return BATTER_GM[keys[keys.length-1][1]];
  const span=Math.max(1,b[0]-a[0]),t=smooth(clamp((frame-a[0])/span,0,1));
  const pa=BATTER_GM[a[1]],pb=BATTER_GM[b[1]],out={};
  for(const key of BATTER_POINT_KEYS)out[key]=pt(pa[key],pb[key],t);
  return out;
}

function poly(ctx,points,fill){
  ctx.fillStyle=fill;ctx.beginPath();
  points.forEach(([x,y],i)=>{const X=Math.round(x),Y=Math.round(y);if(i)ctx.lineTo(X,Y);else ctx.moveTo(X,Y);});
  ctx.closePath();ctx.fill();
}
function rect(ctx,x,y,w,h,fill){
  ctx.fillStyle=fill;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function segment(ctx,a,b,outlineWidth,fillWidth,fill,highlight){
  ctx.lineCap='square';ctx.lineJoin='miter';
  ctx.strokeStyle=BATTER_PALETTE.outline;ctx.lineWidth=outlineWidth;
  ctx.beginPath();ctx.moveTo(Math.round(a[0]),Math.round(a[1]));ctx.lineTo(Math.round(b[0]),Math.round(b[1]));ctx.stroke();
  ctx.strokeStyle=fill;ctx.lineWidth=fillWidth;ctx.stroke();
  if(highlight){
    ctx.strokeStyle=highlight;ctx.lineWidth=Math.max(1,Math.floor(fillWidth/4));
    ctx.beginPath();ctx.moveTo(Math.round(a[0]-1),Math.round(a[1]-1));ctx.lineTo(Math.round(b[0]-1),Math.round(b[1]-1));ctx.stroke();
  }
}
function shoe(ctx,p){
  const x=Math.round(p[0]),y=Math.round(p[1]);
  poly(ctx,[[x-7,y-3],[x+5,y-3],[x+8,y-1],[x+7,y+4],[x-7,y+4],[x-9,y+1]],BATTER_PALETTE.outline);
  rect(ctx,x-6,y-2,11,3,BATTER_PALETTE.shoe);
  rect(ctx,x-4,y-2,6,1,BATTER_PALETTE.shoeHi);
  rect(ctx,x+3,y+1,5,2,BATTER_PALETTE.deep);
}
function glove(ctx,p){
  const x=Math.round(p[0]),y=Math.round(p[1]);
  rect(ctx,x-4,y-4,8,8,BATTER_PALETTE.outline);
  rect(ctx,x-3,y-3,6,6,BATTER_PALETTE.glove);
  rect(ctx,x-2,y-2,4,2,BATTER_PALETTE.gloveHi);
}
function bat(ctx,knob,tip){
  segment(ctx,knob,tip,6,3,BATTER_PALETTE.bat,BATTER_PALETTE.batHi);
  rect(ctx,tip[0]-2,tip[1]-2,5,5,BATTER_PALETTE.outline);
  rect(ctx,tip[0]-1,tip[1]-1,3,3,BATTER_PALETTE.batHi);
}
function renderGoldenBatter(ctx,shot,frame){
  const p=batterPoseAt(batterAction(shot),frame),c=BATTER_PALETTE;
  ctx.clearRect(0,0,96,96);
  ctx.imageSmoothingEnabled=false;

  ctx.fillStyle='rgba(0,0,0,.28)';
  ctx.beginPath();ctx.ellipse(50,82,33,5,0,0,Math.PI*2);ctx.fill();

  const batFront=p.tip[0]>84||batterAction(shot)==='miss';
  if(!batFront)bat(ctx,p.knob,p.tip);

  segment(ctx,p.hb,p.kb,11,7,c.pantsShadow,c.pants);
  segment(ctx,p.kb,p.fb,10,6,c.pants,c.jerseyHi);
  segment(ctx,p.hf,p.kf,12,8,c.pants,c.jerseyHi);
  segment(ctx,p.kf,p.ff,10,6,c.pants,c.jerseyHi);
  shoe(ctx,p.fb);shoe(ctx,p.ff);

  const torso=[[p.sb[0]-3,p.sb[1]-3],[p.sf[0]+3,p.sf[1]-2],[p.hf[0]+4,p.hf[1]+4],[p.hb[0]-4,p.hb[1]+4]];
  poly(ctx,torso,c.outline);
  poly(ctx,[[p.sb[0]-1,p.sb[1]-1],[p.sf[0]+1,p.sf[1]],[p.hf[0]+2,p.hf[1]+2],[p.hb[0]-2,p.hb[1]+2]],c.jersey);
  poly(ctx,[[p.sb[0],p.sb[1]],[p.hb[0]-1,p.hb[1]+1],[(p.hb[0]+p.hf[0])/2-1,(p.hb[1]+p.hf[1])/2+2],[(p.sb[0]+p.sf[0])/2,(p.sb[1]+p.sf[1])/2+1]],c.jerseyShadow);
  segment(ctx,[(p.hb[0]+p.hf[0])/2-1,(p.sb[1]+p.sf[1])/2+3],[(p.hb[0]+p.hf[0])/2,(p.hb[1]+p.hf[1])/2+1],4,2,c.teal,c.tealHi);
  segment(ctx,[p.hb[0]-1,p.hb[1]+1],[p.hf[0]+1,p.hf[1]+1],4,2,c.tealDark,c.tealHi);

  segment(ctx,p.sb,p.eb,9,5,c.skinShadow,c.skin);
  segment(ctx,p.eb,p.hbnd,8,4,c.skin,c.skinHi);
  segment(ctx,p.sf,p.ef,9,5,c.skin,c.skinHi);
  segment(ctx,p.ef,p.hfnd,8,4,c.skin,c.skinHi);
  glove(ctx,p.hbnd);glove(ctx,p.hfnd);

  segment(ctx,[p.neck[0],p.neck[1]-1],[p.neck[0],p.neck[1]+4],7,4,c.skin,c.skinHi);

  const hx=Math.round(p.head[0]),hy=Math.round(p.head[1]);
  poly(ctx,[[hx-7,hy-4],[hx+5,hy-3],[hx+7,hy+1],[hx+5,hy+7],[hx-4,hy+6],[hx-7,hy+2]],c.outline);
  poly(ctx,[[hx-5,hy-2],[hx+4,hy-2],[hx+5,hy+1],[hx+3,hy+5],[hx-3,hy+4],[hx-5,hy+2]],c.skin);
  rect(ctx,hx-3,hy-2,5,2,c.skinHi);
  rect(ctx,hx+3,hy,2,2,c.outline);
  rect(ctx,hx+3,hy+4,3,2,c.skinShadow);

  poly(ctx,[[hx-8,hy-4],[hx-6,hy-9],[hx-2,hy-12],[hx+5,hy-11],[hx+9,hy-7],[hx+9,hy-3],[hx+5,hy-2],[hx-7,hy-2]],c.outline);
  poly(ctx,[[hx-6,hy-4],[hx-5,hy-7],[hx-1,hy-10],[hx+4,hy-9],[hx+7,hy-7],[hx+7,hy-4],[hx+4,hy-3],[hx-5,hy-3]],c.helmet);
  poly(ctx,[[hx-4,hy-7],[hx-1,hy-9],[hx+3,hy-8],[hx+5,hy-7],[hx-1,hy-6]],c.helmetHi);
  rect(ctx,hx+5,hy-4,8,3,c.outline);
  rect(ctx,hx+6,hy-3,6,1,c.helmetHi);
  rect(ctx,hx-5,hy-2,3,5,c.deep);

  const cx=Math.round((p.sb[0]+p.sf[0]+p.hb[0]+p.hf[0])/4)+2,cy=Math.round((p.sb[1]+p.sf[1]+p.hb[1]+p.hf[1])/4);
  rect(ctx,cx-3,cy-5,6,2,c.tealDark);rect(ctx,cx+1,cy-4,2,8,c.tealDark);rect(ctx,cx-3,cy+1,5,2,c.tealDark);

  for(const [knee,foot] of [[p.kb,p.fb],[p.kf,p.ff]]){
    const sx=lerp(knee[0],foot[0],.72),sy=lerp(knee[1],foot[1],.72);
    rect(ctx,sx-3,sy-2,6,3,c.tealDark);rect(ctx,sx-2,sy-2,5,1,c.tealHi);
  }

  if(batFront)bat(ctx,p.knob,p.tip);
  rect(ctx,p.knob[0]-3,p.knob[1]-2,5,4,c.outline);
  rect(ctx,p.knob[0]-2,p.knob[1]-1,3,2,c.gloveHi);

  if((batterAction(shot)==='swing'||batterAction(shot)==='homer')&&frame>=17&&frame<=20){
    rect(ctx,p.tip[0]-1,p.tip[1]-1,3,3,c.batHi);
  }
}

function startGoldenBatter(canvas,ctx,who,shot,playToken){
  const buffer=document.createElement('canvas');
  buffer.width=96;buffer.height=96;
  const bctx=buffer.getContext('2d',{alpha:true,desynchronized:true});
  if(!bctx)return()=>{};

  let raf=0,cancelled=false;
  const startedAt=performance.now();
  const tick=now=>{
    if(cancelled)return;
    const elapsed=Math.max(0,now-startedAt);
    const f=frameAt(who,shot,elapsed);
    renderGoldenBatter(bctx,shot,f);

    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.globalAlpha=1;
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(buffer,0,0,96,96,0,0,canvas.width,canvas.height);
    canvas.style.opacity='1';

    if(elapsed<(shot.motion?.duration||900)+34)raf=requestAnimationFrame(tick);
  };
  raf=requestAnimationFrame(tick);
  return()=>{cancelled=true;cancelAnimationFrame(raf);};
}

export default function V4CanvasSprite({sheet,who,shot,playToken=0}){
  const ref=useRef(null);

  useEffect(()=>{
    const canvas=ref.current;
    const ctx=canvas?.getContext?.('2d',{alpha:true,desynchronized:true});
    if(!canvas||!ctx||!sheet||!shot||typeof Image==='undefined')return;
    ctx.imageSmoothingEnabled=false;

    if(who==='batter')return startGoldenBatter(canvas,ctx,who,shot,playToken);

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

export {frameAt,batterPoseAt,renderGoldenBatter};
