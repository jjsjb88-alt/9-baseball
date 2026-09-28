# 9ZONE HOMEBOUND — MASTERPIECE 2.0 ROADMAP

> 기준일: 2026-09-29  
> 기준 브랜치: `main` @ `0ff2f57672e5b23df1c0cc4fefa59d194957133a`  
> 목적: 기능 추가보다 **완성된 한 작품처럼 보이고 느껴지는 게임**으로 끌어올리는 품질 재정렬.
> 기존 `AGENTS.md`, `VISUAL-REBOOT-LOOP-ENGINEERING.md`, `docs/V12-MASTERPIECE.md`, `docs/antigravity/QUEUE.md`의 계약은 그대로 유지한다.

## 0. 현재 상태 판정

이미 잘 된 부분:
- 세로 전투 PHASE 1은 내부 품질 게이트를 통과했고, 카드/9ZONE/HUD/버튼/기본 타격 연출 구조가 잡혀 있다.
- PHASE 2에서 가로 전투, 보상, 지도, 덱/도감, 타이틀/엔딩, 일부 VFX까지 실제 런타임에 연결됐다.
- 테스트·시각 QA·영향도 분석 규칙이 저장소에 이미 존재한다.
- 카드 아트는 계속 보강 중이며 시각 자산 파이프라인도 생겼다.

남은 핵심 병목:
1. **대표 전투 장면의 ‘한 장 완성도’**가 아직 모든 화면의 기준점 역할을 하지 못한다.
2. 타자/투수/경기장/VFX/UI가 각각 개선됐어도 **동일한 아트 디렉션으로 묶이는 힘**이 약하다.
3. 모션은 프레임 수보다 **체중 이동·타이밍·카메라·히트스톱의 연결**이 더 중요하다.
4. 홈런/정타/파울/헛스윙/삼진/강판이 서로 다른 감정 곡선을 가져야 한다.
5. 모바일 세로/가로/PC가 단순 축소·재배치가 아니라 각 화면에 맞는 구도로 완성되어야 한다.
6. 자동 QA 점수는 품질 근거 중 하나일 뿐이며, 최종 Visual PASS는 실제 렌더 비교로 판단해야 한다.

## 1. MASTERPIECE 2.0의 핵심 전략

이번 패스는 “부품을 하나씩 예쁘게 만든 뒤 합치는 방식”을 버린다.

**최종 화면을 먼저 감독하고, 그 화면을 성립시키는 데 필요한 부품을 역으로 제작한다.**

단일 우선순위:

> 390×844 대표 전투 화면 한 장이 홍보 이미지로 그대로 사용 가능해야 한다.

이 Golden Master가 통과하기 전에는 다른 화면을 대규모로 다시 꾸미지 않는다.

## 2. 모델 역할 분리 — Astra를 감독으로 사용

### GPT-6 Astra가 담당할 일
- 현재 렌더의 시각적 문제를 우선순위화
- Golden Master 구도와 시선 흐름 결정
- 에셋/코드/연출이 서로 충돌하는 원인 분석
- 실제 브라우저 화면 비교
- 여러 구현안을 비교하고 다음 루프를 선택
- 모션 타이밍, 카메라, VFX처럼 여러 시스템을 동시에 보는 난제
- 마지막 Master QA와 “왜 아직 싸 보여 보이는가” 판정

### Sol/Terra가 담당할 일
- 확정된 설계의 반복 구현
- CSS/컴포넌트 정리
- 테스트 추가
- 에셋 매핑
- 카드 데이터/포즈 테이블 연결
- 다수의 비슷한 수정
- 문서 갱신, 스모크, 회귀 체크

### 이미지 생성이 담당할 일
- Batter/Pitcher MASTER
- 카드 일러스트
- 경기장 레이어
- 결과 컷인
- VFX 원화
- 홍보용 key pose

원칙: **Astra에게 픽셀 수작업을 반복시키지 않는다. Astra는 ‘무엇을 왜 다시 만들어야 하는지’ 결정한다.**

## 3. 세션 한도 절약 규칙

1. Astra 기본 추론은 Low 또는 Medium.
2. High는 아래 네 구간에만 우선 배정한다.
   - M0 Visual Bible Lock
   - M1 Battle Golden Master
   - M4 Motion/Cinematic Timing
   - M9 Final Master QA
3. 한 Astra 루프는 반드시 하나의 비교 질문만 가진다.
   - 예: “타자가 작다” + “카드가 복잡하다” + “지도도 별로다”를 한 번에 처리하지 않는다.
