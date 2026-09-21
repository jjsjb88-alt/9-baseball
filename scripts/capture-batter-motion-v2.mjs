import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:4173/';
const out=process.env.QA_OUT||'qa/batter-motion-loop-v2';
const viewports=[
  {name:'390x844',width:390,height:844},
  {name:'844x390',width:844,height:390},
  {name:'1440x900',width:1440,height:900},
];
const required=['ready','load','trigger','swing-start','contact','follow-through-early','finish','settle'];
const capturePoses=['ready','swing-start','contact','finish'];

await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={base,generatedAt:new Date().toISOString(),required,cases:[]};

const uniqueInOrder=list=>list.filter((value,index)=>index===0||value!==list[index-1]);

for(const viewport of viewports){
  const dynamic=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
  const errors=[];
  dynamic.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
  dynamic.on('pageerror',error=>errors.push(String(error)));
  await dynamic.goto(base+'?cinema=1',{waitUntil:'networkidle'});
  const stage=dynamic.locator('.cinema-lab-stage');
  await stage.waitFor({state:'visible',timeout:15000});
  await dynamic.locator('.batter-reboot-v2.reboot-pose-ready .batter-reboot-art').waitFor({state:'visible',timeout:10000});
  await dynamic.evaluate(()=>{
    const root=document.querySelector('.batter-reboot-v2');
    window.__batterPoseTrace=[root?.dataset?.batterPose||'ready'];
    const observer=new MutationObserver(()=>{
      const pose=root?.dataset?.batterPose;
      if(pose&&window.__batterPoseTrace.at(-1)!==pose)window.__batterPoseTrace.push(pose);
    });
    if(root)observer.observe(root,{attributes:true,attributeFilter:['class','data-batter-pose']});
    window.__batterPoseObserver=observer;
  });
  await dynamic.locator('.cinema-selected button.primary').click();
  await dynamic.waitForFunction(()=>window.__batterPoseTrace?.includes('settle'),null,{timeout:8000,polling:'raf'});
  await dynamic.waitForTimeout(80);
  const trace=uniqueInOrder(await dynamic.evaluate(()=>window.__batterPoseTrace||[]));
  const traceCore=trace.filter(p=>p!=='ready'||trace.indexOf(p)===0).slice(0,8);
  const dynamicMetrics=await dynamic.evaluate(()=>{
    const root=document.querySelector('.batter-reboot-v2');
    const img=document.querySelector('.batter-reboot-art');
    return {
      pose:root?.dataset?.batterPose||'',
      naturalWidth:img?.naturalWidth||0,
      naturalHeight:img?.naturalHeight||0,
      standinCount:document.querySelectorAll('.batter-standin,.batter-presence').length,
      rendererStatus:document.querySelector('.renderer-status')?.textContent?.trim()||'',
    };
  });
  await dynamic.close();

  const captures={};
  for(const pose of capturePoses){
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
    const pageErrors=[];
    page.on('console',msg=>{if(msg.type()==='error')pageErrors.push(msg.text())});
    page.on('pageerror',error=>pageErrors.push(String(error)));
    await page.goto(base+'?cinema=1&batterPose='+encodeURIComponent(pose),{waitUntil:'networkidle'});
    const qaStage=page.locator('.cinema-lab-stage');
    await qaStage.waitFor({state:'visible',timeout:15000});
    await page.locator('.batter-reboot-v2.reboot-pose-'+pose+' .batter-reboot-art').waitFor({state:'visible',timeout:10000});
    await qaStage.scrollIntoViewIfNeeded();
    await page.waitForTimeout(120);
    const metrics=await page.evaluate(()=>{
      const rect=selector=>{const el=document.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
      const img=document.querySelector('.batter-reboot-art');
      return {
        stage:rect('.cinema-lab-stage'),
        batter:rect('.cinema-lab-stage .actor-left'),
        pitcher:rect('.cinema-lab-stage .actor-right'),
        art:rect('.batter-reboot-art'),
        pose:document.querySelector('.batter-reboot-v2')?.dataset?.batterPose||'',
        naturalWidth:img?.naturalWidth||0,
        naturalHeight:img?.naturalHeight||0,
      };
    });
    await page.screenshot({path:`${out}/${viewport.name}-${pose}.png`,fullPage:false});
    await qaStage.screenshot({path:`${out}/${viewport.name}-arena-${pose}.png`});
    captures[pose]={metrics,pageErrors};
    await page.close();
  }

  const failures=[];
  const firstEight=trace.filter((pose,index)=>index===0||pose!==trace[index-1]).slice(0,8);
  if(JSON.stringify(firstEight)!==JSON.stringify(required))failures.push('dynamic pose order mismatch: '+firstEight.join(' > '));
  if(dynamicMetrics.naturalWidth!==192||dynamicMetrics.naturalHeight!==192)failures.push('runtime asset is not 192x192');
  if(dynamicMetrics.standinCount!==0)failures.push('legacy stand-in is rendered');
  for(const pose of capturePoses){
    if(captures[pose].metrics.pose!==pose)failures.push('static QA pose mismatch for '+pose);
    if(captures[pose].metrics.naturalWidth!==192||captures[pose].metrics.naturalHeight!==192)failures.push(pose+' asset is not 192x192');
    if(captures[pose].pageErrors.length)failures.push(pose+' page errors: '+captures[pose].pageErrors.join(' | '));
  }
  if(errors.length)failures.push('dynamic page errors: '+errors.join(' | '));

  report.cases.push({...viewport,trace,dynamicMetrics,captures,failures});
}

await browser.close();
await fs.writeFile(`${out}/qa-report.json`,JSON.stringify(report,null,2));
const failures=report.cases.flatMap(item=>item.failures.map(message=>item.name+': '+message));
if(failures.length){
  console.error(failures.join('\n'));
  process.exitCode=1;
}
console.log(JSON.stringify(report,null,2));
