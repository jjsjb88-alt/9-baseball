---
description: 9ZONE 안티그래비티 루프 한 바퀴 (브랜치 + Draft PR 까지, main 머지 금지)
---

1. `docs/ANTIGRAVITY-LOOP.md` 전체를 읽는다.
2. §3 ① 시작 점검: 열린 `ag/` PR과 `docs/antigravity/QUEUE.md`를 확인한다. 멈춰야 하면 §7 형식으로 보고하고 끝낸다.
3. `git fetch origin main` 후 `git checkout -B ag/<YYYYMMDD>-<주제> origin/main`.
4. §3 ②~⑦을 순서대로 진행한다. ③ 영향도 분석과 ④ 실패 테스트를 코드보다 먼저 한다.
5. `npm test`, `npm run build`, `node scripts/zone-report.js 10`이 모두 통과해야 커밋한다.
6. `git push -u origin <ag 브랜치>` 후 base `main`으로 Draft PR을 연다. 제목 앞 `[AG]`. 절대 merge 하지 않는다.
7. QUEUE 상태를 `[~]`로, `docs/antigravity/LOG.md`에 한 줄 추가 후 커밋·push.
8. §7 형식으로 한국어 보고 후 멈춘다. 다음 항목은 시작하지 않는다.
