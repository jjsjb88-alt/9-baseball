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
  - `reward` / `risk`가 없으면 `NODE_TYPES` 기본 문구를 쓴다.
  - 엔진이 주면 그대로 쓰는 상세 필드: `routeLabel`(칸에 붙는 루트 꼬리표), `opponent.name` + `opponent.maxHp`(칸에 붙는 상대 요약), `utility.effect`(같은 자리, 비전투 칸), `preview`(미리보기 `상대` 줄), `opponent.threat` 또는 `utility.detail`(미리보기 아래 설명). 없으면 그 줄을 아예 그리지 않는다.
  - 한 줄에 네 칸까지 온다. 좁은 화면에서는 글자를 줄이고 루트 꼬리표를 숨겨 넷을 그대로 세운다.
- `edges`: `[{from, to}]` 배열. 노드 id 쌍이다.
- 배치: 같은 `depth`를 한 줄에 놓되 **한 줄 최대 4개**로 끊는다. 5개 이상이면 다음 줄로 넘긴다.
- 연결선은 `viewBox="0 0 100 100"` SVG 오버레이로 그린다. 노드 좌표는 줄/칸 인덱스에서 바로 계산하므로 DOM 측정 없이도 정확하다. `currentNodeId`에서 나가는 reachable 간선은 `.v10-edge-live`로 강조한다.
- 막 접기: `act`가 있는 지도는 막 단위로 접힌다. 기본은 `currentNodeId`가 있는 막만 펴고 나머지는 한 줄 막대로 접는다. 막대를 누르면 펴고 접는다. 21노드를 한 화면에 세로로 다 깔면 모바일에서 4000px가 넘어가기 때문이다.
- 막마다 제 SVG를 쓴다. 그래서 접힌 막이 다른 막의 좌표를 흔들지 않고, 막을 건너는 간선(`boss → 다음 entry`)은 선 대신 `다음 막으로 이어진다` 표시로 대신한다.
- 연결선은 양 끝에서 노드 높이의 절반만큼 물려 잘라 그린다(`EDGE_TRIM`). 선이 노드 상자 밑으로 지나가지 않는다.
- **어느 칸이든 미리 볼 수 있다.** 누르거나 포커스만 옮겨도 보상·위험·이후 경로가 뜬다. 지도를 읽고 계획하는 게 지도의 일이라 닿지 않는 칸도 보여준다.
- **가는 것은 `이 경로로 간다` 버튼만 한다.** `onSelect(id)`는 이 버튼에서만 호출된다. `reachableIds`에 없는 칸을 보고 있으면 버튼 대신 `아직 닿지 않는 칸이다` 안내가 뜬다.
- `reachableIds`에 없는 노드는 `aria-disabled="true"`에 `.is-locked`다. `disabled` 대신 `aria-disabled`를 쓴 이유는 키보드로 지도 전체를 훑을 수 있게 두기 위해서다.
- 키보드: roving tabindex. 방향키로 줄과 칸을, `Home`/`End`로 그 줄의 양 끝을 오간다. 이동은 배열 순서가 아니라 칸 번호를 따라가므로 lane 지도에서도 좌우가 화면과 같다. 포커스는 `:focus-visible` 외곽선으로 보인다.
- 스크린 리더: 칸마다 `aria-describedby`로 `이름 · 보상 · 위험 · 갈 수 있는지`를 붙인다. 포커스만 옮겨도 읽힌다. 미리보기 패널은 `aria-live="polite"`라 눌러서 바꿨을 때도 읽힌다.
- 엔진은 노드를 고른 순간 `reachableIds`를 비우고, 전투가 끝난 뒤 `completeRunNode()`에서 다음 갈래를 채운다. 그 사이에는 지도의 모든 칸이 잠긴 상태로 보이므로, 통합 이슈 #6에서 지도를 언제 띄울지 정해야 한다.
- 반응형: 390×844 / 360×740은 한 칸 세로 배치, 1280×900은 지도와 미리보기 2단.

## fixture와 시각 확인

- `v10-fixture.html` + `src/duel/v10-fixture.jsx`가 엔진 없이 세 컴포넌트를 렌더한다. `vite.config.js`의 입력에 넣지 않았으므로 **프로덕션 빌드에는 들어가지 않는다.**
- fixture 값은 `codex/v10-engine-map`의 출력 모양을 그대로 베꼈다. 3막 21노드 지도, 엔진 phase 이름, 엔진 피해 키를 쓴다.
- 스크린샷은 `scripts/v10-ui-shot.mjs`가 390×844 / 360×740 / 1280×900을 찍고 콘솔 오류를 센다. 오류가 하나라도 있으면 종료 코드가 1이다.
- playwright는 이 저장소의 의존성이 아니다. `package.json`과 lock을 건드리지 않으려고 뺐다. 찍을 때만 임시로 넣는다.

```
npm install --no-save playwright
npx vite --port 5199 --strictPort &
node scripts/v10-ui-shot.mjs .qa-v10
```

## 통합 전에 반드시 맞춰야 하는 것

엔진의 `selectV10Combat()`은 지금 이 모양을 돌려준다.

```
{choice:'contact', actualPitch:7, verdict:'2루타', damage:18, hpAfter:54}
```

`CombatResultSummary`는 `choice`와 `actualPitch`를 **화면에 그대로 적는다.** 위 값을 그냥 넘기면
`내 선택: contact`, `실제 공: 7`이 찍힌다. `v10-storage.js`의 `validateV10State()`가
`actualPitch`를 0~9 정수로, `choice`를 문자열로 **강제**하고 있어 저장 계약도 이 모양에 묶여 있다.

통합(#6)에서 둘 중 하나를 해야 한다.

1. 연결부에서 `{card: CARDS[choice].name, zone: ZONES[aimZone]}`와 `{type, zone: ZONES[actualPitch]}`로 옮긴다. UI는 그대로 둔다.
2. 엔진이 `lastCombat`에 표시용 이름을 같이 실어 보낸다. 저장 검증도 같이 늘린다.

UI 쪽은 1번을 가정하고 있다. `zone` 이름표(`ZONES`)는 `cards.js`에 있고 이 셸은 그걸 import하지 않으므로,
옮기는 일은 UI 파일 안에서 할 수 없다.

## 카피

`v10-copy.js`에 모두 모아 둔다. 핵심 선택지에 영어를 쓰지 않고, `역할/축/산출/빌드` 같은 기획 용어도 쓰지 않는다.
노드 설명은 `무엇을 한다 → 무엇을 얻는다 → 무엇을 지불한다` 순서로 적는다. 지도 CTA는 `이 경로로 간다`.
