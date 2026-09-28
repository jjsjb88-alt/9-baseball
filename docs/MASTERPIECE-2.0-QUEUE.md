# MASTERPIECE 2.0 — EXECUTION QUEUE

> 이 큐는 기존 `docs/antigravity/QUEUE.md`를 덮어쓰지 않는다.
> MASTERPIECE 2.0의 **품질업 전용 상위 큐**다.
> 한 루프 = 한 항목. 각 항목은 별도 브랜치/PR/프리뷰를 기본으로 한다.
>
> 상태: `[ ]` 대기 · `[~]` 작업/PR · `[x]` 통과 · `[!]` 막힘 · `[R]` 재루프
>
> 모델 표기:
> - A-L = Astra Low
> - A-M = Astra Medium
> - A-H = Astra High
> - S = Sol
> - T = Terra
> - IMG = 이미지 생성

## GATE 0 — 기준 잠금

- [ ] MP2-00 현재 main 3뷰포트 Before 캡처 고정 — S
- [ ] MP2-01 기존 아트/모션/화면 중 보존 자산과 폐기 후보 인벤토리 — S
- [ ] MP2-02 Visual Bible 초안 — A-M
- [ ] MP2-03 Visual Bible 실제 자산 6종 샘플 검증 — A-M + IMG
- [ ] MP2-04 Visual Bible LOCK / 금지 패턴 문서화 — A-H

완료 조건:
- 이후 모든 새 에셋이 같은 작품의 자산으로 판정 가능
- 저품질 placeholder 사용 금지
- Before 캡처와 기준 SHA 고정

## GATE 1 — BATTLE GOLDEN MASTER

- [ ] MP2-10 390×844 현재 전투 시선 흐름 분석 — A-M
- [ ] MP2-11 대표 구도 3안 생성/비교 — A-M + IMG
- [ ] MP2-12 Golden Master 1안 선정 — A-H
- [ ] MP2-13 Golden Master에 필요한 자산 차이 목록 확정 — A-M
- [ ] MP2-14 런타임 1차 구현 — S
- [ ] MP2-15 실제 브라우저 캡처와 목업 비교 — A-M
- [ ] MP2-16 가장 약한 축 1개만 재루프 — S/IMG
- [ ] MP2-17 Golden Master Final PASS — A-H

완료 조건:
- 390×844 한 장을 홍보 이미지 후보로 사용 가능
- 야구 승부가 UI보다 먼저 보임
- 사용자 승인 전 다음 대규모 화면 리디자인 금지

## GATE 2 — BATTER MASTER

- [ ] MP2-20 타자 MASTER 신체비율/카메라/팔레트 lock — A-M + IMG
- [ ] MP2-21 ready/load/trigger 생성 및 동일성 QA — IMG + S
- [ ] MP2-22 swing-start/swing-mid/contact 생성 및 동일성 QA — IMG + S
- [ ] MP2-23 follow-through-early/late/finish/settle 생성 — IMG + S
- [ ] MP2-24 miss/foul/homer reaction 제작 — IMG
- [ ] MP2-25 anchor/배트/얼굴/헬멧 자동 검증 — S
- [ ] MP2-26 런타임 삽입 — S
- [ ] MP2-27 실제 모션 타이밍 판정 — A-M
- [ ] MP2-28 Batter Final PASS — A-H

## GATE 3 — PITCHER MASTER

- [ ] MP2-30 power/high silhouette lock — A-M + IMG
- [ ] MP2-31 sinker/low silhouette lock — A-M + IMG
- [ ] MP2-32 closer/boss silhouette lock — A-M + IMG
- [ ] MP2-33 각 archetype 7 key pose 제작 — IMG
- [ ] MP2-34 mound anchor / release point normalization — S
- [ ] MP2-35 12명 투수에 archetype 규칙 매핑 — S
- [ ] MP2-36 실제 전투 삽입/회귀 — S
- [ ] MP2-37 이름·색 제거 blind silhouette QA — A-M
- [ ] MP2-38 Pitcher Final PASS — A-H

## GATE 4 — MOTION / CINEMATIC

- [ ] MP2-40 pitch→read→trigger→contact 전체 타임라인 계측 — S
- [ ] MP2-41 perceptual stutter 원인 분해 — A-H
- [ ] MP2-42 key pose duration / acceleration 패스 — S
- [ ] MP2-43 contact hit-stop / camera timing 패스 — A-M + S
- [ ] MP2-44 follow-through / settle 관성 패스 — A-M + S
- [ ] MP2-45 60fps / low-end adaptive 검증 — S
- [ ] MP2-46 reduced-motion 검증 — S
- [ ] MP2-47 Motion Final PASS — A-H

