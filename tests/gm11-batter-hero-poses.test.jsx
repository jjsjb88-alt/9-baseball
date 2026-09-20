import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {batterHeroPoseFor} from '../src/duel/App.jsx';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');
const asset=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const expectSvgAsset=(value,file)=>{
  expect(value).toBeTruthy();
  expect(value).toMatch(new RegExp(`(?:data:image/svg\\+xml|${file.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\const asset=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');')})`));
};

describe('GM11 batter hero poses',()=>{
  it('uses authored idle only outside active pitch motion',()=>{
    expectSvgAsset(batterHeroPoseFor('idle',null,null),'batter-idle-hero.svg');
    expect(batterHeroPoseFor('idle','windup',{grade:'solid'})).toBeNull();
  });

  it('cuts to contact art only for decisive contact at impact',()=>{
    const contact=batterHeroPoseFor('contact','impact',{grade:'dead-center'});
    expectSvgAsset(contact,'batter-contact-hero.svg');
    expect(batterHeroPoseFor('contact','impact',{grade:'solid'})).toBe(contact);
    expect(batterHeroPoseFor('contact','impact',{grade:'extra'})).toBe(contact);
    expect(batterHeroPoseFor('contact','impact',{grade:'jammed'})).toBeNull();
    expect(batterHeroPoseFor('contact','release',{grade:'solid'})).toBeNull();
  });

  it('owns homer release/settle and miss slowmo/release without replacing windup',()=>{
    const homer=batterHeroPoseFor('homer','release',{grade:'homer'});
    const miss=batterHeroPoseFor('miss','slowmo',{grade:'near-miss'});
    expectSvgAsset(homer,'batter-homer-hero.svg');
    expect(batterHeroPoseFor('homer','settle',{grade:'grand-slam'})).toBe(homer);
    expectSvgAsset(miss,'batter-miss-hero.svg');
    expect(batterHeroPoseFor('miss','release',{grade:'strikeout'})).toBe(miss);
    expect(homer).not.toBe(miss);
    expect(batterHeroPoseFor('miss','windup',{grade:'strikeout'})).toBeNull();
  });

  it('keeps V4 Canvas alive underneath the authored key pose',()=>{
    expect(app).toContain('<V4CanvasSprite sheet={v4Sheet}');
    expect(app).toContain('className="duel-sprite v5-hero-layer"');
    expect(css).toContain('.golden-master-stage .golden-actor.v5-hero-pose .v4-canvas');
    expect(css).toContain('opacity:.10!important');
    expect(css).not.toContain('.v5-hero-pose .v4-canvas{display:none');
  });

  it('ships four crisp authored SVG silhouettes with multi-value palettes',()=>{
    const files=[
      'assets/sprites-v5/batter-idle-hero.svg',
      'assets/sprites-v5/batter-contact-hero.svg',
      'assets/sprites-v5/batter-homer-hero.svg',
      'assets/sprites-v5/batter-miss-hero.svg',
    ];
    for(const file of files){
      const svg=asset(file);
      expect(svg).toContain('viewBox="0 0 192 192"');
      expect(svg).toContain('shape-rendering="crispEdges"');
      const colors=new Set([...svg.matchAll(/#[0-9a-fA-F]{6}/g)].map(m=>m[0].toLowerCase()));
      expect(colors.size).toBeGreaterThanOrEqual(8);
      expect(svg).toContain('#071216');
      expect(svg).toContain('#5fb7aa');
      expect(svg).toContain('#f0ce83');
    }
  });

  it('keeps mobile, low-height and reduced-motion contracts',()=>{
    expect(css).toContain('@media(max-width:700px)');
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).toContain('filter:none!important');
    expect(css).toContain('transform:none!important');
  });
});
