# 9ZONE — Sprite-Gen Batter Pipeline V1

## 0. 목적

이 문서는 `aldegad/sprite-gen`의 제작 방식을 9ZONE HOMEBOUND의 타자 애니메이션 파이프라인에 안전하게 도입하기 위한 **실험 계약**이다.

핵심 결론은 다음과 같다.

> **60장을 AI로 한 번에 생성하지 않는다.**
> 승인된 Golden Master 키포즈를 SSOT로 고정하고, 키포즈 사이에만 제한적으로 generative in-between을 만든 뒤, 발 기준 정렬·pixel-unfake·motion QA를 통과한 실제 프레임을 atlas + manifest로 묶어 재생한다.

현재 main의 V3는 10 authored poses를 갖고 있고, 얼굴/헬멧 보호 레이어와 rigid bat 분리까지 적용되어 있다. 그러나 중간 포즈는 수동 Delaunay landmark warp로 생성되며, runtime은 sparse pose swap 또는 기존 V4의 fixed 10×6 atlas / adjacent-frame alpha blend 경로를 사용한다.

V1의 목표는 **기존 게임 규칙과 연출을 바꾸지 않고**, 외부/AI 제작 프레임을 안정적으로 받아들이는 ingest + playback 기반을 먼저 만든 뒤 사람 눈으로 비교하는 것이다.

---

## 1. Impact Analysis

### UI / 레이아웃
- 이번 V1의 runtime adapter는 신규 파일로만 추가하고 `App.jsx`에 연결하지 않는다.
- 따라서 현재 사용자 화면에는 변화가 없다.
- 추후 연결 시 기존 192×192 actor box와 발 중심을 유지한다.

### 입력 / 제스처
- 변경 없음.
- 신규 canvas는 `aria-hidden`이며 입력을 받지 않는다.

### 게임 로직 / 밸런스
- 변경 없음.
- 카드, 9ZONE, HP, 판정, 확률, turn/pitch 진행에는 손대지 않는다.

### 저장 / 불러오기
- 변경 없음.
- save schema에 animation 상태를 저장하지 않는다.

### 모바일 뷰포트
- V1 자체는 연결하지 않으므로 변화 없음.
- 연결 단계에서는 390×844 / 844×390 / 1440×900을 모두 검수한다.

### 스크롤 / 오버플로
- 변경 없음.
- 전역 CSS를 추가하지 않는다.

### 기존 사용자 플로우
- 변경 없음.
- 타이틀 → 경로 → 전투 → 보상 → 시설 → 다음 경로 흐름에 영향 없음.

### 테스트 / 회귀
- 신규 pure helper unit test를 추가한다.
- 실제 연결 시 기존 batter motion 계약 + 화면 캡처 QA를 다시 실행한다.

### 빌드 / 배포
- 신규 JS/JSX 모듈은 아직 runtime import하지 않는다.
- main / Vercel 배포는 하지 않는다.
- 이 브랜치는 integration spike 용도다.

**Risk level: LOW for V1 infrastructure / HIGH when actual batter is swapped.**

---

## 2. 현재 9ZONE 병목

### 2.1 이미 해결된 것
현재 main은 다음 기반을 이미 갖고 있다.

- 10포즈:
  `ready → load → trigger → swing-start → swing-mid → contact → follow-through-early → follow-through-late → finish → settle`
- approved V1 anchors: ready / trigger / contact / finish
- V3 intermediates 6장
- clean head/helmet overlay
- rigid bat extraction/transform
- 192×192 nearest-neighbor assets
- rAF 기반 60Hz renderer infrastructure
- contact / hit-stop / camera / VFX 타임라인

즉 “프레임 수가 부족해서만 끊긴다”가 아니다.

### 2.2 남은 구조적 문제

#### A. 수동 landmark warp
`scripts/generate-batter-motion-v3.py`는 포즈별 좌표를 직접 지정한다.

장점:
- deterministic
- nearest-neighbor
- 얼굴/배트 보호 가능

한계:
- 새 캐릭터마다 landmark를 다시 써야 한다.
- 관절 회전이나 실루엣 변화가 큰 구간에서 형태가 기계적으로 보이기 쉽다.
- 타자 1명은 관리 가능해도 여러 타자 / 투수 archetype으로 확장하기 어렵다.

#### B. sparse key-pose swap
10개 포즈가 모두 브라우저에 실제 노출되어도, 포즈 사이 실제 운동이 없으면 “슬라이드쇼”처럼 보일 수 있다.