## GATE 5 — RESULT LANGUAGE

- [ ] MP2-50 READ 연출 문법 — A-M
- [ ] MP2-51 solid/dead-center 연출 문법 — A-M
- [ ] MP2-52 foul 연출 문법 — A-M
- [ ] MP2-53 miss/strikeout 연출 문법 — A-M
- [ ] MP2-54 homer 연출 문법 — A-H
- [ ] MP2-55 knockout 연출 문법 — A-M
- [ ] MP2-56 VFX 원화 제작/연결 — IMG + S
- [ ] MP2-57 실제 타임라인 비교 — A-M
- [ ] MP2-58 Result Language Final PASS — A-H

## GATE 6 — CARD / 9ZONE UX

- [ ] MP2-60 현재 첫 투구 신규 사용자 시뮬레이션 — A-M
- [ ] MP2-61 카드 정보 위계 재정렬 — A-M
- [ ] MP2-62 hand→stack→commit transition 구현 — S
- [ ] MP2-63 CONNECT/BREAK / 실제 coverage 정확성 검증 — S
- [ ] MP2-64 잠김/오류의 해결행동 표시 — S
- [ ] MP2-65 카드 선택 물리감 / touch 검증 — S
- [ ] MP2-66 390×844/844×390 의사결정 밀도 QA — A-M
- [ ] MP2-67 Card/9ZONE Final PASS — A-H

## GATE 7 — STADIUM INTEGRATION

- [ ] MP2-70 authored landmark 선정/제작 — A-M + IMG
- [ ] MP2-71 batter box / mound / shadow 접지 패스 — S
- [ ] MP2-72 foreground occlusion 패스 — S
- [ ] MP2-73 crowd/scoreboard depth 패스 — IMG + S
- [ ] MP2-74 key/rim/contact lighting 통합 — A-M + S
- [ ] MP2-75 세로/가로/PC depth 비교 — A-M
- [ ] MP2-76 Stadium Final PASS — A-H

## GATE 8 — META SCREEN UNIFICATION

Golden Battle 승인 후 시작.

- [ ] MP2-80 Title 재정렬 — S + IMG
- [ ] MP2-81 Map 재정렬 — S + IMG
- [ ] MP2-82 Reward 재정렬 — S + IMG
- [ ] MP2-83 Locker/Facility 재정렬 — S + IMG
- [ ] MP2-84 Deck/Dex 재정렬 — S + IMG
- [ ] MP2-85 Ending 재정렬 — S + IMG
- [ ] MP2-86 전 화면 visual consistency QA — A-M
- [ ] MP2-87 Meta Final PASS — A-H

## GATE 9 — MASTER QA

- [ ] MP2-90 390×844 전체 런 캡처 — S
- [ ] MP2-91 844×390 전체 런 캡처 — S
- [ ] MP2-92 1440×900 전체 런 캡처 — S
- [ ] MP2-93 save/resume/input/scroll/rotation regression — S
- [ ] MP2-94 전체 테스트 + smoke + production build — S
- [ ] MP2-95 Before/After contact/release/result contact sheet — S
- [ ] MP2-96 Astra 최종 결함 목록 — A-H
- [ ] MP2-97 결함별 단일 재루프 — S/T/IMG
- [ ] MP2-98 최종 Visual PASS 후보 — A-H
- [ ] MP2-99 사용자 최종 판정 — USER

## Astra Budget Rule

Astra를 연속 구현 에이전트로 쓰지 않는다.

권장 한 Gate당 Astra 호출 예산:
- 일반 Gate: 2~4회
- 난제 Gate(M1/M4/M9): 4~7회
- 같은 캡처에 대해 질문만 바꿔 재호출 금지
- 구현 결과가 나오기 전 재평가 호출 금지

예상 전체 Astra 핵심 호출 수:
- 최소형: 약 25회
- 권장형: 약 35~45회
- 세밀형: 약 55~70회

이 숫자는 메시지 한도 보장이 아니라 **작업 설계 예산**이다. 실제 사용량은 추론 수준, 입력 크기, 도구 사용량에 따라 달라진다.

## 매 항목 공통 완료 형식

1. Impact Analysis
2. Before evidence
3. Change
4. Automated validation
5. 3 viewport capture
6. Visual QA
7. PASS / FAIL / NEXT
8. commit SHA / PR / preview

테스트 통과만으로 Visual PASS를 선언하지 않는다.
