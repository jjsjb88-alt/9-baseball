import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const baseUrl=process.argv[2]||'http://127.0.0.1:5177/';
const outDir=path.resolve(process.argv[3]||'.qa-actor-runtime');
const label=process.argv[4]||'candidate';
const fixture=JSON.parse(await readFile(new URL('../docs/design/v12/fixtures/p0-1-combat.json',import.meta.url),'utf8'));
const SAVE_KEY='9zone-v10-run';
const TOUR_KEY='9zone-zones-tour-v5';
const viewports=[
  {name:'portrait',width:390,height:844},
  {name:'landscape',width:844,height:390},
  {name:'desktop',width:1440,height:900},
];

const quantile=(xs,q)=>{
  const s=[...xs].sort((a,b)=>a-b);
  if(!s.length)return 0;
  return s[Math.min(s.length-1,Math.floor((s.length-1)*q))];
};
const round=n=>Math.round(n*100)/100;

await mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];

for(const viewport of viewports){
  const context=await browser.newContext({
    viewport:{width:viewport.width,height:viewport.height},
    deviceScaleFactor:1,
    reducedMotion:'no-preference',
  });
  await context.addInitScript(({fixture,saveKey,tourKey})=>{
    localStorage.setItem(saveKey,JSON.stringify(fixture));
    localStorage.setItem(tourKey,'done');
  },{fixture,saveKey:SAVE_KEY,tourKey:TOUR_KEY});
  const page=await context.newPage();
  const errors=[];
  page.on('console',m=>m.type()==='error'&&errors.push(m.text()));
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(baseUrl,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'MAIN RUN 이어하기'}).click();
  await page.waitForSelector('.duel-combat');
  await page.getByRole('button',{name:'스윙하기',exact:true}).click();
  await page.getByRole('button',{name:'BASIC SWING',exact:true}).click();

  await page.evaluate(()=>{
    const perf={times:[],longTasks:[],layoutReads:0};
    window.__actorPerf=perf;
    if('PerformanceObserver' in window){
      try{
        const observer=new PerformanceObserver(list=>{
          for(const e of list.getEntries())perf.longTasks.push({start:e.startTime,duration:e.duration});
        });
        observer.observe({entryTypes:['longtask']});
        perf.observer=observer;
      }catch{}
    }
    const tick=now=>{
      if(!window.__actorPerf?.active)return;
      perf.times.push(now);
      requestAnimationFrame(tick);
    };
    perf.active=true;
    requestAnimationFrame(tick);
  });

  await page.getByTestId('execute-action').click();
  await page.waitForTimeout(900);
  await page.screenshot({path:path.join(outDir,label+'-'+viewport.name+'-swing.png'),fullPage:false});
  await page.waitForTimeout(1500);

  const raw=await page.evaluate(()=>{
    const perf=window.__actorPerf;
    if(!perf)return null;
    perf.active=false;
    perf.observer?.disconnect?.();
    const pitcher=document.querySelector('.red-rush-frame.duel-sprite');
    const batter=document.querySelector('.batter-reboot-v3');
    return {
      times:perf.times,
      longTasks:perf.longTasks,
      pitcherFrame:pitcher?.dataset?.frame??null,
      pitcherTag:pitcher?.tagName??null,
      batterPose:batter?.dataset?.batterPose??null,
      errors:[],
    };
  });
  const deltas=[];
  for(let i=1;i<(raw?.times?.length||0);i++){
    const d=raw.times[i]-raw.times[i-1];
    if(d>0&&d<250)deltas.push(d);
  }
  const mean=deltas.length?deltas.reduce((a,b)=>a+b,0)/deltas.length:0;
  results.push({
    ...viewport,label,errors,
    sampleCount:deltas.length,
    meanFrameMs:round(mean),
    medianFrameMs:round(quantile(deltas,.5)),
    p95FrameMs:round(quantile(deltas,.95)),
    maxFrameMs:round(Math.max(0,...deltas)),
    over20ms:deltas.filter(x=>x>20).length,
    over25ms:deltas.filter(x=>x>25).length,
    over33ms:deltas.filter(x=>x>33).length,
    approxFps:mean?round(1000/mean):0,
    longTaskCount:raw?.longTasks?.length||0,
    longTaskMs:round((raw?.longTasks||[]).reduce((a,x)=>a+x.duration,0)),
    pitcherFrame:raw?.pitcherFrame,
    pitcherTag:raw?.pitcherTag,
    batterPose:raw?.batterPose,
  });
  await context.close();
}

await browser.close();
await writeFile(path.join(outDir,label+'.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
if(results.some(x=>x.errors.length))process.exitCode=1;
