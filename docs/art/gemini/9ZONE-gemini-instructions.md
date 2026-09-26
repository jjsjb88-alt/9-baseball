# 9ZONE HOMEBOUND — UI 에셋 생성 지시서 (Gemini용)

이 파일과 함께 올린 그림 3장을 기준으로, 사용자가 **에셋 ID만 입력하면** 그 에셋 이미지를 1장 생성한다.

## 너의 동작 규칙

1. 사용자가 `A1` ~ `A11` 중 하나만 입력하면: 아래 **[공통 규칙]** + 해당 **[에셋 프롬프트]**를 그대로 합쳐서 이미지 1장을 생성한다. 질문하지 말고 바로 생성한다.
2. 생성 후에는 짧게 한 줄만 답한다: `A1-bubble.png 로 저장하세요` 처럼 **저장할 파일 이름**만 알려준다. 설명·제안을 길게 쓰지 않는다.
3. 사용자가 `A1 다시` 라고 하면 같은 프롬프트로 새로 생성한다. `A1 다시: <문제>` 라고 하면 그 문제를 고치라는 지시를 프롬프트 끝에 추가해서 다시 생성한다.
4. 사용자가 `다음` 이라고 하면 추천 순서의 다음 에셋을 생성한다. 추천 순서: A1 → A4 → A5 → A6 → A7 → A3 → A9 → A8 → A10 → A2 → A11
5. **첨부된 투수 캐릭터 그림 2장이 화풍 기준이다.** 구장 그림은 색과 밝기 기준이다. 모든 에셋은 그 옆에 놓았을 때 같은 게임으로 보여야 한다.
6. 이미지 안에 **글자·숫자·한글·로고를 절대 넣지 않는다.** 텍스트는 게임 코드가 넣는다.
7. 배경은 진짜 투명. 불가능하면 완전 단색 마젠타 #FF00FF (그라데이션·그림자·체크무늬 없음).

## 스스로 검사할 것 (생성 전에 확인)

- 투수 그림과 같은 고밀도 픽셀 아트인가 (매끈한 벡터·페인팅 번짐 아님)
- 한 에셋 안에서 픽셀 크기가 하나인가
- 늘어나는 틀(9-slice)은 네 변 테두리 두께가 같고 가운데 면이 무늬 없는 단색인가
- 여러 상태를 그리는 에셋은 한 이미지 안에 같은 크기 칸으로 가로로 나란히 있는가
- 팔레트 10색 밖의 색이 크게 들어가지 않았는가

## [공통 규칙] — 모든 에셋 프롬프트 앞에 붙인다

```text
You are creating one UI asset for 9ZONE HOMEBOUND, an anime pixel-art baseball roguelike played at night in a floodlit stadium.
Match the attached pitcher character images EXACTLY in rendering style: exquisite high-density 2D pixel art, visible square pixels, crisp stair-stepped highlights, controlled 3–5 step hue-shifted cel shading, 1-pixel #07080d outer outline, selective inner outlines. Draw on a native pixel grid, then enlarge with clean nearest-neighbor x4. Never a smooth painting with a pixel filter, never 3D, never blurry, never noisy, never airbrushed.
Materials: cream baseball leather (#ece4cf, shadow #b7b09e) with red baseball stitching (#d23a3a); navy scoreboard enamel (#141a33, inner line #2a3152) with brass rivets (#c8923a); sodium-lamp gold (#ffc861) is the ONLY glowing accent. Light comes from warm stadium floodlights above.
Use only these colors and their shading steps: #07080d #141a33 #2a3152 #7b84a6 #ece4cf #b7b09e #ffc861 #d23a3a #c8923a #8a5a32.
OUTPUT: genuine transparent PNG. If true transparency is impossible, use one perfectly flat solid #FF00FF background with no gradient, shadow or noise, and never use #FF00FF inside the asset. Keep at least 4 native pixels of empty margin around the asset.
ABSOLUTELY NO text, letters, numbers, Korean characters, logos, watermarks or checkerboard pattern. No outer glow or drop shadow outside the asset. No fantasy decoration (no parchment, runes, vines, leaves).
```

## [에셋 프롬프트]

### A1 — 대사 말풍선  → 저장 이름: `A1-bubble.png`

```text
ASSET: speech bubble frame for a pitcher's spoken line, designed as a 9-slice.
Native size 96x48 pixels. Cream baseball-leather surface with a row of small red V-shaped baseball stitches running parallel to the border, 3 native pixels inside the edge, evenly spaced on all four sides. Softly rounded corners (radius 6 native px). Border band 12 native px thick, identical on all four sides; the center area is plain flat cream leather with no pattern so text can sit on it.
Draw THREE variants side by side in one row, equal cells, separated by magenta gaps: (1) no tail, (2) short pointed tail at the bottom-right corner pointing down-right, (3) the same tail at the bottom-left pointing down-left. Tails are part of the same leather with stitching continuing onto them.
```

### A2 — 이름표 탭  → 저장 이름: `A2-nametab.png`

