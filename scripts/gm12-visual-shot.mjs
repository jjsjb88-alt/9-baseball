import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const out=process.argv[2]||'.qa-gm12';
const before=process.env.GM12_BEFORE_URL||'http://127.0.0.1:5198';
const after=process.env.GM12_AFTER_URL||'http://127.0.0.1:5199';
const sizes=[
  ['portrait-390x844',390,844],
  ['landscape-844x390',844,390],
  ['desktop-1440x900',1440,900],
];
const poseQuery={
  idle:'',
  contact:'&qaCase=dead&qaStage=impact',
  homer:'&qaCase=homer&qaStage=release',
  miss:'&qaCase=near&qaStage=slowmo',
};

await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});

async function openLab(url,width,height,pose='idle'){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];
  page.on('console',message=>message.type()==='error'&&errors.push(message.text()));
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(url+'/?cinema=1'+poseQuery[pose],{waitUntil:'networkidle'});
  await page.waitForSelector('.cinema-lab-stage');
  await page.waitForTimeout(120);
  return {page,errors};
}

async function assertAfterPose(page,pose){
  if(pose==='idle'){
    const actor=page.locator('.actor-left .sprite-batter.v7-hero-pose.pose-idle');
    await actor.waitFor({state:'visible',timeout:1500});
    return;
  }
  const actor=page.locator('.actor-left .sprite-batter.v7-hero-pose.pose-'+pose);
  await actor.waitFor({state:'visible',timeout:1500});
  const hero=actor.locator('.v7-hero-layer');
  await hero.waitFor({state:'visible',timeout:1500});
  const [stageClass,actorClass,src]=await Promise.all([
    page.locator('.cinema-lab-stage').getAttribute('class'),
    actor.getAttribute('class'),
    hero.getAttribute('src'),
  ]);
  console.log(`GM12 pose proof · ${pose} · ${stageClass} · ${actorClass} · ${src}`);
}

async function viewportProof(label,url,name,width,height){
  let errors=0;
  for(const pose of ['idle','contact']){
    const opened=await openLab(url,width,height,pose);
    if(label==='after')await assertAfterPose(opened.page,pose);
    await opened.page.screenshot({path:`${out}/${label}-${name}-${pose}.png`,fullPage:false});
    if(opened.errors.length){
      errors+=opened.errors.length;
      console.log(`${label} ${name} ${pose} console errors: ${opened.errors.join(' | ')}`);
    }
    await opened.page.close();
  }
  return errors;
}

async function closeups(label,url){
  let errors=0;
  for(const pose of ['idle','contact','homer','miss']){
    const opened=await openLab(url,1440,900,pose);
    if(label==='after')await assertAfterPose(opened.page,pose);
    await opened.page.locator('.cinema-lab-stage').screenshot({path:`${out}/${label}-close-${pose}.png`});
    if(opened.errors.length){
      errors+=opened.errors.length;
      console.log(`${label} close ${pose} console errors: ${opened.errors.join(' | ')}`);
    }
    await opened.page.close();
  }
  return errors;
}

let errors=0;
for(const [name,width,height] of sizes){
  errors+=await viewportProof('before',before,name,width,height);
  errors+=await viewportProof('after',after,name,width,height);
}
errors+=await closeups('before',before);
errors+=await closeups('after',after);
await browser.close();
console.log(`GM12 visual proof complete · console errors ${errors}`);
process.exit(errors?1:0);
