import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const POSES=['idle','contact','homer','miss'];
const fileFor=pose=>`assets/sprites-v5/batter-${pose}-hero.svg`;

describe('GM12 Batter Golden Master redraw',()=>{
  it('marks every hero pose as the GM12 authored batter set',()=>{
    for(const pose of POSES){
      const svg=read(fileFor(pose));
      expect(svg).toContain('viewBox="0 0 192 192"');
      expect(svg).toContain('shape-rendering="crispEdges"');
      expect(svg).toContain('data-art="gm12-batter"');
      expect(svg).toContain(`data-pose="${pose}"`);
      expect(svg).toContain(`id="batter-${pose}"`);
    }
  });

  it('replaces the old block pass with dense, layered pixel construction',()=>{
    for(const pose of POSES){
      const svg=read(fileFor(pose));
      const primitives=[...svg.matchAll(/<(?:path|rect|polygon|polyline)\b/g)].length;
      const colors=new Set([...svg.matchAll(/#[0-9a-fA-F]{6}/g)].map(match=>match[0].toLowerCase()));
      expect(Buffer.byteLength(svg,'utf8')).toBeGreaterThan(3800);
      expect(primitives).toBeGreaterThanOrEqual(50);
      expect(colors.size).toBeGreaterThanOrEqual(14);
      expect(svg).not.toContain('stroke-width="5"');
      expect(svg).toContain('#071216');
      expect(svg).toContain('#e9e1c9');
      expect(svg).toContain('#c9c3ad');
      expect(svg).toContain('#918c7d');
      expect(svg).toContain('#d39a70');
      expect(svg).toContain('#a86f50');
      expect(svg).toContain('#f1c294');
      expect(svg).toContain('#5fb7aa');
      expect(svg).toContain('#347a73');
    }
  });

  it('keeps anatomy readable instead of hiding the pose in one body blob',()=>{
    for(const pose of POSES){
      const svg=read(fileFor(pose));
      expect(svg).toMatch(/bat/i);
      expect(svg).toMatch(/leg/i);
      expect(svg).toMatch(/hips/i);
      expect(svg).toMatch(/torso/i);
      expect(svg).toMatch(/arm/i);
      expect(svg).toMatch(/hand|glove/i);
      expect(svg).toMatch(/head|helmet/i);
      expect(svg).toMatch(/face/i);
    }
  });

  it('authors four meaningfully different swing silhouettes',()=>{
    const idle=read(fileFor('idle'));
    const contact=read(fileFor('contact'));
    const homer=read(fileFor('homer'));
    const miss=read(fileFor('miss'));

    expect(idle).toContain('rear bat');
    expect(contact).toContain('bat at contact');
    expect(contact).toContain('braced front leg');
    expect(homer).toContain('follow-through bat');
    expect(homer).toContain('front leg owns weight');
    expect(miss).toContain('bat late and trailing');
    expect(miss).toContain('hips over-rotated');

    const normalized=POSES.map(pose=>read(fileFor(pose)).replace(/data-pose="[^"]+"/,''));
    expect(new Set(normalized).size).toBe(4);
  });

  it('does not touch the protected V4 60Hz actor pipeline',()=>{
    const app=read('src/duel/App.jsx');
    const canvas=read('src/duel/V4CanvasSprite.jsx');
    expect(app).toContain('<V4CanvasSprite sheet={v4Sheet}');
    expect(app).toContain('className="duel-sprite v5-hero-layer"');
    expect(canvas).toContain('requestAnimationFrame');
    expect(canvas).toContain('drawImage');
  });
});
