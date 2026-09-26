# 제미나이 작업지시서 — 9ZONE UI 킷 (V14 ART-1)

> 받는 사람: Gemini (이미지 생성).
> 목적: CSS 사각형 UI를 **그려진 UI 에셋**으로 바꿔, 투수·경기장 그림과 **한 화풍**으로 만든다.
> 결과물은 사용자가 받아서 Claude에게 넘긴다. 잘라내기·배경 제거·크기 조정·9-slice 적용은 Claude가 한다.

---

## 0. 먼저 첨부할 레퍼런스 (제미나이에 같이 올릴 것)

| 파일 | 왜 |
| --- | --- |
| `assets/pitcher-mobs-v1/regular-01-red-rush.png` | **화풍 기준.** 고밀도 애니 픽셀 아트, 4~6단 셀 음영, 선명한 외곽선 |
| `assets/pitcher-mobs-v1/regular-02-teal-mirage.png` | 같은 화풍의 다른 색 — 화풍이 캐릭터가 아니라 "규칙"임을 보여줌 |
| `assets/duel/stadium.png` | 이 UI가 올라갈 야간 구장 배경. 색온도·밝기 기준 |
| 사용자가 보낸 상업 게임 레퍼런스 스샷 (말풍선/진행바) | **구성 기준만.** 화풍은 따라 하지 말 것 (그쪽은 페인팅, 우리는 픽셀) |

---

## 1. 스타일 바이블 — 모든 에셋 공통

**한 문장:** 야간 야구장 조명 아래, 야구공 가죽과 전광판으로 만든 고밀도 애니 픽셀 아트 UI.

### 1.1 화풍
- **고밀도 픽셀 아트.** 사각 픽셀이 보이고 가장자리 선명. 계단식 하이라이트. 블러·에어브러시·노이즈 금지.
- 에셋마다 **네이티브 픽셀 격자**를 정해 그리고 정수배(×4)로 확대해 전달한다. 한 에셋 안에서 픽셀 크기가 섞이면 불합격.
- 음영 **최소 3단**: 외곽선 → 본색 → 그림자 → 하이라이트. 색은 hue-shift (그림자는 푸르게, 하이라이트는 따뜻하게).
- 외곽선: 가장 바깥은 잉크색 `#07080d` 1픽셀(네이티브 기준). 안쪽 선은 선택적(selective outline).

### 1.2 모티프 (이 게임만의 것)
| 재질 | 어디에 | 디테일 |
| --- | --- | --- |
| **크림 야구공 가죽** + **빨간 실밥** | 말풍선, 카드 앞면, 이름표 | 테두리를 따라 V자 실밥 스티치 |
| **남색 전광판 에나멜** + **황동 리벳** | 정보 패널, HP 틀, 진행바 바탕 | 모서리 리벳 4개, 얇은 황동 테두리 |
| **소듐 조명 금색** | 강조(주 버튼, 선택, 시그니처 카드) | 이 색만 "빛나는" 색. 남용 금지 |
| **다이아몬드(베이스) 모양** | 진행 단계 노드, 지도 노드 받침 | 야구장 베이스처럼 45° 회전한 정사각형 |

### 1.3 팔레트 — 이 색만 쓴다 (+ 각 색의 음영 단계)
| 이름 | HEX | 용도 |
| --- | --- | --- |
| 잉크 | `#07080d` | 외곽선, 가장 어두운 그림자 |
| 나이트 | `#141a33` | 패널 본색 |
| 라인 | `#2a3152` | 패널 안쪽 테두리 |
| 슬레이트 | `#7b84a6` | 비활성, 보조 |
| 본(크림 가죽) | `#ece4cf` | 말풍선·카드 본색 |
| 본 그림자 | `#b7b09e` | 가죽 그림자 |
| 소듐 | `#ffc861` | 유일한 강조색 |
| 실밥 레드 | `#d23a3a` | 스티치, 경고, 투수 대사 포인트 |
| 황동 | `#c8923a` | 리벳, 금속 테두리 |
| 가죽 브라운 | `#8a5a32` | 글러브 톤, 버튼 측면 |

### 1.4 빛
- 광원: **위쪽 따뜻한 구장 조명**. 윗면 하이라이트, 아랫면 그림자.
- 에셋 밖으로 번지는 글로우·그림자는 그리지 않는다 (코드에서 넣는다).

