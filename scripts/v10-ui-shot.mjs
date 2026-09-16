/* V10 UI 셸 fixture를 세 해상도로 찍는다. 콘솔 오류도 같이 센다.
   playwright는 이 저장소의 의존성이 아니다. 찍을 때만 임시로 넣는다:
     npm install --no-save playwright
     npx vite --port 5199 --strictPort &
     node scripts/v10-ui-shot.mjs .qa-v10 */
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const out=process.argv[2]||'.qa-v10';
const url=process.env.V10_FIXTURE_URL||'http://localhost:5199/v10-fixture.html';
const chrome=process.env.CHROMIUM_PATH||undefined;
const SIZES=[['mobile-390x844',390,844],['mobile-360x740',360,740],['desktop-1280x900',1280,900]];
/* 폰트 CDN이 막힌 환경에서도 찍히게, 우리 코드가 아닌 오류는 세지 않는다. */
const ours=text=>!/ERR_CERT|favicon|net::ERR_/.test(text);

await mkdir(out,{recursive:true});
const browser=await chromium.launch(chrome?{executablePath:chrome}:{});
let failed=0;
for(const [name,width,height] of SIZES){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2});
  const errors=[];
  page.on('console',message=>message.type()==='error'&&ours(message.text())&&errors.push(message.text()));
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.waitForSelector('.v10-map');
  await page.click('[data-testid="v10-node-a1-fork-b"]');
  await page.waitForTimeout(250);
  await page.screenshot({path:`${out}/v10-${name}.png`,fullPage:true});
  await page.close();
  failed+=errors.length;
  console.log(`${name.padEnd(18)} 콘솔 오류 ${errors.length}${errors.length?' · '+errors.join(' | '):''}`);
}
await browser.close();
process.exit(failed?1:0);
