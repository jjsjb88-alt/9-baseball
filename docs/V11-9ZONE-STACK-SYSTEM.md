# V11 — 9ZONE STACK SYSTEM

> **Source of truth for all sessions.**  
> 2026-09-19 이후 9ZONE HOMEBOUND의 최우선 제품 방향은 이 문서다.

## 0. 제품 문장

**투수의 의도를 읽고, 9존 위에 카드를 순서대로 배치해 하나의 스윙을 설계하고, 투수를 무너뜨리는 야구 덱빌딩 로그라이트.**

V11은 기존 Swing Stack을 없애지 않는다.  
기존의 “여러 장 = 넓은 커버 / 낮은 HP 피해 효율”을 **배치 위치 + 순서 + 연결**이 중요한 대표 메커니즘으로 승격한다.

---

## 1. 레퍼런스에서 가져오는 문법

### Stack Order
- 같은 카드 묶음이라도 **쌓는 순서**가 결과를 바꾼다.
- 카드가 단순 소비재가 아니라 하나의 실행 시퀀스를 만든다.

### ON&OFF
- 행동 문법이 짧고 명확하다.
- 9ZONE의 문법은 **READ → PLACE → CONNECT → SWING**으로 고정한다.

### Hell Deck
- 보드가 단순 조준 UI가 아니라 전투의 중심이다.
- 9존 자체가 플레이어가 스윙을 조립하는 전장이어야 한다.

### Grail / boss duel references
- 상대는 HP만 다른 적이 아니라 내가 조립하는 방식을 바꾸는 규칙이어야 한다.

### 9ZONE 고유 번역
- 공간: 3×3 스트라이크 존.
- 순서: 메인 카드부터 지원카드까지의 Swing Order.
- 연결: 이전 카드의 노림존과 다음 카드의 노림존이 인접하면 CONNECT.
- 실행: 완성된 Stack을 한 번의 60Hz 타격 시퀀스로 Resolve.

---

## 2. V11 핵심 루프

1. **READ** — 투수 의도 / 경향 / 스카우팅 정보를 읽는다.
2. **PLACE** — 메인 타격 카드를 9존에 놓는다.
3. **STACK** — 최대 3장의 공격 카드를 더 배치한다.
4. **ORDER** — 지원 카드 순서를 바꿔 스윙 경로를 설계한다.
5. **CONNECT** — 연속 카드의 존이 인접하면 연결 보너스를 얻는다.
6. **PREVIEW** — 커버, 연결 수, HP 피해 효율, 예상 결과를 즉시 확인한다.
7. **SWING** — 카드가 ①→②→③→④ 순서로 연쇄 발동한 뒤 실제 투구를 공개하고 타격한다.

한 투구에서 생각해야 할 핵심 질문은 하나다.

> **“이 공을 잡기 위해 어떤 순서와 경로로 스윙을 만들 것인가?”**

---

## 3. V11.1 — 최우선 적용 계약

### 3.1 카드 수
- 메인 1장 + 지원 최대 3장.
- 기존 `V10_SWING_STACK_MAX = 4` 계약 유지.
- BASIC SWING / 번트 / patience one-zone은 Stack 불가 계약 유지.

### 3.2 CONNECT 판정
- 메인 카드의 `aimZone`에서 시작한다.
- 지원카드는 배열 순서대로 ②, ③, ④가 된다.
- 이전 카드와 다음 카드의 aimZone이 **3×3 보드에서 인접**하면 CONNECT.
- 인접은 가로/세로/대각선 8방향을 포함한다.
- 같은 존에 겹쳐 놓는 것도 CONNECT로 본다.
- 순서를 바꾸면 같은 카드와 같은 존을 써도 CONNECT 수가 달라질 수 있다.

### 3.3 HP 피해 효율
기존 카드 수 패널티를 유지한다.

- 1장 100%
- 2장 80%
- 3장 65%
- 4장 50%

V11.1에서는 **연결 1개마다 +7%p 회복**한다.

예:
- 2장 + 1 CONNECT → 87%
- 3장 + 2 CONNECT → 79%
- 4장 + 3 CONNECT → 71%

이 보너스는 “카드를 더 쓰면 무조건 이득”을 만들지 않는다.  
4장 완전 연결도 단독 스윙보다 약하다.

### 3.4 지원 카드 적중
- V11.1에서는 기존 계약을 유지한다.
- 메인 카드 커버 적중: 메인 카드의 hit profile.
- 지원 카드 커버에만 적중: 단타.
- 순서 효과로 장타까지 변형하는 것은 V11.2 이후.

### 3.5 UI 필수
- 현재 Stack을 **① MAIN → ② → ③ → ④**로 명시한다.
- 지원 카드마다 **앞으로 / 뒤로** 순서를 바꿀 수 있다.
- 3×3 미니 보드에 카드 순번을 표시한다.
- 각 연결 사이에 `CONNECT` 또는 `BREAK`를 표시한다.
- Preview에는 최소 다음을 동시에 보여준다.
  - 전체 커버 수
  - 카드 소비 수
  - CONNECT 수
  - 기본 HP 효율
  - CONNECT 회복
  - 최종 HP 효율

