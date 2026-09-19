import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const canvas=fs.readFileSync(new URL('../src/duel/V4CanvasSprite.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/duel.css',import.meta.url),'utf8');
const generator=fs.readFileSync(new URL('../scripts/generate-v4-sprites.py',import.meta.url),'utf8');

const pngSize=path=>{
  const b=fs.readFileSync(new URL(path,import.meta.url));
  expect(b.subarray(1,4).toString()).toBe('PNG');
  return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};
};

describe('GM08 hotfix — continuous Canvas V4 pixel playback',()=>{
  it('ships five 10×6 raster sheets at mobile-safe 192px cells',()=>{
    for(const name of ['batter-swing','batter-miss','batter-homer','pitcher-pitch','pitcher-strikeout']){
      expect(pngSize('../assets/sprites-v4/'+name+'-60.png')).toEqual({width:1920,height:1152});
    }
  });

  it('still generates sixty optical-flow in-between raster frames',()=>{
    expect(generator).toContain('TOTAL=60');
    expect(generator).toContain('CELL=192');
    expect(generator).toContain('calcOpticalFlowFarneback');
  });

  it('routes live actors through Canvas and never the SVG puppet',()=>{
    expect(app).toContain("import V4CanvasSprite from './V4CanvasSprite.jsx'");
    expect(app).toContain('<V4CanvasSprite sheet={v4Sheet}');
    expect(app).not.toContain("import SmoothActor from './SmoothActor.jsx'");
    expect(app).not.toContain('<SmoothActor ');
  });

  it('does not rerender React on every animation frame',()=>{
    expect(canvas).toContain("requestAnimationFrame(tick)");
    expect(canvas).toContain("ctx.drawImage");
    expect(canvas).toContain("desynchronized:true");
    expect(canvas).not.toContain('useState(');
    expect(canvas).not.toContain('setIndex(');
  });

  it('uses one continuous pitch timeline independent of presentation stage changes',()=>{
    expect(canvas).toContain('function frameAt(who,shot,elapsed)');
    expect(canvas).toContain("const anchor=who==='pitcher'?(strikeout?20:23):18");
    expect(canvas).toContain('playToken,shot?.grade');
    expect(canvas).not.toContain('stage,');
  });

  it('subframe-blends adjacent authored frames on every display refresh',()=>{
    expect(canvas).toContain('const lo=Math.floor(f),hi=Math.min(59,lo+1),mix=f-lo');
    expect(canvas).toContain('drawCell(ctx,img,lo,1-mix)');
    expect(canvas).toContain('drawCell(ctx,img,hi,mix)');
  });

  it('does not globally preload all five decoded V4 textures',()=>{
    expect(app).toContain('batterSwingV4,pitcherPitchV4');
    expect(app).not.toContain('const V4_SHEETS=');
  });

  it('keeps the Canvas free of legacy stepped actor motion',()=>{
    expect(css).toContain('.sprite-stage.v4-sequence .v4-canvas');
    expect(css).toContain('animation:none!important');
    expect(css).not.toContain('.v4-sheet-frame');
  });
});
