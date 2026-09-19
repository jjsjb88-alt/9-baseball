import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/golden-master.css',import.meta.url),'utf8');
const asset=name=>fs.readFileSync(new URL('../assets/sprites-v3/'+name,import.meta.url),'utf8');

describe('golden master 06 authored actor art',()=>{
  it('ships dedicated authored hero/release assets instead of only CSS transforms',()=>{
    for(const name of ['batter-homer-hero.svg','pitcher-sinker-release.svg','pitcher-high-release.svg','pitcher-closer-release.svg']){
      const svg=asset(name);
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 144 176"');
      expect(svg).toContain('shape-rendering="crispEdges"');
    }
  });

  it('routes the homer hold through dedicated v3 hero art',()=>{
    expect(app).toContain("import batterHomerHeroV3 from '../../assets/sprites-v3/batter-homer-hero.svg'");
    expect(app).toContain("who==='batter'&&pose==='homer'");
    expect(app).toContain("['release','settle'].includes(stage)");
    expect(app).toContain("return batterHomerHeroV3");
  });

  it('routes sinker/high/closer signature release frames through unique assets',()=>{
    expect(app).toContain("const PITCHER_RELEASE_V3={sinker:pitcherSinkerReleaseV3,high:pitcherHighReleaseV3,closer:pitcherCloserReleaseV3}");
    expect(app).toContain("who==='pitcher'&&PITCHER_RELEASE_V3[variant]");
    expect(app).toContain("stage==='slowmo'");
  });

  it('does not replace strikeout celebration with the generic archetype release art',()=>{
    expect(app).toContain("!(shot?.grade==='strikeout'||shot?.grade?.endsWith('-k'))");
  });

  it('marks authored art and removes cheap duplicate echo/smear treatment',()=>{
    expect(app).toContain("(authored?' v3-authored':'')");
    expect(css).toContain('.golden-master-stage .golden-actor.v3-authored .sprite-echo{opacity:.035!important');
    expect(css).toContain('.golden-master-stage .golden-actor.v3-authored.sprite-batter .bat-smear{opacity:0!important}');
  });

  it('keeps authored art clamped for portrait, low landscape and reduced motion',()=>{
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
    expect(css).toContain('@media (orientation:portrait)');
    expect(css).toContain('@media (prefers-reduced-motion:reduce)');
    expect(css).toContain('.golden-master-stage .golden-actor.v3-authored{transition:none!important}');
  });
});
