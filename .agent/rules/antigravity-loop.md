# 9ZONE — Antigravity 상시 규칙

- `main` 브랜치에 push / merge / rebase / force-push 하지 않는다. PR을 스스로 merge·approve 하지 않는다.
- 모든 작업은 `ag/<YYYYMMDD>-<주제>` 브랜치 + Draft PR 까지만.
- 작업 방법 전체: `docs/ANTIGRAVITY-LOOP.md`. 저장소 공통 규칙: `AGENTS.md`.
- 테스트를 지우거나 skip 하거나 임계값을 완화해서 통과시키지 않는다.
- 파일을 통째로 다시 쓰지 말고 필요한 줄만 고친다. 없는 함수·클래스를 가정하지 말고 grep으로 확인한다.
- 게임 수치, 저장 스키마, 전역 CSS, 새 패키지는 사용자 확인 없이 바꾸지 않는다.
- 검증하지 않은 것을 확인했다고 쓰지 않는다. 보고는 한국어로.
