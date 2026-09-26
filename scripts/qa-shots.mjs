#!/usr/bin/env node
/* QA screenshots for the ballpark screens (docs/ANTIGRAVITY-LOOP.md §3 ⑥, used by the ag-qa agent).

   Usage:  npx vite --port 5199 &          (or any running dev/preview server)
           node scripts/qa-shots.mjs --url http://localhost:5199 --out work/qa

   For each viewport (phone portrait 412×743, phone landscape 844×390, PC 1440×900) it loads a
   fixed save from the engine and captures: map, battle (deciding), battle (result), reward.
   It checks what broke before: horizontal scroll, the page growing taller than the screen, and the
   pitcher being covered by the HUD. Writes PNGs + report.json; exits 1 when a check fails.
   Playwright is not a project dependency: it uses a local or global install (PLAYWRIGHT_MODULE to
   override) and CHROMIUM_PATH if set. */
import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createV10Duel,enterV10Node,setAimZone,playV10Action} from '../src/duel/engine.js';

const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d;};
const URL_=arg('url','http://localhost:5199'),OUT=arg('out','work/qa');
const VIEWPORTS=[[412,743,'phone-portrait'],[844,390,'phone-landscape'],[1440,900,'pc']];
fs.mkdirSync(OUT,{recursive:true});

async function loadPlaywright(){
  const tries=[process.env.PLAYWRIGHT_MODULE,'playwright'];
  try{tries.push(pathToFileURL(path.join(execSync('npm root -g').toString().trim(),'playwright/index.mjs')).href);}catch{}
  for(const t of tries.filter(Boolean)){try{return await import(t);}catch{}}
  console.error('Playwright not found. Install it globally (npm i -g playwright) or set PLAYWRIGHT_MODULE.');process.exit(2);
}

/* saves: fixed seed, first Act 1 fight */
function battleSave(){let s=createV10Duel(1);s=enterV10Node(s,'a1-entry');s.battle.pending={zone:4,roll:.5,powerRoll:.9};return s;}
function rewardSave(){let s=createV10Duel(0);s=enterV10Node(s,'a1-entry');s={...s,pitcher:{...s.pitcher,hp:1,phase:'critical'}};s=setAimZone(s,s.battle.aimZone);return playV10Action(s,{type:'card',id:'basic'});}
const SAVES={map:createV10Duel(1),battle:battleSave(),reward:rewardSave()};

const overlap=(a,b)=>{if(!a||!b)return 0;const w=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)),h=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));return a.w*a.h?w*h/(a.w*a.h):0;};

const {chromium}=await loadPlaywright();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[];let failed=0;
const check=(name,ok,detail)=>{report.push({name,ok,detail});if(!ok){failed++;console.log('FAIL',name,detail||'');}};

for(const [w,h,label] of VIEWPORTS){
  const open=async key=>{
    const p=await browser.newPage({viewport:{width:w,height:h}});
    const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.goto(URL_+'/?qa=1');
    await p.evaluate(s=>{localStorage.clear();localStorage.setItem('9zone-v10-run',s);localStorage.setItem('9zone-hint-chase','done');},JSON.stringify(SAVES[key]));
    await p.reload();await p.getByRole('button',{name:'MAIN RUN 이어하기',exact:true}).click();await p.waitForTimeout(1500);
    return {p,errors};
  };
  const measure=p=>p.evaluate(()=>{
    const q=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return r.width&&r.height?{x:r.x,y:r.y,w:r.width,h:r.height}:null;};
    return {hscroll:document.documentElement.scrollWidth>innerWidth+1,vover:document.documentElement.scrollHeight-innerHeight,
      pitcher:q('.bp-pitcher'),hud:['.bp-ptag','.bp-verdict','.bp-voice','.bp-count'].map(q)};
  });
  const shot=async(p,name)=>{const f=path.join(OUT,`${label}-${name}.png`);await p.screenshot({path:f});return f;};
  const common=(tag,m,errors)=>{
    check(`${label} ${tag}: no horizontal scroll`,!m.hscroll);
    check(`${label} ${tag}: no console errors`,!errors.length,errors.join(' | '));
  };

  {const {p,errors}=await open('map');const m=await measure(p);await shot(p,'map');common('map',m,errors);await p.close();}
  {const {p,errors}=await open('battle');let m=await measure(p);await shot(p,'battle-decide');common('battle',m,errors);
    check(`${label} battle: fits the screen`,m.vover<=1,`overflow ${m.vover}px`);
    await p.locator('.bp-card.basic').first().click();await p.locator('.bp-cell').nth(4).click();await p.getByTestId('bp-swing').click();
    await p.waitForTimeout(3500);m=await measure(p);await shot(p,'battle-result');
    const cover=Math.max(...m.hud.map(b=>overlap(m.pitcher,b)));
    check(`${label} battle: pitcher not covered by HUD`,cover<.35,`covered ${(cover*100|0)}%`);
    await p.close();}
  {const {p,errors}=await open('reward');const m=await measure(p);await shot(p,'reward');common('reward',m,errors);
    const face=await p.evaluate(()=>{const i=document.querySelector('.bp-sport img'),h=document.querySelector('.bp-shead');if(!i||!h)return null;const a=i.getBoundingClientRect(),b=h.getBoundingClientRect();return a.top>=b.top-2;});
    if(face!==null)check(`${label} reward: portrait top inside its stage`,face);
    await p.close();}
}
await browser.close();
fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({url:URL_,failed,checks:report},null,1));
console.log(`${report.length-failed}/${report.length} checks passed · shots in ${OUT}`);
process.exit(failed?1:0);
