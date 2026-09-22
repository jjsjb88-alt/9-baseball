# 9ZONE SHOWDOWN — Codex 인수인계

## 최우선 인수인계 — BATTER MOTION LOOP V3 · 2026-09-22

**사용자 최신 판정: "스윙할때 약간 배트랑얼굴 그래픽 깨지는것같고, 부드럽다는 느낌보다는 끊어지는 느낌이 강해"**

이 피드백을 V2보다 우선한다.

새 세션은 먼저 아래를 읽는다.

1. `docs/visual/BATTER-MOTION-LOOP-V3.md`
2. `docs/visual/BATTER-MOTION-LOOP-V2.md`
3. `docs/visual/BATTER-ASSET-LOOP-V1.md`
4. `VISUAL-REBOOT-LOOP-ENGINEERING.md`
5. `AGENTS.md`

### 현재 브랜치 / 확인 링크

- 작업 브랜치: `codex/batter-motion-loop-v3`
- 부모: `codex/batter-motion-loop-v2`
- 실제 플레이: `https://jjsjb88-alt.github.io/9-baseball/batter-v3/`
- Cinema Lab: `https://jjsjb88-alt.github.io/9-baseball/batter-v3/?cinema=1`
- **main은 건드리지 않는다. 사용자 확인 전 merge 금지.**

### V3 핵심

V2 8포즈를 다음 10포즈로 확장했다.

`ready → load → trigger → swing-start → swing-mid → contact → follow-through-early → follow-through-late → finish → settle`

핵심 변경:
- 승인된 V1 ready / trigger / contact / finish 앵커는 유지.
- V3 intermediate는 `assets/batter-reboot-v3/`.
- 얼굴/헬멧은 clean source layer를 다시 덮어써 warp 파손 방지.
- 배트는 body warp에 섞지 않고 protected rigid layer로 분리/회전.
- follow-through의 ghost barrel 잔상도 full-tube extraction으로 제거.
- runtime은 한 pose씩 `flushSync` commit → `requestAnimationFrame` paint → 다음 pose 예약.
- 투수 V4 60-frame playback은 보호.

### 실제 QA

필수 뷰포트:
- 390×844
- 844×390
- 1440×900

현재 real-browser QA에서 세 뷰 모두:
- 10포즈 순서 관찰
- intermediate pose 최소 노출시간 기준 통과
- 192×192 runtime art 확인
- stand-in 0
- WebGL2 active
- page error 0
- `failures: []`

전체 Vitest / smoke / production build도 통과했다.

### 현재 판정

**V3는 사용자 재검수용 candidate다.**

자동 QA 성공만으로 최종 visual PASS라고 선언하지 않는다.
사용자가 `/batter-v3/` 실제 플레이에서 얼굴·배트 무결성과 모션 흐름을 확인해야 한다.

통과 전:
- 60Hz 보간/재생 확장 금지.
- main merge 금지.
- procedural/block batter 회귀 금지.

사용자에게 추가 피드백이 오면 V3 키포즈/타이밍을 먼저 수정한다.

---


## 최우선 인수인계 — BATTER MOTION LOOP V2 · 2026-09-21

**사용자 최신 판정: "그냥 서있는 모습만 반복되는 것 같다."**

이 판정을 최우선으로 적용한다.

새 세션은 어떤 기능 추가보다 먼저 아래 문서를 읽고 즉시 이어서 작업한다.

1. `docs/visual/BATTER-MOTION-LOOP-V2.md`
2. `docs/visual/BATTER-ASSET-LOOP-V1.md`
3. `VISUAL-REBOOT-LOOP-ENGINEERING.md`
4. `AGENTS.md`

### 현재 작업 브랜치

- 작업 브랜치: `codex/batter-motion-loop-v2`
- 부모: `codex/batter-asset-loop-v1`
- V1 확인용 프리뷰: `https://jjsjb88-alt.github.io/9-baseball/batter-v1/`

