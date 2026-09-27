# 안티그래비티 작업 큐

> 규칙: [`docs/ANTIGRAVITY-LOOP.md`](../ANTIGRAVITY-LOOP.md). 한 바퀴에 **맨 위 `[ ]` 항목 하나만**.
> 상태: `[ ]` 대기 · `[~]` PR 열림 · `[x]` 머지됨 · `[!]` 막힘.
>
> **현재 PHASE 1은 세로 전투 대표 화면 하나만 완성한다.**
> 기준: `docs/art/benchmark/target/battle-portrait.png`
> PHASE 1 QUALITY-BAR 통과 전에는 지도·보상·타이틀·도감·엔딩의 신규 시각 작업을 시작하지 않는다.

## PHASE 1 — BATTLE PORTRAIT MASTERPIECE LOCK

공통 완료 기준:
- 412×743 세로 전투가 목표 목업 대비 §11 블라인드 비교에서 **IMPROVED**
- 전체 전투 화면 8축 평균 4.3 이상, 모든 축 4 이상을 최종 게이트로 사용
- 844×390 / 1440×900 회귀 없음
- 게임 수치·저장·전역 CSS 변경 금지
- 기존 승인 에셋 우선 재사용, **없는 production art는 §10으로 직접 생성**
- 한 PR = 한 항목

### 1. HERO ACTOR — 가장 큰 차이부터

- [ ] P1-01 B3 BATTER READY MASTER 생성·검수
  - 무엇: 목표 목업과 같은 대형 어깨너머 타자의 MASTER ready 포즈 1장을 직접 생성한다. 기존 타자 자산과 목업을 먼저 비교하고, 중복/저품질이면 새 MASTER로 교체 후보를 만든다.
  - 완료 기준: 같은 화면에 합성했을 때 왼쪽 약 45%의 hero actor로 읽힘 · 얼굴/체형/유니폼/카메라 고정 가능 · placeholder 느낌 없음 · 모바일 축소 판독 가능.
  - 건드려도 되는 곳: docs/art/gemini/, assets/ui-kit/raw/, assets/ui-kit/batter/, work/asset-fix/
  - 주의: READY가 PASS하기 전 나머지 9포즈 생성 금지.

- [ ] P1-02 B3 타자 나머지 9포즈 생성 + 동일성 QA
  - 무엇: PASS된 READY를 reference master로 사용해 load → trigger → swing-start → swing-mid → contact → follow-through-early → follow-through-late → finish → settle 생성.
  - 완료 기준: 같은 인물/체형/유니폼/카메라/픽셀 밀도 · canvas/anchor 일치 · 배트/얼굴 파손 없음 · 포즈만 달라짐.
  - 건드려도 되는 곳: assets/ui-kit/raw/, assets/ui-kit/batter/, scripts/asset-fix.mjs 관련 설정.

- [ ] P1-03 T9 대형 어깨너머 타자 실제 런타임 삽입
  - 무엇: B3 10포즈를 Pixi `BallparkActors`에 매핑하고, 세로에서 타자 왼쪽 약 45%, 투수는 마운드 중앙 뒤. 기존 스윙 타임라인은 유지하며 공 궤적/접점 원점을 새 타자에 맞춘다.
  - 완료 기준: 10포즈가 실제 플레이에서 끊김 없이 읽힘 · 투수 가림 없음 · contact가 가장 강한 순간 · 412×743에서 목업의 hero composition에 접근.
  - 건드려도 되는 곳: BallparkActors.jsx, BallparkBattle.jsx, ballpark.css의 actor 범위, App.jsx 포즈 import, 관련 테스트.

### 2. CORE TACTICAL READABILITY

- [ ] P1-04 T2 9ZONE 유리 셀 + CONNECT 금빛 선 + 위험 칸
  - 무엇: 푸른 유리 셀, 금빛 순서 토큰, CONNECT 발광선, BREAK/위험 빨강을 목업 수준으로 구현. 확률 숫자는 유지.
  - 완료 기준: 타자/투수 다음으로 시선이 즉시 9ZONE에 감 · 412×743에서 번호/확률 가독.
  - 건드려도 되는 곳: ballpark.css .bp-zone/.bp-cell/.bp-token, ZoneLinks.jsx, 관련 테스트.

- [ ] P1-05 T3 투수 칭호 + 이름 + HP 가로 게이지
  - 무엇: 칭호+이름, 가로 HP, 최근 피해 표시, 흔들림 상태를 한 모듈로 통합.
  - 완료 기준: 목업과 같은 정보 위계 · 투수 얼굴/몸 비가림 · HP 변화가 즉시 읽힘.
  - 건드려도 되는 곳: BallparkBattle.jsx ptag, ballpark.css .bp-ptag, 관련 테스트.

### 3. CARD + DECISION AREA

