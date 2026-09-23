import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.resolve(ROOT,process.argv[2]||'v12-d1-preview');
const base=process.env.V12_D1_PREVIEW_URL||'http://127.0.0.1:5177/docs/design/v12/d1-preview.html';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
for(const v of ['d','e','f']){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
  page.on('pageerror',err=>errors.push(String(err)));
  await page.goto(base+'?v='+v,{waitUntil:'networkidle'});
  await page.waitForTimeout(450);
  const file=path.join(out,`d1-${v}-390x844.png`);
  await page.screenshot({path:file,fullPage:false});
  results.push({variant:v,file:path.basename(file),errors});
  await context.close();
}
await browser.close();
console.log(JSON.stringify({results},null,2));
if(results.some(x=>x.errors.length))process.exitCode=1;
