# ANTIGRAVITY LOOP — 안티그래비티 루프 개발 지시서

> 대상: Google Antigravity 에이전트.
> 목적: 한 번에 하나씩 만들고, **사람(또는 Claude 리뷰)이 확인한 뒤에만 main에 들어가게** 한다.
>
> 이 문서는 `AGENTS.md`(저장소 공통 규칙)를 상속한다. 충돌하면 **이 문서가 더 엄격한 쪽으로 우선**한다.
> 작업 목록은 [`docs/antigravity/QUEUE.md`](./antigravity/QUEUE.md)에 있다.

---

## 0. 한 줄 요약

**브랜치에서 하나 만들고 → 전부 검증하고 → PR 열고 → 멈춘다. 머지는 절대 하지 않는다.**

main은 Vercel(https://9-baseball.vercel.app)과 GitHub Pages로 **바로 공개 배포**된다.
안티그래비티가 main에 닿는 순간 실수가 그대로 사용자에게 나간다. 그래서 main은 사람 문이다.

---

## 1. 절대 금지 — 하나라도 어기면 그 바퀴는 무효

| # | 금지 | 왜 |
| --- | --- | --- |
| X1 | `main`에 push, merge, rebase, force-push | main = 공개 배포. 머지는 사용자 또는 리뷰어만 한다 |
| X2 | PR을 스스로 merge, approve, auto-merge 설정 | 리뷰 없이 들어가는 것과 같다 |
| X3 | 테스트 삭제·`skip`·`only`·임계값/타임아웃 완화로 통과시키기 | 검사가 의미를 잃는다 |
| X4 | 파일을 통째로 다시 써서 교체하기 (부분 수정이 가능한 경우) | 다른 기능이 조용히 사라진다. 이 저장소에서 가장 많이 나온 사고 |
| X5 | 저장소에 없는 함수·파일·CSS 클래스·패키지를 "있다고 가정"하고 호출 | 먼저 grep으로 존재를 확인한다 |
| X6 | 새 npm 패키지 추가, `pnpm-lock.yaml` 손 편집 | 빌드·배포가 깨진다. 필요하면 멈추고 묻는다 |
| X7 | 게임 수치(확률·피해·HP·카드 효과·런 구조) 변경 — QUEUE 항목에 명시된 경우 제외 | 밸런스는 시뮬레이션 근거가 필요하다 |
| X8 | 저장 스키마(`9zone-v10-run`) 형태 변경 | 기존 세이브가 깨진다 |
| X9 | `html`, `body`, `#root`, `.duel-app`, `button` 같은 전역 셀렉터 수정 | 다른 화면이 깨진다 (AGENTS.md §0 사례) |
| X10 | 저품질 placeholder 그림·AI 생성 이미지 임의 추가 | AGENTS.md §6 그래픽 기준 |
| X11 | 검증 안 한 것을 "확인했다/완료"라고 쓰기 | 다음 사람이 문서를 믿을 수 없게 된다 |
| X12 | 한 번에 열린 안티그래비티 PR 2개 이상 | 리뷰가 밀리고 충돌이 쌓인다 |

---

## 2. 브랜치 규칙

- 이름: `ag/<YYYYMMDD>-<짧은-주제>` 예) `ag/20260927-map-node-glow`
- 항상 **최신 main에서 새로 딴다.**
  ```bash
  git fetch origin main
  git checkout -B ag/20260927-map-node-glow origin/main
  ```
- 한 브랜치 = QUEUE 항목 하나 = PR 하나.
- push는 **자기 `ag/` 브랜치에만**: `git push -u origin ag/...`
- 리뷰 수정은 **같은 브랜치에 새 커밋**으로. amend·force-push 금지.

---

## 3. 한 바퀴 (Loop Round) — 이 순서 그대로

### ① 시작 점검 (멈출지 먼저 판단)
1. 열린 `ag/` PR이 있는지 확인한다.
   - 있고 리뷰 코멘트가 달렸다 → **그 PR 수정이 이번 바퀴**다 (③부터, 같은 브랜치).
   - 있고 코멘트가 없다 → **아무것도 하지 말고 "리뷰 대기 중"만 보고하고 끝낸다.**
