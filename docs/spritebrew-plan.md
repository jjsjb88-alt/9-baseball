# SpriteBrew 캐릭터 애니메이션 생성 가이드

> 2026-09-29. 목표 목업 `docs/art/benchmark/target/battle-portrait.png`에 맞춰 SpriteBrew(spritebrew.com)에서 타자·투수 스프라이트 애니메이션을 만들기 위한 준비 문서.
> 생성은 사용자가 사이트에서 직접 한다. 이 문서와 코드(`SpritePlayer`, 프레임 레지스트리, 폴더 구조)는 **에셋이 들어오기 전 준비**다. 현재 런타임 아트는 아무것도 교체하지 않았다.
>
> 확인 출처: spritebrew.com은 이 세션 네트워크 정책으로 막혀 있어 공개 README([GAlbanese09/spritebrew](https://github.com/GAlbanese09/spritebrew), AGPL-3.0, 코드 복사 없음)로 확인했다.
> - 확인됨: 토큰 Fast 3 / Plus 10 / Pro 40 / Anim-short 15 / Anim-long 50. 캐릭터 스타일은 Pro Fantasy, Sci-fi, Horror, Painterly, Simple, Default, Top Down, Platformer. 애니메이션 종류는 4-Angle Walking, Walking & Idle, Small Sprites, VFX Effects, **Custom Animation**, 8-Direction Rotation. 캐릭터 준비 단계는 "pixel-perfect resize to 64×64". 배경 제거는 토글 + 허용치 조절. Export는 TexturePacker JSON Hash, Aseprite JSON, GameMaker strip, RPG Maker 3×4, Godot SpriteFrames, **Raw Frames ZIP**.
> - README에 없음: short/long 구분 기준(프레임 수), 64보다 큰 해상도 옵션, ZIP 안 파일 이름 규칙. 사이트에서 직접 확인한다.

## 1. 목업 조사 결과

### 찾은 목업 · 레퍼런스 (main 기준)

`codex/v9-deckbuilder`(2026-09-15)에는 목업이 없고, main(111커밋 앞)에만 있다. 사용자 결정에 따라 main 기준으로 작업했다.

| 경로 | 화면 / 내용 |
| --- | --- |
| `docs/art/benchmark/target/battle-portrait.png` (720×1279) | **세로 전투 — 기준 목업.** 어깨너머 대형 타자 #9, 원경 투수, 9존, 코치, 손패 4장, 휘두른다/지켜본다 |
| `docs/art/benchmark/target/battle-landscape.png` (612×358) | 가로 전투. 후면 타자 중형, SD 투수(레드 러시), 9존, 카드 5장 |
| `docs/art/benchmark/target/homerun.png` | 홈런 스플래시. 뒷모습 타자 + 청색 타구 |
| `docs/art/benchmark/target/knockout.png` | 투수 강판 컷 |
| `docs/art/benchmark/target/{title,map,reward,deck,dex,ending}.png` | 타이틀·지도·보상·덱·도감·엔딩 (캐릭터 애니메이션 대상 아님) |
| `docs/art/benchmark/ref-01-commercial.png` | 상용 게임 품질 참고 |
| `docs/design/complete-mockup/README.md`, `docs/design/v14/TARGET-MOCKUP.md` | 목업 설명·결정 D1(투수=여성 로스터)·D2(타자=목업과 똑같이) |
| `assets/production-art/battle-portrait-v15/scene-preview.jpg` | battle-portrait 목업을 V15 에셋으로 합성한 구도 참고 |
| `assets/production-art/mockup-world-v15/` | 카드·도감·지도 원화 후보 (캐릭터 애니메이션 대상 아님) |

**기준 목업: `battle-portrait.png`.** 이유: complete-mockup README에서 세로 전투가 전투 화면 우선순위 1이고, V14 결정 D2가 "타자는 목업과 똑같이"로 확정됐다. 게임에서 가장 오래 보이는 화면이기도 하다.

### 목업 분석

| 항목 | 타자 (#9 주인공) | 투수 |
| --- | --- | --- |
| 이름 | 저장소에 "박강타" 표기 없음. 코드·문서는 `#9` 주인공 타자 | 목업은 남성 #27 "불꽃의 강민호". **결정 D1으로 게임은 여성 로스터 12명**, 기본 상대는 레드 러시 |
| 시점 | 쿼터뷰 **어깨너머 3/4 후면** (카메라가 타자 뒤-왼쪽) | 원경 **3/4 정면**, 마운드 위 |
| 방향 | 화면 **오른쪽 위**(투수 쪽)를 봄, 우타석 | 화면 **왼쪽**(타자 쪽)으로 던짐 |
| 화면 내 크기 (목업 720px 폭) | 약 570px 높이 ≈ 화면 높이 45% | 약 165px 높이 |
| 게임 표시 크기 (390px 폭 폰) | `.bp-batter` 78vw ≈ **300 CSS px** | `.bp-pitcher` 24vw ≈ **94 CSS px** |
| 등신비 | 약 5.5~6등신, 성인 체형 (치비 아님) | 약 6등신 |
| 외곽선 | 있음. 짙은 남색/검정 1px 외곽선 | 있음 |
| 팔레트 | 크림 흰 유니폼 + 남색 헬멧·언더셔츠 + 금색 파이핑, 나무 배트 | 레드 러시: 검정·진홍 상의, 빨간 롱 포니테일, 갈색 글러브 |
| 배경 톤 | 석양 주황·보라 하늘, 청록 관중석, 금빛 조명 | 〃 |
| 픽셀 밀도 | 픽셀 한 칸 ≈ 목업 4px → 인물 약 **140 아트 픽셀** 높이의 HD 픽셀아트 | 인물 약 40~50 아트 픽셀 |

### 현재 코드의 스프라이트 (main)

| 역할 | 경로 | 크기 | 포즈 / 프레임 | 재생 |
| --- | --- | --- | --- | --- |
| 타자 (런타임) | `assets/production-art/battle-portrait-v15/batter-sheet-runtime.png` | 2048×1536, 4×2 셀 512×768 | 키포즈 7장: ready, load, swing-start, swing-mid, contact, follow-early, follow-through | Pixi `BallparkActors` + DOM 폴백 `Sprite`(App.jsx). `src/duel/batter-v15.js`가 10포즈 계약에 매핑. **smooth 샘플링**(HD 일러스트) |
| 타자 원본 | `battle-portrait-v15/batter-*.png` | 1024×1536 투명 | 위 7장 개별 | — |
| 투수 (런타임) | `assets/pitcher-sd-v1/red-rush-pitch-120-atlas.png`, `assets/pitcher-sd-v2/atlases/*-pitch-120-atlas.png` (11명) | 2560×3072, 10×12 셀 256×256 | 120프레임 60fps 2초 투구, 왼쪽 향함 | Pixi, `redRushFrameAt(t)`, 릴리스 frame 76 |
| 투수 HD 후보 | `battle-portrait-v15/red-rush-{windup,stride,release}.png`, `battle-polish-v16/red-rush-*.png` | 1024×1536 | 키포즈 3+5장 | 미연결 |
| 홈런 컷 | `assets/production-art/phone-assets-v18/A01-homerun-batter-9.png` | 1512×1399 | 정지 1장 | `HomeRunCut` (phone-art-v18.jsx) |
| 레거시 | `assets/sprites-v1`, `sprites-v2/frames`(36장), `sprites-v4` | 소형 측면 도트 | 튜토리얼(v9) 화면만 | App.jsx `Sprite` |

**목업과 차이점**

- 타자: 구도·의상은 V15가 목업과 일치. 다만 7키포즈뿐이라 인비트윈이 없고(스윙이 뚝뚝 끊김), idle 호흡·헛스윙 전용·홈런 세리머니 동작이 없다. HD 일러스트 스무딩이라 목업의 "선명한 픽셀 클러스터"와 질감이 다르다.
- 투수: 120프레임으로 부드럽지만 **SD(치비) 비율**이라 목업의 6등신 투수와 다르다. idle 루프 전용 동작이 없다(set 프레임 정지).
- 둘 다 대기 동작이 없어 판정 사이 화면이 정지 사진처럼 보인다.

### 게임 타이밍 (코드 상수)

"와인드업 550ms" 같은 단일 상수는 코드에 없다. 실제 투구는 한 시계로 돈다.

| 이벤트 | 값 | 출처 |
| --- | --- | --- |
| 투구 전체 | 2000ms (120f @ 60fps) | `pitcher-sd.js` `RED_RUSH_DURATION_MS` |
| 릴리스 | frame 76 ≈ **1267ms** | `RED_RUSH_RELEASE_MS` |
| 공 비행 | 300ms → 컨택 ≈ **1567ms** | `PITCH_FLIGHT_MS` |
| 타자 load / trigger / swing-start / swing-mid | 컨택 −320 / −200 / −118 / −58ms | `batterMotionV3.js` (syncToPitcher) |
| 히트스톱 | 90ms | `BallparkActors.jsx` `HIT_STOP_MS` |
| 컨택 유지 (안타) | 150~235ms, 팔로스루 ≥ 500ms | `batterMotionV3.js` |
| 헛스윙 팔로 | 컨택 +92ms부터 | 〃 |
| idle 호흡 | 2600ms 주기 | `IDLE_BREATH_MS` |
| 홈런 연출 | 1.7~2.2초 | HANDOFF 연출 계약 |
| 강판 | +700ms 유지 | `KNOCKOUT_HOLD_MS` |

## 2. 캐릭터별 생성 계획

### 공통 규칙

- **배경 제거: ON** (모든 모션). 경기장은 별도 배경 플레이트이고, 액터는 투명 컷아웃이어야 한다. 업로드 이미지가 이미 투명이면 입력 쪽 제거는 필요 없다.
- **해상도:** 사이트 기본 64×64. 게임은 **원본 해상도 그대로 저장**하고 화면에서 nearest-neighbor로 키운다(미리 키운 PNG 금지 — dist 예산이 46.0/50MB라 여유 4MB).
  - `BallparkActors`의 `crisp()`가 "CSS 배율 × devicePixelRatio"를 정수로 맞추므로, 아래 배율은 DPR 2에서 정수 픽셀이 된다.
- **모든 모션에 방향·시점을 반복 명시**한다. 한 모션만 다른 방향으로 나오면 폐기.
- 같은 캐릭터의 모든 모션은 **같은 기준 이미지 한 장**에서 만든다 (얼굴·유니폼·크기 일관성).

### 2-1. 타자 #9

**a) 기준 이미지 (Animate My Character)**

- 1순위: `assets/production-art/battle-portrait-v15/batter-ready.png` — 목업 구도(어깨너머 3/4 후면)와 유니폼이 그대로인 준비 자세, 투명 배경. 1024×1536 세로형이라 사이트가 정사각형을 요구하면 **좌우 투명 여백을 붙여 1536×1536**으로 올린다(인물을 자르지 말 것).
- 홈런 세리머니만: `assets/production-art/phone-assets-v18/A01-homerun-batter-9.png` (홈런 목업의 뒷모습 타자). 단, 얼굴·유니폼이 ready와 달라 보이면 ready로 통일.
- 기존 이미지가 전부 불합격일 때만 Text-to-Sprite:
  ```
  pixel art baseball batter, adult Korean man, over-the-shoulder three-quarter back view,
  right-handed batting stance, facing up-right toward the pitcher, navy batting helmet with number 9,
  cream white uniform with navy and gold piping, navy undershirt sleeves, wooden bat held high,
  dark 1px outline, 3-step shading, full body, transparent background
  ```
  추천 스타일: **Pro Fantasy** (21종 중 명암 단계·디테일 밀도가 가장 높아 목업 HD 픽셀에 가깝다). 갑옷·망토 같은 판타지 소품이 붙으면 **Platformer**로 재시도(인체 비례·동작 가독성 우선). Simple은 목업 밀도에 못 미쳐 제외. 먼저 **Fast(3)** 로 구도만 보고, 합격 구도만 **Pro(40)** 로 뽑는다.

**b) 애니메이션 · c) 프롬프트 · d) 해상도**