### 현재 판정

V1은 새 authored batter art를 실제 게임에 넣는 데는 성공했지만,
실제 플레이에서는 `idle / trigger / contact / finish` 포즈 전환만 보여
**스윙이 아니라 정지 이미지 반복처럼 읽힌다.**

따라서:
- V1 visual PASS 아님.
- main 병합 금지.
- 60Hz 완성 선언 금지.
- procedural/block batter로 회귀 금지.

### 다음 작업의 단일 목표

**타자가 실제로 스윙하는 것처럼 보여야 한다.**

최소 8단계:
`ready → load → trigger → swing-start → contact → follow-through-early → finish → settle`

현재 4개 앵커:
- `assets/batter-reboot-v1/batter-ready.png`
- `assets/batter-reboot-v1/batter-trigger.png`
- `assets/batter-reboot-v1/batter-contact.png`
- `assets/batter-reboot-v1/batter-finish.png`

추가 authored pose:
- load
- swing-start
- follow-through-early
- settle

정적/키포즈 흐름이 실제 모바일 화면에서 통과한 뒤에만 60Hz 보간/재생으로 확장한다.

### 필수 QA

- 390×844
- 844×390
- 1440×900

각 뷰에서 ready / swing-start / contact / finish를 직접 확인한다.

다음이 모두 충족되어야 통과:
- 더 이상 서있는 그림 반복처럼 보이지 않음.
- trigger→contact 가속이 읽힘.
- contact 순간이 분명함.
- 하체→몸통→손→배트 흐름이 연결됨.
- finish가 contact의 결과처럼 보임.
- 배트 순간이동 없음.
- 발/기준선 흔들림 없음.
- 투수와 같은 게임 세계에 속해 보임.
- 모바일 가독성 유지.

**테스트/빌드 성공은 visual PASS의 증거가 아니다. 사용자 확인 전 merge 금지.**

---

## 최우선 인수인계 — VISUAL RESET · 2026-09-20

**새 세션은 어떤 기능 추가보다 먼저 아래 4개를 이 순서로 읽는다.**

1. `VISUAL-REBOOT-LOOP-ENGINEERING.md`
2. `AGENTS.md`
3. GitHub Issue #22 `[VISUAL REBOOT] 레퍼런스 기준 Loop Engineering 완주`
4. `docs/V11-9ZONE-STACK-SYSTEM.md`

### 사용자 최신 판정 — 반드시 최우선 적용

현재 라이브 모바일 화면의 타자/투수 아트는 **마스터피스급 픽셀아트 기준 미달**이다.
최근 기능/연출 개선이 많았지만 캐릭터 본체의 퀄리티가 기준 문서가 요구하는 수준에 도달하지 못했다.

특히:
- 타자가 큰 블록 덩어리처럼 읽히고 실루엣/체중 이동/배트 존재감이 약하다.
- 타자와 투수의 아트 밀도와 비율이 서로 달라 같은 작품 안의 캐릭터처럼 보이지 않는다.
- UI/경기장보다 핵심 배우가 더 낮은 품질로 보여 화면 전체의 완성도를 끌어내린다.
- “2D 도트풍” 자체가 목표가 아니다. **고밀도·고완성도·마스터피스급 픽셀아트**가 목표다.

### 절대 품질 기준

새 세션은 새 아트지시서를 만들지 말고 **기존 `VISUAL-REBOOT-LOOP-ENGINEERING.md`를 단일 기준으로 재실행**한다.

