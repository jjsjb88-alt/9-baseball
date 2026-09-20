import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {batterPoseAt} from '../src/duel/V4CanvasSprite.jsx';

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

  it('keeps every decisive pose authored independently instead of recycling one silhouette',()=>{
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

  it('authors the full batter motion as readable key poses, not just four overlay stills',()=>{
    const swingFrames=[0,6,11,15,18,34,59].map(frame=>batterPoseAt('swing',frame));
    expect(new Set(swingFrames.map(pose=>JSON.stringify(pose))).size).toBeGreaterThanOrEqual(6);

    const idle=swingFrames[0];
    const contact=batterPoseAt('swing',18);
    const follow=batterPoseAt('swing',59);
    const homer=batterPoseAt('homer',59);
    const miss=batterPoseAt('miss',59);

    expect(contact.tip[0]).toBeGreaterThan(idle.tip[0]);
    expect(contact.ff[0]).toBeGreaterThan(idle.ff[0]);
    expect(follow.tip[0]).toBeLessThan(contact.tip[0]);
    expect(homer.tip[1]).toBeLessThan(contact.tip[1]);
    expect(miss.tip[1]).toBeGreaterThan(contact.tip[1]);
    expect(JSON.stringify(homer)).not.toBe(JSON.stringify(miss));
  });

  it('keeps the protected V4 60Hz RAF timeline while replacing the moving batter art',()=>{
    const app=read('src/duel/App.jsx').toString('utf8');
    const canvas=read('src/duel/V4CanvasSprite.jsx').toString('utf8');
    expect(app).toContain('<V4CanvasSprite sheet={v4Sheet}');
    expect(app).toContain('className="duel-sprite v5-hero-layer"');
    expect(canvas).toContain('requestAnimationFrame');
    expect(canvas).toContain('frameAt(who,shot,elapsed)');
    expect(canvas).toContain("if(who==='batter')return startGoldenBatter");
    expect(canvas).toContain("buffer.width=96;buffer.height=96");
    expect(canvas).toContain('ctx.imageSmoothingEnabled=false');
    expect(canvas).toContain('ctx.drawImage(buffer,0,0,96,96,0,0,canvas.width,canvas.height)');
    expect(canvas).not.toContain('setInterval(');
  });

  it('keeps visual QA on the same production landscape and visual pipeline as the shipped app',()=>{
    const fixture=read('src/duel/gm12-visual-fixture.jsx').toString('utf8');
    const qa=read('scripts/gm12-visual-qa.mjs').toString('utf8');
    for(const visualImport of [
      './landscape-first.css',
      './landscape-scroll-fix.css',
      './character-master.css',
      './responsive-master.css',
      './sts-battleboard.css',
      './combat-readability.css',
      './v10-relic-ui.css',
      './landscape-declutter.css',
      './golden-master.css',
    ])expect(fixture).toContain(visualImport);
    for(const runtimeImport of [
      './stack-direct-tap.js',
      './sts-battleboard.js',
      './combat-readability.js',
      './v10-relic-ui.js',
      './landscape-declutter.js',
    ])expect(fixture).toContain(runtimeImport);
    expect(fixture).toContain("import {renderGoldenBatter} from './V4CanvasSprite.jsx'");
    expect(fixture).toContain('GM12 · FULL-MOTION 60HZ BATTER RIG');
    expect(qa).toContain("['rig-sheet-844x900',844,900,'?rig=1','rig']");
    expect(qa).toContain('state.declutter&&state.arena&&state.arena.height>=height*.52');
    expect(qa).toContain('noHorizontalOverflow');
  });

  it('keeps pitcher sheet playback isolated from the new batter rig',()=>{
    const canvas=read('src/duel/V4CanvasSprite.jsx').toString('utf8');
    expect(canvas).toContain('loadSheet(sheet).then(img=>');
    expect(canvas).toContain('drawCell(ctx,img,lo,1-mix)');
    expect(canvas).toContain('if(hi!==lo&&mix>.001)drawCell(ctx,img,hi,mix)');
  });
});
