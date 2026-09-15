import React,{useEffect,useRef} from 'react';

const PALETTES={
  success:['#fff7c7','#f6d879','#e8a85c','#9fe2a8'],
  danger:['#ffd2c8','#ef8b76','#b9534e','#7e3340'],
  magic:['#d6ffff','#8fe7e5','#5cb2c5','#d7c7ff'],
  gold:['#fff6ae','#ffd05e','#ef9148','#c65c36'],
};
const successGrades=new Set(['dead-center','solid','extra','homer','grand-slam','jammed','lucky']);
const dangerGrades=new Set(['near-miss','near-miss-k','chase','chase-k','fooled','strikeout']);

function hash(text=''){
  let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0;
}
function rng(seed){
  let x=seed||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296};
}
function trajectory(grade){
  if(['homer','grand-slam'].includes(grade))return [304,14];
  if(grade==='extra')return [300,52];
  if(grade==='lucky')return [238,54];
  if(grade==='jammed')return [292,145];
  if(['near-miss','near-miss-k'].includes(grade))return [28,120];
  if(['chase','chase-k'].includes(grade))return [22,158];
  if(['fooled','strikeout'].includes(grade))return [18,132];
  return [296,72];
}
function paletteFor(shot){
  if(shot?.kind==='read')return PALETTES.magic;
  if(shot?.grade==='grand-slam'||shot?.grade==='homer')return PALETTES.gold;
  if(dangerGrades.has(shot?.grade))return PALETTES.danger;
  return successGrades.has(shot?.grade)?PALETTES.success:PALETTES.magic;
}
function square(ctx,x,y,size,color,alpha=1){
  ctx.globalAlpha=Math.max(0,Math.min(1,alpha));ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),size,size);
}
function ray(ctx,x,y,angle,len,color,alpha){
  const dx=Math.cos(angle),dy=Math.sin(angle);ctx.globalAlpha=alpha;ctx.fillStyle=color;
  for(let i=0;i<len;i+=3)ctx.fillRect(Math.round(x+dx*i),Math.round(y+dy*i),2,2);
}
function impactPass(ctx,t,shot,random){
  const colors=paletteFor(shot),cx=126,cy=105,count=shot?.grade==='grand-slam'?58:shot?.grade==='homer'?46:dangerGrades.has(shot?.grade)?30:36;
  const spread=shot?.grade==='grand-slam'?1.35:1;
  for(let i=0;i<count;i++){
    const angle=random()*Math.PI*2,speed=(22+random()*92)*spread,life=.18+random()*.34,p=Math.min(1,t/life);
    if(p>=1)continue;
    const drag=1-p*.38,x=cx+Math.cos(angle)*speed*p*drag,y=cy+Math.sin(angle)*speed*p*drag+(p*p*22);
    square(ctx,x,y,random()>.72?3:2,colors[i%colors.length],(1-p)*.9);
  }
  for(let i=0;i<8;i++)ray(ctx,cx,cy,(Math.PI*2/8)*i+(random()-.5)*.12,26+t*80,colors[i%colors.length],Math.max(0,.7-t*3.4));
  const flash=Math.max(0,1-t*8);square(ctx,cx-5,cy-5,10,'#fffde5',flash);
}
function slowmoPass(ctx,t,shot,random){
  const colors=paletteFor(shot),cx=126,cy=105;
  for(let i=0;i<26;i++){
    const a=random()*Math.PI*2,r=16+random()*88,drift=t*(4+random()*8),x=cx+Math.cos(a)*r+drift,y=cy+Math.sin(a)*r*.55-drift*.3;
    square(ctx,x,y,random()>.85?3:2,colors[i%colors.length],.16+random()*.34);
  }
  if(['near-miss','near-miss-k'].includes(shot?.grade)){
    for(let i=0;i<7;i++)square(ctx,115+i*4,100+i,2,PALETTES.danger[i%4],.5);
    for(let i=0;i<7;i++)square(ctx,137+i*3,109-i,2,'#fff0c2',.38);
  }
}
function releasePass(ctx,t,shot,random){
  const colors=paletteFor(shot),start=[126,105],end=trajectory(shot?.grade),dur=shot?.grade==='grand-slam'?.92:shot?.grade==='homer'?.78:shot?.grade==='lucky'?.82:.58,p=Math.min(1,t/dur);
  const ease=1-Math.pow(1-p,2.2),x=start[0]+(end[0]-start[0])*ease;
  let y=start[1]+(end[1]-start[1])*ease;
  if(shot?.grade==='lucky')y-=Math.sin(Math.PI*p)*54;
  else if(shot?.grade==='jammed')y+=Math.sin(Math.PI*p)*8;
  else if(['homer','grand-slam','extra'].includes(shot?.grade))y-=Math.sin(Math.PI*p)*22;
  for(let i=9;i>=1;i--){
    const q=Math.max(0,p-i*.018),ex=1-Math.pow(1-q,2.2),tx=start[0]+(end[0]-start[0])*ex;
    let ty=start[1]+(end[1]-start[1])*ex;
    if(shot?.grade==='lucky')ty-=Math.sin(Math.PI*q)*54;
    else if(['homer','grand-slam','extra'].includes(shot?.grade))ty-=Math.sin(Math.PI*q)*22;
    square(ctx,tx,ty,i>5?3:2,colors[i%colors.length],(10-i)*.045);
  }
  square(ctx,x,y,4,'#fffce2',.96);square(ctx,x+1,y+1,2,colors[0],.9);
  const extra=shot?.grade==='grand-slam'?22:shot?.grade==='homer'?14:6;
  for(let i=0;i<extra;i++){const bx=x-(8+random()*28),by=y+(random()-.5)*18;square(ctx,bx,by,2,colors[i%colors.length],random()*.55);}
}
function settlePass(ctx,t,shot,random){
  const colors=paletteFor(shot),count=['homer','grand-slam'].includes(shot?.grade)?34:12;
  for(let i=0;i<count;i++){const x=random()*320,y=30+random()*130+Math.min(30,t*18);square(ctx,x,y,random()>.8?3:2,colors[i%colors.length],Math.max(0,.34-t*.35));}
}