해당 문서의 다음 규칙을 임의로 완화하지 않는다.
- 기존 스프라이트 확대/축소·CSS 필터만으로 완료 처리 금지.
- 머리/몸통/팔다리가 사각 블록으로 읽히는 임시 도트 금지.
- 강한 캐릭터 실루엣, 읽히는 키포즈, 명백한 체중 이동 필수.
- 최소 3단계 이상 명암 구조.
- 타자: idle / load / trigger / swing start / contact / follow through / miss-foul / big-hit-homer.
- 투수: set / windup / leg lift / stride / release / finish / strikeout-dominant accent.
- 싱커형 / 높은 공형 / 클로저형은 **색상 스왑이 아니라 실루엣과 릴리스 폼 자체로 구분**.
- 캐릭터 아트 + 포즈 전환 + 카메라/VFX + 반응형 크기를 한 묶음으로 검토.
- 모바일 세로 / 모바일 가로 / PC Before-After와 타자·투수 클로즈업 비교 없이는 완료 선언 금지.

### PR #80 / GM11 처리 지침

현재 main은 `a17ef3cf9a580f74c024295c2d7ea8b1d39ac018`이며 PR #80의 GM11 Batter Hero Pose Pass가 포함되어 있다.

**GM11은 기술적으로 병합·배포됐지만 아트 품질 완료로 인정하지 않는다.**
새 세션은 GM11의 192×192 SVG hero pose를 “완성 자산”으로 전제하지 말 것.
필요하면 교체·재제작·제거해도 된다.

중요:
- V4 Canvas 60Hz 재생 구조는 보호한다.
- `V4CanvasSprite`의 60Hz 보간/재생을 frame-step 방식으로 되돌리지 않는다.
- Adaptive Performance 예산을 우회하는 항상-on blur/particle을 추가하지 않는다.
- GM09/GM10의 Outcome Director / actor focus는 **좋은 아트를 보여주기 위한 연출 인프라**로 취급하고, 저품질 배우를 효과로 감추는 용도로 쓰지 않는다.

### 다음 세션의 첫 작업

**LOOP 1 — Batter Golden Master를 다시 연다.**

첫 작업은 기능 추가가 아니라:
1. 현재 라이브 타자 화면을 기준 문서와 대조해 실패 항목을 명시한다.
2. 타자 본체의 비율·실루엣·머리/어깨/골반·하체·손·배트 라인을 다시 설계한다.
3. 최소 idle / contact / homer / miss를 서로 명확히 다른 authored key pose로 재제작한다.
4. 작은 모바일 크기에서도 타자의 얼굴 방향, 손 위치, 배트 궤적, 하체 체중이 읽히는지 확인한다.
5. 실제 모바일 세로 390×844, 가로 844×390, PC 1440×900 비교 후 다음 루프로 넘어간다.

**새 기능, 추가 파티클, 새 STACK 기능, 새 카메라 효과를 먼저 만들지 않는다.**

### 완료 판정

테스트/빌드/배포 성공은 그래픽 품질의 증거가 아니다.
새 세션은 다음을 모두 충족해야만 Batter Golden Master 통과를 선언한다.

- 정지 화면 한 장만 봐도 타자가 임시 블록 도트처럼 보이지 않는다.
- 실루엣만으로 타격 자세와 무게중심이 읽힌다.
- contact / homer / miss가 몸의 방향과 관성만으로 구분된다.
- 타자와 투수의 비율·픽셀 밀도·팔레트가 같은 게임 세계에 속해 보인다.
- 모바일 세로/가로에서 캐릭터가 아이콘처럼 작아지거나 UI에 묻히지 않는다.
- Before / After 차이가 설명 없이도 즉시 보인다.
- 마지막에 전체 테스트 + smoke + production build + Pages 배포 확인을 한다.

---

## 최우선 인수인계 V11 · 2026-09-19

**모든 세션은 작업 전에 `docs/V11-9ZONE-STACK-SYSTEM.md`와 `AGENTS.md`를 먼저 읽는다.**

현재 최우선 제품 방향:
> 투수의 의도를 읽고, 9존 위에 카드를 순서대로 배치해 하나의 스윙을 설계하고, 투수를 무너뜨리는 야구 덱빌딩 로그라이트.

