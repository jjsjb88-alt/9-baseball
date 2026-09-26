---
description: 9ZONE 안티그래비티 루프 (항목마다 브랜치 + PR + 프리뷰, 묻지 않고 반복, main 머지 금지)
---

1. `docs/ANTIGRAVITY-LOOP.md` 전체를 읽는다.
2. §3 ① 이번 바퀴 고르기: 답 안 한 리뷰 코멘트가 있는 `ag/` PR → 없으면 QUEUE 맨 위 `[ ]` → 둘 다 없으면 끝.
3. `git fetch origin main` 후 `git checkout -B ag/<YYYYMMDD>-<주제> origin/main`.
4. §3 ②~⑦을 순서대로 진행한다. ③ 영향도 분석과 ④ 실패 테스트를 코드보다 먼저 한다.
5. `npm test`, `npm run build`, `node scripts/zone-report.js 10`이 모두 통과해야 커밋한다.
5-a. 화면이 바뀌면 §11: before(main)/after 스크린샷 → `compare-shots` → 판정 에이전트가 블라인드 점수 → `--reveal`. IMPROVED가 아니면 고치고 다시 (최대 3회).
5-b. 검증 에이전트(`/ag-verify`)와 리뷰 에이전트(`/ag-review`)를 직접 띄운다 (안 되면 역할을 바꿔 같은 절차 수행, 파일 수정 금지). 사용자를 기다리지 않는다. 둘 다 통과해야 6으로. 실패면 고치고 5부터 (최대 3회, 넘으면 §5).
6. `git push -u origin <ag 브랜치>` 후 base `main`으로 PR을 연다 (제목 앞 `[AG]`, 라벨 `antigravity`). 검증·리뷰 결과 블록을 본문에 붙인다. 절대 merge·approve 하지 않는다.
7. Vercel 체크가 끝나면 `vercel[bot]` 코멘트의 프리뷰 링크를 PR 본문 맨 위에 적는다. 가능하면 `node scripts/qa-shots.mjs --url <프리뷰> --out work/qa-preview`.
8. QUEUE 항목을 `[~] PR #번호 · 프리뷰 <URL>`로, `docs/antigravity/LOG.md`에 한 줄 추가 후 커밋·push.
9. §7 형식(+품질 한 줄)으로 한국어 보고 후 **1번으로 돌아가 다음 항목**. 큐가 비면 §11.4: BAR_MET 아니면 [auto] 항목 생성해 계속, BAR_MET 또는 연속 3회 NOT_IMPROVED 또는 연속 2개 `[!]`면 전체 요약으로 끝낸다.
