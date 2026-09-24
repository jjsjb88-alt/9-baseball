// @vitest-environment happy-dom
import {afterEach,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {installSwingStackDirectTap} from '../src/duel/stack-direct-tap.js';

// V12 P3-3 — efficiency is a multiplier, never an HP value (C3), and the cover count is the real
// number of covered cells (C1), not the number of cards.
const tick=()=>new Promise(r=>setTimeout(r,60));
function board(covered){
  document.body.innerHTML=`<main class="duel-combat"><section class="zone-panel" aria-label="9존 타격 계획"><div class="zone-grid">${Array.from({length:9},(_,i)=>`<button class="zone-cell ${covered.includes(i)?'covered':''}" aria-label="존${i+1}" aria-pressed="${i===0}"><span>존${i+1}</span></button>`).join('')}</div></section>
  <section class="card-drawer" aria-label="스윙 카드 선택"><div class="duel-hand"><button class="duel-card attack selected"><strong>밀어치기</strong></button><button class="duel-card attack basic-card"><strong>BASIC SWING</strong></button></div>
  <section class="swing-stack"><div class="stack-efficiency"><b>100%</b></div></section><div class="decision-preview"><button data-testid="execute-action">스윙</button></div></section></main>`;
}
afterEach(()=>{document.body.innerHTML='';});

describe('V12 P3-3 board guide',()=>{
  it('counts the covered cells, not the cards',async()=>{
    board([0,3,6]);const off=installSwingStackDirectTap(document);await tick();
    const guide=document.querySelector('.zone-card-board-guide');
    expect(guide.querySelector('.zone-board-copy>strong').textContent).toBe('1장 배치 · 커버 3칸');
    off();
  });
  it('labels the rate as damage efficiency, not HP',async()=>{
    board([0]);const off=installSwingStackDirectTap(document);await tick();
    const head=document.querySelector('.zone-power-head');
    expect(head.querySelector('span').textContent).toBe('피해 효율');
    expect(head.querySelector('strong').textContent).toBe('×1.00');
    expect(document.querySelector('.zone-card-board-guide').textContent).not.toMatch(/HP ×/);
    off();
  });
});

describe('V12 P3-3 execute label',()=>{
  const app=fs.readFileSync(path.resolve(process.cwd(),'src/duel/App.jsx'),'utf8');
  it('names the efficiency as efficiency on the trigger',()=>{
    expect(app).toContain("'장 배치 스윙 · 피해 효율 '");
    expect(app).toContain("' · 단독 스윙 · 피해 효율 100%'");
    expect(app).not.toContain("'장 배치 스윙 · HP '");
  });
});
