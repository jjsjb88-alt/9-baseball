# Codex 분업과 작업 관제 화면

이 설정은 공식 저장소의 작업 브랜치에서 한 바퀴를 수행합니다. 메인은 계획·통합·최종 판단, 필요한 소규모 에이전트는 탐색·편집·조사, 별도 검토자는 세 시점의 점검을 맡습니다. 기존 품질·중단·작가 결정권이 우선합니다. main을 병합하거나 배포하는 명령은 포함하지 않습니다.

## 채팅에서 시작

게임 전체 반복 개발은 [GAME-AUTODEV.md](../loop/GAME-AUTODEV.md)와 [시작 프롬프트](../loop/game-autodev-prompt.md)를 활성 세션에 전달한다. 아래 CLI `scripts/codex-loop.mjs`는 계속 `loop/codex-prompt.md`로 **한 회만** 실행하며 새 모드를 읽거나 자동 반복하지 않는다. 두 실행 경로를 동시에 돌리지 않는다.

Work/Codex 채팅에서는 [채팅 분업 지침](chat-loop.md)과 [시작 프롬프트](../loop/chat-prompt.md)를 사용합니다. 현재 채팅의 네이티브 서브에이전트로 진행하며 메인 모델은 사용자 선택을 유지합니다. 아래 역할 모델 표와 런처는 컴퓨터의 Codex CLI 설정입니다.

## 역할

| 역할 | 설정 | 권한과 일 |
| --- | --- | --- |
| 메인 | gpt-6.1-sol / high | 계획, 통합, 원고 집필, 최종 판단 |
| explorer | gpt-6-luna / high | 파일과 계약 탐색, 읽기 전용 |
| worker | gpt-6-luna / high | 지정 파일 편집·테스트, workspace-write |
| researcher | gpt-6-luna / high | 공식 문서·설정 근거 조사, 읽기 전용 |
| reviewer | gpt-6.1-sol / high | 별도 호출로 계획·반복 실패·완료 근거 점검, 읽기 전용 |

`.codex/agents/*.toml`은 프로젝트 역할이며 `.codex/config.toml`은 메인과 기본 위임 설정입니다. 최대 동시 서브에이전트는 3개, 쓰는 worker는 하나입니다. 파일 존재 확인 한 번에 에이전트를 새로 만들지 않습니다. 현재 계정에서 해당 모델을 쓸 수 없거나 custom agent가 로드되지 않으면 BLOCKED로 보고합니다. 자동으로 다른 모델을 선택하거나 사용자 홈 설정을 덮어쓰지 않습니다. 프로젝트를 신뢰한 현재 Codex CLI가 필요합니다. 조직 정책과 선택한 프로필이 최종 적용값을 바꿀 수 있으므로 세션에서 역할 이름·실제 모델을 확인합니다.

reviewer는 Claude `/advisor`의 이름만 바꾼 내장 기능이 아닙니다. 메인이 독립 에이전트를 호출해 목표·제약·diff·테스트 결과·누락 사항을 제공합니다. 모든 비공개 서브에이전트 대화를 자동으로 읽는다고 주장하지 않습니다. 세 체크포인트는 지침이며 런처가 호출 횟수를 강제하지 않습니다.

## 컴퓨터에서 실행

저장소에서 이 PR의 브랜치를 checkout/pull한 뒤 Node.js 20 이상과 로그인된 최신 Codex CLI로 실행합니다. 원격 인증 계정과 대상이 `jjsjb88-alt`인지 쓰기 전에 별도로 확인합니다. 런처의 origin 검사는 인증 계정 검사를 대신하지 않습니다.

터미널 1 — 화면:

```bash
node scripts/agent-dashboard.mjs
```

브라우저에서 `http://127.0.0.1:4317`을 엽니다. 포트가 사용 중이면 `--port 4318`을 붙입니다. 서버는 localhost에만 열고 읽기 전용 GET만 받습니다. 화면의 실행 명령 복사 버튼은 명령만 복사하며 AI를 시작하지 않습니다.

터미널 2 — 한 바퀴:

```bash
node scripts/codex-loop.mjs --check
node scripts/codex-loop.mjs --dry-run
node scripts/codex-loop.mjs --run
```

check/dry-run은 모델 세션을 호출하지 않습니다. run은 `codex exec --json --sandbox workspace-write`로 한 번 실행하고 끝납니다. 지침은 `loop/codex-prompt.md`를 읽습니다. 권한 우회·자동 재시도·예약 작업을 추가하지 않습니다. main/master, detached HEAD, 잘못된 origin, 누락 파일 또는 필요한 CLI 플래그 미지원이면 차단합니다. CLI 자체의 계정·모델 접근 검증 실패도 실패 상태로 남습니다. 중단은 작업 터미널에서 Ctrl+C입니다. 같은 저장소의 이 런처 동시 실행은 lock으로 차단합니다. 비정상 강제 종료 후 lock이 남으면 다른 세션이 없는지 확인한 뒤 `loop/.runtime/codex.lock`만 삭제합니다. 기존 별도 런처와 동시에 쓰는 것은 실행하지 않습니다.

Claude Code에서는 기존 `node scripts/claude-loop.mjs --run`을 사용하고 화면의 Claude Code 탭을 선택합니다. 메인이 아래 상태 기록 지침에 따라 진행을 기록합니다. 일반 Claude/Codex 앱에서 열었던 다른 세션이나 기존 예약 루프를 이 화면이 자동 감시하지는 않습니다.