export default function PixelVFX({stage,shot,token=0}){
  const ref=useRef(null);
  useEffect(()=>{
    if(!stage||!shot)return;
    const canvas=ref.current;let ctx;
    try{ctx=canvas?.getContext?.('2d',{alpha:true});}catch{return;}
    if(!ctx)return;
    ctx.imageSmoothingEnabled=false;
    let raf=0,start=performance.now(),alive=true;
    const seed=hash(String(token)+'|'+stage+'|'+(shot.grade||shot.kind)),random=rng(seed);
    const duration={windup:.18,impact:.55,slowmo:.8,release:1.05,settle:1}[stage]||.8;
    const loop=now=>{
      if(!alive)return;const t=(now-start)/1000;ctx.clearRect(0,0,320,180);ctx.globalCompositeOperation='source-over';
      if(stage==='impact')impactPass(ctx,t,shot,random);
      else if(stage==='slowmo')slowmoPass(ctx,t,shot,random);
      else if(stage==='release')releasePass(ctx,t,shot,random);
      else if(stage==='settle')settlePass(ctx,t,shot,random);
      ctx.globalAlpha=1;
      if(t<duration)raf=requestAnimationFrame(loop);
    };
    raf=requestAnimationFrame(loop);
    return ()=>{alive=false;cancelAnimationFrame(raf);ctx.clearRect(0,0,320,180)};
  },[stage,shot?.grade,shot?.kind,token]);
  return <canvas ref={ref} className={'pixel-vfx-canvas '+(shot?'vfx-'+(shot.grade||shot.kind):'')} width="320" height="180" aria-hidden="true"/>;
}
