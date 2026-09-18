import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');
const map=fs.readFileSync(new URL('../src/duel/run-map.js',import.meta.url),'utf8');

describe('golden master 05 actor silhouettes',()=>{
  it('connects V10 archetype identity to the live pitcher actor',()=>{
    expect(map).toContain("{key:'sinker'");
    expect(map).toContain("{key:'high'");
    expect(map).toContain("{key:'closer'");
    expect(app).toContain("const PITCHER_FORM_KEYS=new Set(['outside','sinker','high','closer'])");
    expect(app).toContain("const pitcherForm=isV10?pitcherFormKey(v10Node?.opponent?.archetypeKey):'outside'");
    expect(app).toContain('variant={pitcherForm}');
    expect(app).toContain("pitcher-form-'+pitcherForm");
  });

  it('holds the dedicated home-run hero pose through release and settle',()=>{
    expect(app).toContain("if(stage==='settle')return ['homer','grand-slam'].includes(shot.grade)?'homer'");
    expect(app).toContain("['homer','grand-slam'].includes(shot.grade)&&['release','settle'].includes(stage)");
    expect(css).toContain('.golden-master-stage.grade-homer.fx-stage-release .golden-actor.sprite-batter.pose-homer');
    expect(css).toContain('.golden-master-stage.grade-homer.fx-stage-settle .golden-actor.sprite-batter.pose-homer');
  });

  it('authors low, high and closer silhouettes without relying on palette swaps',()=>{
    expect(css).toContain('.golden-master-stage .golden-actor.sprite-pitcher.variant-sinker');
    expect(css).toContain('scale(1.085,.93)');
    expect(css).toContain('.golden-master-stage .golden-actor.sprite-pitcher.variant-high');
    expect(css).toContain('scale(.94,1.09)');
    expect(css).toContain('.golden-master-stage .golden-actor.sprite-pitcher.variant-closer');
    expect(css).toContain('rotate(-3.4deg)');
  });

  it('moves the release geometry with each pitcher form',()=>{
    expect(css).toContain('.golden-master-stage.pitcher-form-sinker .gm-release-ring');
    expect(css).toContain('.golden-master-stage.pitcher-form-high .gm-release-ring');
    expect(css).toContain('.golden-master-stage.pitcher-form-closer .gm-release-ring');
    expect(css).toContain('.golden-master-stage.pitcher-form-sinker .gm-pitch-tunnel');
    expect(css).toContain('.golden-master-stage.pitcher-form-high .gm-pitch-tunnel');
  });

  it('clamps silhouette changes on portrait, low landscape and reduced motion',()=>{
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('@media (orientation:portrait)');
    expect(css).toContain('@media (prefers-reduced-motion:reduce)');
    expect(css).toContain('.golden-master-stage .golden-actor.sprite-pitcher.variant-closer{transform:translate3d(-5px,0,0)');
  });
});