| 모션 | 폴더 | 프레임 / fps | 길이 | 게임 연결 |
| --- | --- | --- | --- | --- |
| 대기 idle | `batter/idle` | 8f @ 3fps, 루프 | 2.6s | 판정 사이 전체 |
| 스윙 (안타) swing | `batter/swing` | 12f @ 15fps | 800ms | **frame 5 = 컨택** → 컨택 320ms 전에 시작 |
| 헛스윙 miss | `batter/miss` | 10f @ 15fps | 670ms | frame 5 = 공 통과 시점 |
| 홈런 세리머니 homerun | `batter/homerun` | 16f @ 8fps | 2.0s | 홈런/만루홈런 컷 |

Custom Animation 프롬프트 (그대로 붙여넣기):

- idle: `subtle idle breathing in batting stance, over-the-shoulder three-quarter back view, facing up-right, bat resting high over rear shoulder, small weight shift, feet planted, seamless loop`
- swing: `powerful baseball swing, over-the-shoulder three-quarter back view, facing up-right: load back, stride, hips rotate, bat whips level through the zone, contact in front of body, full follow-through with bat wrapping over the left shoulder, feet stay on the same ground line`
- miss: `baseball swing and miss, over-the-shoulder three-quarter back view, facing up-right: load, stride, fast swing that passes under the ball, off-balance follow-through, front knee buckles, head turns to look back at the catcher`
- homerun: `home run celebration, three-quarter back view facing up-right: finish the swing, hold the follow-through pose, watch the ball fly, drop the bat to the side, raise right fist high, proud stance`

