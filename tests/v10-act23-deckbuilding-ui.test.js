// @vitest-environment happy-dom
import {afterEach,describe,expect,it} from 'vitest';
import {installAct23DeckbuildingUi} from '../src/duel/act23-deckbuilding-ui.js';

const tick=()=>new Promise(resolve=>setTimeout(resolve,35));

afterEach(()=>{document.body.innerHTML='';});

describe('V10 act signature reward presentation',()=>{
  it('강적 시그니처 카드를 일반 카드와 구분하고 막별 보상 문맥을 붙인다',async()=>{
    document.body.innerHTML=`<main class="reward-screen"><div class="reward-cards">
      <button class="duel-card attack"><strong>릴리스 간파</strong></button>
      <button class="duel-card attack"><strong>라인드라이브</strong></button>
    </div></main>`;
    // 모듈 자동 설치가 이미 되어 있으면 observer가 이 mutation을 처리하고, 아니면 직접 설치한다.
    installAct23DeckbuildingUi(document);await tick();
    const sig=[...document.querySelectorAll('.duel-card')].find(x=>x.textContent.includes('라인드라이브'));
    expect(sig.dataset.signatureAct).toBe('2');
    expect(sig.dataset.signatureLabel).toBe('ACT II SIGNATURE');
    const callout=document.querySelector('.signature-draft-callout');
    expect(callout).toBeTruthy();
    expect(callout.textContent).toContain('ACT II SIGNATURE');
    expect(callout.textContent).toContain('강적을 잡아야만');
    expect(document.querySelector('.reward-screen').dataset.signatureDraft).toBe('2');
  });

  it('시그니처가 없는 보상에서는 과장된 콜아웃을 만들지 않는다',async()=>{
    document.body.innerHTML=`<main class="reward-screen"><div class="reward-cards">
      <button class="duel-card attack"><strong>당겨 넘기기</strong></button>
      <button class="duel-card attack"><strong>주자 연결</strong></button>
    </div></main>`;
    await tick();
    expect(document.querySelector('.signature-draft-callout')).toBeNull();
    expect(document.querySelector('.reward-screen').dataset.signatureDraft).toBeUndefined();
  });
});
