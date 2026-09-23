# BATTER MOTION LOOP V2 — 2026-09-21

## 사용자 최신 판정

현재 `/batter-v1/` 프리뷰를 실제로 확인한 결과:

> "그냥 서있는 모습만 반복되는 것 같다."

이 판정을 최우선으로 적용한다.

정지 아트 교체 자체는 개선되었지만, 현재 타자는 실전에서 **동작이 아니라 포즈 전환**처럼 읽힌다.
따라서 V1은 시각적으로 최종 통과한 상태가 아니며, **main 병합 금지**다.

---

## 현재 기준 브랜치

- 부모 브랜치: `codex/batter-asset-loop-v1`
- V2 작업 브랜치: `codex/batter-motion-loop-v2`
- V1 확인용 Pages: `https://jjsjb88-alt.github.io/9-baseball/batter-v1/`

V2는 V1의 좋은 정지 앵커를 유지하면서 **실제 스윙 모션이 읽히게 만드는 단계**다.

---

## 핵심 원인

현재 타자가 정지 반복처럼 보이는 이유:

1. 포즈 수가 사실상 `idle / trigger / contact / finish` 정도로 너무 적다.
2. `load / swing-start / early-follow-through / settle`이 없다.
3. contact 구간이 너무 짧아 사용자가 타격 순간을 거의 인지하지 못한다.
4. 체중 이동 → 배트 가속 → 임팩트 → 관성의 흐름이 시각적으로 연결되지 않는다.
5. 결과적으로 실제 플레이에서는 준비 자세만 반복되는 것처럼 보인다.

---

## 이번 루프의 단일 목표

**타자가 실제로 스윙하는 것처럼 보여야 한다.**

테스트 통과가 목표가 아니다.
정지 아트 장수가 늘어나는 것도 목표가 아니다.
모바일 실제 플레이에서 설명 없이 봐도:

- 준비
- 힘을 싣는 동작
- 배트 출발
- contact
- follow-through
- finish

가 하나의 연속된 스윙으로 읽혀야 한다.

---

## 최소 8단계 포즈 구조

반드시 아래 구조로 확장한다.

1. `ready`
2. `load`
3. `trigger`
4. `swing-start`
5. `contact`
6. `follow-through-early`
7. `finish`
8. `settle`

현재 앵커:

- `assets/batter-reboot-v1/batter-ready.png`
- `assets/batter-reboot-v1/batter-trigger.png`
- `assets/batter-reboot-v1/batter-contact.png`
- `assets/batter-reboot-v1/batter-finish.png`

이 4장은 버리지 않는다.
V2에서 위 앵커 사이의 authored intermediate pose를 만든다.

---

## 절대 금지

- GM12 procedural/block batter 방향으로 회귀 금지.
- 사각형 팔다리 조합 렌더러 재도입 금지.
- CSS transform만 흔들어서 “애니메이션”이라고 완료 처리 금지.
- 60장을 서로 무관한 독립 프레임으로 손제작하는 방식 금지.
- 테스트/빌드 성공만으로 visual PASS 선언 금지.
- 사용자 확인 전 main 병합 금지.

---

## 애니메이션 설계 원칙

### 1. 키포즈 중심
좋은 authored key pose를 먼저 확보한다.

### 2. 중간포즈는 동작 논리를 연결해야 한다
단순 평균 보간이 아니라 다음이 읽혀야 한다.

- 하체 체중 이동
- 골반 회전 시작
- 몸통 지연
- 손과 배트의 출발
- contact에서의 압축
- 임팩트 후 관성
- finish에서의 균형 회복

### 3. 동일 캐릭터 보존
모든 포즈에서 다음을 유지한다.

- 같은 신체 비율
- 같은 얼굴/헬멧 방향성
- 같은 유니폼 구조
- 같은 배트 길이/두께
- 같은 발 기준선
- 같은 캐릭터 스케일
- 같은 픽셀 밀도

---

## 타이밍 기준

정확한 수치는 실제 화면을 보며 조절하되 방향은 아래와 같다.

- ready: 짧은 호흡
- load: 체중 이동이 읽힐 만큼 확보
- trigger: 짧게
- swing-start: 빠르게 가속
- contact: 일반 포즈보다 더 명확히 읽히게
- follow-through-early: 즉시 관성 연결
- finish: 결과를 읽을 수 있게 유지
- settle: 길지 않게 idle 복귀

특히 `contact`는 지금보다 명확히 보이게 해야 한다.

---

## 60Hz 확장 원칙

V2에서 8단계 구조가 실제 화면에서 PASS한 뒤에만 60Hz 루프로 확장한다.

권장 구조:

`ready → load → trigger → swing-start → contact → follow-through-early → finish → settle`

60Hz는 key pose 사이의 모션을 매끄럽게 연결하는 용도다.
나쁜 포즈를 60fps로 재생해도 좋은 애니메이션이 되지 않는다.

---

## 코드 보호 범위

- 투수 V4 60Hz 구조 보호.
- `V4CanvasSprite` 기반 기존 투수 재생 인프라 삭제 금지.
- Outcome / camera / VFX 구조를 타자 저품질을 가리는 용도로 쓰지 않는다.
- 타자 모션은 새 authored asset timeline으로 확장한다.
- 기존 `batterRebootPoseFor`의 단순 stage mapping은 필요하면 V2 timeline으로 대체한다.

---

## 필수 실제 화면 QA

다음 세 뷰 모두 직접 캡처해서 비교한다.

- 모바일 세로: 390 × 844
- 모바일 가로: 844 × 390
- PC: 1440 × 900

각 뷰에서 최소:
- ready
- swing-start
- contact
- finish

를 확인한다.

### PASS 기준

- 더 이상 “서있는 그림 반복”으로 보이지 않는다.
- trigger → contact 사이에 실제 가속이 느껴진다.
- contact가 눈에 들어온다.
- 하체/몸통/손/배트가 하나의 움직임으로 연결된다.
- finish가 contact의 결과처럼 보인다.
- 배트가 순간이동하지 않는다.
- 발이 바닥에서 떠다니지 않는다.
- 투수와 같은 게임 세계의 캐릭터로 읽힌다.
- UI와 충돌하지 않는다.
- 모바일에서 캐릭터가 너무 작거나 뭉개지지 않는다.

하나라도 명백히 실패하면 다음 단계로 넘어가지 않는다.

---

## 작업 순서

1. 현재 V1 실제 화면을 다시 확인한다.
2. 8단계 pose timeline을 코드/문서에 고정한다.
3. `load`, `swing-start`, `follow-through-early`, `settle` 신규 중간포즈를 만든다.
4. common canvas / baseline / scale / bat continuity를 맞춘다.
5. 정적 포즈를 먼저 게임에 삽입한다.
6. 3개 viewport 캡처를 생성한다.
7. 정적/동작 흐름이 PASS하면 motion timing을 연결한다.
8. contact readability를 조정한다.
9. 60Hz 보간/재생으로 확장한다.
10. 다시 3개 viewport 실전 QA.
11. 사용자 확인.
12. 그 뒤에만 merge 검토.

---

## 완료 선언 전에 반드시 남길 것

- 변경 브랜치
- 추가/수정 자산 목록
- pose mapping
- timing table
- 390x844 캡처
- 844x390 캡처
- 1440x900 캡처
- PASS/FAIL 메모
- 남은 시각적 문제

---

## 한 줄 미션

**V2의 목적은 타자를 더 예쁘게 세워두는 것이 아니라, 실제 게임에서 살아 움직이는 스윙으로 보이게 만드는 것이다.**
