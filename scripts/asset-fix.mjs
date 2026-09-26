#!/usr/bin/env node
/* Clean a generated UI image into game assets (docs/art/gemini/assets.json, docs/ANTIGRAVITY-LOOP.md §10).

   node scripts/asset-fix.mjs A1                 # reads assets/ui-kit/raw/A1*.png
   node scripts/asset-fix.mjs A1 --in some.png   # any PNG

   Writes assets/ui-kit/<name>-<state>.png (native pixels ×scale, palette only, real alpha),
   work/asset-fix/<ID>-report.json and a preview sheet work/asset-fix/<ID>-preview.png.
   Exit 1 when the image fails a check (wrong cell count, off palette, cropped, 9-slice centre not flat). */
import fs from 'node:fs';
import path from 'node:path';
import {decodePNG,encodePNG} from './lib/png.mjs';
import {fixAsset,upscale} from './lib/asset-fix.mjs';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const id=(process.argv[2]||'').toUpperCase(),arg=k=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:null;};
const specs=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/art/gemini/assets.json'),'utf8'));
const spec=specs.assets[id];
if(!spec){console.error('usage: node scripts/asset-fix.mjs <A1..A11> [--in file.png]');process.exit(2);}

let input=arg('in');
if(!input){
  const dir=path.join(ROOT,'assets/ui-kit/raw');
  const hit=fs.existsSync(dir)&&fs.readdirSync(dir).filter(f=>f.toUpperCase().startsWith(id+'-')||f.toUpperCase()===id+'.PNG').sort().pop();
  if(!hit){console.error(`no raw image: put ${id}-*.png into assets/ui-kit/raw/`);process.exit(2);}
  input=path.join(dir,hit);
}
const raw=decodePNG(fs.readFileSync(input));
const res=fixAsset(raw,spec,specs.palette);

const outDir=path.join(ROOT,'assets/ui-kit'),workDir=path.join(ROOT,'work/asset-fix');
fs.mkdirSync(outDir,{recursive:true});fs.mkdirSync(workDir,{recursive:true});
const files=[];
if(res.ok||process.argv.includes('--force')){
  for(const o of res.outputs){const f=path.join(outDir,`${spec.name}-${o.state}.png`);fs.writeFileSync(f,encodePNG(upscale(o.native,specs.scale)));files.push(path.relative(ROOT,f));}
}
/* preview: every state on the night panel colour, side by side, ×scale */
const k=specs.scale,gap=4,W=res.outputs.reduce((s,o)=>s+o.native.width+gap,gap),H=Math.max(1,...res.outputs.map(o=>o.native.height))+gap*2;
const sheet={width:W,height:H,data:new Uint8Array(W*H*4)};
for(let i=0;i<W*H;i++){sheet.data.set([20,26,51,255],i*4);}
let x0=gap;for(const o of res.outputs){const {width:w,height:h,data}=o.native;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const s=(y*w+x)*4;if(data[s+3]<128)continue;sheet.data.set(data.subarray(s,s+4),((y+gap)*W+x0+x)*4);}x0+=w+gap;}
fs.writeFileSync(path.join(workDir,`${id}-preview.png`),encodePNG(upscale(sheet,k)));
const report={id,input:path.relative(ROOT,input),ok:res.ok,problems:res.problems,files,
  cells:res.outputs.map(o=>({state:o.state,aspectErr:+o.aspect.toFixed(3),offPalette:+o.offPalette.toFixed(1),centreFlat:o.centreFlat==null?null:+o.centreFlat.toFixed(3),slice:o.inset}))};
fs.writeFileSync(path.join(workDir,`${id}-report.json`),JSON.stringify(report,null,1));
console.log(res.ok?`OK ${id}: ${files.length} files → assets/ui-kit/`:`REJECT ${id}:\n - `+res.problems.join('\n - '));
console.log(`preview: work/asset-fix/${id}-preview.png`);
process.exit(res.ok?0:1);
