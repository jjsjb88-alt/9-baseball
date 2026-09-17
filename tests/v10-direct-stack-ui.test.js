// @vitest-environment happy-dom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {installSwingStackDirectTap} from '../src/duel/stack-direct-tap.js';

const tick=()=>new Promise(resolve=>setTimeout(resolve,45));
const settle=()=>new Promise(resolve=>setTimeout(resolve,130));
function pointer(target,type,x,y,id=1){
  const e=new Event(type,{bubbles:true,cancelable:true});
  Object.defineProperties(e,{clientX:{value:x},clientY:{value:y},pointerId:{value:id},pointerType:{value:'touch'}});
  target.dispatchEvent(e);return e;
}
const ZONE_NAMES=Array.from({length:9},(_,i)=>`존${i+1}`);

function fixture({withMain=true}={}){
  document.body.innerHTML=`
  <section class="zone-panel" aria-label="9존 타격 계획">
    <div class="zone-grid">${ZONE_NAMES.map((name,i)=>`<button class="zone-cell" aria-label="${name}" aria-pressed="${withMain&&i===0?'true':'false'}"><span>${name}</span><strong>${10+i}%</strong><small>비숙련</small></button>`).join('')}</div>
  </section>
  <section class="card-drawer" aria-label="스윙 카드 선택">
    <div class="drawer-head"></div><div class="drawer-escape"></div>
    <div class="duel-hand">
      <button class="duel-card attack ${withMain?'selected':''}"><strong>밀어치기</strong></button>
      <button class="duel-card attack"><strong>맞혀놓기</strong></button>
      <button class="duel-card attack"><strong>강공</strong></button>
      <button class="duel-card attack basic-card"><strong>BASIC SWING</strong></button>
    </div>
    <section class="swing-stack">
      <div class="stack-lane"><div class="stack-slot main"><strong>밀어치기</strong></div><button class="stack-slot support"><strong>맞혀놓기</strong><small>존1 · 커버만</small></button><button class="stack-slot support"><strong>강공</strong><small>존1 · 커버만</small></button></div>
      <div class="stack-candidates"><button><span>+ 겹치기</span><strong>맞혀놓기</strong></button><button><span>+ 겹치기</span><strong>강공</strong></button></div>
      <div class="stack-aim-editor"><div class="stack-aim-title"><div></div><button>빼기</button></div><div class="assist-zone-grid">${ZONE_NAMES.map((name,i)=>`<button data-zone="${i}">${name}</button>`).join('')}</div></div>
    </section>
    <div class="decision-preview"><button data-testid="execute-action">스윙</button></div>
  </section>`;
  const cards=[...document.querySelectorAll('.duel-hand .duel-card')],zones=[...document.querySelectorAll('.zone-grid .zone-cell')],candidates=[...document.querySelectorAll('.stack-candidates button')],slots=[...document.querySelectorAll('.stack-slot.support')];
  zones.forEach((zone,i)=>zone.addEventListener('click',()=>zones.forEach((x,j)=>x.setAttribute('aria-pressed',j===i?'true':'false'))));
  cards.forEach(card=>card.addEventListener('click',()=>{
    cards.forEach(x=>x.classList.remove('selected'));card.classList.add('selected');
    candidates.forEach(x=>x.classList.remove('picked'));
  }));
  candidates.forEach((candidate,i)=>candidate.addEventListener('click',()=>candidate.classList.toggle('picked')));
  document.querySelectorAll('.assist-zone-grid button').forEach(button=>button.addEventListener('click',()=>{
    const picked=candidates.filter(x=>x.classList.contains('picked')),active=Math.max(0,picked.length-1),slot=slots[active];
    if(slot)slot.querySelector('small').textContent=ZONE_NAMES[Number(button.dataset.zone)]+' · 커버만';
  }));
  return {drawer:document.querySelector('.card-drawer'),cards,zones,candidates,slots,main:cards[0],second:cards[1],third:cards[2],basic:cards[3]};
}