해상도: 64×64 → **×5 nearest-neighbor** (320 CSS px ≈ `.bp-batter` 300px 박스, DPR 2에서 한 픽셀 = 10 기기 픽셀).
⚠ 품질 경고: 목업 타자는 약 140 아트 픽셀 높이다. 64px 캔버스는 그보다 2배 이상 거칠다. README 기준 준비 단계가 64×64 고정이라 128 옵션은 없을 가능성이 크다. 사이트에 **128×128 이상 옵션이 있으면 타자는 128로** 뽑고 ×2.5 배율(DPR 2에서 ×5 정수)을 쓴다. 64 결과가 V15 HD 타자보다 거칠면 **교체하지 않는다**(AGENTS §6 저품질 placeholder 금지).

### 2-2. 투수 (레드 러시, 여성 — 결정 D1)

**a) 기준 이미지**

- 1순위: `assets/pitcher-mobs-v1/regular-01-red-rush.png` — 정체성 마스터 전신 컷(1086×1448, 투명). 정사각형 패딩 후 업로드.
- 대안: `assets/production-art/battle-portrait-v15/red-rush-windup.png` — 목업 톤의 HD 버전이나 와인드업 자세라 idle 기준으로는 부적합.
- 게임 비율 유지용 참고: `assets/pitcher-sd-v1/frames/`의 frame 0 (256×256 SD, 왼쪽 향함). SD 비율로 갈지 목업 6등신으로 갈지는 **첫 Fast 시안을 보고 결정**(아래 체크리스트).
- Text-to-Sprite 대체 프롬프트 (기존 이미지 불합격 시):
  ```
  pixel art female baseball pitcher, adult, three-quarter front view facing left toward the batter,
  long bright red high ponytail, black cap with red emblem, black and crimson opaque jersey,
  long pale baseball pants, brown leather glove on right hand, athletic build, dark 1px outline,
  3-step shading, full body, transparent background
  ```
  추천 스타일: **Pro Fantasy** → 판타지 소품이 붙으면 **Platformer**. 수위 규칙: 성인, 불투명 의상, 비노출·비선정(기존 투수 프롬프트 규칙).