V11.1 계약:
- READ → PLACE → STACK → ORDER → CONNECT → PREVIEW → SWING.
- 메인 1 + 지원 최대 3장.
- 지원 배열 순서가 실제 Swing Order다.
- 이전 aimZone과 다음 aimZone이 8방향 인접/동일이면 CONNECT.
- 기존 피해 효율 100/80/65/50%를 유지하되 CONNECT 1개당 +7%p 회복.
- 지원 적중은 V11.1에서 기존처럼 단타.
- UI에서 지원 카드 순서를 직접 앞/뒤로 바꿀 수 있어야 한다.
- 3×3 미니 Stack Path 보드에 ①②③④와 CONNECT/BREAK가 보여야 한다.
- GM08 60Hz actor rig를 제거하거나 frame-step 방식으로 되돌리지 않는다.

병렬 작업 소유권:
- **INTEGRATOR(현재 세션)**: `engine.js`, `App.jsx`, 통합 테스트, merge/deploy.
- **SESSION B**: 새 `StackBoard.jsx`, `v11-stack.css`, Stack UX QA. App/engine 수정 금지.
- **SESSION C**: balance report/test/docs. App/engine 수정 금지.
- **SESSION D**: V11.1 merge 뒤 Stack Resolve 연쇄 연출.

공용 파일을 건드릴 필요가 있으면 먼저 이슈에 이유를 남기고 INTEGRATOR merge 이후 rebase한다.
오래된 PR #1은 V11 작업에 사용하지 않는다.

---

## 최우선 인수인계 V9.2 · 2026-09-15

현재 개발 브랜치는 `codex/v9-deckbuilder`, 제품 계약은 `docs/V9.md`다.
**main / 공개 Pages는 V8.10 안정본 그대로이며 V9.2는 아직 배포하지 않았다.**

제품 해석을 바꾸지 말 것:
- V8.10 세 덱은 초기덱이 아니라 완성형 체험/튜토리얼.
- MAIN RUN은 9장 공통 스타터 → 상대 선택 → 경기 → 카드 드래프트 → 시설 선택으로 성장한다.
- 고위험 상대는 실제 목표/투수 능력을 올리고, 앞선 3경기 승리 시 드래프트 4번째 후보를 연다. 지도 장식으로 축소하지 않는다.
- 카드 보상은 기본 3장 중 1장 또는 건너뛰기. 시설은 강화/제거/유물/임시 스카우팅을 분리한다.
- 스카우팅은 pending 실제 공을 공개하거나 재추첨하지 않는다.
- 커버 적중=안타 계약 유지. 적중 후 실패 확률을 되살리지 않는다.
- 기다림/연결/행운 성장을 MAIN RUN에 다시 강제로 붙이지 않는다.