2. `docs/antigravity/QUEUE.md`에서 `[ ]` 상태의 **맨 위 항목 하나**만 고른다.
   - 비어 있으면 **새 일을 지어내지 말고** "큐 비어 있음"만 보고하고 끝낸다.

### ② 읽기 (범위 제한)
- `AGENTS.md` — §1 9축, §5 완료 정의, §6 그래픽 기준
- `docs/design/v13/BALLPARK.md` — 현재 화면 설계 (손대는 화면 절만)
- 손댈 파일은 **전체를 읽고** 수정한다. 모르는 함수는 `grep`으로 정의를 찾아 읽는다.

주요 파일 지도:
| 영역 | 파일 |
| --- | --- |
| 전투 화면 | `src/duel/BallparkBattle.jsx` |
| 캐릭터/공/이펙트 (Pixi) | `src/duel/BallparkActors.jsx` |
| 지도 | `src/duel/BallparkMap.jsx` |
| 보상·시설 | `src/duel/BallparkStop.jsx` |
| 런 종료 | `src/duel/BallparkEnd.jsx` |
| 볼파크 스타일 (전부 `.bp-*` 범위) | `src/duel/ballpark.css` |
| 투수 대사 | `src/duel/pitcher-voice.js` |
| 게임 규칙 (수정 주의) | `src/duel/engine.js`, `src/duel/run-map.js`, `src/duel/cards.js` |
| 앱 흐름 | `src/duel/App.jsx` |

### ③ 영향도 분석 먼저 (코드 쓰기 전)
`.github/pull_request_template.md`의 `IMPACT_ANALYSIS_REQUIRED` 섹션을 **지금 채운다**.
9축 각각 **영향 있음 / 없음 / 확인 필요** + 대응. 이 초안이 없으면 코드를 쓰지 않는다.

### ④ 실패하는 테스트 먼저
- 버그 수정: 재현하는 테스트를 먼저 쓰고 **실패하는 것을 확인**한다.
- 기능 추가: 동작을 고정하는 테스트를 `tests/`에 추가한다.
- 기존 테스트를 고쳐야만 통과한다면 → **멈추고 묻는다** (§5).

### ⑤ 구현 — 좁게
- 필요한 파일만, 필요한 줄만 바꾼다. 부분 수정(Edit)을 쓴다.
- CSS는 `ballpark.css` 안에서 `.bp-*` 또는 화면 단위 셀렉터로만.
- 표시 숫자는 엔진 함수의 반환값을 읽는다. UI에서 공식을 다시 만들지 않는다.
- 변경 파일이 **8개를 넘으면** 범위가 너무 크다 → 멈추고 쪼갤지 묻는다.

### ⑥ 검증 게이트 — 전부 통과해야 커밋
```bash
npm test                 # 전체 테스트. 1개라도 실패하면 커밋 금지
npm run build            # production build
node scripts/zone-report.js 10   # smoke
```
화면이 바뀌면 **스크린샷을 찍고 직접 본다** (Antigravity 브라우저 또는 Playwright):
| 뷰포트 | 의미 |
| --- | --- |
| 412×743 | 실제 폰 세로 (브라우저 주소창 포함 높이) |
| 844×390 | 폰 가로 (작은 높이) |
| 1440×900 | PC |

각 뷰포트에서 확인: 가로 스크롤 없음 / 세로 넘침 없음 / **투수 얼굴·몸이 UI에 가리지 않음** / 버튼이 화면 안.
실행 못 한 검증은 **"못 함 + 이유"로 한 번만** 적는다. 재시도로 시간을 쓰지 않는다.

### ⑦ 자기 리뷰 — `git diff origin/main...HEAD` 를 처음부터 끝까지 다시 읽기
아래 체크를 PR 본문에 그대로 붙인다.
- [ ] 의도하지 않은 파일 변경 없음 (특히 lockfile, 이미지, 다른 화면 CSS)
- [ ] 삭제된 줄 중 기능이 사라진 것 없음
- [ ] 새로 호출한 함수·클래스가 실제로 존재함 (grep 확인)
- [ ] `skip`/`only`/완화된 임계값 없음
- [ ] 전역 셀렉터 추가 없음
- [ ] `prefers-reduced-motion` 대응 (애니메이션 추가 시)
- [ ] 콘솔 에러 없음