**b~d)**

| 모션 | 폴더 | 프레임 / fps | 길이 | 게임 연결 |
| --- | --- | --- | --- | --- |
| 대기 idle | `pitcher/idle` | 8f @ 4fps, 루프 | 2.0s | 투구 전 |
| 와인드업 windup | `pitcher/windup` | 12f @ 11fps | ≈1.09s | 0ms → 릴리스 모션으로 인계 |
| 릴리스 release | `pitcher/release` | 8f @ 12fps | ≈670ms | **frame 2 = 공 놓는 순간** → 1267−167 = 1100ms에 시작 |

- idle: `pitcher standing on the mound, three-quarter front view facing left, glove at chest, gentle breathing and small shoulder roll, ponytail sways slightly, seamless loop`
- windup: `baseball pitcher windup, three-quarter front view facing left: hands together at chest, rock back, lift front knee high, coil the hips, begin long stride toward the left`
- release: `baseball pitcher release and follow-through, three-quarter front view facing left: throwing arm whips over the top, ball leaves the hand toward the left, body bends forward, back leg swings up, recover to balance`

해상도: 64×64 → **×1.5** (96 CSS px ≈ `.bp-pitcher` 94px 박스, DPR 2에서 ×3 정수). 가로 모드 박스가 더 크면 `crisp()`가 정수로 맞춘다.
⚠ 지금 120프레임(60fps) 아틀라스보다 프레임 수가 적어 **동작이 덜 부드러워질 수 있다.** 비율(6등신)·팔레트가 목업에 더 가까울 때만 교체 가치가 있다. 아니면 idle만 추가하고 투구는 아틀라스 유지.

### 3. 토큰 예산

| 항목 | 개수 | 단가 | 합계 |
| --- | --- | --- | --- |
| 짧은 애니 (타자 idle, 투수 idle, 투수 release) | 3 | 15 | 45 |
| 긴 애니 (타자 swing, miss, homerun, 투수 windup) | 4 | 50 | 200 |
| **기본안 소계 (기존 이미지 업로드)** | | | **245** |
| 재시도 여유 ×0.5 (방향 뒤집힘·손 깨짐 대비) | | | +123 |
| **권장 확보량** | | | **≈370** |
| (선택) Text-to-Sprite 기준 이미지 — Fast 시안 3회씩 ×2캐릭터 | 6 | 3 | 18 |
| (선택) 합격 구도 Pro 생성 ×2캐릭터 | 2 | 40 | 80 |
| (선택) Plus로 타협 시 ×2캐릭터 | 2 | 10 | 20 |
| **최대 (Text-to-Sprite Pro 포함)** | | | **≈470** |