afterEach(()=>{document.body.innerHTML='';delete document.elementFromPoint;});

describe('V10 9-zone card placement interaction',()=>{
  it('첫 카드를 고른 뒤에도 나머지 공격 카드가 모두 살아 있는 배치 선택지로 보인다',async()=>{
    const ui=fixture(),cleanup=installSwingStackDirectTap(document);await tick();
    expect(ui.drawer.classList.contains('zone-card-board')).toBe(true);
    expect(ui.main.dataset.boardAction).toContain('효과 카드');
    expect(ui.second.dataset.boardAction).toBe('＋ 존에 놓기');
    expect(ui.third.dataset.boardAction).toBe('＋ 존에 놓기');
    expect(document.querySelector('.zone-card-board-guide').textContent).toContain('1장 배치');
    cleanup();
  });

  it('카드 탭은 메인을 교체하지 않고 카드를 든 상태로 만들고, 존 탭이 곧 추가 배치가 된다',async()=>{
    const ui=fixture(),replaceMain=vi.fn(),addSupport=vi.fn();
    ui.second.addEventListener('click',replaceMain);ui.candidates[0].addEventListener('click',addSupport);
    const cleanup=installSwingStackDirectTap(document);await tick();

    ui.second.click();await tick();
    expect(replaceMain).not.toHaveBeenCalled();
    expect(ui.second.classList.contains('board-card-armed')).toBe(true);
    expect(document.querySelector('.zone-card-board-guide').textContent).toContain('놓을 존');

    ui.zones[4].click();await settle();
    expect(addSupport).toHaveBeenCalledTimes(1);
    expect(ui.main.classList.contains('selected')).toBe(true);
    expect(ui.candidates[0].classList.contains('picked')).toBe(true);
    expect(ui.slots[0].querySelector('small').textContent).toContain('존5');
    cleanup();
  });

  it('아직 메인이 없으면 카드 → 존 두 동작으로 첫 효과 카드와 노림존을 동시에 정한다',async()=>{
    const ui=fixture({withMain:false}),cleanup=installSwingStackDirectTap(document);await tick();
    ui.second.click();ui.zones[7].click();await settle();
    expect(ui.second.classList.contains('selected')).toBe(true);
    expect(ui.zones[7].getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.zone-card-token.main')?.textContent).toContain('맞혀놓기');
    cleanup();
  });

  it('카드를 존까지 드래그하면 별도 COVER 편집 화면 없이 바로 그 존에 배치한다',async()=>{
    const ui=fixture(),cleanup=installSwingStackDirectTap(document);await tick();
    document.elementFromPoint=vi.fn(()=>ui.zones[2]);
    pointer(ui.second,'pointerdown',120,320);pointer(ui.second,'pointermove',180,240);pointer(ui.second,'pointerup',180,240);
    await settle();
    expect(ui.candidates[0].classList.contains('picked')).toBe(true);
    expect(ui.slots[0].querySelector('small').textContent).toContain('존3');
    expect(ui.drawer.querySelector('.stack-aim-editor').classList.contains('direct-open')).toBe(false);
    expect(ui.drawer.classList.contains('direct-stack-aiming')).toBe(false);
    cleanup();
  });

  it('존 안의 추가 카드 토큰을 탭하면 즉시 빼고 다른 카드는 그대로 유지한다',async()=>{
    const ui=fixture();ui.candidates[0].classList.add('picked');ui.slots[0].querySelector('small').textContent='존6 · 커버만';
    const cleanup=installSwingStackDirectTap(document);await tick();
    const token=document.querySelector('.zone-card-token.support');
    expect(token?.textContent).toContain('맞혀놓기');
    token.click();await settle();
    expect(ui.candidates[0].classList.contains('picked')).toBe(false);
    expect(ui.main.classList.contains('selected')).toBe(true);
    expect(ui.second.dataset.boardAction).toBe('＋ 존에 놓기');
    cleanup();
  });
});
