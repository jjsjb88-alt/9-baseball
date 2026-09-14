# 9ZONE SHOWDOWN — Codex 인수인계

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
