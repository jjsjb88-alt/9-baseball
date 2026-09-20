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
  idle:{head:[46,22],neck:[45,31],sb:[33,35],sf:[56,34],hb:[34,57],hf:[59,57],eb:[24,45],hbnd:[43,48],ef:[50,44],hfnd:[64,45],kb:[31,70],fb:[21,84],kf:[59,70],ff:[70,84],knob:[63,45],tip:[82,12]},
  load:{head:[43,21],neck:[43,31],sb:[31,35],sf:[54,33],hb:[34,57],hf:[57,55],eb:[22,44],hbnd:[42,43],ef:[48,43],hfnd:[60,41],kb:[30,69],fb:[20,84],kf:[57,68],ff:[68,82],knob:[59,41],tip:[77,9]},
  trigger:{head:[44,22],neck:[44,32],sb:[32,36],sf:[55,34],hb:[36,57],hf:[59,55],eb:[24,45],hbnd:[44,45],ef:[51,43],hfnd:[63,45],kb:[33,69],fb:[21,84],kf:[61,67],ff:[73,81],knob:[62,45],tip:[83,19]},
  swingStart:{head:[46,23],neck:[46,33],sb:[34,37],sf:[58,35],hb:[40,58],hf:[63,55],eb:[31,47],hbnd:[52,49],ef:[56,44],hfnd:[67,49],kb:[37,68],fb:[28,83],kf:[65,66],ff:[77,82],knob:[66,49],tip:[88,33]},
  contact:{head:[49,24],neck:[49,34],sb:[37,38],sf:[61,35],hb:[44,59],hf:[67,55],eb:[43,48],hbnd:[63,49],ef:[60,44],hfnd:[71,48],kb:[42,69],fb:[36,84],kf:[68,67],ff:[79,83],knob:[70,48],tip:[95,45]},
  follow:{head:[50,24],neck:[49,34],sb:[39,37],sf:[62,39],hb:[47,58],hf:[68,58],eb:[46,42],hbnd:[58,34],ef:[59,42],hfnd:[66,33],kb:[46,69],fb:[43,84],kf:[68,68],ff:[78,84],knob:[65,32],tip:[34,11]},
  homer:{head:[51,21],neck:[50,32],sb:[39,35],sf:[62,38],hb:[47,57],hf:[68,57],eb:[43,38],hbnd:[53,29],ef:[57,39],hfnd:[63,28],kb:[46,68],fb:[43,84],kf:[68,67],ff:[79,84],knob:[61,27],tip:[28,9]},
  miss:{head:[51,26],neck:[50,35],sb:[40,39],sf:[62,42],hb:[47,60],hf:[68,61],eb:[49,48],hbnd:[64,54],ef:[61,48],hfnd:[72,55],kb:[48,71],fb:[45,84],kf:[70,71],ff:[82,83],knob:[71,55],tip:[92,67]},
  missFollow:{head:[51,27],neck:[50,36],sb:[41,40],sf:[62,44],hb:[48,61],hf:[69,63],eb:[52,49],hbnd:[64,59],ef:[63,51],hfnd:[72,60],kb:[50,72],fb:[47,84],kf:[71,72],ff:[83,83],knob:[71,60],tip:[86,78]},
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
function taperedLimb(ctx,a,b,outerA,outerB,innerA,innerB,fill,highlight){
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len;
  const quad=(wa,wb)=>[
    [a[0]+nx*wa,a[1]+ny*wa],[b[0]+nx*wb,b[1]+ny*wb],
    [b[0]-nx*wb,b[1]-ny*wb],[a[0]-nx*wa,a[1]-ny*wa],
  ];
  poly(ctx,quad(outerA,outerB),BATTER_PALETTE.outline);
  poly(ctx,quad(innerA,innerB),fill);
  if(highlight){
    const ha=Math.max(1,innerA*.46),hb=Math.max(1,innerB*.4);
    poly(ctx,[
      [a[0]+nx*ha-1,a[1]+ny*ha-1],[b[0]+nx*hb-1,b[1]+ny*hb-1],
      [b[0]+nx*.15-1,b[1]+ny*.15-1],[a[0]+nx*.15-1,a[1]+ny*.15-1],
    ],highlight);
  }
}
function pixelJoint(ctx,p,rx,ry,fill,highlight){
  const x=p[0],y=p[1];
  poly(ctx,[[x-rx+2,y-ry],[x+rx-2,y-ry],[x+rx,y-ry+2],[x+rx,y+ry-2],[x+rx-2,y+ry],[x-rx+2,y+ry],[x-rx,y+ry-2],[x-rx,y-ry+2]],BATTER_PALETTE.outline);
  poly(ctx,[[x-rx+3,y-ry+2],[x+rx-3,y-ry+2],[x+rx-2,y+ry-3],[x-rx+2,y+ry-3]],fill);
  if(highlight)rect(ctx,x-rx+3,y-ry+2,Math.max(2,rx),2,highlight);
}
function shoe(ctx,p){
  const x=Math.round(p[0]),y=Math.round(p[1]);
  poly(ctx,[[x-8,y-4],[x+5,y-4],[x+9,y-1],[x+8,y+4],[x-8,y+4],[x-10,y+1]],BATTER_PALETTE.outline);
  rect(ctx,x-7,y-2,13,4,BATTER_PALETTE.shoe);
  rect(ctx,x-5,y-2,7,1,BATTER_PALETTE.shoeHi);
  rect(ctx,x+3,y+1,6,2,BATTER_PALETTE.deep);
}
function glove(ctx,p){
  const x=Math.round(p[0]),y=Math.round(p[1]);
  rect(ctx,x-5,y-5,10,10,BATTER_PALETTE.outline);
  rect(ctx,x-4,y-4,8,8,BATTER_PALETTE.glove);
  rect(ctx,x-3,y-3,6,2,BATTER_PALETTE.gloveHi);
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

  taperedLimb(ctx,p.hb,p.kb,9.5,8.2,7.3,6.2,c.pantsShadow,c.pants);
  pixelJoint(ctx,p.kb,7.8,6.8,c.pants,c.jerseyHi);
  taperedLimb(ctx,p.kb,p.fb,7.6,5.8,5.8,4.2,c.pants,c.jerseyHi);
  taperedLimb(ctx,p.hf,p.kf,10.0,8.6,7.7,6.5,c.pants,c.jerseyHi);
  pixelJoint(ctx,p.kf,8,7,c.pants,c.jerseyHi);
  taperedLimb(ctx,p.kf,p.ff,7.8,5.9,5.9,4.3,c.pants,c.jerseyHi);
  shoe(ctx,p.fb);shoe(ctx,p.ff);

  const chestY=Math.min(p.sb[1],p.sf[1]),waistY=Math.max(p.hb[1],p.hf[1]);
  const torso=[
    [p.sb[0]-9,p.sb[1]-3],[p.sb[0]-6,chestY-7],[p.sf[0]+6,chestY-6],[p.sf[0]+9,p.sf[1]-1],
    [p.hf[0]+9,p.hf[1]+5],[(p.hb[0]+p.hf[0])/2+4,waistY+10],[p.hb[0]-9,p.hb[1]+5]
  ];
  poly(ctx,torso,c.outline);
  poly(ctx,[
    [p.sb[0]-6,p.sb[1]-1],[p.sb[0]-4,chestY-4],[p.sf[0]+4,chestY-3],[p.sf[0]+6,p.sf[1]+1],
    [p.hf[0]+6,p.hf[1]+3],[(p.hb[0]+p.hf[0])/2+3,waistY+7],[p.hb[0]-6,p.hb[1]+3]
  ],c.jersey);
  poly(ctx,[
    [p.sb[0]-4,p.sb[1]+1],[p.hb[0]-5,p.hb[1]+2],[(p.hb[0]+p.hf[0])/2-1,waistY+5],
    [(p.sb[0]+p.sf[0])/2-3,(p.sb[1]+p.sf[1])/2+3]
  ],c.jerseyShadow);
  poly(ctx,[
    [p.sf[0]-1,chestY-1],[p.sf[0]+4,p.sf[1]],[p.hf[0]+4,p.hf[1]+1],
    [(p.hb[0]+p.hf[0])/2+3,waistY+3],[(p.sb[0]+p.sf[0])/2+2,(p.sb[1]+p.sf[1])/2+2]
  ],c.jerseyHi);
  segment(ctx,[(p.hb[0]+p.hf[0])/2-1,(p.sb[1]+p.sf[1])/2+3],[(p.hb[0]+p.hf[0])/2,(p.hb[1]+p.hf[1])/2+1],4,2,c.teal,c.tealHi);
  segment(ctx,[p.hb[0]-1,p.hb[1]+1],[p.hf[0]+1,p.hf[1]+1],4,2,c.tealDark,c.tealHi);

  const sbSleeve=pt(p.sb,p.eb,.43),sfSleeve=pt(p.sf,p.ef,.43);
  pixelJoint(ctx,p.sb,8,7,c.jersey,c.jerseyHi);
  taperedLimb(ctx,p.sb,sbSleeve,8.2,7.2,6.2,5.3,c.jerseyShadow,c.jerseyHi);
  taperedLimb(ctx,sbSleeve,p.eb,7.1,6.5,5.2,4.7,c.skinShadow,c.skin);
  pixelJoint(ctx,p.eb,6.2,5.4,c.skin,c.skinHi);
  taperedLimb(ctx,p.eb,p.hbnd,6.8,5.2,5.0,3.8,c.skin,c.skinHi);

  pixelJoint(ctx,p.sf,8.4,7.2,c.jersey,c.jerseyHi);
  taperedLimb(ctx,p.sf,sfSleeve,8.5,7.3,6.4,5.4,c.jersey,c.jerseyHi);
  taperedLimb(ctx,sfSleeve,p.ef,7.3,6.6,5.4,4.8,c.skin,c.skinHi);
  pixelJoint(ctx,p.ef,6.2,5.4,c.skin,c.skinHi);
  taperedLimb(ctx,p.ef,p.hfnd,6.9,5.3,5.1,3.9,c.skin,c.skinHi);
  glove(ctx,p.hbnd);glove(ctx,p.hfnd);

  pixelJoint(ctx,[p.neck[0],p.neck[1]+1],5.5,4.5,c.skin,c.skinHi);

  const hx=Math.round(p.head[0]),hy=Math.round(p.head[1]);
  poly(ctx,[[hx-10,hy-5],[hx-7,hy-8],[hx+5,hy-7],[hx+9,hy-3],[hx+10,hy+3],[hx+6,hy+9],[hx-5,hy+9],[hx-10,hy+4]],c.outline);
  poly(ctx,[[hx-8,hy-4],[hx-5,hy-6],[hx+4,hy-5],[hx+7,hy-2],[hx+7,hy+3],[hx+4,hy+7],[hx-4,hy+7],[hx-8,hy+3]],c.skin);
  rect(ctx,hx-5,hy-2,7,3,c.skinHi);
  rect(ctx,hx+4,hy-1,3,3,c.outline);
  rect(ctx,hx+5,hy+4,4,2,c.skinShadow);
  rect(ctx,hx-7,hy+2,3,3,c.skinShadow);

  poly(ctx,[[hx-11,hy-5],[hx-10,hy-10],[hx-6,hy-14],[hx-1,hy-16],[hx+7,hy-14],[hx+12,hy-10],[hx+13,hy-5],[hx+8,hy-2],[hx-10,hy-2]],c.outline);
  poly(ctx,[[hx-9,hy-5],[hx-8,hy-9],[hx-4,hy-12],[hx,hy-14],[hx+6,hy-12],[hx+10,hy-9],[hx+10,hy-5],[hx+6,hy-3],[hx-8,hy-3]],c.helmet);
  poly(ctx,[[hx-6,hy-8],[hx-2,hy-11],[hx+4,hy-10],[hx+7,hy-8],[hx,hy-7]],c.helmetHi);
  rect(ctx,hx+6,hy-5,8,3,c.outline);
  rect(ctx,hx+7,hy-4,6,1,c.helmetHi);
  rect(ctx,hx-7,hy-2,4,6,c.deep);
  rect(ctx,hx+5,hy,2,2,c.skinHi);
  rect(ctx,hx+6,hy+3,3,2,c.skinShadow);

  const cx=Math.round((p.sb[0]+p.sf[0]+p.hb[0]+p.hf[0])/4)+2,cy=Math.round((p.sb[1]+p.sf[1]+p.hb[1]+p.hf[1])/4);
  rect(ctx,cx-4,cy-6,8,2,c.tealDark);rect(ctx,cx+1,cy-5,2,10,c.tealDark);rect(ctx,cx-4,cy+1,6,2,c.tealDark);
  rect(ctx,Math.min(p.hb[0],p.hf[0])-4,waistY+2,Math.abs(p.hf[0]-p.hb[0])+9,3,c.tealDark);
  rect(ctx,Math.min(p.hb[0],p.hf[0])-2,waistY+2,Math.abs(p.hf[0]-p.hb[0])+5,1,c.tealHi);

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
