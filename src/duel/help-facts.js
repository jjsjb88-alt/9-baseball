import {CARDS} from './cards.js';
import {V10_SWING_DAMAGE_RATES,V11_STACK_CONNECT_BONUS,V10_SWING_STACK_MAX} from './engine.js';

/*
 * V12 P7-1 — the help screen says only what has been verified, and reads its numbers from the engine.
 * endsAtBat / continuesAtBat are the outcomes replayed in the V12 P4-2 audit (docs/V12-PROGRESS.md);
 * controls are the input paths verified by real input in P2–P5.
 */
export function helpFacts(){
  const pct=r=>Math.round(r*100);
  return {
    cardCount:Object.keys(CARDS).length,
    stack:V10_SWING_DAMAGE_RATES.slice(0,V10_SWING_STACK_MAX).map((r,i)=>(i+1)+'장 '+pct(r)+'%').join(' · ')
      +' · 이어진 순서 한 번마다 +'+pct(V11_STACK_CONNECT_BONUS)+'%p',
    endsAtBat:['안타','인플레이 아웃','희생 번트','삼진','볼넷'],
    continuesAtBat:['볼','스트라이크','헛스윙','파울'],
    controls:[
      ['카드 놓기','카드 → 칸을 차례로 누르거나, 카드를 9존으로 끌어 놓습니다. 키보드는 카드에서 Enter, 칸은 방향키로 옮기고 Enter.'],
      ['덮는 칸 미리 보기','카드를 든 채 칸 위에 올리면 그 칸에 놓았을 때 실제로 덮는 칸만 밝혀집니다(메인 실선, 지원 점선).'],
      ['카드 설명','선택한 카드는 실행 칸의 ⓘ 설명, 손패 카드는 i 키 또는 길게 누르기로 원문 규칙을 엽니다.'],
      ['순서 · 회수','카드를 2장 이상 놓으면 순서 버튼이 생깁니다. 메인은 고정, 지원 카드는 ◀ ▶로 순서를 바꾸거나 회수합니다.'],
      ['손패 넘기기','손패는 옆으로 밀어 넘깁니다. 보드 쪽으로 끌 때만 카드가 들립니다.'],
      ['지도','칸을 누르면 스카우팅 리포트가 열리고, 갈 수 있는 곳이 여럿이면 보상·위험을 나란히 비교합니다.'],
    ],
  };
}
