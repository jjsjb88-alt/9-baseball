import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createV10Duel,enterV10Node} from '../src/duel/engine.js';
import {validateV10State,V10_SAVE_KEY} from '../src/duel/v10-storage.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const META_PATH=path.join(ROOT,'docs/design/v12/baseline.json');
const TOUR_KEY='9zone-zones-tour-v5';

export async function readBaselineMeta(){
  return JSON.parse(await readFile(META_PATH,'utf8'));
}

export function buildBaselineState(meta){
  const state=enterV10Node(createV10Duel(meta.seed),meta.entryNodeId);
  if(!validateV10State(state))throw new Error('generated V12 baseline is not a valid V10 save');
  if(state.phase!=='battle')throw new Error('V12 baseline must open in battle phase');
  if(state.v10?.nodeId!==meta.entryNodeId)throw new Error('V12 baseline entered the wrong node');
  return state;
}

export async function writeFixture(){
  const meta=await readBaselineMeta();
  if(meta.saveKey!==V10_SAVE_KEY)throw new Error('baseline save key drifted from V10_SAVE_KEY');
  const state=buildBaselineState(meta);
  const file=path.join(ROOT,meta.fixture);
  await mkdir(path.dirname(file),{recursive:true});
  await writeFile(file,JSON.stringify(state,null,2)+'\n');
  return {meta,state,file};
}

export async function checkFixture(){
  const meta=await readBaselineMeta();
  if(meta.saveKey!==V10_SAVE_KEY)throw new Error('baseline save key drifted from V10_SAVE_KEY');
  const expected=buildBaselineState(meta);
  const actual=JSON.parse(await readFile(path.join(ROOT,meta.fixture),'utf8'));
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('committed V12 fixture no longer matches engine output');
  return {meta,state:actual};
}

async function capture(outDir){
  const {meta,state}=await checkFixture();
  const {chromium}=await import('playwright');
  const baseUrl=process.env.V12_BASELINE_URL||'http://127.0.0.1:5177/';
  const browser=await chromium.launch({headless:true});
  const manifest={baselineSha:meta.baselineSha,seed:meta.seed,url:baseUrl,captures:[]};
  let failed=0;
  await mkdir(outDir,{recursive:true});

  for(const viewport of meta.viewports){
    const context=await browser.newContext({
      viewport:{width:viewport.width,height:viewport.height},
      deviceScaleFactor:1,
      reducedMotion:'reduce',
    });
    await context.addInitScript(({saveKey,fixture,tourKey})=>{
      localStorage.setItem(saveKey,JSON.stringify(fixture));
      localStorage.setItem(tourKey,'done');
    },{saveKey:meta.saveKey,fixture:state,tourKey:TOUR_KEY});
    const page=await context.newPage();
    const errors=[];
    page.on('console',message=>message.type()==='error'&&errors.push(message.text()));
    page.on('pageerror',error=>errors.push(String(error)));
    await page.goto(baseUrl,{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'MAIN RUN 이어하기'}).click();
    await page.waitForSelector('.duel-combat');
    await page.waitForTimeout(300);
    const metrics=await page.evaluate(()=>({
      width:window.innerWidth,
      height:window.innerHeight,
      scrollWidth:document.documentElement.scrollWidth,
      scrollHeight:document.documentElement.scrollHeight,
      phase:document.querySelector('.duel-combat')?.className||'',
      hp:document.querySelector('.v10-combat-hp')?.textContent?.trim()||'',
    }));
    const filename=`p0-1-${viewport.name}.png`;
    await page.screenshot({path:path.join(outDir,filename),fullPage:true});
    manifest.captures.push({...viewport,filename,errors,metrics});
    failed+=errors.length;
    await context.close();
  }
  await browser.close();
  await writeFile(path.join(outDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  if(failed)throw new Error(`V12 baseline capture saw ${failed} console/page errors`);
  return manifest;
}

async function main(){
  const args=process.argv.slice(2);
  if(args.includes('--write')){
    const {file}=await writeFixture();
    console.log(`wrote ${path.relative(ROOT,file)}`);
    return;
  }
  if(args.includes('--check')){
    const {meta}=await checkFixture();
    console.log(`V12 baseline fixture matches engine · seed ${meta.seed} · ${meta.baselineSha}`);
    return;
  }
  const at=args.indexOf('--capture');
  if(at>=0){
    const out=path.resolve(ROOT,args[at+1]||'.qa-v12-p0-1');
    const result=await capture(out);
    console.log(JSON.stringify(result,null,2));
    return;
  }
  console.error('usage: node scripts/v12-baseline.mjs --write | --check | --capture <out>');
  process.exitCode=2;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  await main();
}