- [ ] P1-06 B1 카드 핵심 4종 일러스트 생성
  - 무엇: 현재 첫 손에서 대표적으로 보이는 공격/정확/컨택/파워 역할의 4종부터 production illustration 생성. 기존 카드 프레임은 재사용하고 **아트 슬롯만** 만든다.
  - 완료 기준: 이름을 읽기 전에도 역할 차이가 느껴짐 · 목업 카드 밀도와 동급 · 카드 프레임과 같은 세계관.
  - 건드려도 되는 곳: assets/ui-kit/cards/, docs/art/gemini/, 관련 manifest.
  - 주의: 한 장짜리 카드 전체를 이미지로 만들지 말고 art slot 자산만 생성.

- [ ] P1-07 T4 카드 프레임/정보 구조 + 4종 아트 실제 연결
  - 무엇: 좌상단 배지, 아트 슬롯, 이름, 태그 2개, 설명 2줄, 선택 시 금테+들림. P1-06 아트를 실제 연결.
  - 완료 기준: 412×743에서 4장 전부 보임 · 글자 12px 이상 · 선택 카드가 한눈에 읽힘.
  - 건드려도 되는 곳: BallparkBattle.jsx cardButton, ballpark.css .bp-card, 관련 테스트.

- [ ] P1-08 T5 휘두른다 / 지켜본다 대형 행동 버튼
  - 무엇: 목표 목업의 강한 하단 2버튼 구조 구현. 기존 승인 A-series/버튼 에셋이 있으면 재사용.
  - 완료 기준: 엄지 영역 ≥64px · 휘두른다가 primary, 지켜본다가 secondary로 즉시 구분.
  - 건드려도 되는 곳: .bp-verbs/.bp-verb, 관련 테스트.

### 4. COACH + HUD

- [ ] P1-09 B2 코치 초상 생성 + T8 대사판 연결
  - 무엇: 목업의 코치 초상 1장 production asset 생성 후 초상 슬롯 + COACH 라벨 + 대사판으로 연결.
  - 완료 기준: 텍스트 잘림 없음 · 캐릭터/투수/타자와 같은 작품으로 보임.
  - 건드려도 되는 곳: assets/ui-kit/, BallparkBattle.jsx, ballpark.css .bp-coach, 관련 테스트.

- [ ] P1-10 T1 볼파크 상단 HUD
  - 무엇: 로고 · inning · BSO · 덱/버림 · 설정을 전투 화면 상단에 목업처럼 압축.
  - 완료 기준: 세로 공간을 과도하게 먹지 않음 · 지도/보상/타이틀 회귀 없음.
  - 건드려도 되는 곳: BallparkBattle.jsx, ballpark.css의 .bp-* 범위, 관련 테스트.

### 5. FEEDBACK / ANIMATION PAYOFF

- [ ] P1-11 타격 순간 polish — hit-stop / trail / impact / camera
  - 무엇: 기존 연출 인프라를 재사용해 투구→스윙→contact→finish가 하나의 액션으로 읽히게 한다. 필요한 VFX가 없으면 §10으로 단일 production VFX 생성.
  - 완료 기준: contact가 정지화면과 실제 플레이 모두 화면 최고점 · reduced-motion 대응 · 성능 예산 유지.
  - 건드려도 되는 곳: BallparkActors.jsx, presentation.js, ballpark.css/.bp-* 연출, VFX assets, 관련 테스트.
  - 건드리면 안 되는 곳: 판정 확률/피해/HP 공식.

- [ ] P1-12 T7 전투 결과 연출 — HOME RUN / 강판 우선
  - 무엇: 목업 수준의 홈런·강판 스플래시와 결과 타이포/VFX. 필요한 B5 production art가 없으면 직접 생성.
  - 완료 기준: 결과가 토스트가 아니라 '보상 장면'으로 읽힘 · 기존 연출 시간 계약 유지.
  - 건드려도 되는 곳: battle result overlay, VFX/splash assets, 관련 테스트.

### 6. FINAL PORTRAIT GATE

- [ ] P1-13 Battle Portrait Golden Pass
  - 무엇: 위 변경이 반영된 최신 통합 상태를 412×743에서 목표 `battle-portrait.png`와 블라인드 비교. 가장 약한 축을 최대 3회 자동 보정.
  - 완료 기준: QUALITY-BAR 평균 ≥4.3, 모든 축 ≥4.0 · 가로/PC 회귀 없음 · 실제 한 판에서 카드 선택→배치→스윙→결과까지 정상.
  - 결과: PASS이면 PHASE 2(가로/보상/지도 등) 큐를 새로 만든다. FAIL이면 가장 약한 축을 [auto] 항목으로 추가하고 PHASE 1을 계속한다.

---

## PHASE 2 — 잠금

PHASE 1의 P1-13이 PASS하기 전에는 신규 작업 금지.
회귀 확인을 위한 캡처/테스트만 허용.

후보: battle-landscape → reward → map → deck/dex → title/ending.
