// @vitest-environment happy-dom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {installSwingStackDirectTap} from '../src/duel/stack-direct-tap.js';

const tick=()=>new Promise(resolve=>setTimeout(resolve,30));

function fixture(){
  document.body.innerHTML=`<section class="card-drawer" aria-label="스윙 카드 선택">
    <div class="drawer-head"></div><div class="drawer-escape"></div>
    <div class="duel-hand">
      <button class="duel-card attack selected"><strong>밀어치기</strong></button>
      <button class="duel-card attack"><strong>맞혀놓기</strong></button>
    </div>
    <section class="swing-stack">
      <div class="stack-lane"><div class="stack-slot main"><strong>밀어치기</strong></div><button class="stack-slot support"><strong>맞혀놓기</strong></button></div>
      <div class="stack-candidates"><button><span>+ 겹치기</span><strong>맞혀놓기</strong></button></div>
      <div class="stack-aim-editor"><div class="stack-aim-title"><div></div><button>빼기</button></div><div class="assist-zone-grid"><button>1</button><button>2</button></div></div>
      <button data-testid="execute-action">2장 겹쳐 스윙 · HP 80%</button>
    </section>
  </section>`;
  return {
    drawer:document.querySelector('.card-drawer'),
    main:document.querySelectorAll('.duel-hand .duel-card')[0],
    second:document.querySelectorAll('.duel-hand .duel-card')[1],
    candidate:document.querySelector('.stack-candidates button'),
    editor:document.querySelector('.stack-aim-editor'),
    slot:document.querySelector('.stack-slot.support'),
  };
}

afterEach(()=>{document.body.innerHTML='';});

describe('V10 direct swing-stack hand interaction',()=>{
  it('첫 카드 선택 뒤 다른 손패 카드를 탭하면 메인 교체 대신 스택 후보를 누른다',async()=>{
    const ui=fixture(),replaceMain=vi.fn(),addSupport=vi.fn(()=>ui.candidate.classList.add('picked'));
    ui.second.addEventListener('click',replaceMain);
    ui.candidate.addEventListener('click',addSupport);
    const cleanup=installSwingStackDirectTap(document);
    await tick();
    expect(ui.main.dataset.stackRole).toBe('MAIN · 1');
    expect(ui.second.dataset.stackRole).toBe('+ 같이 쓰기');
    ui.second.click();
    await tick();
    expect(replaceMain).not.toHaveBeenCalled();
    expect(addSupport).toHaveBeenCalledTimes(1);
    expect(ui.editor.classList.contains('direct-open')).toBe(true);
    cleanup();
  });

  it('이미 같이 쓰는 카드를 다시 탭하면 제거하지 않고 그 카드의 존 편집을 연다',async()=>{
    const ui=fixture(),removeSupport=vi.fn(),editSupport=vi.fn();
    ui.candidate.classList.add('picked');
    ui.candidate.addEventListener('click',removeSupport);
    ui.slot.addEventListener('click',editSupport);
    const cleanup=installSwingStackDirectTap(document);
    await tick();
    ui.second.click();
    await tick();
    expect(removeSupport).not.toHaveBeenCalled();
    expect(editSupport).toHaveBeenCalledTimes(1);
    expect(ui.editor.classList.contains('direct-open')).toBe(true);
    cleanup();
  });
});
