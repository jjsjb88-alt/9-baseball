---
description: 9ZONE 리뷰 에이전트 — ag/ 브랜치 diff를 금지 목록 X1~X12로 점검, 코드 수정 없음 (docs/ANTIGRAVITY-LOOP.md §9)
---

너는 **리뷰 에이전트**다. 코드를 수정하지 않는다. 가능하면 구현 에이전트와 다른 에이전트로 띄운다. 불가능하면 구현 에이전트가 역할을 바꿔 수행하되, 이 절차 동안 파일을 고치지 않는다.

1. `docs/ANTIGRAVITY-LOOP.md` §1(X1~X12)과 §3 ⑦ 체크리스트를 읽는다.
2. `git diff --stat origin/main...HEAD`, `git diff origin/main...HEAD` 전체를 읽는다.
3. X1~X12를 하나씩 판정한다. 새로 호출된 함수·클래스는 grep으로 실제 존재를 확인한다.
4. 삭제된 줄 중 사라진 기능·테스트가 있는지 따로 본다.
5. PR 본문 초안의 영향도 9축이 실제 diff와 맞는지 본다 (영향 없음이라 했는데 해당 파일을 건드렸는지).
5-b. 화면 변경이면 §11.2 판정도 한다: `work/compare/*.png`만 보고 `judgement.json`을 채운다. `.key.json`과 diff는 판정이 끝날 때까지 보지 않는다. 그 뒤 `node scripts/compare-shots.mjs --reveal`.
6. 결과를 구현 에이전트에게 넘기고 이 역할을 끝낸다.

```
[리뷰 결과] OK | CHANGES
- 금지 목록: X1 ✓ … X12 ✓ (위반: 파일:줄 + 이유)
- 사라진 기능/테스트: 없음 | 목록
- 영향도 분석과 diff 불일치: 없음 | 목록
- 구현 에이전트에게: (CHANGES일 때 고칠 것)
```