### 1.5 금지 (하나라도 있으면 다시 생성)
- **글자·숫자·한글·로고·워터마크** (텍스트는 코드가 넣는다)
- 체크무늬 "가짜 투명" 배경
- 부드러운 페인팅, 3D 렌더, 사진 질감, 그라데이션 번짐
- 판타지 장식(양피지, 룬, 나뭇잎 덩굴) — 레퍼런스 스샷의 소재를 그대로 가져오지 않는다
- 에셋 가장자리가 잘림, 여백 없음

---

## 2. 출력 규칙 (모든 에셋)

1. **배경**: 진짜 투명 PNG. 안 되면 **완전 단색 마젠타 `#FF00FF`** 한 색 (그라데이션·그림자·노이즈 없음). 에셋 안에는 마젠타를 쓰지 않는다.
2. **여백**: 에셋 둘레에 네이티브 기준 4픽셀 이상 빈 공간.
3. **9-slice 에셋**(늘어나는 틀): 네 모서리 장식은 모서리 안에만, **가운데 면은 무늬 없는 단색** 또는 아주 약한 균일 질감. 테두리 두께는 네 변이 같다.
4. **상태 시트**: 한 이미지에 상태별 변형을 **가로 한 줄, 같은 크기 칸**으로 나란히 (칸 사이 마젠타 간격). 같은 이미지 안에서 그려야 화풍이 흔들리지 않는다.
5. 크기는 아래 "네이티브" 격자로 그리고 ×4 확대. 정확하지 않아도 되지만 **비율과 테두리 두께 균일**은 지킬 것.
6. 파일 이름은 아래 ID 그대로: 예) `A1-bubble.png`

---

## 3. 에셋 목록 (우선순위 순)

| ID | 에셋 | 네이티브 크기 | 9-slice 여백 | 상태 / 변형 | 쓰이는 곳 |
| --- | --- | --- | --- | --- | --- |
| **A1** | 대사 말풍선 | 96×48 | 12 | 꼬리 없음 · 꼬리 오른쪽 아래 · 꼬리 왼쪽 아래 | 투수 대사 (전투·보상) |
| **A2** | 이름표 탭 | 48×14 | 6 | 기본 · 실밥 레드 | 말풍선 위 화자 이름 |
| **A3** | 정보 패널 | 64×40 | 10 | 기본 | HP 태그, 판정, 카운트 |
| **A4** | 주 버튼 | 80×24 | 10 | 기본 · 눌림 · 비활성 | 휘두른다 / 다음 공 / 챙긴다 |
| **A5** | 보조 버튼 | 80×24 | 10 | 기본 · 눌림 · 비활성 | 지켜본다 / 그냥 간다 |
| **A6** | 카드 틀 | 40×56 | 8 | 일반 · 선택됨 · 시그니처(레어) · 스킬(둥근 모서리) | 손패, 보상 카드 |
| **A7** | 카드 뒷면 | 40×56 | — | 1장 | 보상 카드 뒤집기 |
| **A8** | 진행 단계 노드 + 연결선 | 노드 16×16, 선 16×4 | — | 노드: 꺼짐 · 현재 · 완료 / 선: 꺼짐 · 켜짐 | 읽기 → 배치 → 전투 같은 단계 표시 |
| **A9** | HP 게이지 틀 + 칸 | 틀 64×8 / 칸 4×6 | 3 | 칸: 가득 · 방금 깎임(빨강) · 빈칸 | 투수 HP |
| **A10** | 지도 노드 받침 | 24×24 | — | 정규전 · 강적 · 보스 · 시설 · 잠김 | 원정 지도 |
| **A11** | 아이콘 12종 | 각 12×12 | — | 덱 · 버림 · 소리켬 · 소리끔 · 도움말 · 라커룸 · 훈련 · 상점 · 휴식 · 주자 · 흔들림 · 시그니처별 | 상단 바, 지도, 칩 |

---

## 4. 에셋별 프롬프트

### 공통 머리말 (모든 프롬프트 맨 앞에 붙인다)
```text
You are creating one UI asset for 9ZONE HOMEBOUND, an anime pixel-art baseball roguelike played at night in a floodlit stadium.
Match the attached pitcher character images EXACTLY in rendering style: exquisite high-density 2D pixel art, visible square pixels, crisp stair-stepped highlights, controlled 3–5 step hue-shifted cel shading, 1-pixel #07080d outer outline, selective inner outlines. Draw on a native pixel grid, then enlarge with clean nearest-neighbor x4. Never a smooth painting with a pixel filter, never 3D, never blurry, never noisy, never airbrushed.
Materials: cream baseball leather (#ece4cf, shadow #b7b09e) with red baseball stitching (#d23a3a); navy scoreboard enamel (#141a33, inner line #2a3152) with brass rivets (#c8923a); sodium-lamp gold (#ffc861) is the ONLY glowing accent. Light comes from warm stadium floodlights above.
Use only these colors and their shading steps: #07080d #141a33 #2a3152 #7b84a6 #ece4cf #b7b09e #ffc861 #d23a3a #c8923a #8a5a32.
OUTPUT: genuine transparent PNG. If true transparency is impossible, use one perfectly flat solid #FF00FF background with no gradient, shadow or noise, and never use #FF00FF inside the asset. Keep at least 4 native pixels of empty margin around the asset.
ABSOLUTELY NO text, letters, numbers, Korean characters, logos, watermarks or checkerboard pattern. No outer glow or drop shadow outside the asset. No fantasy decoration (no parchment, runes, vines, leaves).
```