## 기록하는 상태와 정확도

- Codex: 이 새 런처의 JSONL 스트림에서 실제 세션·도구·명령·파일 변경 이벤트를 요약합니다. raw 명령·도구 출력·원고·reasoning·인증 정보는 대시보드 로그로 복사하지 않습니다.
- 역할·검토·검증: 메인이 worker/reviewer의 실제 결과를 받아 `loop-status.mjs`로 기록합니다. 읽기 전용 에이전트가 로그 쓰기 권한을 얻는 것은 아닙니다. 화면에는 메인이 보고한 상태가 표시되며 자동 감지했다고 주장하지 않습니다.
- 화면의 모델명은 설정값입니다. 세션에서 실사용 모델을 확인한 보고는 별도 근거로 남깁니다.
- 토큰: CLI가 보고한 **가장 최근 메인 턴** input/output만 표시합니다. 모든 에이전트/상담의 총사용량이나 실제 청구 합계가 아닙니다. Claude 토큰은 여기에서 집계하지 않습니다.
- 비용: 미측정입니다. 달러나 절감률을 만들지 않습니다.
- 테스트: 이름과 실제 결과가 기록된 것만 합산합니다. 명령이 종료됐다는 이유로 테스트 통과를 추측하지 않습니다.
- 상태 기록은 `loop/.runtime/events.jsonl`에 보관하고 gitignore로 제외합니다. 마지막 실행만 화면에 표시하며 자동 삭제하지 않습니다. 16 MiB를 넘으면 기록을 별도로 보관하고 새 파일로 시작합니다.

메인 상태 기록 예시 (각 인수는 명령 문자열을 조합하지 말고 그대로 전달):

```bash
node scripts/loop-status.mjs --engine codex --role main --status running --stage plan --summary "계획 검토 중"
node scripts/loop-status.mjs --engine codex --role reviewer --status done --checkpoint before-plan --summary "검토 결과와 반영 사항"
node scripts/loop-status.mjs --engine codex --role worker --status running --stage build --summary "지정 파일 작업 중"
node scripts/loop-status.mjs --engine codex --role worker --status done --test "관련 회귀 테스트" --result passed --summary "실제 종료 코드 0 확인"
node scripts/loop-status.mjs --engine codex --role main --status running --stage verify --summary "화면과 변경분 확인 중"
```

첫 상태 기록에는 `--run <고유한-id>`가 필요합니다. Codex 새 런처는 runId를 만들고 프롬프트에 전달합니다. Claude 메인은 세션 시작 시 `--engine claude --role main --status running --stage plan --run <세션별-고유-id>`로 시작합니다. 이후 호출은 해당 engine의 마지막 runId를 사용합니다. reviewer 기록도 메인이 기록합니다. checkpoint는 `before-plan`, `repeat-error`, `before-done` 중 하나입니다. 기존 검수 횟수는 늘리지 않습니다. 실제 테스트가 미실행이면 result=blocked입니다. 긴 작업 종료 전 누락 검토와 다음 한 단계를 남깁니다.

## 화면만 확인

```bash
node scripts/agent-dashboard.mjs --demo
```

DEMO 배너가 있는 예시 데이터 화면입니다. 모델을 호출하지 않고 실제 로그에 쓰지 않습니다. 일반 모드에서 실행 기록이 없으면 대기·미검증으로 보입니다. 모바일 390px과 PC 폭을 지원합니다. 화면 종료는 해당 터미널 Ctrl+C입니다.

## 근거

- https://learn.chatgpt.com/docs/agent-configuration/subagents
- https://learn.chatgpt.com/docs/non-interactive-mode
- https://learn.chatgpt.com/docs/developer-commands?surface=cli

공식 문서 확인일: 2026-10-04. 실제 사용자 PC의 모델 접근·프로젝트 신뢰·라이브 AI 실행은 그 PC에서 확인해야 합니다.

## 기존 Codex 예약 루프

`loop/loop.sh`, `loop/env.sh`, Windows 스케줄러는 수정하지 않았습니다. 기존 고정 모델·권한·횟수는 유지합니다. 새 설정을 자동으로 그 실행 경로에 강제하지 않습니다. 새 한 바퀴 경로를 쓰려면 `scripts/codex-loop.mjs`를 실행합니다. 게임의 영향도 분석·품질·배포 게이트는 그대로입니다.

## 검증 명령

`node --test tools/agent-dashboard/agent-loop.node.mjs`는 Node 기본 모듈만 사용하며 AI를 호출하지 않습니다. 게임 Vitest의 테스트 탐색에 섞이지 않도록 `.test.*` 이름을 사용하지 않습니다. PR의 Agent Loop Checks도 이 명령만 실행합니다.

Windows에서는 PATH의 네이티브 codex.exe 또는 npm 설치의 JS 진입점을 셸 없이 실행합니다. 표준 npm 전역 설치를 권장하며 특수 패키지 관리자 shim만 있는 환경은 CLI 확인 단계에서 차단될 수 있습니다.

## 화면 예시

아래 캡처는 DEMO 데이터입니다. 실제 작업·검증·사용량 기록이 아닙니다.

![PC 진행 화면](../tools/agent-dashboard/preview-desktop.png)

![휴대폰 진행 화면](../tools/agent-dashboard/preview-mobile.png)
