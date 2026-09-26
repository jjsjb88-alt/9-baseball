#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateSpriteGenManifest} from '../../src/duel/spriteGenAtlas.js';

function fail(message){
  console.error(message);
  process.exitCode=1;
}

const manifestPath=process.argv[2];
const state=process.argv[3]||'swing';
const minFrames=Number(process.argv[4]||10);

if(!manifestPath){
  fail('usage: node scripts/sprite-gen/verify-batter-run.mjs <manifest.json> [state=swing] [minFrames=10]');
}else{
  const absolute=path.resolve(manifestPath);
  let manifest=null;
  try{
    manifest=JSON.parse(fs.readFileSync(absolute,'utf8'));
  }catch(error){
    fail(`failed to read manifest: ${error.message}`);
  }

  if(manifest){
    const result=validateSpriteGenManifest(manifest,{
      state,
      cellSize:192,
      minFrames:Number.isFinite(minFrames)&&minFrames>0?minFrames:10,
    });

    const summary={
      manifest:absolute,
      state,
      ok:result.ok,
      frames:result.row?.frameCount||0,
      fps:result.row?.fps||null,
      totalMs:result.row?Math.round(result.row.totalMs):null,
      loop:result.row?.loop??null,
      errors:result.errors,
    };
    console.log(JSON.stringify(summary,null,2));
    if(!result.ok)process.exitCode=1;
  }
}
