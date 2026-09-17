// @vitest-environment happy-dom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {installSwingStackDirectTap} from '../src/duel/stack-direct-tap.js';

const tick=()=>new Promise(resolve=>setTimeout(resolve,35));
function pointer(target,type,x,y,id=1){
  const e=new Event(type,{bubbles:true,cancelable:true});
  Object.defineProperties(e,{clientX:{value:x},clientY:{value:y},pointerId:{value:id},pointerType:{value:'touch'}});
  target.dispatchEvent(e);return e;
}

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

describe('V10 swipe swing-stack hand interaction',()=>{
  it('메인 선택 뒤 다른 카드가 위로 밀어 커버하는 카드임을 손패에서 직접 보여준다',async()=>{
    const ui=fixture(),cleanup=installSwingStackDirectTap(document);await tick();
    expect(ui.main.dataset.stackRole).toBe('MAIN · 1');
    expect(ui.second.dataset.stackRole).toBe('↑ 위로 밀어 커버');
    expect(ui.drawer.querySelector('.direct-stack-guide').textContent).toContain('위로 밀어');
    cleanup();
  });

  it('다른 카드를 충분히 위로 스와이프하면 메인 교체 없이 COVER로 들어가고 존 선택이 열린다',async()=>{
    const ui=fixture(),replaceMain=vi.fn(),addSupport=vi.fn(()=>ui.candidate.classList.add('picked'));
    ui.second.addEventListener('click',replaceMain);ui.candidate.addEventListener('click',addSupport);
    const cleanup=installSwingStackDirectTap(document);await tick();
    pointer(ui.second,'pointerdown',120,320);pointer(ui.second,'pointermove',121,245);pointer(ui.second,'pointerup',121,245);
    await tick();
    expect(replaceMain).not.toHaveBeenCalled();
    expect(addSupport).toHaveBeenCalledTimes(1);
    expect(ui.editor.classList.contains('direct-open')).toBe(true);
    cleanup();
  });

  it('짧게 끌다 놓으면 스택에 넣지 않고 더 위로 밀라는 피드백만 준다',async()=>{
    const ui=fixture(),addSupport=vi.fn(()=>ui.candidate.classList.add('picked'));
    ui.candidate.addEventListener('click',addSupport);
    const cleanup=installSwingStackDirectTap(document);await tick();
    pointer(ui.second,'pointerdown',120,320);pointer(ui.second,'pointermove',121,295);pointer(ui.second,'pointerup',121,295);
    await tick();
    expect(addSupport).not.toHaveBeenCalled();
    expect(ui.drawer.querySelector('.direct-stack-guide').textContent).toContain('조금 더 위로');
    cleanup();
  });

  it('탭은 PC와 접근성을 위한 보조 조작으로 그대로 동작한다',async()=>{
    const ui=fixture(),replaceMain=vi.fn(),addSupport=vi.fn(()=>ui.candidate.classList.add('picked'));
    ui.second.addEventListener('click',replaceMain);ui.candidate.addEventListener('click',addSupport);
    const cleanup=installSwingStackDirectTap(document);await tick();
    ui.second.click();await tick();
    expect(replaceMain).not.toHaveBeenCalled();
    expect(addSupport).toHaveBeenCalledTimes(1);
    expect(ui.editor.classList.contains('direct-open')).toBe(true);
    cleanup();
  });

  it('이미 COVER인 카드를 다시 스와이프하면 제거 대신 존 편집을 연다',async()=>{
    const ui=fixture(),removeSupport=vi.fn(),editSupport=vi.fn();
    ui.candidate.classList.add('picked');ui.candidate.addEventListener('click',removeSupport);ui.slot.addEventListener('click',editSupport);
    const cleanup=installSwingStackDirectTap(document);await tick();
    pointer(ui.second,'pointerdown',120,320);pointer(ui.second,'pointermove',120,240);pointer(ui.second,'pointerup',120,240);
    await tick();
    expect(removeSupport).not.toHaveBeenCalled();
    expect(editSupport).toHaveBeenCalledTimes(1);
    expect(ui.editor.classList.contains('direct-open')).toBe(true);
    cleanup();
  });
});
