import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root));
const POSES=['idle','contact','homer','miss'];
const fileFor=pose=>`assets/sprites-v6/batter-${pose}-hero.png`;
const PNG_SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);

describe('GM12 Batter Golden Master V6 pixel masters',()=>{
  it('ships four true 96x96 logical-pixel PNG masters',()=>{
    for(const pose of POSES){
      const png=read(fileFor(pose));
      expect(png.subarray(0,8).equals(PNG_SIGNATURE)).toBe(true);
      expect(png.readUInt32BE(16)).toBe(96);
      expect(png.readUInt32BE(20)).toBe(96);
      expect(png.length).toBeGreaterThan(1900);
      expect(png.length).toBeLessThan(2600);
    }
  });

  it('keeps every pose authored independently instead of recycling one silhouette',()=>{
    const assets=POSES.map(pose=>read(fileFor(pose)).toString('base64'));
    expect(new Set(assets).size).toBe(4);
  });

  it('wires the promoted V6 masters into the hero-pose router',()=>{
    const app=read('src/duel/App.jsx').toString('utf8');
    for(const pose of POSES)expect(app).toContain(`../../assets/sprites-v6/batter-${pose}-hero.png`);
    expect(app).toContain('const BATTER_HERO_V6=');
    expect(app).toContain('...Object.values(BATTER_HERO_V6)');
    expect(app).not.toContain('const BATTER_HERO_V5=');
  });

  it('renders the raster masters without smoothing',()=>{
    const css=read('src/duel/golden-master.css').toString('utf8');
    expect(css).toContain('.golden-master-stage .golden-actor .v5-hero-layer');
    expect(css).toContain('image-rendering:pixelated!important');
    expect(css).toContain('image-rendering:crisp-edges!important');
  });

  it('does not touch the protected V4 60Hz actor pipeline',()=>{
    const app=read('src/duel/App.jsx').toString('utf8');
    const canvas=read('src/duel/V4CanvasSprite.jsx').toString('utf8');
    expect(app).toContain('<V4CanvasSprite sheet={v4Sheet}');
    expect(app).toContain('className="duel-sprite v5-hero-layer"');
    expect(canvas).toContain('requestAnimationFrame');
    expect(canvas).toContain('drawImage');
  });
});