### 3.6 연출 필수
- SWING 실행 시 카드 resolve는 반드시 ①→②→③→④의 순서를 따른다.
- V11.1은 엔진/UI 계약 우선이며 resolve 연쇄 애니메이션은 V11.2의 별도 작업으로 분리한다.
- 기존 GM08 60Hz actor rig를 제거하거나 frame-step 구조로 되돌리지 않는다.

---

## 4. 이후 확장 — V11.2+

### 카드 역할 문법
향후 공격카드를 SETUP / CONTROL / CONTACT / FINISHER 성격으로 확장한다.
현재 `CARDS[*].role`을 마이그레이션 입력으로 활용할 수 있으나 V11.1에서 밸런스를 한 번에 뒤집지 않는다.

### 순서 기반 카드 효과
예:
- 첫 카드가 범위 카드면 다음 카드 aim 보정.
- 마지막 카드가 장타 카드면 완전 CONNECT일 때 power 보너스.
- 생존 카드는 BREAK 1회를 파울로 완충.
- 진루 카드는 연결된 지원 적중의 주자 진루 강화.

### 투수 카운터 룰
예:
- Sinker: 아래쪽 CONNECT를 끊거나 낮은 존에서 효율 변화.
- High Heat: 높은 존 마지막 카드 강화/위험.
- Control Artist: 같은 존 2장 이상을 카운터.
- Closer: 3번째 이후 카드 효율 급락.

이 단계는 **V11.1의 순서/연결 계약이 실제 플레이에서 재미가 있는지 확인한 뒤** 진행한다.

---

## 5. 다른 세션 작업 분장 / 충돌 방지

### INTEGRATOR — 현재 세션
소유:
- `src/duel/engine.js`
- `src/duel/App.jsx`
- V11.1 통합 테스트
- 최종 PR / merge / deploy

다른 세션은 INTEGRATOR PR이 열린 동안 위 두 파일을 직접 수정하지 않는다.

### SESSION B — Stack Board UX
충돌 없이 작업 가능:
- 새 파일 `src/duel/StackBoard.jsx`
- 새 파일 `src/duel/v11-stack.css`
- `docs/v11/STACK-UX-QA.md`

목표:
- 3×3 보드에서 ①②③④와 CONNECT/BREAK를 한눈에 읽게 만들기.
- 모바일 세로 / 가로 / PC 각각의 시각 계층 정의.
- App.jsx 연결은 INTEGRATOR가 담당.

### SESSION C — Balance / Simulation
충돌 없이 작업 가능:
- `scripts/report-v11-stack.mjs`
- `tests/v11-stack-balance.test.js`
- `docs/v11/BALANCE.md`

목표:
- 1/2/3/4장 사용률.
- CONNECT 0~3 분포.
- 최종 damageRate 분포.
- 지원 카드가 무조건 정답이 되는지 검사.

### SESSION D — Resolve Presentation
V11.1 merge 이후 시작:
- 새 `src/duel/StackResolve.jsx`
- 새 `src/duel/stack-resolve.css`
- 기존 GM08 actor rig는 읽기만 하고 수정하지 않는다.

목표:
- ①→②→③→④ 0.4~0.7초 resolve.
- 카드 발동 소유권 → zone trace → 실제 타격으로 시선 이동.
- 파티클 수가 아니라 타이밍으로 연출한다.

### 공통 규칙
- 작업 시작 전에 이 문서와 `AGENTS.md`를 읽는다.
- 각 세션은 자기 이슈 번호를 PR 본문에 적는다.
- 공용 파일을 건드려야 하면 먼저 이슈에 이유를 남기고 INTEGRATOR merge 이후 rebase한다.
- 오래된 PR #1은 V11과 무관하므로 사용하지 않는다.

---

## 6. 완료 판정

V11.1은 아래가 모두 만족되어야 완료다.

- 같은 카드/존 조합도 순서를 바꾸면 CONNECT 결과가 달라지는 테스트 존재.
- Preview와 실제 pitcher HP damageRate가 같은 Stack Plan을 사용.
- 지원카드 순서를 UI에서 직접 변경 가능.
- 3×3 Stack Path 보드에서 순번과 연결 상태가 보임.
- 기존 카드 소비 / 저장 / 맵 / 보상 계약 회귀 없음.
- 모바일 세로 / 저높이 가로에서 Stack UI가 전투 화면을 잠그지 않음.
- 전체 테스트 / smoke / production build 성공.
- Pages 배포 성공.

**테스트 통과만으로 재미가 증명되지는 않는다.**  
배포 뒤 실제 플레이에서 “순서를 바꾸고 싶은 이유가 생기는가?”를 다음 판단 기준으로 삼는다.
