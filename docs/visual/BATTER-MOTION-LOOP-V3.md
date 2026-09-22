# BATTER MOTION LOOP V3 — 2026-09-22

## 사용자 최신 판정

V2 실제 프리뷰에 대한 최신 피드백:

> "스윙할때 약간 배트랑얼굴 그래픽 깨지는것같고, 부드럽다는 느낌보다는 끊어지는 느낌이 강해"

V3는 이 두 문제만 해결하기 위한 다음 루프다.

- **얼굴/헬멧 픽셀 파손 제거**
- **배트 왜곡·잔상 제거**
- **contact 전후 큰 점프 완화**
- **렌더 부하에서도 중간포즈가 실제 화면에 보이게 보장**

아직 60Hz 단계가 아니다. 좋은 키포즈 흐름을 먼저 통과시킨다.

---

## 작업 브랜치 / 프리뷰

- 작업 브랜치: `codex/batter-motion-loop-v3`
- 부모: `codex/batter-motion-loop-v2`
- V3 실제 플레이: `https://jjsjb88-alt.github.io/9-baseball/batter-v3/`
- V3 Cinema Lab: `https://jjsjb88-alt.github.io/9-baseball/batter-v3/?cinema=1`
- main 병합: **금지 — 사용자 확인 전 유지**

---

## V3 10포즈 계약

`ready → load → trigger → swing-start → swing-mid → contact → follow-through-early → follow-through-late → finish → settle`

V2의 8포즈에서 가장 변화량이 컸던 두 구간에 bridge pose를 추가했다.

- `swing-mid`: swing-start와 contact 사이
- `follow-through-late`: early follow-through와 finish 사이

승인된 V1 앵커 4장은 그대로 유지한다.

- `assets/batter-reboot-v1/batter-ready.png`
- `assets/batter-reboot-v1/batter-trigger.png`
- `assets/batter-reboot-v1/batter-contact.png`
- `assets/batter-reboot-v1/batter-finish.png`

V3 intermediate 6장:

- `assets/batter-reboot-v3/batter-load.png`
- `assets/batter-reboot-v3/batter-swing-start.png`
- `assets/batter-reboot-v3/batter-swing-mid.png`
- `assets/batter-reboot-v3/batter-follow-through-early.png`
- `assets/batter-reboot-v3/batter-follow-through-late.png`
- `assets/batter-reboot-v3/batter-settle.png`

모든 자산은 192×192 PNG다.

---

## 그래픽 깨짐 수정 방식

V2의 문제는 중간포즈 생성 시 배트를 지우는 넓은 geometric mask가 얼굴/헬멧 픽셀과 겹칠 수 있다는 점이었다.

V3의 `scripts/generate-batter-motion-v3.py`는 다음 원칙을 고정한다.

1. **몸통**
   - nearest-neighbour landmark warp만 사용.
   - blur / bilinear 재샘플링 금지.

2. **배트**
   - 전체 노출 bat tube를 별도 rigid layer로 분리한다.
   - 원본 배트 픽셀을 similarity transform으로 회전/이동한다.
   - 배트를 몸과 함께 늘이거나 휘지 않는다.
   - grip/얼굴 보호영역을 mask에서 제외한다.

3. **얼굴/헬멧**
   - 깨끗한 source head를 별도 layer로 보관한다.
   - body warp 뒤 마지막에 다시 overlay한다.
   - 얼굴 픽셀이 body/bat warp의 희생물이 되지 않게 한다.

4. **ghost barrel**
   - 초기 V3 palette-only 분리는 일부 어두운 배트 픽셀을 원위치에 남겼다.
   - 현재는 protected full-tube extraction으로 바꿔 follow-through의 이중 배트/잔상을 제거한다.

procedural/block batter renderer로 회귀하지 않는다.

---

## 끊김 수정 방식

런타임은 여전히 authored PNG key pose 방식이다.

`src/duel/App.jsx`의 V3 player는:

- 한 번에 한 authored pose만 예약한다.
- 각 pose를 `flushSync`로 DOM에 먼저 commit한다.
- 그 다음 `requestAnimationFrame`으로 실제 browser paint를 한 번 기다린다.
- 그 뒤 다음 pose timer를 예약한다.

이유:
WebGL 부하가 큰 844×390에서 React가 sparse state update를 늦게 commit하면서
`follow-through-early`가 길게 붙잡히고 `follow-through-late`가 12ms만 보이는 현상이 실제 QA에서 발견됐다.

수정 뒤 실제 브라우저 trace에서는 해당 포즈가 다시 정상적으로 보인다.

**주의:** 이 구조는 60Hz interpolation이 아니다.
나쁜 키포즈를 고프레임으로 숨기지 않기 위한 key-pose validation 단계다.

---

## 실제 브라우저 QA

필수 뷰포트:

- 390×844
- 844×390
- 1440×900

Playwright QA는 아래를 자동 검증한다.

- 10포즈 순서 누락 없음.
- `swing-start / swing-mid / follow-through-early / follow-through-late`가 각각 실제 DOM에서 최소 28ms 이상 보임.
- 모든 runtime image natural size = 192×192.
- stand-in = 0.
- WebGL2 renderer active.
- page error = 0.
- 각 viewport에서 10개 정적 pose 캡처.
- live `swing-mid` 캡처.
- contact trace 존재.

최근 실브라우저 검수에서 세 뷰 모두 `failures: []`을 기록했다.

대표 dwell 예시(844×390):
- swing-start: 약 237ms
- swing-mid: 약 100ms
- contact: 약 201ms
- follow-through-early: 약 487ms
- follow-through-late: 약 125ms
- finish: 약 224ms

렌더 부하 때문에 전체 속도는 늘어날 수 있지만 **중간 실루엣 자체가 삭제되면 안 된다.**

---

## 자동 검증

- 전체 Vitest: 통과
- smoke reports: 통과
- production build: 통과
- 10× 192×192 asset verification: 통과
- real-browser 3 viewport capture: 통과

QA workflow:
- `.github/workflows/batter-motion-loop-v3-qa.yml`
- concurrent run의 bot push 충돌을 막기 위해 V3 QA는 serialize/cancel-in-progress하며 evidence push 전에 rebase한다.

---

## 현재 판정

### 개선된 점
- V2에서 보이던 얼굴/헬멧 파손 위험을 구조적으로 분리했다.
- 배트를 rigid layer로 유지한다.
- contact 전후 bridge pose가 생겨 V2보다 궤적 변화량이 작다.
- 844×390에서도 sparse pose가 React batching으로 사라지지 않는다.
- 10포즈가 실제 브라우저 trace에서 모두 관찰된다.

### 아직 금지
- main merge 금지.
- 60Hz 완료 선언 금지.
- procedural/block renderer 회귀 금지.
- 테스트 성공만으로 최종 visual PASS 선언 금지.

### 다음 판정
사용자가 `/batter-v3/` 실제 플레이를 확인한다.

사용자가 그래픽 무결성과 키포즈 흐름을 통과시키면 그때만
**10 authored anchors 사이를 연결하는 60Hz continuation**으로 확장한다.

---

## 다음 세션 첫 행동

1. `HANDOFF.md` 최상단을 읽는다.
2. 이 문서를 읽는다.
3. `codex/batter-motion-loop-v3`를 확인한다.
4. V3 Pages를 실제로 본다.
5. 사용자 새 피드백이 있으면 V3 키포즈/타이밍을 먼저 수정한다.
6. 사용자 확인 전 main에 merge하지 않는다.
7. static/key-pose visual PASS 전에는 60Hz로 넘어가지 않는다.

## 한 줄 미션

**얼굴과 배트의 픽셀 무결성을 유지한 채, contact 전후의 실제 스윙 궤적이 끊기지 않게 읽히는 authored motion loop를 완성한다.**
