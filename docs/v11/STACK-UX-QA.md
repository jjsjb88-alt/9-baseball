# V11 Stack Board UX QA

기준: `docs/V11-9ZONE-STACK-SYSTEM.md` / Issue #50

## 목표

9ZONE은 보조 미니맵이 아니라 **이번 공의 스윙을 설계하는 주 전술 보드**로 보여야 한다.

플레이어는 보드를 본 순간 다음을 1초 안에 읽을 수 있어야 한다.

- 현재 메인 카드가 어느 존에 있는가
- ②→③→④가 어떤 순서로 이어지는가
- 어느 링크가 CONNECT이고 어느 링크가 BREAK인가
- 현재 Stack의 BASE / CONNECT BONUS / FINAL HP 효율이 얼마인가
- 같은 카드를 유지한 채 순서를 바꿀 수 있다는 것

## 시각 계층

1. **3×3 보드**
   - 가장 먼저 읽혀야 한다.
   - ①은 금색 MAIN 토큰.
   - ②~④는 청록 SUPPORT 토큰.
   - 같은 존에 여러 장이 있으면 토큰이 한 셀 안에서 함께 보여야 한다.

2. **경로**
   - CONNECT: 밝은 민트 실선.
   - BREAK: 붉은 절단선.
   - 같은 존 반복은 루프 원으로 표현.

3. **결과**
   - `BASE → CONNECT → FINAL` 계산을 한 줄로 보여준다.
   - Final HP 효율은 금색으로 가장 강하게 강조.
   - CONNECT 수는 우상단 counter에 고정.

4. **SWING ORDER**
   - ① MAIN은 고정.
   - ②~④만 좌우 재배치.
   - 카드명 + 존 + 순번이 동시에 읽혀야 한다.

## 뷰포트 QA

### 390×844 portrait
- Stack Board는 가로 스크롤 없이 보드+결과가 한 화면 폭에 들어가야 한다.
- 제목 보조설명은 숨겨도 핵심 정보는 유지.
- 3×3 토큰은 최소 23px 수준으로 읽혀야 한다.
- SWING ORDER rail은 카드 수가 많으면 가로 스크롤 허용.
- 실행 버튼까지 도달하는 흐름을 막지 않는다.

### 844×390 landscape
- Stack Board는 세로 높이를 과도하게 먹지 않아야 한다.
- 3×3 보드는 약 160px 이하.
- link list는 한 줄 3열 형태로 압축 가능.
- order rail label 등 비핵심 장식은 숨겨도 된다.

### 1440×900 PC
- 보드가 모바일 UI를 단순 확대해 보이면 실패.
- 좌측 전술판 / 우측 계산·링크 정보의 2-column 구조를 유지.
- 3×3 보드와 route line이 시각 중심이어야 한다.

## 상호작용 QA

- 지원 카드 선택 → StackBoard 토큰과 route line 즉시 갱신.
- 지원 카드 aimZone 변경 → 해당 토큰이 새 셀로 이동.
- order ←/→ → 카드 자체는 유지되고 순서와 route line만 변경.
- BREAK가 CONNECT로 바뀔 때 Final HP 효율도 같은 프레임에서 갱신.
- MAIN 카드는 reorder 불가.
- support token/cell 선택은 해당 카드 편집 상태를 열 수 있어야 한다.

## 실패 기준

다음 중 하나라도 해당하면 다시 반복한다.

- 보드보다 텍스트가 먼저 읽힌다.
- CONNECT/BREAK가 색상 외에는 구분되지 않는다.
- 순서를 바꿀 수 있다는 사실을 처음 보는 사람이 알아차리기 어렵다.
- 같은 존 중첩 카드가 하나로 뭉쳐 보인다.
- 모바일 세로에서 Stack Board 때문에 실행 버튼이 지나치게 멀어진다.
- 디자인은 좋아졌지만 기존 `v11StackPlan` 계약과 다른 숫자를 보여준다.

## Integrator 연결 계약

`StackBoard.jsx` props:

- `plan`: `choice.stackPlan`
- `activeId`: 현재 `stackEdit`
- `onSelect(id)`: `setStackEdit(id)`
- `onMove(id, delta)`: `moveStackOrder(id, delta)`
- `damageRate`: `choice.damageRate`
- `baseDamageRate`: `choice.baseStackDamageRate`
- `connectBonus`: `choice.connectBonus`

기존 inline `.v11-stack-path`와 `.v11-order-controls`는 Integrator가 제거한다.

Animation hotfix 기준점: `main@e2b788a` 이후. `V4CanvasSprite`/animation path는 이 작업에서 수정하지 않는다.
