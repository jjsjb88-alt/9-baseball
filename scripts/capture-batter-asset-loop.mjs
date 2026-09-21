import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:4173/';
const out=process.env.QA_OUT||'qa/batter-asset-loop-v1';
const cases=[
  {name:'mobile-portrait',width:390,height:844},
  {name:'mobile-landscape',width:844,height:390},
  {name:'desktop',width:1440,height:900},
];

await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={base,generatedAt:new Date().toISOString(),cases:[]};

function intersects(a,b){
  if(!a||!b)return false;
  return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
    Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))>0;
}

for(const v of cases){
  const page=await browser.newPage({viewport:{width:v.width,height:v.height},deviceScaleFactor:1});
  const consoleErrors=[];
  page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text())});
  page.on('pageerror',err=>consoleErrors.push(String(err)));

  await page.goto(base+'?cinema=1',{waitUntil:'networkidle'});
  const stage=page.locator('.cinema-lab-stage');
  await stage.waitFor({state:'visible',timeout:15000});
  await page.locator('.batter-reboot-v1.reboot-pose-idle .batter-reboot-art').waitFor({state:'visible',timeout:10000});
  await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);

  const readMetrics=()=>page.evaluate(()=>{
    const rect=sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    const img=document.querySelector('.batter-reboot-art');
    return {
      stage:rect('.cinema-lab-stage'),
      batter:rect('.cinema-lab-stage .actor-left'),
      pitcher:rect('.cinema-lab-stage .actor-right'),
      art:rect('.batter-reboot-art'),
      naturalWidth:img?.naturalWidth||0,
      naturalHeight:img?.naturalHeight||0,
      standinCount:document.querySelectorAll('.batter-standin,.batter-presence').length,
      pose:document.querySelector('.batter-reboot-v1')?.className||'',
      webglStatus:document.querySelector('.renderer-status')?.textContent?.trim()||'',
    };
  });

  const idle=await readMetrics();
  await page.screenshot({path:`${out}/${v.name}-idle.png`,fullPage:false});
  await stage.screenshot({path:`${out}/${v.name}-arena-idle.png`});

  await page.locator('.cinema-selected button.primary').click();
  await page.locator('.batter-reboot-v1.reboot-pose-trigger').waitFor({state:'visible',timeout:5000});
  await stage.scrollIntoViewIfNeeded();
  const trigger=await readMetrics();

  await page.locator('.batter-reboot-v1.reboot-pose-contact').waitFor({state:'visible',timeout:5000});
  const contact=await readMetrics();
  await page.screenshot({path:`${out}/${v.name}-contact.png`,fullPage:false});
  await stage.screenshot({path:`${out}/${v.name}-arena-contact.png`});

  await page.locator('.batter-reboot-v1.reboot-pose-finish').waitFor({state:'visible',timeout:5000});
  const finish=await readMetrics();
  await page.screenshot({path:`${out}/${v.name}-finish.png`,fullPage:false});

  const failures=[];
  if(idle.naturalWidth!==192||idle.naturalHeight!==192)failures.push('runtime anchor is not 192x192');
  if(idle.standinCount!==0)failures.push('legacy stand-in is still rendered');
  if(intersects(idle.batter,idle.pitcher))failures.push('batter and pitcher actor boxes overlap');
  if(!contact.pose.includes('reboot-pose-contact'))failures.push('contact pose did not render');
  if(!finish.pose.includes('reboot-pose-finish'))failures.push('finish pose did not render');

  report.cases.push({...v,idle,trigger,contact,finish,consoleErrors,failures});
  await page.close();
}

await browser.close();
await fs.writeFile(`${out}/qa-report.json`,JSON.stringify(report,null,2));
const failures=report.cases.flatMap(x=>x.failures.map(f=>x.name+': '+f));
if(failures.length){
  console.error(failures.join('\n'));
  process.exitCode=1;
}
console.log(JSON.stringify(report,null,2));
