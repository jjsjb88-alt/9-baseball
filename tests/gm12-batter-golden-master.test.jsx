import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {batterHeroPoseFor} from '../src/duel/App.jsx';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');
const keyPose=fs.readFileSync(new URL('../src/duel/V7KeyPose.jsx',import.meta.url),'utf8');

describe('GM12 batter golden master · V7 raster key poses',()=>{
  it('uses the original high-density idle frame only outside active pitch motion',()=>{
    const idle=batterHeroPoseFor('idle',null,null);
    expect(idle).toMatchObject({frame:0});
    expect(idle.sheet).toBeTruthy();
    expect(batterHeroPoseFor('idle','windup',{grade:'solid'})).toBeNull();
  });

  it('hands contact ownership to the clean extension frame without replacing motion phases',()=>{
    const contact=batterHeroPoseFor('contact','impact',{grade:'dead-center'});
    expect(contact).toMatchObject({frame:12});
    expect(batterHeroPoseFor('contact','slowmo',{grade:'solid'})).toBe(contact);
    expect(batterHeroPoseFor('contact','impact',{grade:'extra'})).toBe(contact);
    expect(batterHeroPoseFor('contact','impact',{grade:'jammed'})).toBeNull();
    expect(batterHeroPoseFor('contact','release',{grade:'solid'})).toBeNull();
  });

  it('uses distinct clean silhouettes for power finish and off-balance miss',()=>{
    const homer=batterHeroPoseFor('homer','release',{grade:'homer'});
    const miss=batterHeroPoseFor('miss','slowmo',{grade:'near-miss'});
    expect(homer).toMatchObject({frame:42});
    expect(miss).toMatchObject({frame:18});
    expect(batterHeroPoseFor('homer','settle',{grade:'grand-slam'})).toBe(homer);
    expect(batterHeroPoseFor('miss','release',{grade:'strikeout'})).toBe(miss);
    expect(homer.frame).not.toBe(miss.frame);
    expect(batterHeroPoseFor('miss','windup',{grade:'strikeout'})).toBeNull();
  });

  it('keeps the real 60 Hz V4 canvas alive beneath V7 key-pose ownership',()=>{
    expect(app).toContain('<V4CanvasSprite sheet={v4Sheet}');
    expect(app).toContain('<V7KeyPose hero={hero}/>');
    expect(css).toContain('.golden-master-stage .golden-actor.v7-hero-pose .v4-canvas');
    expect(css).toContain('opacity:.18!important');
    expect(css).not.toContain('.v7-hero-pose .v4-canvas{display:none');
    expect(app).not.toContain('v6-hero');
  });

  it('draws V7 directly from the 10x6 192px raster sheets with smoothing disabled',()=>{
    expect(keyPose).toContain("ctx.imageSmoothingEnabled=false");
    expect(keyPose).toContain("img.naturalWidth/10");
    expect(keyPose).toContain("img.naturalHeight/6");
    expect(keyPose).toContain('width="192" height="192"');
    expect(keyPose).toContain('className="duel-sprite v7-hero-layer"');
    expect(app).toContain("idle:{sheet:batterSwingV4,frame:0}");
    expect(app).toContain("contact:{sheet:batterSwingV4,frame:12}");
    expect(app).toContain("homer:{sheet:batterHomerV4,frame:42}");
    expect(app).toContain("miss:{sheet:batterMissV4,frame:18}");
  });

  it('retains portrait, low-height landscape and reduced-motion contracts',()=>{
    expect(css).toContain('@media(max-width:700px)');
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).toContain('width:110%');
    expect(css).toContain('width:108%');
    expect(css).toContain('transform:none!important');
    expect(css).not.toContain('.v7-hero-layer{filter:none!important}');
  });
});
