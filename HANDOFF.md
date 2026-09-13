# 9ZONE SHOWDOWN — Codex 인수인계

## 최우선 인수인계: v8.8 · 2026-09-13

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

## 과거 v8.7 인수인계 · 2026-09-13

읽는 순서: `docs/feedback/INBOX.md` 전체 → `docs/STATUS.md` v8.7 절. 아래 v8.6 절과 그
이하는 역사다.

INBOX 4번 중 `BaseballSim-deck-5.jsx` 단일 파일 세대를 완료했다. 삭제 전 `src/main.jsx`에서
시작한 현행 그래프가 `src/duel` 내부와 `assets/duel`로만 이어지는 것을 다시 확인했다. 단일 파일과
이를 직접 렌더링하던 UI 검사 2개, 전용 경기장 이미지·36개 프레임, Tailwind 경로, `tone` 의존성을
`2850d35`에서 제거했다. Git 이력으로 복구 가능하며 `src/game` 로직과 단위 검사는 건드리지 않았다.

삭제 후 현행 코드·검사·설정의 관련 참조는 0건이다. 설치된 Vitest 직접 실행 10파일·107개,
설치된 Vite 직접 빌드, `git diff --check`가 통과했다. `pnpm test`는 코드 실행 전에 기존
`node_modules`와 현재 pnpm 저장소 위치가 다르다며 비대화형 재설치를 중단해 재시도하지 않았다.
Chrome 1440×1000 실제 시작 화면을 직접 읽어 배경·타자·세 시작 덱·시드 입력·시작 버튼이
정상 렌더링되고 잘리거나 로드에 실패한 요소가 없음을 확인했다. 화면 자체는 바꾸지 않았다.

다음 세션도 INBOX 4번의 마지막 `src/game` 세대만 진행한다. 삭제 전에 현행 import 그래프를
다시 확인하고, NIGHT RUN / CORE TEST 로직·단위 검사·리포트·package 명령을 함께 정리한다.

`deckbuilding-v8` 브랜치에 있으며 **push·배포하지 않았다.** `loop/PROMPT.md`가 푸시를 금지한다.

---

> v8.6 이하의 이전 인수인계는 [인수인계 아카이브](./docs/history/HANDOFF-archive.md)에 보존한다.
