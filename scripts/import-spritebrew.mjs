/* Copies SpriteBrew "Raw Frames" (an unzipped folder of PNGs) into
   public/sprites/{character}/{animation}/frame_00.png … in natural file-name order.
   No dependencies; unzip the ZIP first.

     node scripts/import-spritebrew.mjs <unzipped-folder> <character> <animation>
     e.g. node scripts/import-spritebrew.mjs ~/Downloads/batter-swing batter swing

   Then set `frames` for that animation in src/duel/spritebrew-frames.js to the printed count
   and run `pnpm test` (tests/spritebrew-frames.test.jsx checks every counted file exists). */
import fs from 'node:fs';
import path from 'node:path';
import {SPRITEBREW_ANIMS} from '../src/duel/spritebrew-frames.js';

const [src,character,animation]=process.argv.slice(2);
if(!src||!character||!animation){
  console.error('usage: node scripts/import-spritebrew.mjs <unzipped-folder> <character> <animation>');
  process.exit(1);
}
if(!SPRITEBREW_ANIMS[character]?.[animation]){
  console.error(`unknown ${character}/${animation}; planned: ${Object.entries(SPRITEBREW_ANIMS).map(([c,a])=>Object.keys(a).map(n=>c+'/'+n).join(', ')).join(', ')}`);
  process.exit(1);
}
const files=fs.readdirSync(src).filter(f=>/\.png$/i.test(f)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
if(!files.length){console.error(`no PNG in ${src}`);process.exit(1);}
if(files.length>100){console.error(`${files.length} frames: frame_NN allows at most 100`);process.exit(1);}

const out=path.join('public','sprites',character,animation);
fs.mkdirSync(out,{recursive:true});
for(const f of fs.readdirSync(out))if(/^frame_\d+\.png$/.test(f))fs.unlinkSync(path.join(out,f));
files.forEach((f,i)=>fs.copyFileSync(path.join(src,f),path.join(out,`frame_${String(i).padStart(2,'0')}.png`)));
console.log(`${files.length} frames → ${out}`);
console.log(`next: SPRITEBREW_ANIMS.${character}.${animation}.frames = ${files.length} in src/duel/spritebrew-frames.js`);
