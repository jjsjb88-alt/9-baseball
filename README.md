# 9ZONE SHOWDOWN

`BaseballSim-deck-5.jsx`의 기존 그래픽·사운드와 공용 CQ/PQ 판정에 **THE NIGHT RUN**을 통합했다. 한 공의 `READ → BET → REVEAL → IMPACT`를 6라운드의 완결된 런으로 플레이할 수 있다. 기존 정규 경기와 CORE TEST도 유지한다.

## THE NIGHT RUN 플레이 방법

튜토리얼을 마치거나 **건너뛰기 → 30분 쇼다운 런 시작 → 타석에 들어서기**를 누른다.

- ROOKIE → ADAPTER → FOX를 각각 두 번 상대한다. 라운드당 8타석, 완주 시 총 48타석이며 동료 자동 타석은 없다.
- PUBLIC 확률과 관찰 노트를 읽고 카드를 선택해 스윙한다. 카드 없는 존은 격자를 눌러 BASIC SWING. 볼로 예상하면 지켜본다.
- 안타/볼넷 1루, 2루타 2루, 3루타 3루, 홈런 4루를 획득한다. 라운드 목표는 3/4/4/5/5/6루다. 정규 야구의 주자 득점과 별개인 런 점수다.
- 도전 기회는 3. 목표 미달은 1 소모하며, 기회가 남으면 다음 라운드로 진행한다. 최종전은 목표 미달 시 남은 기회와 무관하게 패배한다.
- 라운드 사이 보상은 새 숙련존 카드 / 기존 카드 강화 / 회복 중 하나. 체력이 가득 차면 회복 대신 다음 라운드 집중 +3이다.
- 매 투구 판정과 보상을 자동 저장한다. **저장하고 나가기 → 저장된 런 이어하기**로 카운트·손패·관찰 기록을 복원한다. 같은 기기·브라우저·주소에서만 이어진다. 새 런은 이전 저장 하나를 덮어쓴다.
- 무한 파울을 막기 위해 타석의 12번째 투구까지 끝나지 않으면 볼넷을 부여한다. 런 전용 규칙이다.

**30분은 목표이며 실측 보장이 아니다.** 48타석의 판단·연출·결과 확인과 5번의 보상 선택을 합쳐 약 25–35분을 목표로 한다. 빨리 입력하거나 일찍 탈락하면 짧아진다. 강제 대기나 30분 제한은 없다. 인간 플레이타임·승률·재미 검증은 아직 필요하다.

## 웹에서 플레이

