import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../src/duel/character-master.css',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

describe('V10 character master presentation',()=>{
  it('loads the dedicated character master layer',()=>{
    expect(main).toContain('character-master.css');
    expect(main.indexOf('character-master.css')).toBeGreaterThan(main.indexOf('landscape-scroll-fix.css'));
  });

  it('gives batter and pitcher different silhouettes and visual weight',()=>{
    expect(css).toContain('.actor-left{width:clamp(184px,23vw,250px)');
    expect(css).toContain('.actor-right{width:clamp(160px,19vw,215px)');
    expect(css).toContain('.actor-left::after');
    expect(css).toContain('.actor-right::after');
  });

  it('uses crisp pixel outlining and separate warm/cool rim lights',()=>{
    expect(css).toContain('image-rendering:pixelated!important');
    expect(css).toContain('drop-shadow(1px 0 0 rgba(255,214,135,.30))');
    expect(css).toContain('drop-shadow(-1px 0 0 rgba(123,219,198,.26))');
  });

  it('makes idle body language distinct instead of using the same generic breathe',()=>{
    expect(css).toContain('@keyframes batter-master-idle');
    expect(css).toContain('@keyframes pitcher-master-idle');
    expect(css).toContain('.actor-left .sprite-stage.pose-idle{animation:batter-master-idle');
    expect(css).toContain('.actor-right .sprite-stage.pose-idle,.actor-right .sprite-stage.pose-set{animation:pitcher-master-idle');
  });

  it('integrates actors with contact, stage escalation and reduced motion',()=>{
    expect(css).toContain('.fx-stage-impact .actor-left{transform:translateX(8px) scale(1.025)}');
    expect(css).toContain('.release-combat.stadium-stage-2 .actor-right::after');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
  });
});
