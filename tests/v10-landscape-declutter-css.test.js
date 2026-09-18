import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

describe('landscape declutter visual contract',()=>{
  const css=fs.readFileSync(new URL('../src/duel/landscape-declutter.css',import.meta.url),'utf8');
  it('중복 HUD를 접고 9존을 중앙 전술 보드로 만든다',()=>{
    expect(css).toContain('.duel-combat.landscape-declutter>.battle-ribbon{display:none!important}');
    expect(css).toContain('.duel-combat.v10-landscape-declutter>.scoreboard .scoreboard-score{display:none!important}');
    expect(css).toContain('left:50%!important;right:auto!important;top:44px!important;transform:translateX(-50%)!important');
    expect(css).toContain('.zone-panel:not(.zone-info-open) .zone-heading');
  });
  it('타자와 투수를 양 끝의 주인공으로 확대한다',()=>{
    expect(css).toContain('scale:1.42!important');
    expect(css).toContain('.actor-left{left:5%!important}');
    expect(css).toContain('.actor-right{right:5%!important}');
    expect(css).toContain('scale:1.52!important');
  });
  it('모바일 가로에서도 9존은 손가락으로 넣을 수 있는 실제 터치 크기를 유지한다',()=>{
    expect(css).toContain('width:clamp(330px,38vw,430px)!important');
    expect(css).toContain('height:52px!important;min-height:52px!important');
    expect(css).toContain('width:300px!important');
    expect(css).toContain('height:44px!important;min-height:44px!important');
    expect(css).toContain('width:276px!important');
    expect(css).toContain('board-targeting .zone-cell');
    expect(css).toContain('transform:translateX(-50%) scale(1.035)!important');
    expect(css).toContain('touch-action:none!important');
  });
  it('READ와 선택 상세는 기본 접힘 후 클릭 확장 구조다',()=>{
    expect(css).toContain('.pitch-read:not(.read-open)>b');
    expect(css).toContain('.decision-preview>div{display:none!important}');
    expect(css).toContain('.decision-preview.choice-info-open>div');
    expect(css).toContain('.v10-relic-rack.relic-info-open .v10-relic-chip b');
  });
});