#### C. V4 adjacent-frame alpha blend
기존 `V4CanvasSprite`는 연속 frame index를 계산한 뒤 `lo`와 `hi` 두 셀을 alpha blend한다.

일반 이미지에서는 부드러울 수 있지만 고밀도 픽셀아트에서는:
- 배트가 두 개로 보이는 ghosting
- 얼굴/헬멧 윤곽이 반투명하게 겹침
- rigid object가 늘어지는 인상

을 만들 수 있다.

**새 파이프라인에서는 real generated frame 하나를 직접 그리는 것을 기본으로 한다.**

#### D. atlas contract가 고정 10×6
현재 V4 renderer는 60프레임 / 10열×6행을 전제로 한다.
외부 authoring pipeline이 18 / 25 / 31프레임을 만들면 자연스럽게 수용하기 어렵다.

---

## 3. Sprite-Gen에서 가져올 핵심 원칙

### 3.1 SSOT character reference
한 캐릭터의 얼굴, 헬멧, 유니폼, 배트, 비율을 정의하는 기준 이미지를 고정한다.

새 프레임은 “직전 AI 프레임”을 기준으로 연쇄 생성하지 않는다.
identity drift가 누적되기 때문이다.

### 3.2 short authored actions
AI에게 처음부터 60개의 독립 포즈를 요구하지 않는다.

9ZONE에서는 이미 검수한 10개 semantic anchors를 유지한다.

### 3.3 generative in-between
두 승인 프레임 사이에서만 midpoint 또는 1/3·2/3 프레임을 생성한다.

flow/RIFE식 cross-fade가 아니라 **두 프레임을 reference로 제공하는 generative tween**을 우선한다.

### 3.4 deterministic extraction
생성 후:
- chroma/background 제거
- alpha crop
- pixel-unfake/grid snap
- foot-centroid 정렬
- bottom alignment
- palette/edge QA

를 deterministic 단계로 처리한다.

### 3.5 motion QA is blocking
정적 한 장의 identity가 멀쩡해도 동작이 흔들리면 실패다.

contact sheet와 animated preview를 따로 보고 motion continuity를 blocking gate로 둔다.

### 3.6 manifest is runtime truth
게임은 atlas grid를 추측하지 않는다.
`manifest.json.frame_layout`의 실제 `x/y/w/h`를 읽는다.

---

## 4. 9ZONE 권장 제작 구조

```
Master Character SSOT
        │
        ▼
10 Approved Semantic Anchors
ready / load / trigger / swing-start / swing-mid
contact / follow-early / follow-late / finish / settle
        │
        ▼
Generative In-between
(approved adjacent anchors only)
        │
        ▼
Extraction / Pixel-unfake
        │
        ▼
Foot-centroid + Bottom Alignment
        │
        ▼
Motion QA + Identity QA
        │
        ▼
Curated Frame Order
        │
        ▼
sprite-sheet-alpha.png + manifest.json
        │
        ▼
9ZONE manifest-driven Canvas Renderer
        │
        ▼
Presentation timeline sync
(contact marker ↔ impactAt)
```

---

## 5. 첫 번째 프레임 설계

V1은 60프레임을 목표로 하지 않는다.
**10 anchors + 약 15 in-betweens = 약 25 play positions**부터 비교한다.

권장 시작안:

| 구간 | Tween |
| --- | ---: |
| ready → load | 1 |
| load → trigger | 1 |
| trigger → swing-start | 2 |
| swing-start → swing-mid | 2 |
| swing-mid → contact | 3 |
| contact → follow-early | 2 |
| follow-early → follow-late | 2 |
| follow-late → finish | 1 |
| finish → settle | 1 |

이 숫자는 “많을수록 좋다”가 아니다.

- 변화량이 작은 준비/복귀: 적게
- 배트 각속도가 급격히 바뀌는 trigger→contact: 많이
- contact는 semantic marker로 고정

### Contact hold
contact를 느리게 보여야 할 때 새 그림을 억지로 생성하지 않는다.

동일 contact rect를 play order에서 복제하거나, 9ZONE presentation timeline에서 hold한다.
texture 자체를 중복 저장할 필요는 없다.

---

## 6. Sprite request 시작값

첫 실험의 **후보값**이다. 실제 결과를 보고 조정한다.