### ⑧ 커밋 · push · PR
- 커밋 메시지: `<type>(<영역>): <무엇을> — <왜>` 예) `fix(map): 선택 노드 테두리 색 — 모바일에서 안 보임`
- `git push -u origin ag/...`
- PR 생성: base `main`, **Draft로 연다**, 제목 앞에 `[AG]`, 라벨 `antigravity`.
- 본문: 템플릿 전체 유지 + ③ 영향도 + ⑥ 결과(명령 출력 요약, 스크린샷) + ⑦ 체크.
- 검증이 모두 끝났으면 Draft → Ready for review.

### ⑨ 멈춤
- QUEUE 항목을 `[~] 리뷰 대기 (PR #번호)`로 바꾸고 이 커밋도 같은 브랜치에 포함한다.
- `docs/antigravity/LOG.md`에 한 줄 기록: 날짜 · 항목 · PR · 결과 · 못 한 검증.
- **여기서 끝. 다음 항목을 시작하지 않는다.** 다음 바퀴는 리뷰 결과가 온 뒤다.

---

## 4. 리뷰 수정 바퀴
1. PR의 모든 리뷰 코멘트를 읽는다. 하나도 빠뜨리지 않는다.
2. 각 코멘트: 고쳤음(커밋 해시) / 안 고침(이유) 을 스레드에 답한다.
3. 같은 브랜치에 커밋 → ⑥ 검증 게이트 다시 전부 → push.
4. main이 앞서 나가 충돌하면: `git fetch origin main && git merge origin/main` (rebase 금지) → 충돌 해결 → ⑥ 다시.
5. CI 빨간불: 원인을 찾아 고친다. "flaky"라고 넘기지 않는다. 재실행으로 초록 만들기 금지.

---

## 5. 멈추고 사용자에게 묻는 조건
아래 중 하나면 **코드를 더 쓰지 말고** 상황·선택지·추천을 적어 PR 코멘트(또는 보고)로 남기고 멈춘다.
- 같은 테스트 실패를 2번 고쳐도 원인을 모름
- 기존 테스트를 수정하거나 지워야 통과함
- 게임 수치·저장 스키마·전역 CSS·공용 엔진 함수를 바꿔야 함
- 새 패키지·새 이미지 자산이 필요함
- 변경 파일이 8개 초과
- QUEUE 항목의 뜻이 두 가지 이상으로 읽힘

---

## 6. 머지 — 사람만 한다
머지 전 리뷰어(사용자 또는 Claude 세션) 확인 목록:
1. `PR Verify` 워크플로(테스트·빌드·smoke) 초록, `Impact Analysis Gate` 초록
2. diff에 X1~X12 위반 없음
3. 스크린샷 3뷰포트 확인 (특히 폰 세로에서 투수 가림 여부)
4. Vercel Preview URL이 있으면 실제 폰으로 한 판
5. 머지 방식: **Squash and merge** (실수 되돌리기 단위를 PR 하나로)

되돌리기: 문제가 생기면 GitHub에서 해당 PR의 **Revert** 버튼 → 새 PR → 머지.

GitHub 저장소 설정 권장 (사용자가 직접): Settings → Branches → `main` 보호 규칙
- Require a pull request before merging
- Require status checks: `PR Verify`, `Impact Analysis Gate`
- Do not allow force pushes

이 규칙이 켜져 있으면 안티그래비티가 실수로 main에 push해도 GitHub가 막는다.

---

## 7. 보고 형식 (바퀴 끝마다)
```
[AG 루프 보고]
- 항목: <QUEUE 항목>
- 브랜치 / PR: ag/... / #번호 (Draft|Ready)
- 바꾼 것: <한두 줄>
- 검증: test <통과 N개|실패> · build <성공|실패> · smoke <성공|실패> · 스크린샷 <3뷰포트|일부|못 함>
- 못 한 것 / 위험: <없으면 "없음">
- 다음: 리뷰 대기
```

---

## 8. 안티그래비티에 붙여 넣을 시작 프롬프트
```
docs/ANTIGRAVITY-LOOP.md 를 읽고 그대로 한 바퀴만 진행해.
main 에는 절대 push/merge 하지 말고, ag/ 브랜치 + Draft PR 까지만.
§3 ① 시작 점검에서 멈춰야 하면 보고만 하고 끝내.
끝나면 §7 형식으로 한국어로 보고해.
```
