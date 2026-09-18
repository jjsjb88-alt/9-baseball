import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const stage=fs.readFileSync(new URL('../src/duel/GoldenMasterStage.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');

describe('golden master 03 stadium depth',()=>{
  it('syncs one stadium language to the run act without changing combat state',()=>{
    expect(stage).toContain("const ACT_CLASS=match=>' gm-act-'");
    expect(app).toContain('match={s.stage}');
    expect(app).toContain('match={3}');
    expect(css).toContain('.gm-act-1 .gm-skyline');
    expect(css).toContain('.gm-act-2 .gm-skyline');
    expect(css).toContain('.gm-act-3 .gm-skyline');
  });

  it('adds readable far architecture instead of a flat wallpaper',()=>{
    expect(stage).toContain('gm-skyline');
    expect(stage).toContain('gm-roof-truss');
    expect(stage).toContain('gm-concourse-windows');
    expect(stage).toContain('gm-light-shaft');
    expect(css).toContain('.gm-roof-truss{');
    expect(css).toContain('.gm-concourse-windows{');
    expect(css).toContain('.gm-light-shaft{');
  });

  it('adds a true atmosphere/middle layer that stays input transparent',()=>{
    expect(stage).toContain('gm-bullpen');
    expect(stage).toContain('gm-atmosphere');
    expect(css).toContain('.gm-atmosphere{');
    expect(css).toContain('@keyframes gmAirDrift');
    expect(css).toContain('.gm-depth-back,.gm-depth-mid,.gm-depth-front{position:absolute;inset:0;pointer-events:none');
  });

  it('uses dark near-camera silhouettes to create foreground depth without covering the duel center',()=>{
    expect(stage).toContain('gm-camera-well');
    expect(stage).toContain('gm-grass-fringe');
    expect(css).toContain('.gm-camera-well{');
    expect(css).toContain('.gm-camera-well-left{left:-5%');
    expect(css).toContain('.gm-camera-well-right{right:-5%');
    expect(css).toContain('.gm-grass-fringe{');
  });

  it('lets the stadium react to contact while keeping the actors as the brightest subjects',()=>{
    expect(css).toContain('.golden-master-stage.fx-stage-impact .gm-concourse-windows>i:nth-child(3n)');
    expect(css).toContain('.golden-master-stage.fx-stage-impact .gm-atmosphere{opacity:1');
    expect(css).toContain('.golden-master-stage.fx-stage-impact .gm-depth-front{filter:brightness(.82)');
    expect(css).toContain('.golden-master-stage.fx-stage-impact .gm-depth-mid.gm-power .gm-side-crowd');
  });

  it('protects short-landscape, portrait and reduced-motion playability',()=>{
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('.gm-bullpen{display:none}');
    expect(css).toContain('.gm-atmosphere>i:nth-child(n+9){display:none}');
    expect(css).toContain('@media (orientation:portrait)');
    expect(css).toContain('@media (prefers-reduced-motion:reduce)');
    expect(css).toContain('.gm-atmosphere>i{animation:none!important');
  });
});