```json
{
  "version": 1,
  "kind": "sprite-gen-request",
  "engine": "component-row",
  "character": {
    "id": "9zone-batter-gm",
    "description": "9ZONE HOMEBOUND approved batter golden master",
    "base_image": "base.png"
  },
  "cell": {
    "shape": "square",
    "size": 192,
    "safe_margin": 12
  },
  "states": {
    "swing": {
      "frames": 10,
      "fps": 30,
      "loop": false,
      "action": "baseball swing, preserve exact identity and equipment, pose progression only"
    }
  },
  "fit": {
    "pixel_unfake": true,
    "logical_height": 96,
    "palette_size": 24,
    "align_x": "foot-centroid",
    "align_y": "bottom",
    "segmentation": "components"
  },
  "style": "high-density authored pixel art, hard pixel edges, no blur"
}
```

주의:
- `logical_height: 96`은 현재 GM12의 96 logical pixel 실험과 192 runtime cell 사이의 2× 정수 배율을 고려한 출발점이다.
- 최종값으로 고정하지 않는다.
- 생성형 row 자체를 10~25장 한 번에 뽑는 것이 아니라, approved anchors ingest + pairwise interpolation을 우선한다.

---

## 7. In-between 생성 규칙

### 절대 규칙
1. 승인 anchor A/B만 입력한다.
2. 얼굴/헬멧/유니폼/배트 디자인 변경 금지.
3. 새 액세서리 생성 금지.
4. 배트 길이·두께 변경 금지.
5. 발 위치는 물리적 stride가 필요한 경우만 이동.
6. interpolation frame을 다음 generation의 identity source로 사용하지 않는다.
7. 생성물은 자동 승인하지 않는다.

### 우선순위
1. silhouette continuity
2. bat angle continuity
3. head identity
4. hands/grip
5. pelvis/shoulder rotation
6. feet/world anchor
7. micro-detail

---

## 8. 9ZONE sidecar motion contract

Sprite-Gen manifest는 atlas geometry의 SSOT다.
하지만 게임은 `contact`가 어느 play position인지 알아야 pitcher release / ball / VFX와 동기화할 수 있다.

따라서 9ZONE은 별도 sidecar를 둔다.

예시:

```json
{
  "version": 1,
  "state": "swing",
  "markers": {
    "ready": 0,
    "load": 2,
    "trigger": 4,
    "swingStart": 7,
    "swingMid": 10,
    "contact": 13,
    "followEarly": 17,
    "followLate": 20,
    "finish": 23,
    "settle": 24
  }
}
```

실제 숫자는 curated frame order가 확정된 뒤 생성한다.

### runtime sync
`contact` marker의 native elapsed를 계산하고,
현재 `shot.motion.impactAt`에 맞도록 pre-contact / post-contact 시간을 piecewise remap한다.

이 방식이면:
- pitcher timing 유지
- hit-stop 유지
- VFX sync 유지
- atlas 자체는 특정 encounter timing에 종속되지 않음

---

## 9. Visual QA — 자동/수동 게이트

### 9.1 Identity gate
- 얼굴/헬멧 형태 변화 없음
- 유니폼 번호/패턴 변형 없음
- 배트 길이·두께 편차 제한
- 손이 배트를 놓치거나 손가락 덩어리가 증가하지 않음

### 9.2 Anchor gate
- 발 baseline Y jitter 제한
- 의도하지 않은 body centroid X drift 제한
- stride 구간 외 foot anchor 순간이동 금지

### 9.3 Motion gate
- duplicate/near-duplicate 연속 프레임 탐지
- silhouette IoU가 갑자기 붕괴하는 구간 탐지
- bat tip 이동 방향이 한 프레임만 역전하지 않는지 확인
- contact 전 배트 각속도 증가가 읽히는지 확인
- follow-through가 contact의 관성 결과로 보이는지 확인

### 9.4 Pixel gate
- non-integer scaling 금지
- bilinear blur 금지
- alpha fringe / chroma residue 검사
- 실제 192×192와 게임 표시 크기에서 둘 다 검수

### 9.5 Human visual gate
필수:
- 390×844 portrait
- 844×390 landscape
- 1440×900 PC
- ready / swing-start / contact / finish close-up
- 정상 속도
- 0.5× slow playback

자동 QA 통과만으로 Visual PASS를 선언하지 않는다.

---

## 10. Runtime 원칙

새 adapter는 다음을 강제한다.

- `manifest.frame_layout` 사용
- fixed grid 추론 금지
- `imageSmoothingEnabled = false`
- adjacent-frame alpha crossfade 금지
- 실제 한 frame rect를 직접 draw
- state fps / durations_ms 존중
- loop 여부 manifest 존중
- component가 실패해도 게임 로직을 막지 않음

기존 `V4CanvasSprite`는 V1에서 수정하지 않는다.
먼저 별도 adapter로 A/B한다.

