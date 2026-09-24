# BATTER MOTION LOOP V2 — NEW SESSION PROMPT

깃허브 `jjsjb88-alt/9-baseball`의 `codex/batter-motion-loop-v2` 브랜치를 확인하고,
`HANDOFF.md` 최상단과 `docs/visual/BATTER-MOTION-LOOP-V2.md`를 먼저 읽은 뒤
지시된 다음 작업을 바로 진행해줘.

사용자 최신 피드백은:

> "그냥 서있는 모습만 반복되는 것 같다."

따라서 이번 작업의 핵심은 정지 포즈 교체가 아니라
**타자가 실제로 스윙하는 것처럼 읽히는 motion loop를 만드는 것**이다.

반드시:
- ready → load → trigger → swing-start → contact → follow-through-early → finish → settle
  최소 8단계 구조로 확장할 것.
- 기존 authored 4개 앵커 자산은 유지할 것.
- load / swing-start / follow-through-early / settle 중간포즈를 새로 설계할 것.
- procedural/block batter renderer로 절대 회귀하지 말 것.
- CSS 흔들기만으로 애니메이션 완료 처리하지 말 것.
- contact 순간이 실제 플레이에서 명확히 보이게 할 것.
- 390x844 / 844x390 / 1440x900 실제 게임 캡처로 검수할 것.
- 테스트 통과와 visual PASS를 동일시하지 말 것.
- 사용자 확인 전 main에 merge하지 말 것.
- 정적/키포즈 흐름이 먼저 통과한 뒤에만 60Hz 보간/재생으로 확장할 것.

중간에 멈추지 말고 실제 코드/자산/QA까지 진행해.
진행 상황은 짧게 알려주되, 최종 판단은 실제 게임 화면 기준으로 내려줘.
