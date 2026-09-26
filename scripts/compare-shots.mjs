#!/usr/bin/env node
/* Blind before/after comparison against the commercial reference (docs/art/QUALITY-BAR.md).

   1) sheets:  node scripts/compare-shots.mjs --before work/qa-before --after work/qa-after
      For every screenshot that exists in both folders (qa-shots.mjs names), writes
      work/compare/<name>.png = [ REFERENCE | A | B ] with A/B in random order, and hides the mapping in
      work/compare/.key.json. The judge scores A and B per axis WITHOUT opening the key, into
      work/compare/judgement.json (template written for you).
   2) reveal:  node scripts/compare-shots.mjs --reveal
      Maps A/B back to before/after, prints per-axis averages and the verdict
      (IMPROVED / NOT_IMPROVED, BAR_MET or not), appends one line to docs/art/QUALITY-LOG.md.
      Exit 0 only when IMPROVED. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {decodePNG,encodePNG} from './lib/png.mjs';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const arg=k=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:null;};
const OUT=path.join(ROOT,'work/compare'),KEY=path.join(OUT,'.key.json'),JUDGE=path.join(OUT,'judgement.json');
export const AXES=['R1 화풍 통일','R2 UI 그림화','R3 빛·환경 통합','R4 캐릭터 존재감','R5 구도','R6 글자 가독','R7 정보 위계','R8 마감'];
export const BAR={avg:4.3,min:4},IMPROVE={avgGain:.25,maxDrop:1};

/* box-filter resize to height h */
function resize(img,h){
  const s=img.height/h,w=Math.max(1,Math.round(img.width/s)),out=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const x0=Math.floor(x*s),x1=Math.max(x0+1,Math.floor((x+1)*s)),y0=Math.floor(y*s),y1=Math.max(y0+1,Math.floor((y+1)*s));
    const acc=[0,0,0,0];let n=0;
    for(let yy=y0;yy<y1&&yy<img.height;yy++)for(let xx=x0;xx<x1&&xx<img.width;xx++){const o=(yy*img.width+xx)*4;for(let c=0;c<4;c++)acc[c]+=img.data[o+c];n++;}
    out.set(acc.map(v=>Math.round(v/Math.max(1,n))),(y*w+x)*4);
  }
  return {width:w,height:h,data:out};
}
function row(panels,gap=24){
  const H=panels[0].height,W=panels.reduce((s,p)=>s+p.width,0)+gap*(panels.length+1),out=new Uint8Array(W*(H+gap*2)*4);
  for(let i=0;i<W*(H+gap*2);i++)out.set([12,14,22,255],i*4);
  let x0=gap;for(const p of panels){for(let y=0;y<p.height;y++)out.set(p.data.subarray(y*p.width*4,(y+1)*p.width*4),((y+gap)*W+x0)*4);x0+=p.width+gap;}
  return {width:W,height:H+gap*2,data:out};
}

export function verdict(scores){
  /* scores: {axis:{before:[..],after:[..]}} averaged over sheets */
  const per=AXES.map(a=>{const b=scores[a]?.before||[],f=scores[a]?.after||[],avg=v=>v.length?v.reduce((s,x)=>s+x,0)/v.length:0;return {axis:a,before:avg(b),after:avg(f)};});
  const mean=k=>per.reduce((s,p)=>s+p[k],0)/per.length;
  const gain=mean('after')-mean('before'),worstDrop=Math.max(0,...per.map(p=>p.before-p.after)),wins=per.filter(p=>p.after>p.before).length;
  const improved=gain>=IMPROVE.avgGain&&worstDrop<=IMPROVE.maxDrop&&wins*2>=per.length;
  const barMet=mean('after')>=BAR.avg&&Math.min(...per.map(p=>p.after))>=BAR.min;
  return {per,before:mean('before'),after:mean('after'),gain,worstDrop,wins,improved,barMet,weakest:[...per].sort((a,b)=>a.after-b.after)[0].axis};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
  fs.mkdirSync(OUT,{recursive:true});
  if(process.argv.includes('--reveal')){
    const key=JSON.parse(fs.readFileSync(KEY,'utf8')),judged=JSON.parse(fs.readFileSync(JUDGE,'utf8'));
    const scores={};
    for(const [sheet,axes] of Object.entries(judged.sheets||{})){
      const map=key[sheet];if(!map)continue;
      for(const [axis,v] of Object.entries(axes)){
        if(typeof v?.A!=='number'||typeof v?.B!=='number')continue;
        scores[axis]??={before:[],after:[]};
        scores[axis][map.A].push(v.A);scores[axis][map.B].push(v.B);
      }
    }
    const v=verdict(scores);
    for(const p of v.per)console.log(`${p.axis.padEnd(12)} before ${p.before.toFixed(2)}  after ${p.after.toFixed(2)}`);
    console.log(`평균 ${v.before.toFixed(2)} → ${v.after.toFixed(2)} (${v.gain>=0?'+':''}${v.gain.toFixed(2)}) · 최대 하락 ${v.worstDrop.toFixed(2)} · 개선 축 ${v.wins}/${v.per.length}`);
    console.log(v.improved?'IMPROVED':'NOT_IMPROVED',v.barMet?'· BAR_MET':`· 기준 미달 (가장 약한 축: ${v.weakest})`);
    const log=path.join(ROOT,'docs/art/QUALITY-LOG.md');
    const line=`| ${new Date().toISOString().slice(0,10)} | ${judged.change||'-'} | ${judged.judge||'-'} | ${v.before.toFixed(2)} → ${v.after.toFixed(2)} | ${v.improved?'IMPROVED':'NOT_IMPROVED'} | ${v.barMet?'BAR_MET':v.weakest} |\n`;
    fs.appendFileSync(log,line);
    process.exit(v.improved?0:1);
  }
  const before=arg('before'),after=arg('after');
  if(!before||!after){console.error('usage: --before <qa dir> --after <qa dir>  |  --reveal');process.exit(2);}
  const ref=decodePNG(fs.readFileSync(path.join(ROOT,'docs/art/benchmark/ref-01-commercial.png')));
  const key={},template={change:'<무엇을 바꿨나>',judge:'<판정 에이전트>',note:'A/B는 무작위. .key.json 열지 말 것. 각 축 1~5 (기준 이미지=5)',sheets:{}};
  for(const f of fs.readdirSync(before).filter(f=>f.endsWith('.png')&&fs.existsSync(path.join(after,f)))){
    const b=decodePNG(fs.readFileSync(path.join(before,f))),a=decodePNG(fs.readFileSync(path.join(after,f)));
    const H=Math.min(720,Math.max(b.height,a.height)),flip=crypto.randomInt(2)===1;
    const [A,B]=flip?[a,b]:[b,a];
    fs.writeFileSync(path.join(OUT,f),encodePNG(row([resize(ref,H),resize(A,H),resize(B,H)])));
    key[f]={A:flip?'after':'before',B:flip?'before':'after'};
    template.sheets[f]=Object.fromEntries(AXES.map(x=>[x,{A:null,B:null}]));
  }
  fs.writeFileSync(KEY,JSON.stringify(key));
  fs.writeFileSync(JUDGE,JSON.stringify(template,null,1));   // new random order → old scores are void
  console.log(`${Object.keys(key).length} sheets → work/compare/*.png  (왼쪽=기준, 가운데=A, 오른쪽=B)`);
  console.log('판정: work/compare/judgement.json 채운 뒤 --reveal');
}
