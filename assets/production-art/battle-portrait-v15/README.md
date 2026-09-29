# Battle Portrait V15 — production art candidates

`docs/art/benchmark/target/battle-portrait.png`를 기준으로 새로 제작한 **비파괴 후보 자산**이다. 기존 런타임 파일은 교체하지 않았다. 제미나이가 배치와 전환을 다듬을 때 `manifest.json`의 프레임 좌표와 시간을 사용한다.

## 파일

| 자산 | 파일 | 용도 |
| --- | --- | --- |
| 타자 키포즈 7장 | `batter-ready.png`, `batter-load.png`, `batter-swing-start.png`, `batter-swing-mid.png`, `batter-contact.png`, `batter-follow-early.png`, `batter-follow-through.png` | 같은 인물의 준비 → 코일 → 스윙 → 임팩트 → 팔로스루 |
| 타자 시트·미리보기 | `batter-sheet.png`, `batter-animatic.webp` | 1024×1536 셀 8개, 4열×2행. 마지막 셀은 헛스윙 전용 |
| 타자 헛스윙 회복 | `batter-miss-recovery.png` | 심판캠 구도의 #9 타자 헛스윙 후 배트를 낮추는 포즈. 시트의 여덟 번째 셀에 연결 |
| 레드 러시 키포즈 3장 | `red-rush-windup.png`, `red-rush-stride.png`, `red-rush-release.png` | 기존 여성 투수의 와인드업 → 스트라이드 → 릴리스 |
| 투수 시트·미리보기 | `red-rush-sheet.png`, `red-rush-animatic.webp` | 1024×1536 셀 3개 |
| 배경 | `stadium-portrait.png` | 타자석 시점의 도시 야구장, 문자·UI 없는 불투명 플레이트 |
| 임팩트 VFX | `impact-burst.png` | 알파가 있는 1회성 금빛/청록 타격 섬광 |
| 구도 참고 | `scene-preview.jpg` | 412×743 합성 예시이며 런타임 화면이 아님 |

## 애니메이션 연결 메모

- 시트는 각 포즈의 **발 기준선을 맞춘** 고정 셀이다. 원본 개별 PNG는 생성 원형 그대로이며 `manifest.json`의 `offset_y_in_sheet`만큼 세로 이동해 시트를 만들었다.
- `batter-animatic.webp`와 `red-rush-animatic.webp`는 **키포즈 타이밍 확인용**이다. 두 포즈 사이의 인비트윈과 부드러운 체중 이동은 아직 없다. 실제 플레이에 사용할 때 포즈 보간 또는 추가 프레임을 제작하고 피벗을 화면 좌표에서 검수한다.
- 타자 contact를 hit-stop의 중심 프레임으로, `impact-burst.png`를 공/배트 접점에 1회 합성한다. 임팩트광이 타자·투수·경기장에 함께 반영되도록 런타임에서 보강한다.
- 투수는 현재 게임의 레드 러시를 기준으로 했으며, 불투명 상의·긴 야구 바지로 통일했다.

## 제작 프롬프트 요약

- **타자:** 목표 목업의 대형 어깨너머 구도, 기존 9ZONE 크림·틸 유니폼의 정체성, 상업 게임급 HD 픽셀 클러스터, 투명 전신 컷아웃. 같은 인물·카메라·광원을 고정한 ready/load/swing-start/swing-mid/contact/follow-early/follow-through 포즈.
- **투수:** 기존 레드 러시의 빨간 포니테일·검정/빨강 정체성을 보존하고 목업 수준의 HD 픽셀화. 전신 와인드업/스트라이드/릴리스, 투명 배경.
- **경기장:** 타자석 시점, 석양 도시·다리·관중석·투광등, 인물/글자/UI 없는 세로 배경.
- **VFX:** 흰 중심광, 금빛 스타버스트와 청록 충격파 링, 투명 단독 이펙트.

## 확인 결과와 남은 작업

모든 캐릭터/VFX PNG는 알파 채널이 있고 경기장만 불투명하다. 프레임 크기와 불투명 영역은 `manifest.json`에 기록했다. 기존 화면에 실제 연결하거나 QUALITY-BAR 통과 판정을 하지는 않았다. 7장/3장 키포즈만으로는 완성된 고프레임 애니메이션이 아니므로, 추가 인비트윈 및 412×743/844×390/1440×900 런타임 검수가 필요하다.

## 2026-09-30 헛스윙 포즈 추가

- [MLB 심판캠 타격 영상](https://www.mlb.com/video/shohei-ohtani-s-hr-through-the-eyes-of-ump-cam)의 준비·스윙 구간을 화면에서 확인했다. 카메라 가까운 타자가 크게 보이고 두 손과 배트가 전경을 통과한다는 구도만 참고했으며, 영상 프레임을 에셋에 복사하지 않았다.
- 기존 #9 외형을 유지한 새 포즈를 `batter-miss-recovery.png`에 보존했다. 원본은 1024×1536 RGBA이고, 128 초과 알파의 발끝을 1527px 공통 기준선에 맞춰 41px 내렸다. `scripts/build-batter-miss-recovery.py`가 두 시트의 빈 여덟 번째 칸을 재생성한다.
- V10 헛스윙 결과에서만 이 포즈를 보여준다. 안타의 contact·finish 시퀀스와 전투 판정은 그대로다. 생성 초안의 여분 다리·신발을 발견해 원본을 두 다리·두 신발로 다시 제작하고 시트를 갱신했다. 수정본의 게임 화면, 실제 Pixi 재생의 연속 동작 및 10화면 품질 판정은 별도 검수가 남는다.
