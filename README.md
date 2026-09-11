

## 현재 로컬: v6 · 플레이 방식이 바뀌는 런 성장 (2026-09-11)

기존 `src/duel`에 세 성장과 보상 선택, 자원 표시, 판정·저장을 통합했다. 아래 v5 및 이전 기록보다 이 절과 `docs/DUEL.md`의 v6 절이 우선한다.

**v6 공개 배포 대상:** [웹에서 플레이](https://jjsjb88-alt.github.io/9-baseball/). `main`에 올리면 GitHub Actions가 검사 후 Pages에 배포한다. 배포 성공 여부는 [배포 기록](https://github.com/jjsjb88-alt/9-baseball/actions/workflows/deploy-pages.yml)에서 확인한다. 웹 화면 상단의 `GROW YOUR BASEBALL · V6`가 이번 버전 표시다. 아래 과거의 “미배포” 기록은 해당 개발 시점에만 적용된다.

- 기다림: 지켜본 스트라이크를 모아 한 존 장타 스윙에 사용한다.
- 연결: 주자를 보내는 희생 번트가 다음 타자의 타구 질과 기존 주자 진루를 강화한다.
- 행운: 땅볼·바가지 단타로 모은 자원을 다음 안타의 추가 진루에 사용한다.
- 세 번의 승리 보상에서 성장 하나와 카드 하나를 선택한다. 같은 성장 심화 또는 혼합 가능. 카드만 건너뛰기도 가능하다.
- 초록 타격 범위 적중 = 안타 보장을 유지한다. 성장이나 스탯 때문에 적중이 아웃으로 바뀌지 않는다. 희생 번트는 별도 작전이다.

### 실행·검사·저장

`pnpm install --frozen-lockfile` → `pnpm dev -- --host 127.0.0.1 --port 5176` → [로컬 플레이](http://127.0.0.1:5176/).

- `pnpm test`: 전체 87개 검사.
- `pnpm build`: 배포용 빌드.
- `pnpm report:growth`: 세 시작 덱 × 세 성장 경로 × 30시드 = 270런. 실제 게임 판정 엔진과 저장 검증을 사용한다.
- `pnpm report:zones`: 첫 투수의 공개 정보 정책 비교. `pnpm test:policy`는 레거시 회귀이며 현행 밸런스 근거가 아니다.
- 저장 키 `9zone-growth-v6`. 이전 v3/v5 저장은 삭제하지 않으며 자동 이관하지 않는다.

QA 체크: 첫 승리 → 성장 선택 → 연결 카드 선택 → 확정 한 번 → 다음 경기 → 성장 충전/사용/취소 → 결과·다음 타자 → 새로고침 복원. 성장 상세 규칙과 알려진 한계는 [인수인계](./HANDOFF.md), [현행 규칙](./docs/DUEL.md), [검증 기록](./docs/STATUS.md)을 읽는다.

현재 자동 정책에서는 연결 경로가 약하다. 인간 재미·30분 런·최종 아트 품질은 아직 검증되지 않았다. 기존 이미지/사운드는 유지했으며 120개 고유 애니메이션 프레임을 추가한 작업이 아니다.

---

## 과거 로컬: 9ZONE v5 · 존 적중은 안타 확정 (2026-09-10)

GitHub v4 `874f566`을 fast-forward한 뒤 기존 `src/duel`에 통합한 시험판이다. 이 절이 아래 v3/v2 기록보다 우선한다. 별도 앱·추가 그래픽 자산 없음. **이번 v5는 아직 GitHub에 push/배포하지 않았다.**

- 실제 공이 카드의 초록 타격 범위에 들어오면 안타 확정. 스탯은 땅볼/중전/바가지 안타·2루타·홈런의 종류만 바꾸며 적중을 아웃으로 바꾸지 않는다. 희생 번트는 명시적 예외.
- 몸쪽 장타 / 바깥 연결 / 끈질긴 컨택 시작 덱, 각각 4숙련존. 카드와 별개로 BASIC SWING 항상 가능.
- 9존 밖 볼, 4볼 볼넷, 3스트라이크 삼진, 2스트라이크 파울 생존, 다음 공/다음 타자 확인 게이트.
- 같은 비교용 시드는 세 덱의 첫 투구가 같다. 이후 카운트와 이전 노림에 따라 경향이 변한다.
- 최신 설계·제약·QA: [docs/DUEL.md](./docs/DUEL.md), [docs/STATUS.md](./docs/STATUS.md).

### 실행과 검사

`pnpm install --frozen-lockfile` 후 `pnpm dev -- --host 127.0.0.1 --port 5176`.
[로컬 게임](http://127.0.0.1:5176/)에서 덱과 비교용 시드를 선택한다. 기본 시드는 20260910이다.

- 전체 검사: `pnpm test` (68개)
- 빌드: `pnpm build`
- 현행 엔진 자동 비교: `pnpm report:zones` (세 덱 × 첫 투수 100시드)
- 기존 엔진 회귀: `pnpm test:policy` — **이 보고서는 레거시 엔진이며 현행 v5 균형의 증거가 아니다.**
- 저장: `9zone-zones-v5`. v3 저장을 삭제하거나 읽어 덮어쓰지 않는다.

화면 QA: 시작 덱 선택 → 승부 → 가이드 Escape → 릴리스 간파 → 대응 카드와 존 선택 → 적중 시 안타 → 다음 타자. 모바일 390px에서 격자와 결과 버튼을 확인한다. **30분 런/인간 재미/완성도는 미검증**이다.

---

이하 과거 버전 기록 (현재 구현 지침 아님)
# 9ZONE — HOMEBOUND

## 최신 로컬 v3: 선수는 출루하고, 카드는 행동한다

이전 ‘베이스=카드’ 설계 오류를 수정했다. **9명 타순과 행동 덱은 별개**이며, 베이스에는 선수 이름이 표시된다. 준비 최대 2회 → 최종 스윙 1회 → 타석 종료 결과 → 다음 타자 입장. 결과 확인 전에는 추가 공격이 불가능하고 새로고침해도 이 경계가 유지된다.

[로컬 플레이](http://127.0.0.1:5176/) · [현재 규칙과 검사](./docs/DUEL.md). 이전 저장 키는 보존. 이번 변경은 아직 공개 사이트에 재배포하지 않았다. 아래 v2/v1 설명은 역사 기록이다.

## 현재 로컬 버전: 베이스가 곧 덱이다

사용자의 ‘슬더스 스킨에 불과하다’는 피드백을 반영해 핵심 구조를 교체했다. **출루한 타격 카드는 베이스에 묶여 덱에서 빠지고, 득점하면 손패로 돌아온다.** 적 체력과 3에너지는 없다. 3아웃 전에 득점해야 한다.

‘타이밍 맞추기 → 담장 넘기기’로 강타 카드를 2루에 보낸 다음, ‘대주자 교체’로 회수하거나 ‘주자 불러들이기’로 득점과 함께 돌려받아 보세요. 작전은 스트라이크를 대가로 하고, 희생타는 아웃을 대가로 합니다. 카드를 선택하면 실제 득점·아웃·이동 결과를 먼저 보여줍니다.

[현재 로컬 플레이](http://127.0.0.1:5176/) · [최신 설계/검증/한계](./docs/DUEL.md). 기본 실행은 `npm run dev`, 검사는 `npm test`, `npm run build`. 전체 57개 테스트 통과. 같은 src/duel에 통합했으며 기존 저장은 보존했습니다.

**현재 변경은 로컬 버전이며 공개 사이트에는 아직 재배포하지 않았습니다.** 30분 완성 런/마스터피스가 아니라 독자적 핵심 규칙을 검증하는 버전입니다. 아래 DUGOUT 설명은 이전 기록입니다.

## 보존 기록 — DUGOUT v1

## 최신 기본 게임: DUGOUT / ACT 0

현행 진입점은 `src/duel/App.jsx`. 최신 설계·검증·다음 작업은 **[docs/DUEL.md](./docs/DUEL.md)**. 아래 LAST LIGHT/NIGHT RUN 절은 역사 자료다.

공개된 투수 의도를 보고 행동력 3으로 여러 카드를 연계한다. 새 런 → 승부 시작 → 카드 선택 → 다시 클릭 또는 ‘카드 사용’ → 턴 종료. 첫 보상에서 직구 유도를 골라 ‘볼 골라내기 → 직구 유도 → 풀스윙’을 시도할 수 있다.

투수 1명 / 카드 12종 / 전투 4회 / 카드 보상 3회 / 자동 저장·이어하기. 새 도트 구장과 캐릭터 각 3포즈, 상단 ♪ OFF로 효과음 켜기. **30분 완성 게임이나 120고유 프레임이 아닌 카드 전투 검증판**이다. 기존 앱·자산·저장은 보존했다.

실행: `npm install` → `npm run dev`. 검사: `npm test`, `npm run build`. 전체 51개 테스트 통과. 새 생성 자산과 프롬프트는 [assets/duel/README.md](./assets/duel/README.md).

GitHub Pages: main에 올리면 기존 워크플로가 검사·빌드·배포한다. 저장소 Settings → Pages → Source가 GitHub Actions여야 한다. 배포 성공 후 주소는 https://jjsjb88-alt.github.io/9-baseball/ . 단순 소스 업로드만으로 배포 완료가 되는 것은 아니므로 Actions 결과를 확인한다.

## 보존 기록 — LAST LIGHT (현재 기본 앱이 아님)

## 현재 버전: 제로베이스 재설계 (2026-09-09)

사용자의 “기존 게임을 고치는 것이 아니라 처음부터 다시” 요청에 따라 기본 앱을 **LAST LIGHT**로 교체했다. 기존 게임의 JSX, 판정 엔진, CSS, 이미지, 사운드를 새 게임에서 import하지 않는다. 아래 NIGHT RUN 관련 절은 보존된 이전 버전 기록이다.

새 런: **3명의 투수 × 3번의 공격 이닝**. 목표 득점은 ROOKIE 1점, ADAPTER 3점, FOX 4점. 안타 수가 아니라 실제로 홈에 들어온 주자만 점수다. 세 상대를 모두 넘으면 우승, 한 매치라도 목표 미달이면 런 종료다.

1. **새로운 런 시작 → 플레이 볼**.
2. 9개 코스 중 하나 선택 → 손패 카드 0~1장 선택 → 집중 0~2 베팅 → 스윙 확정.
3. 볼로 예상하면 지켜보기. 카드 없이 기본 스윙도 항상 가능하다.
4. 이닝이 끝나면 숙련존/접촉/집중 등을 강화하고 다음 이닝으로 진행한다.
5. 상단 Ⅱ → 저장하고 메인으로 → 이어하기. 같은 기기·브라우저·주소에서 저장된다.

로컬 실행: `npm install` 후 `npm run dev`. 검사: `npm test`, `npm run report:last-light`, `npm run build`. 현재 열어둔 개발 서버는 `http://127.0.0.1:5176/`이며 재실행 시 포트는 달라질 수 있다. 소리는 기본 OFF이고 상단에서 켤 수 있다.

현행 소스: `src/reboot/App.jsx`, `engine.js`, `data.js`, `policy.js`, `audio.js`, `reboot.css`. 새 배경은 `assets/reboot/last-light-stadium.png`. 최신 설계·인수인계·검증 근거는 **[docs/REBOOT.md](./docs/REBOOT.md)**를 먼저 읽는다.

30분은 목표이지 실측 보장이 아니다. 300개 시드의 패턴 활용 봇 완주 표본은 평균 133.4구였다. 한 구 판단·연출에 평균 12초, 브리핑·보상에 총 3분을 쓰면 약 30분이라는 설계 가정이다. 인간 플레이 시간과 재미 검증은 아직 없다.

## 이전 프로토타입 기록 — 아래 규칙은 현행 LAST LIGHT에 적용하지 않음

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