4. 매 Astra 호출 전에 필요한 캡처·파일·비교 대상을 모두 준비한다.
5. 실패 원인이 구현 문제면 같은 문제를 Astra에게 재질문하지 않고 Sol/Terra로 수정한다.
6. 정적 테스트/빌드/반복 수정은 Astra 사용 금지.
7. 한 루프의 끝에는 반드시 PASS / FAIL / NEXT 하나를 기록한다.

## 4. M0 — VISUAL BIBLE LOCK

목표: 이후 생성되는 모든 그래픽과 UI가 같은 작품처럼 보이게 한다.

산출물:
- 색온도 / 명암 / 림라이트 / 금속 / 유리 / 흙 / 잔디 / 네온 규칙
- 캐릭터 비율 및 픽셀 밀도
- 타자/투수 공통 외곽선 규칙
- UI 프레임 재질
- 카드 일러스트 크롭 규칙
- 경기장 전경/중경/후경/공기층 규칙
- 허용 VFX / 금지 VFX
- 세로/가로/PC의 카메라 기준

PASS:
- 이름/로고를 가려도 “같은 게임”의 화면이라고 판단 가능.
- 신규 에셋이 기존 화면 위에서 붕 뜨지 않음.
- 저품질 placeholder를 품질 판단에 사용하지 않음.

## 5. M1 — BATTLE GOLDEN MASTER 2.0

최우선 단계.

390×844 대표 전투 한 화면에 아래를 모두 넣는다.
- Batter hero actor
- Pitcher on mound
- Stadium depth
- 9ZONE
- Pitcher HP
- Cards / stack state
- Primary action
- Lighting / atmosphere
- 최소 1개의 action anticipation state

시선 순서 목표:
**승부 장면 → 투수/타자 → 9ZONE → 손패 → 실행 버튼**

PASS:
- UI보다 야구 승부가 먼저 보인다.
- 타자와 투수가 같은 공간에 서 있는 것처럼 보인다.
- 9ZONE과 카드는 전투를 설명하지만 장면을 압도하지 않는다.
- 390×844 캡처를 그대로 스토어/홍보 후보로 사용할 수 있다.
- Golden Master 승인 전 대규모 화면 확장 금지.

## 6. M2 — BATTER MASTER

목표: 타자를 게임의 대표 배우로 만든다.

필수 상태:
ready → load → trigger → swing-start → swing-mid → contact → follow-through-early → follow-through-late → finish → settle

별도 reaction:
- miss
- foul
- homer

PASS:
- 발 기준선 흔들림 없음.
- 배트 길이/그립/얼굴/헬멧이 프레임마다 변형되지 않음.
- contact 한 장만 떼도 홍보용 이미지로 쓸 수 있음.
- 하체 → 골반 → 흉곽 → 손 → 배트의 에너지 전달이 보임.
- 단순 프레임 교체가 아니라 관성이 읽힘.

## 7. M3 — PITCHER MASTER

최소 3 아키타입을 실루엣과 리듬으로 분리:
- power/high
- sinker/low
- closer/boss

필수 상태:
set → windup → leg-lift → stride → release → finish → dominant reaction

PASS:
- 이름/색/HP를 가려도 유형이 구분됨.
- 투수의 축발이 마운드와 일치.
- 모든 투수가 동일한 화면 좌표 규격을 공유.
- 단순 색상 스킨 방식 금지.

## 8. M4 — MOTION & CINEMATIC TIMING

목표: “프레임이 많다”가 아니라 “동작이 산다”.

타격 기본 타임라인 예:
anticipation → pitch release → ball read → trigger → acceleration → contact hit-stop → follow-through → result payoff

결과별 연출 분리:
- 정타
- 장타
- 홈런
- 파울
- 빗나감
- 삼진
- 투수 강판

PASS:
- 각 결과의 카메라/명암/소리/VFX 리듬이 서로 다름.
- 모든 효과가 같은 순간 동시에 터지지 않음.
- contact와 release에서 시선 주도권이 명확함.
- reduced-motion에서도 정보 손실 없음.
- 60fps 목표를 유지하되 프레임 수보다 입력 지연·페이싱·지각적 부드러움을 우선.

## 9. M5 — IMPACT / VFX LANGUAGE

효과를 더 많이 만드는 단계가 아니다. **효과의 문법을 정리하는 단계**다.