가장 중요한 사용자 지시:
- **이 게임에서 연출은 최우선이다.** 머리를 쓰는 시간이 길기 때문에 읽음·맞춤·빗나감 등 판정 순간이 마스터피스급 보상이어야 한다.
- 판정을 다시 작은 로그/토스트 한 종류로 합치지 않는다.
- `src/duel/presentation.js`가 READ / 접촉 품질 / 실패 원인 / 상황별 판정과 각 타임라인의 단일 의미 표다.
- `src/duel/duel.css`의 `MASTER PRESENTATION` 절은 스캔, 히트스톱, 선택적 슬로모션, 충격 링, 전체 화면 셰이크, 속도선, 스파크, 존 비교, 공 궤적, 전광판/베이스 반응을 담당한다.
- Git 이력에서 `assets/sprites-v2/frames` 36장을 복구했다. App.jsx는 Vite glob으로 타자 스윙 12 / 미스 6 / 투수 투구 12 / 삼진 6을 실제 타임라인에 재생한다. 다시 3포즈 자산만 쓰는 구조로 퇴행시키지 않는다.
- `src/duel/PixelVFX.jsx`는 320×180 nearest-neighbor 캔버스 VFX 패스다. 파티클은 시작 시 한 번 생성해 프레임 간 물리 연속성을 유지한다.
- `src/duel/ArenaRenderer2.jsx`는 Renderer 2.0의 핵심이다. 외부 라이브러리 없이 native WebGL2를 사용하며 CSS 경기장은 fallback이다.
- Renderer 2.0은 6단 공간감, 카메라 줌/팬/틸트, 경기별 조명, 원근 공/그림자, 바닥 READ TRACE를 담당한다.
- 공 본체를 DOM/PixelVFX에 중복시키지 않는다. WebGL active면 WebGL이 core ball, PixelVFX는 trail/particle만 담당.
- CINEMA LAB의 R2 ON/OFF와 WEBGL 상태 뱃지를 삭제하지 않는다. 시각 QA에서 Legacy 2D와 직접 A/B 비교하는 계약이다.
- READ TRACE, 경기별 구장 색감, 라이벌 그레이딩, 도트 스미어/잔상/패럴랙스, 타구별 그림자·먼지·체공은 현재 품질 계약의 일부다.
- `src/duel/audio.js`는 판정별 합성 사운드를 갖고 저역 임팩트·노이즈·공기음·스테레오·홈런 스웰을 레이어한다. `src/duel/haptics.js`는 지원 모바일의 판정별 진동을 담당한다. 둘 다 실패가 전투를 막으면 안 된다.
- reduced-motion 계약은 transient FX를 60ms 안에 정리하는 것이다. 영구 결과 정보는 남긴다.

검증:
- 126/126 테스트.
- V9.2 30시드 full-run 완주율 0.233(7/30), 평균 최종 덱 10.5장.
- zone / V9 / showcase growth / deck-relic 리포트와 프로덕션 빌드 성공.
- 픽셀 시네마 기준 GitHub Actions run `34958791058` 성공: 125/125 테스트, V9/zone/growth/deck-relic 리포트, 프로덕션 빌드 통과.
- 자동 수치는 종료·저장·난도 회귀 기준이지 인간 재미·연출 완성도 증명이 아니다.

다음 우선순위:
1. 실제 모바일/데스크톱에서 READ → 맞춤 → 빗나감 → 홈런 연출을 사람 눈으로 검수한다.
2. 일반 판정 0.7~1.1초, 선택적 슬로모션 0.09~0.36초, 홈런/만루홈런 1.7~2.2초가 실제 폰에서 쾌감인지 피로인지 조정한다.
3. 이후에만 추가 연출(득점, 경기 승리, 라이벌 격파, 런 완주)을 같은 언어로 확장한다.
4. 시각 QA 전에는 main/Pages에 병합·배포하지 않는다.

---

## 최우선 인수인계 V8.10 · 2026-09-15

현재 코드 `5d1be77`은 main과 `codex/v8-release`에 push했고 Pages 배포도 완료했다.
Actions `34896681529` 성공 및 공개 사이트 동일 번들/첫 안타/저장 복원을 확인했다.
작업 트리는 원본 폴더 아래 `logs/v8-release`다. 원본 작업 디렉터리의 main+미커밋 V6.1 및
별도 level/deckEdits 실험은 수정하지 않았다. 그 코드를 다시 전체 병합하지 말 것.
배포 기준은 v8의 `plus` / `chooseReward` / version 8 계약이다.

읽는 순서: `docs/RELEASE-V8.10.md` → STATUS 최상단 → DECK/DUEL 최상단.
사용자 승인: “마스터피스를 완성해서 배포해줘”, 이어서 “계속 진행해”.
이번 변경의 main push와 Pages 배포는 승인 범위지만 자율 루프는 켜지 않는다.

