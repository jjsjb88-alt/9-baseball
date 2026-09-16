# V10 UI 계약

이슈 #5 범위. 엔진을 import하지 않고 fixture props만으로 렌더하는 UI 셸의 입력 계약이다.
이슈 #5에서 미정이던 항목은 아래처럼 UI 쪽에서 확정했다. 통합 이슈 #6에서 엔진 selector가 이 형태를 맞춘다.

## 공통

- 파일: `PitcherHpHud.jsx` / `CombatResultSummary.jsx` / `RunMap.jsx` / `v10-ui.css` / `v10-copy.js`
- 세 컴포넌트 모두 `./v10-ui.css`를 자기 파일에서 import한다. 번들러가 중복을 제거하므로 통합 시 App.jsx에 따로 import를 넣지 않아도 된다.
- 전투 규칙을 UI에서 재계산하지 않는다. 엔진이 준 값을 표시만 한다.
- 모션 억제는 `v10-copy.js`의 `useReducedMotion()`이 `matchMedia('(prefers-reduced-motion: reduce)')`를 읽어 루트에 `v10-reduced` 클래스와 `data-reduced="true"`를 붙인다. CSS에도 같은 내용의 미디어 쿼리가 있어 JS 없이도 동작한다.

## PitcherHpHud

`{name, hp, maxHp, phase, lastDamage}`

- `phase`: `'steady' | 'shaky' | 'cornered' | 'pulled'` = 정상 / 흔들림 / 몰림 / 강판. **엔진이 준 값이 우선이다.**
- 엔진(`pitcher-hp.js`)은 `steady | pressured | critical | defeated`를 쓴다. `PHASE_ALIASES`가 `pressured → shaky`, `critical → cornered`, `defeated → pulled`로 받아준다. 경계는 양쪽이 같다(60% / 30%).
- `phase`가 없거나 모르는 값이면 표시 전용 보조값 `phaseFor(hp, maxHp)`로 떨어진다. 경계는 `>60% steady`, `>30% shaky`, `>0% cornered`, `0 pulled`. 이건 화면 표기용 보조일 뿐이고 전투 규칙이 아니다.
- HP 막대에 60% / 30% 눈금을 그린다. 눈금은 표시일 뿐 판정을 만들지 않는다.
- `lastDamage > 0`이면 직전 HP 위치에 잔상(`.v10-hp-ghost`)과 피해 숫자(`-N`)를 낸다. `lastDamage`가 0이면 둘 다 렌더하지 않는다.
- 현재 HP는 `role="status"`인 `.v10-sr-only` 문단으로도 읽힌다.

## CombatResultSummary

`{choice, actualPitch, verdict, damage, hpAfter}`

항상 네 줄, 순서 고정: `내 선택` → `실제 공` → `야구 판정` → `투수 HP`.

- `choice`: 문자열이거나 `{card, zone}`. 객체면 `카드 · 존`으로 붙인다.
- `actualPitch`: 문자열이거나 `{type, zone}`.
- `verdict`: `v10-copy.js`의 `VERDICTS` 키나 그대로 쓸 한국어 문자열. 객체면 `{kind, label}`.
  - 엔진 `damageForOutcome()`이 돌려주는 키도 그대로 받는다: `homeRun` `triple` `double` `single` `inPlayOut` `walk` `hardFoul` `foul` `nearMiss` `whiff` `ball` `calledStrike`. 매핑이 없으면 키가 영어 그대로 화면에 노출되므로 엔진이 키를 늘리면 `VERDICTS`도 같이 늘려야 한다.
- `hpAfter`와 `damage`로 4번째 줄을 만든다. `damage > 0`이면 `이전 → 이후 (-피해)`, 0이면 `이후 유지`. 별도의 `hpBefore`는 받지 않는다.
- 연출 문구와 원인 설명은 넣지 않는다. 사실 네 줄만 둔다.

## RunMap

`{nodes, edges, currentNodeId, reachableIds, onSelect}`

- `nodes`: `{id, type, depth, label?, reward?, risk?}` 또는 엔진 `run-map.js`가 주는 `{id, type, act, row, lane, name}`
  - `type`: `battle | elite | training | locker | shop | rest | boss`
  - 층: `depth`가 있으면 그걸 쓴다. 없고 `act`와 `row`가 같이 있으면 `act * 100 + row`로 합쳐 한 줄로 편다. 엔진 지도는 3막 × 5줄 = 15줄 21노드가 된다.
  - 칸: 모든 노드에 정수 `lane`이 있으면 칸 번호를 그대로 쓴다. 칸 수는 지도 전체에서 한 번만 세므로, 한 줄에 노드가 하나뿐이어도 가운데 칸에 그대로 남는다. `lane`이 없으면 배열 순서대로 균등 배치한다.
  - 이름은 `label`, 없으면 `name`, 그것도 없으면 `NODE_TYPES` 기본 제목.
  - `reward` / `risk`가 없으면 `NODE_TYPES` 기본 문구를 쓴다. 엔진 노드에는 아직 이 두 필드가 없다.
- `edges`: `[{from, to}]` 배열. 노드 id 쌍이다.
- 배치: 같은 `depth`를 한 줄에 놓되 **한 줄 최대 4개**로 끊는다. 5개 이상이면 다음 줄로 넘긴다.
- 연결선은 `viewBox="0 0 100 100"` SVG 오버레이로 그린다. 노드 좌표는 줄/칸 인덱스에서 바로 계산하므로 DOM 측정 없이도 정확하다. `currentNodeId`에서 나가는 reachable 간선은 `.v10-edge-live`로 강조한다.
- 선택은 2단계다. **노드를 누르면 보상·위험·이후 경로를 보여주고, `이 경로로 간다` 버튼에서만 `onSelect(id)`가 호출된다.** 보상과 위험을 보기 전에 확정되지 않게 하려는 의도다.
- `reachableIds`에 없는 노드는 `aria-disabled="true"`에 `.is-locked`다. 눌러도 미리보기가 바뀌지 않고 `onSelect`도 호출되지 않는다. `disabled` 대신 `aria-disabled`를 쓴 이유는 키보드로 지도 전체를 훑을 수 있게 두기 위해서다.
- 키보드: roving tabindex. 방향키로 줄과 칸을 옮기고, Enter/Space는 버튼 기본 동작으로 미리보기를 연다. 이동은 배열 순서가 아니라 칸 번호를 따라가므로 lane 지도에서도 좌우가 화면과 같다. 포커스는 `:focus-visible` 외곽선으로 보인다.
- 엔진은 노드를 고른 순간 `reachableIds`를 비우고, 전투가 끝난 뒤 `completeRunNode()`에서 다음 갈래를 채운다. 그 사이에는 지도의 모든 칸이 잠긴 상태로 보이므로, 통합 이슈 #6에서 지도를 언제 띄울지 정해야 한다.
- 반응형: 390×844 / 360×740은 한 칸 세로 배치, 1280×900은 지도와 미리보기 2단.

## 카피

`v10-copy.js`에 모두 모아 둔다. 핵심 선택지에 영어를 쓰지 않고, `역할/축/산출/빌드` 같은 기획 용어도 쓰지 않는다.
노드 설명은 `무엇을 한다 → 무엇을 얻는다 → 무엇을 지불한다` 순서로 적는다. 지도 CTA는 `이 경로로 간다`.