---

## 11. 단계별 적용

### Phase A — Infrastructure spike
이번 브랜치 범위.

- manifest parser/timing helper
- manifest-driven Canvas component
- manifest validator
- unit tests
- runtime 미연결

**현재 게임 화면 변화 0.**

### Phase B — Existing anchors ingest

현재 approved/reviewed 10 pose를 **생성하지 않고 먼저 import run으로 넣는다.**
Sprite-Gen의 `unpack-atlas --pngs-dir`는 별도 PNG 폴더를 curator-ready run으로 가져올 수 있다.

권장 staging layout:

```
sprite-gen-input/
  _base/
    batter-golden-master.png
  swing/
    01-ready.png
    02-load.png
    03-trigger.png
    04-swing-start.png
    05-swing-mid.png
    06-contact.png
    07-follow-early.png
    08-follow-late.png
    09-finish.png
    10-settle.png
    _refs/
      anchor-ready.png
      anchor-contact.png
```

숫자 prefix가 play order를 고정한다.

실행 형태:

```bash
sprite-gen unpack-atlas --pngs-dir sprite-gen-input/ --out-dir <run-dir>
sprite-gen curation --run-dir <run-dir> --lang ko
```

여기서 먼저 생성 AI를 전혀 쓰지 않고:
- 현재 10포즈의 순서
- 발/몸 기준 흔들림
- 실제 표시 크기
- atlas / manifest 소비 경로

를 검증한다.

그 다음에만 pairwise Tween을 연다.

예:

```bash
$SPRITE_GEN_ROOT/.venv/bin/python \
  $SPRITE_GEN_ROOT/scripts/interpolate_frames.py \
  --run-dir <run-dir> \
  --state swing \
  --between 4 5 \
  --provider codex \
  --t 0.5 \
  --label swing_mid_to_contact_050 \
  --extract
```

주의:
- `--between`은 해당 state primary strip의 component index다. import 후 실제 index를 curator에서 확인한다.
- Tween 생성물은 final frame이 아니라 take다.
- 새 take는 deterministic extraction을 다시 거친 뒤 curator에서 play sequence에 넣는다.
- identity drift가 보이면 local warp로 숨기지 않고 해당 take를 reroll한다.

결과:
- base 10 pose baseline atlas
- alignment QA report
- 기존 V3와 1:1 비교
- 문제 구간만 추가한 tween candidate pool

### Phase C — In-between
각 approved pair에 제한적 tween을 생성한다.

처음부터 모든 구간을 만들지 않는다.

1. swing-mid → contact
2. contact → follow-early
3. trigger → swing-start
4. 나머지

가장 문제인 구간부터 ROI를 확인한다.

### Phase D — Runtime A/B
Cinema Lab에서:
- current V3 discrete
- current V4 blend
- sprite-gen manifest direct-frame

3개를 동일 shot timing으로 비교한다.

### Phase E — Product integration
사람 눈으로 새 방식이 명확히 우세할 때만 `App.jsx` batter path를 교체한다.

main merge 전:
- full Vitest
- smoke
- production build
- portrait/landscape/PC actual capture
- save/resume flow
- adaptive performance
- reduced-motion

---

## 12. 실패 시 중단 조건

다음 중 하나면 프레임 수를 늘리지 말고 anchor/art 단계로 되돌아간다.

- 얼굴이 구간마다 다른 사람처럼 보임
- 배트 길이 또는 grip이 변함
- 발이 미끄러짐
- contact silhouette가 기존 approved contact보다 약해짐
- 192px에서 디테일이 뭉개짐
- generated tween이 단순 dissolve처럼 보임
- 25프레임이 10포즈보다 “부드럽지만 싸구려”로 보임

**smoothness는 art quality보다 우선하지 않는다.**

---

## 13. 성공 기준

V1 pipeline 성공은 다음 의미다.

- 10 approved anchor identity를 보존한다.
- manual Delaunay warp 없이도 핵심 구간 중간동작을 만들 수 있다.
- 발/몸 기준점이 안정적이다.
- 배트/얼굴 ghosting 없이 실제 frame-to-frame motion으로 연결된다.
- atlas 크기/행/프레임 수가 바뀌어도 runtime 코드가 grid를 추측하지 않는다.
- 현재 presentation timing과 contact sync를 유지할 수 있다.
- 실제 모바일에서 현재 V3보다 명백히 자연스럽게 읽힌다.

그 전까지는 기존 main asset/runtime을 폐기하지 않는다.