[9ZONE SHOWDOWN 바로 플레이하기](https://jjsjb88-alt.github.io/9-baseball/)

배포 예정 주소다. 저장소 **Settings → Pages → Source: GitHub Actions** 활성화가 필요하며, 이전 확인에서는 이 단계가 완료되지 않았다. 활성화 후 `main` 푸시가 테스트·빌드를 통과하면 배포된다. 로컬 변경은 푸시 전까지 이 주소에 반영되지 않는다. 상태는 **Actions → Deploy to GitHub Pages**에서 확인한다.

## 실행

Node.js 20 이상을 권장한다.

```bash
npm install
npm run dev
```

터미널에 표시된 로컬 주소를 브라우저에서 연다. 배포용 확인은 다음과 같다.

```bash
npm test
npm run build
npm run preview
```

GitHub Pages용 빌드는 저장소 하위 경로인 `/9-baseball/`을 자동 적용한다. 로컬 개발 서버는 기존처럼 `/`에서 실행된다.

## 소스 구조

- `BaseballSim-deck-5.jsx`: 게임 본체이자 소스 오브 트루스. 기존 자산과 최신 코어 규칙이 함께 있다.
- `src/main.jsx`: 로컬 React 진입점.
- `src/game/showdown-engine.js`: 실제 플레이와 자동시뮬이 함께 import하는 CQ/PQ 판정 엔진.
- `src/game/run-session.js`: 판정 결과를 받아 카운트·48타석·보상·승패·저장 스키마를 처리한다. 타격 판정식을 복제하지 않는다.
- `src/game/RunJourney.jsx`: 런 진입·경로·관찰 노트·라운드 결과·보상·최종 결과 UI.
- `tests/run-session.test.js`, `tests/run-ui.test.jsx`: 런 순수 로직과 실제 React 화면의 완주·저장·BASIC SWING 회귀 검사.
- `src/styles.css`: Tailwind와 전역 스타일 진입점.
- `assets/sprites-v2/frames/`: 전투용 고해상도 타자·투수 키포즈 36장. 앱은 이 폴더를 한 번에 로드한다.
- `work/process_sprite_v2.py`: 생성된 6칸 시트를 투명 512px 개별 프레임으로 정리하는 재현용 도구.
- `tests/showdown-engine.test.js`: 실제 게임이 export하는 CQ/PQ 판정 엔진의 최소 회귀 테스트.
- `HANDOFF.md`: 설계 원칙, 변경 지점, 플레이테스트 체크리스트.

별도의 프로토타입 JSX를 계속 복제하지 않는다. 코어 규칙 변경은 `src/game/showdown-engine.js`의 `resolveShowdownContact()`와 그 호출부를 수정한다. 자동시뮬도 반드시 같은 함수를 호출해야 한다.

## 지금 반드시 지킬 것

1. 플레이 흐름은 `READ → BET → REVEAL → IMPACT`다.
2. READ 성공은 안타 확정이 아니다. 읽기와 실행은 분리한다.
3. CQ는 접촉, PQ는 접촉 후 타구 질만 담당한다.
4. PUBLIC 확률만 화면에 보이고 TRUE INTENT는 숨긴다.
5. AI는 과거 선택만 기억한다. 현재 고른 카드를 엿보면 안 된다.
6. 자동시뮬과 실제 게임은 같은 판정 엔진을 쓴다.
7. 유저 타순에서는 어떤 예약 타이머도 자동 타석을 실행하지 못한다.
8. 캐릭터 포즈 전환과 화면의 2차 동작을 분리한다. 포즈는 고정 키프레임, 이동·회전·히트스톱은 `requestAnimationFrame` 타임라인이 담당한다.

상세 내용은 [HANDOFF.md](./HANDOFF.md)를 먼저 읽는다.

## 자율 개발 루프

Windows용 자율 루프가 준비되어 있다. 운영 루프는 아직 꺼져 있다. 2026-09-01에 파일을 수정하지 않는 스모크 모드로 독립 세션 두 바퀴만 실행했고, 두 바퀴 모두 종료 코드 0으로 끝났다.

한 바퀴마다 `codex exec --ephemeral`을 새로 실행한다. 이전 세션을 `resume`하거나 대화를 이어 붙이지 않으며, 작업 맥락은 문서와 Git 커밋으로만 넘긴다.

### 시작 전에 채울 것

1. `docs/DESIGN.md`에 고정 기획을 적는다.
2. `docs/STATUS.md`에 현재 상태와 다음 한 가지를 적는다.
3. `docs/feedback/INBOX.md`에 첫 지시를 적는다.
4. `loop/PROMPT.md`의 `[작성 필요]` 항목을 마무리한다.
5. `loop/env.sh`에서 모델, 추론 강도, 작업 사이클 상한, 대기 시간, 최대 바퀴 수를 확인한다.

기본값은 `gpt-5.6-sol`, 추론 강도 `high`, 작업 사이클 상한 12, 바퀴 사이 30초, 최대 바퀴 수 0(무한)이다. 설치된 Codex CLI에는 직접적인 `--max-turns` 옵션이 없으므로 `LOOP_MAX_TURNS`는 각 새 세션의 지시문에 작업-검증 사이클 상한으로 주입된다. 별도의 1시간 세션 시간 제한도 적용된다.

### 켜기·끄기·상태 보기

프로젝트 루트에서 PowerShell로 실행한다.

```powershell
# 켜기: STOP을 지우고 작업을 활성화한 뒤 백그라운드에서 시작
powershell -NoProfile -ExecutionPolicy Bypass -File .\loop\task.ps1 Start

# 끄기: 새 바퀴를 막고, 현재 바퀴가 끝나면 정상 종료
powershell -NoProfile -ExecutionPolicy Bypass -File .\loop\task.ps1 Stop

# 상태 보기
powershell -NoProfile -ExecutionPolicy Bypass -File .\loop\task.ps1 Status
```

`loop/loop.ps1`을 인수 없이 직접 실행하면 무한 루프가 현재 터미널에 붙는다. 평상시에는 직접 실행하지 말고 위의 `task.ps1 Start`를 사용한다. 작업 스케줄러 항목은 로그인 시 시작하고 비정상 종료 시 1분 뒤 재시작하지만, `STOP` 또는 최대 바퀴 수 도달에 따른 정상 종료는 즉시 재시작하지 않는다.

다시 등록하거나 실행만 막고 싶을 때는 다음을 쓴다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\loop\task.ps1 Register
powershell -NoProfile -ExecutionPolicy Bypass -File .\loop\task.ps1 Disable
```

등록 직후에는 항상 비활성 상태다. `loop/env.sh`에는 Codex, Node.js, pnpm, Git, Windows 시스템 도구의 PATH가 명시되어 있다. Codex 앱 업데이트로 버전이 붙은 실행 파일 경로가 바뀌면 `CODEX_BIN`과 PATH 첫 항목도 갱신한다.

### 로그 보기

로그는 `logs/YYYY-MM-DD.log`에 누적되고 Git에는 들어가지 않는다. 각 실행과 바퀴에는 고유 실행 ID, 시작·종료 시각, 종료 코드가 붙는다.

```powershell
Get-Content ".\logs\$(Get-Date -Format yyyy-MM-dd).log" -Tail 120
```

설치 확인만 다시 하고 싶으면 다음처럼 스모크 모드를 쓴다. 이 모드는 새 세션을 열어 문서를 읽지만 파일 수정·개발·테스트·Git 조작은 하지 않는다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\loop\loop.ps1 `
  -MaxRounds 2 -WaitSeconds 1 -MaxTurns 1 -SessionTimeoutSeconds 300 -SmokeTest
```

### 루프 관련 파일

- `loop/loop.ps1`: Windows 진입점. 한정 실행과 스모크 옵션을 Bash 본체에 전달한다.
- `loop/loop.sh`: 무한 반복, 독립 `codex exec`, 날짜별 로그, STOP 처리를 담당한다.
- `loop/env.sh`: 모델·추론 강도·사이클 상한·대기·최대 바퀴·명시적 PATH 설정이다.
- `loop/PROMPT.md`: 매 새 세션이 읽는 여섯 절짜리 운영 지시서다.
- `loop/task.ps1`: 작업 스케줄러 등록·켜기·끄기·상태 보기 제어기다.
- `docs/DESIGN.md`: 거의 바뀌지 않는 기획서 틀이다.
- `docs/STATUS.md`: 매 바퀴가 갱신하는 현재 상태 틀이다.
- `docs/feedback/INBOX.md`: 가장 먼저 처리할 사용자 지시함이다.
- `logs/`: 날짜별 실행 로그와 각 바퀴의 마지막 응답이 저장되는 Git 제외 폴더다.