### A1 대사 말풍선
```text
ASSET: speech bubble frame for a pitcher's spoken line, designed as a 9-slice.
Native size 96x48 pixels. Cream baseball-leather surface with a row of small red V-shaped baseball stitches running parallel to the border, 3 native pixels inside the edge, evenly spaced on all four sides. Softly rounded corners (radius 6 native px). Border band 12 native px thick, identical on all four sides; the center area is plain flat cream leather with no pattern so text can sit on it.
Draw THREE variants side by side in one row, equal cells, separated by magenta gaps: (1) no tail, (2) short pointed tail at the bottom-right corner pointing down-right, (3) the same tail at the bottom-left pointing down-left. Tails are part of the same leather with stitching continuing onto them.
```

### A2 이름표 탭
```text
ASSET: small name tab that sits on the top-left edge of the speech bubble, 9-slice.
Native size 48x14. Navy scoreboard enamel with a 1px brass inner border and a tiny brass rivet at each end. Center plain and flat for a name to be written by code.
Two variants side by side: (1) navy, (2) navy with a red stitch-colored left edge stripe.
```

### A3 정보 패널
```text
ASSET: information panel, 9-slice. Native size 64x40.
Navy scoreboard enamel plate, 1px #2a3152 inner bevel line, thin brass frame, one small round brass rivet in each corner. Slight top highlight from floodlights, darker bottom edge. Border band 10 native px thick on all four sides; center plain flat navy, very slightly lighter than the border, no pattern.
```

### A4 주 버튼
```text
ASSET: primary action button, 9-slice. Native size 80x24.
Sodium-gold (#ffc861) leather button with a brown leather side (#8a5a32) visible below it, like a thick pressed baseball-glove patch; a row of small red stitches along the top and bottom edges. Border band 10 native px; center plain flat gold.
Three states side by side, equal cells: (1) normal — raised, bright top highlight; (2) pressed — pushed down 2 native px, side almost hidden, slightly darker; (3) disabled — desaturated grey-navy (#7b84a6 family), no stitches highlighted, flat.
```

### A5 보조 버튼
```text
ASSET: secondary action button, 9-slice. Native size 80x24.
Navy scoreboard enamel button with a thin cream (#ece4cf) inner outline and brass end rivets; side depth in #07080d. Border band 10 native px; center plain flat navy.
Three states side by side: (1) normal, (2) pressed (down 2 native px), (3) disabled (dim, low contrast).
```

### A6 카드 틀
```text
ASSET: card frame for a hand of baseball batting cards, 9-slice. Native size 40x56 (portrait).
Cream baseball-leather card face bordered by a navy enamel frame with red stitching along the inside of the frame. Border band 8 native px; center plain flat cream for code to draw the card content.
Four variants side by side, equal cells: (1) common — as described; (2) selected — frame edge turns sodium gold with brighter top highlight; (3) signature/rare — brass-and-gold frame with four small gold diamond studs at the corners and a subtle warm sheen band across the top border only; (4) skill — same as common but with fully rounded pill-like corners (radius 10 native px).
```

### A7 카드 뒷면
```text
ASSET: back side of the same card, not a 9-slice. Native size 40x56.
Navy enamel back with a centered emblem: a 3x3 grid of small square cells (a strike zone) inside a baseball-diamond outline, in brass and sodium gold. Diagonal fine leather grain pattern in two navy shades. Frame and stitching identical to A6 common.
```

### A8 진행 단계 노드
```text
ASSET: step progress indicator parts. Draw on one canvas in a row with magenta gaps:
- Node, native 16x16: a baseball base (square rotated 45 degrees) made of cream leather with a brass rim. Three states: (1) off — dim navy-grey; (2) current — cream with sodium-gold rim and a small bright gold core; (3) done — cream with a small red stitch check mark shape (not a letter).
- Connector line, native 16x4: two states — (1) off: dotted navy; (2) on: solid sodium gold with a 1px highlight.
```