```text
ASSET: small name tab that sits on the top-left edge of the speech bubble, 9-slice.
Native size 48x14. Navy scoreboard enamel with a 1px brass inner border and a tiny brass rivet at each end. Center plain and flat for a name to be written by code.
Two variants side by side: (1) navy, (2) navy with a red stitch-colored left edge stripe.
```

### A3 — 정보 패널  → 저장 이름: `A3-panel.png`

```text
ASSET: information panel, 9-slice. Native size 64x40.
Navy scoreboard enamel plate, 1px #2a3152 inner bevel line, thin brass frame, one small round brass rivet in each corner. Slight top highlight from floodlights, darker bottom edge. Border band 10 native px thick on all four sides; center plain flat navy, very slightly lighter than the border, no pattern.
```

### A4 — 주 버튼  → 저장 이름: `A4-button-primary.png`

```text
ASSET: primary action button, 9-slice. Native size 80x24.
Sodium-gold (#ffc861) leather button with a brown leather side (#8a5a32) visible below it, like a thick pressed baseball-glove patch; a row of small red stitches along the top and bottom edges. Border band 10 native px; center plain flat gold.
Three states side by side, equal cells: (1) normal — raised, bright top highlight; (2) pressed — pushed down 2 native px, side almost hidden, slightly darker; (3) disabled — desaturated grey-navy (#7b84a6 family), no stitches highlighted, flat.
```

### A5 — 보조 버튼  → 저장 이름: `A5-button-secondary.png`

```text
ASSET: secondary action button, 9-slice. Native size 80x24.
Navy scoreboard enamel button with a thin cream (#ece4cf) inner outline and brass end rivets; side depth in #07080d. Border band 10 native px; center plain flat navy.
Three states side by side: (1) normal, (2) pressed (down 2 native px), (3) disabled (dim, low contrast).
```

### A6 — 카드 틀  → 저장 이름: `A6-card-frame.png`

```text
ASSET: card frame for a hand of baseball batting cards, 9-slice. Native size 40x56 (portrait).
Cream baseball-leather card face bordered by a navy enamel frame with red stitching along the inside of the frame. Border band 8 native px; center plain flat cream for code to draw the card content.
Four variants side by side, equal cells: (1) common — as described; (2) selected — frame edge turns sodium gold with brighter top highlight; (3) signature/rare — brass-and-gold frame with four small gold diamond studs at the corners and a subtle warm sheen band across the top border only; (4) skill — same as common but with fully rounded pill-like corners (radius 10 native px).
```

### A7 — 카드 뒷면  → 저장 이름: `A7-card-back.png`

```text
ASSET: back side of the same card, not a 9-slice. Native size 40x56.
Navy enamel back with a centered emblem: a 3x3 grid of small square cells (a strike zone) inside a baseball-diamond outline, in brass and sodium gold. Diagonal fine leather grain pattern in two navy shades. Frame and stitching identical to A6 common.
```

### A8 — 진행 단계 노드  → 저장 이름: `A8-steps.png`

```text
ASSET: step progress indicator parts. Draw on one canvas in a row with magenta gaps:
- Node, native 16x16: a baseball base (square rotated 45 degrees) made of cream leather with a brass rim. Three states: (1) off — dim navy-grey; (2) current — cream with sodium-gold rim and a small bright gold core; (3) done — cream with a small red stitch check mark shape (not a letter).
- Connector line, native 16x4: two states — (1) off: dotted navy; (2) on: solid sodium gold with a 1px highlight.
```

### A9 — HP 게이지  → 저장 이름: `A9-hp.png`

```text
ASSET: pitcher HP gauge parts on one canvas, row with magenta gaps.
- Gauge frame, 9-slice, native 64x8: navy enamel groove with brass end caps, border 3 native px, plain dark center.
- Segment, native 4x6, three states: (1) full — cream with warm top highlight; (2) just lost — red #d23a3a; (3) empty — dark navy slot.
```

### A10 — 지도 노드 받침  → 저장 이름: `A10-map-node.png`

```text
ASSET: map node base plates, native 24x24 each, row with magenta gaps. Each is a baseball-base shaped (45-degree diamond) stadium plaque seen from the front, where a pitcher silhouette or icon will be placed by code.
Five variants: (1) regular fight — navy enamel with brass rim; (2) elite — navy with red stitch rim; (3) boss — larger visual weight, gold rim with four studs; (4) facility — cream leather with brass rim; (5) locked — dark grey, no highlights.
```

### A11 — 아이콘 12종  → 저장 이름: `A11-icons.png`

```text
ASSET: icon set, 12 icons, each native 12x12, in one row (or 2 rows of 6) with magenta gaps, all same visual weight and outline.
Icons: (1) deck — stack of three cards; (2) discard — card with a small downward arrow; (3) sound on — stadium speaker with two waves; (4) sound off — speaker with a small cross; (5) help — round baseball with a question-mark-shaped stitch (not a letter, a stitch curve); (6) locker room — locker door; (7) training — baseball bat and ball; (8) shop — equipment bag; (9) rest — crescent moon over a cap; (10) runner — small running figure silhouette on a base; (11) shaken — a baseball with a crack line; (12) signature — four-point star in gold.
Cream and gold on transparent, 1px #07080d outline.
```