정의할 것:
- READ
- GOOD CONTACT
- DEAD CENTER
- FOUL
- MISS
- STRIKEOUT
- HOME RUN
- KNOCKOUT

각 판정에:
- 색
- 광량
- 카메라
- hit-stop
- shake
- trail
- scoreboard reaction
- stadium reaction
- duration
을 별도로 정의한다.

PASS:
- 텍스트를 숨겨도 대략 어떤 결과인지 감정적으로 구분 가능.
- 파티클 수로 강도를 표현하지 않음.
- 실패도 “아무 일도 안 일어남”이 아니라 짧고 명확한 리액션을 가짐.

## 10. M6 — CARD / 9ZONE / DECISION UI

목표: 보드게임처럼 읽히되 장면을 죽이지 않는 결정 UI.

중점:
- 카드 역할을 이미지와 프레임만으로 1차 구분
- 비용/조건/커버/순서의 정보 위계
- stack/commit 전이
- CONNECT/BREAK
- 실제 엔진 coverage와 일치
- 손패 → 슬롯 이동의 물리감
- 선택/잠김/오류의 해결 방법 즉시 표시

PASS:
- 신규 사용자가 20초 안에 첫 배치를 시도할 수 있는지 검증.
- 12px 미만 핵심 텍스트 금지.
- 카드가 많아져도 야구 장면이 뒤로 밀리지 않음.
- 엔진 계산을 UI가 임의로 재해석하지 않음.

## 11. M7 — STADIUM INTEGRATION

목표: 캐릭터가 배경 위에 붙은 것이 아니라 실제 야구장 안에 존재하게 한다.

필수:
- foreground occlusion
- contact shadow
- mound / batter box grounding
- asymmetric authored landmark
- scoreboard
- crowd depth
- atmosphere
- selective rim light

PASS:
- procedural CSS 장식이 장면의 주인공이 아님.
- 타자/투수 발이 공간에 접지됨.
- 캐릭터 광원과 배경 광원이 일치.
- 모바일에서도 전경/중경/후경이 구분됨.

## 12. M8 — META SCREENS

Golden Battle을 기준으로:
- Title
- Map
- Reward
- Locker / Facility
- Deck / Dex
- Ending

각 화면을 같은 재질·조명·타이포·프레임 언어로 정리한다.

PASS:
- 다른 게임의 화면을 섞어 놓은 느낌이 없음.
- 각 화면마다 정보 밀도는 다르지만 동일한 Visual Bible을 공유.
- 지도와 보상은 장식이 아니라 선택의 의미를 강화.

## 13. M9 — MASTER QA

필수 캡처:
- 390×844
- 844×390
- 1440×900

필수 플레이:
title → map → battle → reward → facility → battle → ending

필수 상태:
- idle
- read
- contact
- foul
- miss
- homer
- knockout
- save/resume

최종 질문:
1. 설명 없이 캡처만 봐도 작품의 정체성이 보이는가?
2. 타자/투수가 placeholder로 느껴지는 구간이 남았는가?
3. 전투 한 장면이 UI보다 먼저 기억되는가?
4. 실패 연출도 보는 맛이 있는가?
5. 세 화면비가 각각 의도된 구도인가?
6. Before/After 차이가 설명 없이도 즉시 보이는가?

하나라도 NO면 MASTERPIECE 2.0 완료 선언 금지.

## 14. 영향도 분석 계약

모든 구현 PR은 `AGENTS.md`의 9축을 그대로 따른다.
- UI / 레이아웃
- 입력 / 제스처
- 게임 로직 / 밸런스
- 저장 / 불러오기
- 모바일 뷰포트
- 스크롤 / 오버플로
- 기존 사용자 플로우
- 테스트 / 회귀
- 빌드 / 배포

아트 변경도 예외가 아니다.

## 15. 완료의 정의

MASTERPIECE 2.0은 “모든 항목을 구현했다”가 아니라 다음 상태를 뜻한다.

- 대표 전투 한 장면이 작품의 키아트 역할을 함
- 타자/투수의 움직임이 실제 야구 동작처럼 읽힘
- 결과별 연출이 감정적으로 구분됨
- UI가 게임 규칙을 정확히 설명하면서 장면을 죽이지 않음
- 전 화면이 동일한 Visual Bible을 공유
- 3뷰포트 회귀 없음
- 전체 테스트 / smoke / production build 통과
- 실제 렌더 Before / After에서 차이가 즉시 보임
- 사용자 최종 Visual PASS 전에는 완료 선언하지 않음
