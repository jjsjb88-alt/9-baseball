import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../src/duel/gm-groundplane.css',import.meta.url),'utf8');

function block(selector){
  const at=css.indexOf(selector);
  expect(at,selector+' 블록을 찾지 못했다').toBeGreaterThan(-1);
  return css.slice(at,css.indexOf('}',at));
}
const opacity=b=>{const m=b.match(/opacity:(\.?\d+(?:\.\d+)?)/);return m?Number(m[1]):null;};
/* radial-gradient의 첫 색을 읽는다. */
const firstRgba=b=>{const m=b.match(/rgba\((\d+),(\d+),(\d+),/);return m?{r:+m[1],g:+m[2],b:+m[3]}:null;};

const base=block('.golden-actor .actor-ground::after{');
const batter=block('.golden-actor.sprite-batter .actor-ground::after{');
const pitcher=block('.golden-actor.sprite-pitcher .actor-ground::after{');
const rest=opacity(base);

describe('ground plane lighting',()=>{
  it('puts a light layer on the ground instead of leaving it unlit',()=>{
    /* 계획 §4: 조명은 key light·rim·접지·컨택트 플래시를 하나로 묶는다.
       기존 gm-actor-light는 gm-depth-mid(z-index 8)에 있어 발밑 흙에 닿지 않았다. */
    expect(base).toContain('mix-blend-mode:screen');
    expect(base).toContain('pointer-events:none');
    expect(rest).toBeGreaterThan(0);
    expect(rest).toBeLessThan(1);
  });

  it('keeps the batter light warm and the pitcher light cool',()=>{
    /* 색은 기존 액터 조명에서 가져온다. 타자는 따뜻한 쪽, 투수는 차가운 쪽. */
    const w=firstRgba(batter), c=firstRgba(pitcher);
    expect(w.r).toBeGreaterThan(w.b);
    expect(c.b).toBeGreaterThan(c.r);
  });

  it('spills the contact light onto the batter dirt at impact',()=>{
    const impact=block('.golden-master-stage.fx-stage-impact .sprite-batter .actor-ground::after{');
    expect(opacity(impact)).toBeGreaterThan(rest);
    /* gm-contact-halo와 같은 박자로 끊어야 번지지 않는다. */
    expect(impact).toContain('steps(2,end)');
  });

  it('moves the light to the mound while the pitcher works',()=>{
    const windupPitcher=block('.golden-master-stage.fx-stage-windup .sprite-pitcher .actor-ground::after{');
    const windupBatter=block('.golden-master-stage.fx-stage-windup .sprite-batter .actor-ground::after{');
    expect(opacity(windupPitcher)).toBeGreaterThan(rest);
    expect(opacity(windupBatter)).toBeLessThanOrEqual(rest);
  });

  it('returns both grounds to the resting level once the call is over',()=>{
    const settle=block('.golden-master-stage.fx-stage-release .actor-ground::after,');
    expect(opacity(settle)).toBe(rest);
  });

  it('drops the light transition under reduced motion',()=>{
    const at=css.indexOf('@media (prefers-reduced-motion:reduce)');
    expect(at).toBeGreaterThan(-1);
    expect(css.slice(at)).toContain('transition:none!important');
  });
});
