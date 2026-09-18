import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../src/duel/landscape-declutter.css',import.meta.url),'utf8');

/* 선택자 블록 하나를 꺼내 배경 알파와 블러를 읽는다. */
function block(selector){
  const at=css.indexOf(selector);
  expect(at,selector+' 블록을 찾지 못했다').toBeGreaterThan(-1);
  return css.slice(at,css.indexOf('}',at));
}
const alpha=b=>{const m=b.match(/background:rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(\.?\d+)\)/);return m?Number(m[1]):null;};
const blur=b=>{const m=b.match(/backdrop-filter:blur\((\d+)px\)/);return m?Number(m[1]):null;};

const resting=block('.duel-combat.landscape-declutter>.zone-panel{');
const placing=block('.duel-combat.landscape-declutter>.zone-panel.board-targeting,');
const infoOpen=block('.duel-combat.landscape-declutter>.zone-panel.zone-info-open{');
const cell=block('.duel-combat.landscape-declutter>.zone-panel .zone-cell{');

describe('9-zone board visual weight',()=>{
  it('lets the combat scene read through the resting board',()=>{
    /* VISUAL-REBOOT-LOOP-ENGINEERING.md §8 "UI보다 전투 장면이 먼저 보인다".
       평상시 보드는 장면을 덮는 판이 아니라 떠 있는 HUD여야 한다. */
    expect(alpha(resting)).toBeLessThanOrEqual(0.5);
    expect(blur(resting)).toBeLessThanOrEqual(3);
  });

  it('solidifies the board while a card is being placed',()=>{
    /* 드롭 대상이 어디인지 모호하면 안 된다. 배치 중에는 평상시보다 또렷해야 한다. */
    expect(alpha(placing)).toBeGreaterThan(alpha(resting));
    expect(blur(placing)).toBeGreaterThan(blur(resting));
  });

  it('keeps the INFO reading state the most opaque of the three',()=>{
    /* 설명을 읽는 상태는 장면보다 글이 우선이다. */
    expect(alpha(infoOpen)).toBeGreaterThan(alpha(placing));
  });

  it('keeps the grid cells more opaque than the panel behind them',()=>{
    /* 셀은 전술 수치가 앉는 바닥이다. 패널 틀만 투명해지고 셀은 자기 바닥을 지킨다. */
    expect(alpha(cell)).toBeGreaterThan(alpha(resting));
  });
});
