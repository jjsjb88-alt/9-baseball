import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {batterHeroPoseFor} from '../src/duel/App.jsx';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');
const expectPixelAsset=(value,file)=>{
  expect(value).toBeTruthy();
  expect(value.startsWith('data:image/png')||value.includes(file)).toBe(true);
};

describe('GM11/GM12 batter hero pose routing',()=>{
  it('uses authored idle only outside active pitch motion',()=>{
    expectPixelAsset(batterHeroPoseFor('idle',null,null),'batter-idle-hero.png');
    expect(batterHeroPoseFor('idle','windup',{grade:'solid'})).toBeNull();
  });

  it('cuts to contact art only for decisive contact at impact',()=>{
    const contact=batterHeroPoseFor('contact','impact',{grade:'dead-center'});
    expectPixelAsset(contact,'batter-contact-hero.png');
    expect(batterHeroPoseFor('contact','impact',{grade:'solid'})).toBe(contact);
    expect(batterHeroPoseFor('contact','impact',{grade:'extra'})).toBe(contact);
    expect(batterHeroPoseFor('contact','impact',{grade:'jammed'})).toBeNull();
    expect(batterHeroPoseFor('contact','release',{grade:'solid'})).toBeNull();
  });

  it('owns homer release/settle and miss slowmo/release without replacing windup',()=>{
    const homer=batterHeroPoseFor('homer','release',{grade:'homer'});
    const miss=batterHeroPoseFor('miss','slowmo',{grade:'near-miss'});
    expectPixelAsset(homer,'batter-homer-hero.png');
    expect(batterHeroPoseFor('homer','settle',{grade:'grand-slam'})).toBe(homer);
    expectPixelAsset(miss,'batter-miss-hero.png');
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

  it('keeps mobile, low-height and reduced-motion contracts',()=>{
    expect(css).toContain('@media(max-width:700px)');
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).toContain('filter:none!important');
    expect(css).toContain('transform:none!important');
  });
});
