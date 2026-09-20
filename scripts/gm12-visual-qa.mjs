import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const out=process.argv[2]||'qa-gm12';
const base=process.env.GM12_QA_URL||'http://127.0.0.1:5199/gm12-visual-fixture.html';
const cases=[
  ['before-390x844',390,844,'?before=1',false],
  ['after-390x844',390,844,'',false],
  ['before-844x390',844,390,'?before=1',false],
  ['after-844x390',844,390,'',false],
  ['before-1440x900',1440,900,'?before=1',false],
  ['after-1440x900',1440,900,'',false],
  ['pose-sheet-390x844',390,844,'?sheet=1',true],
];
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
let failures=0;

for(const [name,width,height,query,sheet] of cases){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];
  page.on('console',message=>message.type()==='error'&&errors.push('console: '+message.text()));
  page.on('pageerror',error=>errors.push('pageerror: '+String(error)));
  try{
    await page.goto(base+query,{waitUntil:'networkidle'});
    if(sheet){
      await page.waitForSelector('.qa-pose-card img',{state:'visible',timeout:5000});
      await page.waitForFunction(()=>[...document.images].every(img=>img.complete&&img.naturalWidth>0),null,{timeout:5000});
    }else{
      const resume=page.getByRole('button',{name:'이어하기',exact:true});
      if(await resume.count())await resume.click();
      await page.waitForSelector('.golden-master-stage .sprite-batter',{state:'visible',timeout:7000});
      await page.waitForTimeout(600);
    }
    await page.screenshot({path:`${out}/${name}.png`});
    const state=await page.evaluate(()=>({
      text:document.body.innerText.slice(0,180),
      stage:!!document.querySelector('.golden-master-stage'),
      batter:!!document.querySelector('.golden-master-stage .sprite-batter'),
      hero:!!document.querySelector('.golden-master-stage .sprite-batter img.duel-sprite'),
      images:[...document.querySelectorAll('.golden-master-stage .sprite-batter img')].map(img=>({src:img.currentSrc||img.src,w:img.naturalWidth,h:img.naturalHeight,complete:img.complete})),
    }));
    console.log(JSON.stringify({name,state,errors}));
    if(!sheet){
      const expected=query.includes('before=1')?'gm12-old-idle.svg':'sprites-v6/batter-idle-hero.png';
      const correctAsset=state.images.some(img=>img.complete&&img.w>0&&img.h>0&&img.src.includes(expected));
      if(!state.stage||!state.batter||!state.hero||!correctAsset)failures++;
    }
    if(errors.length)failures++;
  }catch(error){
    failures++;
    console.error(JSON.stringify({name,error:String(error),errors}));
    await page.screenshot({path:`${out}/${name}-FAILED.png`}).catch(()=>{});
  }finally{
    await page.close();
  }
}
await browser.close();
process.exit(failures?1:0);
