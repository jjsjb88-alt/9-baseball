import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');

describe('GM07 animation fluidity',()=>{
  it('uses RAF instead of timer stepping for sprite playback',()=>{
    expect(app).toContain('requestAnimationFrame(tick)');
    expect(app).toContain('cancelAnimationFrame(raf)');
    expect(app).not.toContain('const timer=setInterval(()=>{i+=1');
  });

  it('caps long stage durations so a few release frames do not crawl',()=>{
    expect(app).toContain("const sequencePlaybackDuration=(stage,duration,count)=>");
    expect(app).toContain("stage==='release'?260");
    expect(app).toContain('sequencePlaybackDuration(stage,stageDuration(stage,shot)');
  });

  it('does not restart the full strikeout sequence during settle',()=>{
    expect(app).toContain("&&stage==='release'");
    expect(app).toContain("&&stage==='settle'");
    expect(app).toContain('start:PITCHER_K_V2.length-1,end:PITCHER_K_V2.length-1');
  });

  it('preloads actor frames before the first result animation',()=>{
    expect(app).toContain('const ACTOR_ASSETS=[');
    expect(app).toContain('function useActorAssetPreload()');
    expect(app).toContain("img.decoding='async'");
    expect(app).toContain('useActorAssetPreload();');
  });

  it('moves authored pitcher art to the intentional slowmo hold instead of abrupt impact swap',()=>{
    expect(app).toContain("PITCHER_RELEASE_V3[variant]&&stage==='slowmo'");
  });

  it('removes stepped actor transforms and softens the authored-frame handoff',()=>{
    expect(css).toContain('.golden-master-stage .golden-actor{transition:transform .095s cubic-bezier');
    expect(css).toContain('@keyframes gmAuthoredFrameIn');
    expect(css).not.toContain('.golden-master-stage.fx-stage-settle .golden-actor{transition:transform .22s steps(4,end)!important}');
  });
});
