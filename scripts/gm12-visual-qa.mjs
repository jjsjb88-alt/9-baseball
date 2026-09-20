import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const out=process.argv[2]||'qa-gm12';
const base=process.env.GM12_QA_URL||'http://127.0.0.1:5199/gm12-visual-fixture.html';
const cases=[
  ['before-390x844',390,844,'?before=1','live'],
  ['after-390x844',390,844,'','live'],
  ['before-844x390',844,390,'?before=1','live'],
  ['after-844x390',844,390,'','live'],
  ['before-1440x900',1440,900,'?before=1','live'],
  ['after-1440x900',1440,900,'','live'],
  ['pose-sheet-390x844',390,844,'?sheet=1','pose'],
  ['rig-sheet-844x900',844,900,'?rig=1','rig'],
  ['continuity-sheet-844x900',844,900,'?compare=1','compare'],
];
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
let failures=0;

for(const [name,width,height,query,mode] of cases){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];
  page.on('console',message=>message.type()==='error'&&errors.push('console: '+message.text()));
  page.on('pageerror',error=>errors.push('pageerror: '+String(error)));
  try{
    await page.goto(base+query,{waitUntil:'networkidle'});
    if(mode==='pose'){
      await page.waitForSelector('.qa-pose-card img',{state:'visible',timeout:5000});
      await page.waitForFunction(()=>[...document.images].every(img=>img.complete&&img.naturalWidth>0),null,{timeout:5000});
    }else if(mode==='rig'){
      await page.waitForSelector('.qa-rig-sheet .qa-pose-card canvas',{state:'visible',timeout:5000});
      await page.waitForFunction(()=>{
        const canvases=[...document.querySelectorAll('.qa-rig-sheet canvas')];
        return canvases.length===8&&canvases.every(canvas=>{
          const ctx=canvas.getContext('2d');
          const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
          for(let i=3;i<pixels.length;i+=4)if(pixels[i])return true;
          return false;
        });
      },null,{timeout:5000});
    }else if(mode==='compare'){
      await page.waitForSelector('.qa-continuity-sheet .qa-pose-card',{state:'visible',timeout:5000});
      await page.waitForFunction(()=>{
        const cards=[...document.querySelectorAll('.qa-continuity-sheet .qa-pose-card')];
        const canvases=[...document.querySelectorAll('.qa-continuity-sheet canvas')];
        return cards.length===8&&[...document.images].every(img=>img.complete&&img.naturalWidth>0)&&canvases.length===4&&canvases.every(canvas=>{
          const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
          for(let i=3;i<pixels.length;i+=4)if(pixels[i])return true;
          return false;
        });
      },null,{timeout:5000});
    }else{
      const resume=page.getByRole('button',{name:'이어하기',exact:true});
      if(await resume.count())await resume.click();
      await page.waitForSelector('.golden-master-stage .sprite-batter',{state:'visible',timeout:7000});
      await page.waitForTimeout(700);
    }
    await page.screenshot({path:`${out}/${name}.png`,fullPage:mode!=='live'});

    const state=await page.evaluate(mode=>({
      text:document.body.innerText.slice(0,180),
      stage:!!document.querySelector('.golden-master-stage'),
      batter:!!document.querySelector('.golden-master-stage .sprite-batter'),
      hero:!!document.querySelector('.golden-master-stage .sprite-batter img.duel-sprite'),
      declutter:!!document.querySelector('.duel-combat.landscape-declutter'),
      images:[...document.querySelectorAll('.golden-master-stage .sprite-batter img')].map(img=>({src:img.currentSrc||img.src,w:img.naturalWidth,h:img.naturalHeight,complete:img.complete})),
      rigFrames:[...document.querySelectorAll('.qa-rig-sheet .qa-pose-card')].map(card=>({
        action:card.dataset.action,
        frame:Number(card.dataset.frame),
        label:card.textContent?.trim(),
      })),
      continuityMetrics:(()=>{
        const cards=[...document.querySelectorAll('.qa-continuity-sheet .qa-pose-card')];
        const alphaStats=source=>{
          const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
          const ctx=canvas.getContext('2d',{willReadFrequently:true});
          if(source instanceof HTMLImageElement)ctx.drawImage(source,0,0,96,96);
          else ctx.drawImage(source,0,0);
          const data=ctx.getImageData(0,0,96,96).data;
          let count=0,minX=96,minY=96,maxX=-1,maxY=-1;
          for(let y=0;y<96;y++)for(let x=0;x<96;x++){
            if(data[(y*96+x)*4+3]>200){
              count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
            }
          }
          return {count,w:maxX>=minX?maxX-minX+1:0,h:maxY>=minY?maxY-minY+1:0};
        };
        const out=[];
        for(let i=0;i+1<cards.length;i+=2){
          const hero=cards[i].querySelector('img'),rig=cards[i+1].querySelector('canvas');
          if(!hero||!rig)continue;
          out.push({hero:alphaStats(hero),rig:alphaStats(rig),label:cards[i].textContent?.trim()});
        }
        return out;
      })(),
      viewport:{w:innerWidth,h:innerHeight},
      body:{scrollWidth:document.body.scrollWidth,scrollHeight:document.body.scrollHeight},
      arena:document.querySelector('.duel-arena')?.getBoundingClientRect?.().toJSON?.()||null,
      zone:document.querySelector('.zone-panel')?.getBoundingClientRect?.().toJSON?.()||null,
      table:document.querySelector('.duel-table')?.getBoundingClientRect?.().toJSON?.()||null,
    }),mode);
    console.log(JSON.stringify({name,mode,state,errors}));

    if(mode==='live'){
      const isBefore=query.includes('before=1');
      const correctAsset=state.images.some(img=>img.complete&&img.w>0&&img.h>0&&(isBefore?img.src.startsWith('data:image/svg+xml'):img.src.includes('sprites-v6/batter-idle-hero.png')));
      const noHorizontalOverflow=state.body.scrollWidth<=state.viewport.w+1;
      const landscapeLayout=height<width?state.declutter&&state.arena&&state.arena.height>=height*.52:true;
      if(!state.stage||!state.batter||!state.hero||!correctAsset||!noHorizontalOverflow||!landscapeLayout)failures++;
    }else if(mode==='rig'){
      const expected=[['swing',0],['swing',6],['swing',11],['swing',15],['swing',18],['swing',34],['homer',59],['miss',59]];
      if(state.rigFrames.length!==8||expected.some(([action,frame],i)=>state.rigFrames[i]?.action!==action||state.rigFrames[i]?.frame!==frame))failures++;
    }else if(mode==='compare'){
      if(state.body.scrollWidth>state.viewport.w+1)failures++;
      if(state.continuityMetrics.length!==4)failures++;
      for(const pair of state.continuityMetrics){
        const area=pair.hero.count?pair.rig.count/pair.hero.count:0;
        const width=pair.hero.w?pair.rig.w/pair.hero.w:0;
        const height=pair.hero.h?pair.rig.h/pair.hero.h:0;
        if(area<.62||area>1.48||width<.76||width>1.26||height<.76||height>1.26)failures++;
      }
    }
    if(errors.length)failures++;
  }catch(error){
    failures++;
    console.error(JSON.stringify({name,error:String(error),errors}));
    await page.screenshot({path:`${out}/${name}-FAILED.png`,fullPage:true}).catch(()=>{});
  }finally{
    await page.close();
  }
}
await browser.close();
process.exit(failures?1:0);
