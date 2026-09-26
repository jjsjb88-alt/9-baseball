import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const out = process.env.CAPTURE_DIR || 'artifacts/gemini-ui-capture';
const base = process.env.CAPTURE_BASE_URL || 'http://127.0.0.1:4173/9-baseball/';
await fs.mkdir(out,{recursive:true});

const browser = await chromium.launch({headless:true});
const context = await browser.newContext({
  viewport:{width:390,height:844},
  deviceScaleFactor:1,
  isMobile:true,
  hasTouch:true,
  colorScheme:'dark',
});
const page = await context.newPage();
page.on('pageerror',e=>console.error('PAGEERROR',e.message));
page.on('console',m=>{ if(m.type()==='error')console.error('CONSOLE',m.text()); });

async function shot(name){
  const file=path.join(out,name+'.png');
  await page.screenshot({path:file,fullPage:false});
  console.log('CAPTURED',file);
}
async function settle(ms=220){await page.waitForTimeout(ms);}

await page.goto(base,{waitUntil:'networkidle'});
await page.evaluate(()=>localStorage.clear());
await page.reload({waitUntil:'networkidle'});
await settle(400);
await shot('01-title-390x844');

await page.getByRole('button',{name:'MAIN RUN 시작 · 투수 HP'}).click();
await page.locator('.bp-map').waitFor({state:'visible'});
await settle(350);
await shot('02-map-390x844');

await page.getByTestId('bp-map-go').click();
await page.locator('.bp-battle').waitFor({state:'visible'});
await settle(700);
await shot('03-battle-idle-390x844');

const swingCards=page.locator('.bp-hand .bp-card:not(.basic)');
const count=await swingCards.count();
if(count<2)throw new Error('Need at least two swing cards for STACK capture');
let first=-1,second=-1;
for(let i=0;i<count;i++){
  const k=await swingCards.nth(i).getAttribute('data-card-kind');
  if(k!=='bunt'){ if(first<0)first=i; else if(second<0){second=i;break;} }
}
if(first<0||second<0){first=0;second=1;}

const cells=page.locator('.bp-cell');
await swingCards.nth(first).click();
await cells.nth(4).click();
await settle(220);
await shot('04-main-card-selected-390x844');

await swingCards.nth(second).click();
await cells.nth(2).click();
await settle(260);
await shot('05-stack-390x844');

await page.setViewportSize({width:844,height:390});
await settle(350);
await shot('06-stack-844x390');
await page.setViewportSize({width:390,height:844});
await settle(350);

await page.getByTestId('bp-swing').click();
await page.getByTestId('bp-commit').waitFor({state:'visible'});
await settle(90);
await shot('07-commit-390x844');

await settle(900);
await shot('08-auto-resolve-390x844');

await page.getByTestId('bp-debrief').waitFor({state:'visible',timeout:15000});
await settle(220);
await shot('09-debrief-390x844');

const manifest = {
  source:'9-baseball main',
  commit:'82eefcbf1168fa0e9da32b6d2ffb4a80c6c14eee',
  viewportPrimary:'390x844',
  captures:[
    ['01-title-390x844.png','타이틀 / 메인 런 진입'],
    ['02-map-390x844.png','런 경로 선택'],
    ['03-battle-idle-390x844.png','전투 기본 상태'],
    ['04-main-card-selected-390x844.png','메인 카드 + 노림 존 선택'],
    ['05-stack-390x844.png','메인 + 지원 카드 STACK'],
    ['06-stack-844x390.png','STACK 가로모드'],
    ['07-commit-390x844.png','BATTING PLAN LOCKED'],
    ['08-auto-resolve-390x844.png','PixiJS 자동 실행 구간'],
    ['09-debrief-390x844.png','PLAN → ACTUAL → NEXT 복기'],
  ],
};
await fs.writeFile(path.join(out,'MANIFEST.json'),JSON.stringify(manifest,null,2));
await fs.writeFile(path.join(out,'README.md'),
  '# 9-baseball UI screenshots for Gemini\n\n'+
  'Generated from main commit '+manifest.commit+'.\n\n'+
  manifest.captures.map(([f,d])=>'- **'+f+'** — '+d).join('\n')+'\n'
);
await browser.close();
