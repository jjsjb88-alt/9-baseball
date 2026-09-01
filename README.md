# 9ZONE SHOWDOWN

`BaseballSim-deck-5.jsx`의 기존 UI·그래픽·사운드·경기 흐름을 유지하면서 `CORE TEST 02`의 타자 심리전 규칙을 통합한 로컬 개발 프로젝트다. 현재 목표는 콘텐츠 확장이 아니라 **한 공을 읽고 베팅하는 15초가 재미있는지** 검증하는 것이다.

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

## 소스 구조

- `BaseballSim-deck-5.jsx`: 게임 본체이자 소스 오브 트루스. 기존 자산과 최신 코어 규칙이 함께 있다.
- `src/main.jsx`: 로컬 React 진입점.
- `src/styles.css`: Tailwind와 전역 스타일 진입점.
- `assets/sprites-v2/frames/`: 전투용 고해상도 타자·투수 키포즈 36장. 앱은 이 폴더를 한 번에 로드한다.
- `work/process_sprite_v2.py`: 생성된 6칸 시트를 투명 512px 개별 프레임으로 정리하는 재현용 도구.
- `tests/showdown-engine.test.js`: 실제 게임이 export하는 CQ/PQ 판정 엔진의 최소 회귀 테스트.
- `HANDOFF.md`: 설계 원칙, 변경 지점, 플레이테스트 체크리스트.

별도의 프로토타입 JSX를 계속 복제하지 않는다. 코어 규칙 변경은 본체의 `resolveShowdownContact()`와 그 호출부를 수정한다. 자동시뮬도 반드시 같은 함수를 호출해야 한다.

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
