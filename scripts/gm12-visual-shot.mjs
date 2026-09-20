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
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});

async function openLab(url,width,height){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];
  page.on('console',message=>message.type()==='error'&&errors.push(message.text()));
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(url+'/?cinema=1',{waitUntil:'networkidle'});
  await page.waitForSelector('.cinema-lab-stage');
  await page.waitForTimeout(200);
  return {page,errors};
}
async function select(page,name,delay){
  const button=page.locator('.cinema-case-grid button').filter({hasText:name}).first();
  await button.click();
  await page.waitForTimeout(delay);
}
async function viewportProof(label,url,name,width,height){
  const {page,errors}=await openLab(url,width,height);
  await page.screenshot({path:`${out}/${label}-${name}-idle.png`,fullPage:false});
  await select(page,'정확 적중',325);
  await page.screenshot({path:`${out}/${label}-${name}-contact.png`,fullPage:false});
  if(errors.length)console.log(`${label} ${name} console errors: ${errors.join(' | ')}`);
  await page.close();
  return errors.length;
}
async function closeups(label,url){
  const {page,errors}=await openLab(url,1440,900);
  const stage=page.locator('.cinema-lab-stage');
  await stage.screenshot({path:`${out}/${label}-close-idle.png`});
  await select(page,'정확 적중',325);
  await stage.screenshot({path:`${out}/${label}-close-contact.png`});
  await page.waitForTimeout(900);
  await select(page,'홈런',560);
  await stage.screenshot({path:`${out}/${label}-close-homer.png`});
  await page.waitForTimeout(1300);
  await select(page,'한 칸 차이',420);
  await stage.screenshot({path:`${out}/${label}-close-miss.png`});
  if(errors.length)console.log(`${label} closeups console errors: ${errors.join(' | ')}`);
  await page.close();
  return errors.length;
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
