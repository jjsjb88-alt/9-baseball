import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/duel.css',import.meta.url),'utf8');
const generator=fs.readFileSync(new URL('../scripts/generate-v4-sprites.py',import.meta.url),'utf8');

const pngSize=path=>{
  const b=fs.readFileSync(new URL(path,import.meta.url));
  expect(b.subarray(1,4).toString()).toBe('PNG');
  return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};
};

describe('GM08 hotfix — real V4 60-frame pixel sprites',()=>{
  it('ships five real 10×6 raster sheets, exactly 60 cells each',()=>{
    for(const name of ['batter-swing','batter-miss','batter-homer','pitcher-pitch','pitcher-strikeout']){
      expect(pngSize('../assets/sprites-v4/'+name+'-60.png')).toEqual({width:2560,height:1536});
    }
  });

  it('generates sixty in-between raster frames from authored pixel poses',()=>{
    expect(generator).toContain('TOTAL=60');
    expect(generator).toContain('calcOpticalFlowFarneback');
    expect(generator).toContain("save_sheet('batter-swing'");
    expect(generator).toContain("save_sheet('pitcher-pitch'");
  });

  it('routes live golden actors through V4 sheets, not the SVG puppet',()=>{
    expect(app).toContain("import batterSwingV4 from '../../assets/sprites-v4/batter-swing-60.png'");
    expect(app).toContain("import pitcherPitchV4 from '../../assets/sprites-v4/pitcher-pitch-60.png'");
    expect(app).toContain('function v4SpriteSpec');
    expect(app).toContain('function V4Frame');
    expect(app).toContain("v4?' v4-sequence':''");
    expect(app).not.toContain("import SmoothActor from './SmoothActor.jsx'");
    expect(app).not.toContain('<SmoothActor ');
  });

  it('covers the whole cinematic timeline with non-overlapping 60-frame ranges',()=>{
    expect(app).toContain("const V4_STAGE_RANGES={windup:[0,17],impact:[18,23],slowmo:[24,31],release:[32,52],settle:[53,59]}");
    expect(app).toContain("const V4_K_RANGES={release:[0,39],settle:[40,59]}");
  });

  it('uses one decoded sprite sheet and changes only its cell',()=>{
    expect(css).toContain('background-size:1000% 600%');
    expect(css).toContain('will-change:background-position');
    expect(css).toContain('.sprite-stage.v4-sequence');
    expect(css).toContain('animation:none!important');
  });
});