### A9 HP 게이지
```text
ASSET: pitcher HP gauge parts on one canvas, row with magenta gaps.
- Gauge frame, 9-slice, native 64x8: navy enamel groove with brass end caps, border 3 native px, plain dark center.
- Segment, native 4x6, three states: (1) full — cream with warm top highlight; (2) just lost — red #d23a3a; (3) empty — dark navy slot.
```

### A10 지도 노드 받침
```text
ASSET: map node base plates, native 24x24 each, row with magenta gaps. Each is a baseball-base shaped (45-degree diamond) stadium plaque seen from the front, where a pitcher silhouette or icon will be placed by code.
Five variants: (1) regular fight — navy enamel with brass rim; (2) elite — navy with red stitch rim; (3) boss — larger visual weight, gold rim with four studs; (4) facility — cream leather with brass rim; (5) locked — dark grey, no highlights.
```

### A11 아이콘 12종
```text
ASSET: icon set, 12 icons, each native 12x12, in one row (or 2 rows of 6) with magenta gaps, all same visual weight and outline.
Icons: (1) deck — stack of three cards; (2) discard — card with a small downward arrow; (3) sound on — stadium speaker with two waves; (4) sound off — speaker with a small cross; (5) help — round baseball with a question-mark-shaped stitch (not a letter, a stitch curve); (6) locker room — locker door; (7) training — baseball bat and ball; (8) shop — equipment bag; (9) rest — crescent moon over a cap; (10) runner — small running figure silhouette on a base; (11) shaken — a baseball with a crack line; (12) signature — four-point star in gold.
Cream and gold on transparent, 1px #07080d outline.
```

---

## 5. 검수 기준 (사용자가 받을 때 보고, Claude가 적용 전에 다시 본다)

| # | 기준 | 불합격 예 |
| --- | --- | --- |
| Q1 | 투수 그림 옆에 두면 같은 게임으로 보인다 | 매끈한 벡터, 페인팅 번짐 |
| Q2 | 한 에셋 안 픽셀 크기가 하나 | 가장자리는 크고 안쪽은 작은 픽셀 |
| Q3 | 9-slice 테두리 두께가 네 변 동일, 가운데 면 단색 | 가운데에 무늬·그라데이션 |
| Q4 | 글자·숫자 없음 | 버튼에 "OK", 카드에 숫자 |
| Q5 | 배경이 진짜 투명 또는 완전 단색 `#FF00FF` | 체크무늬, 마젠타 그라데이션 |
| Q6 | 상태 변형이 한 이미지 안에 같은 크기로 나란히 | 상태마다 화풍이 다름 |
| Q7 | 팔레트 밖 색이 크게 없음 | 형광 파랑, 보라 그라데이션 |
| Q8 | 폰 크기로 줄여도 형태가 읽힘 (412px 폭 화면에서 버튼 높이 약 48px) | 줄이면 실밥이 뭉개져 노이즈 |

---

## 6. 전달 방법

1. 에셋마다 1장씩 생성 (A1부터). 불합격이면 같은 프롬프트에 "문제: …, 고칠 것: …"을 붙여 다시.
2. 합격본을 `A1-bubble.png` 식으로 이름 붙여 Claude 세션에 올린다 (한 번에 여러 장 가능).
3. Claude가 할 일: 배경 제거 → 격자에 맞춰 정리 → `assets/ui-kit/`에 저장 → CSS `border-image`로 `.bp-*` 요소에 적용 → 3뷰포트 스크린샷 비교 → 사용자 확인 후 반영.

적용 순서(체감 큰 순): **A1 말풍선 → A4/A5 버튼 → A6/A7 카드 → A3 패널 → A9 HP → A8 진행 → A10 지도 → A11 아이콘**.

---

## 7. 제미나이에 처음 붙여 넣을 메시지

```text
첨부한 투수 캐릭터 그림들과 똑같은 고밀도 애니 픽셀 아트 화풍으로, 야구 로그라이크 게임 "9ZONE HOMEBOUND"의 UI 에셋을 한 장씩 만들 거야.
아래 스타일 규칙을 모든 이미지에 지켜 줘. 글자·숫자는 절대 넣지 말고, 배경은 진짜 투명(안 되면 완전 단색 #FF00FF)으로.
첫 번째는 A1 대사 말풍선이야. 프롬프트:
<공통 머리말 + A1 프롬프트를 여기에 붙여 넣기>
```
이후에는 "다음은 A4 주 버튼. 프롬프트: <공통 머리말 + A4>" 식으로 하나씩.