"짧은/긴"의 사이트 기준(프레임 수·길이)이 위 분류와 다르면 사이트 기준으로 다시 센다. 12f 이하가 짧은 애니면 swing/miss/windup도 15로 내려가 기본안은 약 **140**이 된다.

### 4. Export

- **Raw Frames ZIP 권장.** 압축을 풀고 아래 스크립트로 넣는다.
  ```
  node scripts/import-spritebrew.mjs <압축 푼 폴더> batter swing
  ```
  파일 이름 자연 정렬 순서로 `public/sprites/batter/swing/frame_00.png …`에 복사하고, 넣은 개수를 출력한다. 그 숫자를 `src/duel/spritebrew-frames.js`의 `frames`에 적으면 `SpritePlayer`가 기존 아트 대신 새 프레임을 재생한다.
- **TexturePacker JSON (Hash)**: `SpritePlayer`는 파싱하지 않는다(개별 PNG 배열 전용). 대신 Pixi 경로(`BallparkActors`)는 설치된 `pixi.js` 8의 `Assets.load()`가 TexturePacker JSON(Hash·Array)을 그대로 읽으므로, Pixi에 직접 붙일 때는 새 파서·의존성 없이 쓸 수 있다. 같은 모션을 두 형식으로 받을 필요는 없다 — Raw ZIP 하나로 둘 다 가능(Pixi도 PNG 배열을 텍스처로 로드).
- 받은 PNG는 **원본 해상도 그대로**. 업스케일본을 넣지 않는다.

### 5. 생성 우선순위 (목업 인상 영향 순)

1. **타자 swing** — 목업 화면 45%를 차지하는 주인공의 핵심 동작. 판정 쾌감의 중심.
2. **타자 idle** — 플레이 시간 대부분 보이는 화면. 정지 사진 느낌 제거.
3. **타자 homerun** — 최고 보상 연출(1.7~2.2초).
4. **타자 miss** — 빈도 높은 실패 판정.
5. **투수 windup** → 6. **투수 release** — 아틀라스가 이미 있어 차이가 작다. 비율 결정 후.
7. **투수 idle** — 원경이라 영향 가장 작다.

1번의 Fast 시안에서 64px 품질이 V15 HD 타자보다 떨어지면 2~7번 진행 전에 해상도/스타일부터 다시 정한다.

## 6. 적용 준비 (코드, 에셋 없이 완료)

| 파일 | 내용 |
| --- | --- |
| `public/sprites/{batter,pitcher}/{animation}/` | 프레임 폴더 7개 (`.gitkeep`만 있음). Vite가 `BASE_URL/sprites/...`로 그대로 서빙 |
| `src/duel/spritebrew-frames.js` | 모션별 `frames`(현재 0 = 미도착)·fps·loop·keyFrame 레지스트리, 경로·프레임 계산 함수 |
| `src/duel/SpritePlayer.jsx` | 프레임 배열 재생 컴포넌트. `image-rendering:pixelated`, `fps`·`loop`·`onComplete`·`playToken`, 프레임 없음/로드 실패 시 `fallback`(기존 스프라이트) 표시, reduced-motion 처리, `pointer-events:none` |
| `scripts/import-spritebrew.mjs` | Raw Frames 폴더 → `frame_NN.png` 복사 |
| `tests/spritebrew-frames.test.jsx` | 경로 규칙, 레지스트리 파일 존재, 게임 시계 키 프레임, 재생·루프·완료·폴백·reduced-motion 12건 |

연결 지점은 `SPRITEBREW-HOOK` 주석으로만 표시했다 (동작 변경 없음):

| 이벤트 | 위치 |
| --- | --- |
| 와인드업 / 릴리스 | `src/duel/BallparkActors.jsx` 투수 텍스처 선택 (`redRushFrameAt`) |
| 스윙 / 헛스윙 / idle | `src/duel/BallparkActors.jsx` 타자 포즈 텍스처 선택 |
| 판정 (컨택·히트스톱) | `src/duel/BallparkActors.jsx` hit-stop 시계 |
| DOM 폴백 액터 | `src/duel/App.jsx` `BallparkBattle`의 `pitcherArt` / `batterArt` |
| 홈런 | `src/duel/phone-art-v18.jsx` `HomeRunCut` |

실제 교체는 에셋이 들어오고 390×844 / 844×390 / 1440×900에서 목업과 비교한 뒤 별도 PR로 한다(영향도 분석 포함).
