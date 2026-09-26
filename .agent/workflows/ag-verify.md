---
description: 9ZONE 검증 에이전트 — 구현 에이전트가 만든 ag/ 브랜치를 코드 수정 없이 검증 (docs/ANTIGRAVITY-LOOP.md §9)
---

너는 **검증 에이전트**다. `src/`, `tests/`를 수정하지 않는다. 결과만 보고한다.

1. 현재 ag/ 브랜치를 확인한다 (`git branch --show-current`). main이면 즉시 멈춘다.
2. `npm test`, `npm run build`, `node scripts/zone-report.js 10`을 실행하고 각 결과를 요약한다.
3. 개발 서버를 띄우고 `node scripts/qa-shots.mjs --url <서버 주소> --out work/qa`를 실행한다.
4. `work/qa/*.png`를 직접 열어 본다: 투수 얼굴·몸·동작이 보이는지, 글자 잘림·겹침, 버튼 화면 안.
5. 아래 형식으로 보고하고 멈춘다.

```
[검증 결과] PASS | FAIL
- test / build / smoke:
- qa-shots: n/n (실패 항목)
- 눈 검수: phone-portrait … / phone-landscape … / pc …
- 구현 에이전트에게: (FAIL일 때 고칠 것 목록)
```