주의: `information.js`는 공개 셀 범주/구간에서 확률의 하한·상한을 계산한다.
UI를 raw `previewCard.hit` 퍼센트로 바꾸면 낮은 읽기 등급의 정확 수치가 다시 샌다.
`knownPitchZones`는 명시적 관찰로 얻은 단서만 노출한다. 선택/미리보기/리로드로 pending 재추첨 금지.
유물 확정은 UI가 검증한 **같은 pending 보상 객체**를 엔진에 전달한다.
강화 설명은 `cardText`를 사용하며 원본 설명과 강화 설명을 모순되게 중복 표시하지 않는다.

다음: 실제 사용자 피드백을 먼저 기준으로 삼아 관찰 카드의 필수화, 연결 성장의 기회비용,
보상 3회의 충분성, 30분 목표를 검증한다. 자동 런의 승률을 인간 재미로 해석하지 않는다.

---

## 최우선 인수인계: v8.9 · 2026-09-13

읽는 순서: `docs/feedback/INBOX.md` 전체 → `docs/STATUS.md` v8.9 절. 아래 v8.8 절은
직전 이력이고, v8.7 이하는 아카이브에 있다.

INBOX 5번의 문서 아카이브를 완료했다. `HANDOFF.md`는 최신 인수인계 2개,
`README.md`는 최신 제품 안내 2개만 남겼다. 이전 내용은 각각
[`docs/history/HANDOFF-archive.md`](./docs/history/HANDOFF-archive.md)와
[`docs/history/README-archive.md`](./docs/history/README-archive.md)로 옮겼다.

본문 축소와 아카이브 생성은 `734a99f`에 체크포인트로 남겼다. 이동한 본문을 Git 원문과
대조했고 새 위치 기준 상대 링크가 모두 존재함을 확인했다. 본문 H2는 각각 2개이며
`git diff --check`가 통과했다. 현재 환경에는 브라우저가 없어 Markdown 렌더링 화면은
확인하지 못했고, 본문 전체와 아카이브 시작·끝을 직접 읽어 경계를 확인했다.

다음 세션은 INBOX 6번의 접근성 점검 한 건만 진행한다. 고칠 수 있는 발견만 구현하고,
나머지는 `docs/STATUS.md`에 미검증 또는 후속 작업으로 남긴다.

`deckbuilding-v8` 브랜치에 있으며 **push·배포하지 않았다.** `loop/PROMPT.md`가 푸시를 금지한다.

---

## 과거 v8.8 인수인계 · 2026-09-13

읽는 순서: `docs/feedback/INBOX.md` 전체 → `docs/STATUS.md` v8.8 절. 아래 v8.7 절과 그
이하는 역사다.

INBOX 4번의 마지막 `src/game` NIGHT RUN / CORE TEST 세대를 완료했다. 삭제 전
`src/main.jsx`에서 시작한 현행 그래프가 `src/duel` 내부와 `assets/duel`로만 이어지고,
`src/game`은 전용 검사·리포트 안에서만 닫혀 있음을 확인했다.

그 코드와 전용 검사 4개, 리포트 2개, package 명령, NIGHT RUN 전용 `src/styles.css`,
ignore 규칙을 `4bfb400`에서 제거했다. Git 이력으로 복구 가능하다. 삭제 후 현행
코드·검사·설정의 관련 참조는 0건이다. 설치된 Vitest 직접 실행 6파일·87개,
설치된 Vite 직접 빌드, `git diff --check`가 통과했다. Chrome 1440×1000 시작 화면을 직접 읽어
배경·타자·세 시작 덱·시드 입력·시작 버튼이 정상 렌더링되고 잘림·로드 실패가 없음을 확인했다.

다음 세션은 INBOX 5번의 문서 아카이브 한 건만 진행한다. 최신 2개 절을 본문에 남기고
역사를 아카이브로 옮기며 현행 링크와 이력을 모두 보존한다.

`deckbuilding-v8` 브랜치에 있으며 **push·배포하지 않았다.** `loop/PROMPT.md`가 푸시를 금지한다.

---

> v8.7 이하의 이전 인수인계는 [인수인계 아카이브](./docs/history/HANDOFF-archive.md)에 보존한다.
