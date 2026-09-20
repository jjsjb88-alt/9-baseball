import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {batterHeroPoseFor} from '../src/duel/App.jsx';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');
const asset=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

describe('GM12 batter golden master',()=>{
  it('uses authored idle only outside active pitch motion',()=>{
    expect(batterHeroPoseFor('idle',null,null)).toContain('data:image/svg+xml');
    expect(batterHeroPoseFor('idle','windup',{grade:'solid'})).toBeNull();
  });

  it('lets authored contact own impact and selective slowmo without replacing motion phases',()=>{
    const contact=batterHeroPoseFor('contact','impact',{grade:'dead-center'});
    expect(contact).toContain('data:image/svg+xml');
    expect(batterHeroPoseFor('contact','slowmo',{grade:'solid'})).toBe(contact);
    expect(batterHeroPoseFor('contact','impact',{grade:'extra'})).toBe(contact);
    expect(batterHeroPoseFor('contact','impact',{grade:'jammed'})).toBeNull();
    expect(batterHeroPoseFor('contact','release',{grade:'solid'})).toBeNull();
  });

  it('gives homer and miss distinct authored silhouettes while preserving windup',()=>{
    const homer=batterHeroPoseFor('homer','release',{grade:'homer'});
    const miss=batterHeroPoseFor('miss','slowmo',{grade:'near-miss'});
    expect(homer).toContain('data:image/svg+xml');
    expect(batterHeroPoseFor('homer','settle',{grade:'grand-slam'})).toBe(homer);
    expect(miss).toContain('data:image/svg+xml');
    expect(batterHeroPoseFor('miss','release',{grade:'strikeout'})).toBe(miss);
    expect(homer).not.toBe(miss);
    expect(batterHeroPoseFor('miss','windup',{grade:'strikeout'})).toBeNull();
  });

  it('keeps the V4 60 Hz canvas alive under authored key-pose ownership',()=>{
    expect(app).toContain('<V4CanvasSprite sheet={v4Sheet}');
    expect(app).toContain('className="duel-sprite v6-hero-layer"');
    expect(css).toContain('.golden-master-stage .golden-actor.v6-hero-pose .v4-canvas');
    expect(css).toContain('opacity:.18!important');
    expect(css).not.toContain('.v6-hero-pose .v4-canvas{display:none');
    expect(app).not.toContain('v5-hero-layer');
  });

  it('ships four dense crisp SVG poses rather than palette-swapped copies',()=>{
    const files=[
      'assets/sprites-v6/batter-idle-hero.svg',
      'assets/sprites-v6/batter-contact-hero.svg',
      'assets/sprites-v6/batter-homer-hero.svg',
      'assets/sprites-v6/batter-miss-hero.svg',
    ];
    const svgs=files.map(asset);
    expect(new Set(svgs).size).toBe(4);
    for(const svg of svgs){
      expect(svg).toContain('viewBox="0 0 192 192"');
      expect(svg).toContain('shape-rendering="crispEdges"');
      const colors=new Set([...svg.matchAll(/#[0-9a-fA-F]{6}/g)].map(m=>m[0].toLowerCase()));
      expect(colors.size).toBeGreaterThanOrEqual(12);
      expect((svg.match(/<path/g)||[]).length).toBeGreaterThanOrEqual(30);
      expect(svg).toContain('#071216');
      expect(svg).toContain('#5fb7aa');
      expect(svg).toContain('#f0ce83');
      expect(svg).toContain('#f1c294');
    }
  });

  it('retains portrait, low-height landscape and reduced-motion contracts',()=>{
    expect(css).toContain('@media(max-width:700px)');
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).toContain('width:110%');
    expect(css).toContain('width:108%');
    expect(css).toContain('transform:none!important');
    expect(css).not.toContain('.v6-hero-layer{filter:none!important}');
  });
});
