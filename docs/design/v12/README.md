# V12 검수 입구

> 2026-09-22 아스트라 검수 반영. **미구현 · 문서 개선만.**

## 먼저 볼 것

1. [검수 결과와 실제 반례](../../V12-REVIEW.md)
2. [D1~D8 권고와 미확정 상태](../../V12-DECISIONS.md)
3. [제품 전체 기획](../../V12-MASTERPIECE.md)
4. [UI 구현 규격·측정 방법](../../V12-UI-MASTER-SPEC.md)

문제의 방향은 유지한다: 작은 글자·중복 정보·멀리 떨어진 조작과 결과를 개선한다.
검수 권고는 **C의 정면 보드/큰 손패 + B의 정보 위계**, 이름·순번·조건 보존이다.
이전 '카드 접촉=연결', '불투명 덮기', '배율=예상 HP' 개념은 구현 기준에서 제외했다.

## 기존 시안 — 수정 전 개념 자료

아래 이미지는 이력과 구성 비교를 위해 보존했다. **수정된 규칙의 완성 시안이 아니다.**

| 파일 | 용도·한계 |
| --- | --- |
| [three-directions.png](./three-directions.png) | A/B/C 정적 구성 비교. 별점은 작성자의 판단 |
| [card-shape-language.png](./card-shape-language.png) | 기본 형태 아이디어. 접촉/연결·고정 십자·가림 개념은 검수에서 수정 |
| [before-after-portrait.png](./before-after-portrait.png) | 이전 빌드와 1차 정적 시안. 인과·개선 효과 증명 아님 |
| [before-portrait-390.png](./before-portrait-390.png) | 원 작성자의 세로 캡처 |
| [before-landscape-844.png](./before-landscape-844.png) | 원 작성자의 가로 캡처·겹침 재현 후보 |
| [dir-a.png](./dir-a.png) / [dir-b.png](./dir-b.png) / [dir-c.png](./dir-c.png) | 각 방향 원본 |
| [after-portrait-390.png](./after-portrait-390.png) | 1차 정적 시안 |

## HTML 보기

[카드 형태](./card-shape-language.html), [A](./dir-a.html), [B](./dir-b.html), [C](./dir-c.html),
[1차 시안](./after-portrait-390.html), [시안 토큰](./tokens.css).

저장소 루트에서 HTTP 서버를 열어 /docs/design/v12/dir-c.html 등에 접근한다.
예: python -m http.server 8080 → http://localhost:8080/docs/design/v12/dir-c.html

이는 HTML/CSS로 렌더되는 **정적 시안**이다. 게임 엔진·드래그·저장·모션 프로토타입이 아니다.
390×844 고정 및 overflow:hidden을 반응형 완료 근거로 쓰지 않는다.
PNG/HTML의 수정 전 설명은 위 기획/규격보다 우선하지 않는다.

## 확인한 것과 남은 것

- 확인: 문서·엔진 코드 대조, 카드 형태/A·B·C 이미지, CSS 정적 재집계, 실제 함수 반례.
- 정정: 원 분포의 186개는 **12px 미만**이다. 11px 미만은 172개다.
- 미완료: 수정된 인터랙티브 시안, 가로/PC 신규 시안, 실제 브라우저 재계측, 기기·사람·아트 품질 검증.

[정적·엔진 재현 스크립트](./audit-static-and-engine.mjs)는 저장소 루트에서
node docs/design/v12/audit-static-and-engine.mjs 로 실행한다.
