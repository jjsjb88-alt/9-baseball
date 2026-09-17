// @vitest-environment happy-dom
import {describe,expect,it,vi} from 'vitest';

const tick=()=>new Promise(resolve=>setTimeout(resolve,55));

describe('V10 landscape progressive disclosure',()=>{
  it('전투 핵심은 남기고 READ/9존 상세/선택 상세/유물 이름은 탭으로 펼친다',async()=>{
    const media={matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()};
    window.matchMedia=vi.fn(()=>media);
    vi.resetModules();
    await import('../src/duel/landscape-declutter.js');

    document.body.innerHTML=`
      <main class="duel-combat">
        <div class="v10-combat-hp"></div>
        <div class="scoreboard"><div class="scoreboard-player"></div><div class="scoreboard-score"></div><div class="scoreboard-count"></div></div>
        <section class="duel-arena"><div class="intent"><span>투수 의도</span><strong>바깥쪽 승부</strong><b>경향</b></div><div class="actor-left"></div><div class="actor-right"></div></section>
        <section class="zone-panel"><div class="zone-heading"><h2>어떤 공을 기다릴까?</h2></div><p class="zone-promise">설명</p><div class="zone-grid"><button class="zone-cell"><span>IN · HIGH</span><strong>HIGH</strong></button></div><p class="zone-legend">범례</p><details class="zone-details"><summary>상세</summary></details></section>
        <div class="pitch-read"><span>READ</span><b>바깥쪽 비중이 높습니다.</b><small>집중 +0</small></div>
        <section class="duel-table"><section class="card-drawer"><div class="duel-hand"></div><div class="decision-preview active"><div><b>맞혀놓기</b><span>설명</span></div><button class="primary" data-testid="execute-action">스윙</button></div></section></section>
        <div class="v10-relic-rack"><span class="v10-relic-chip"><i>1ST</i><b>초구 노림표</b></span></div>
      </main>`;

    await tick();
    const combat=document.querySelector('.duel-combat');
    expect(combat.classList.contains('landscape-declutter')).toBe(true);
    expect(combat.classList.contains('v10-landscape-declutter')).toBe(true);

    const zone=document.querySelector('.zone-panel');
    const zoneToggle=zone.querySelector('.landscape-zone-info-toggle');
    expect(zoneToggle?.getAttribute('aria-expanded')).toBe('false');
    zoneToggle.click();
    expect(zone.classList.contains('zone-info-open')).toBe(true);
    expect(zoneToggle.getAttribute('aria-expanded')).toBe('true');

    const read=document.querySelector('.pitch-read');
    const readToggle=read.querySelector('.landscape-read-toggle');
    expect(readToggle.textContent).toContain('바깥쪽 승부');
    readToggle.click();
    expect(read.classList.contains('read-open')).toBe(true);

    const preview=document.querySelector('.decision-preview');
    const detail=preview.querySelector('.landscape-choice-toggle');
    detail.click();
    expect(preview.classList.contains('choice-info-open')).toBe(true);

    const relics=document.querySelector('.v10-relic-rack');
    relics.click();
    expect(relics.classList.contains('relic-info-open')).toBe(true);
    expect(document.querySelector('.landscape-duel-axis')).not.toBeNull();
  });
});
