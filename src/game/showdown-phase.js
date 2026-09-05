// 화면 페이즈 단일 소스.
// "지금 화면이 묻는 질문"은 여기서만 결정한다. 한 페이즈에 한 질문, 활성 입력 영역은 항상 하나다.

export const UI_PHASES = ["OBSERVE", "READ", "BET", "REVEAL", "AUTO", "PITCH"];

// 페이즈 라벨은 어떤 상태에서도 비어 있으면 안 된다(동료 타석 포함).
// REVEAL만 지시문 대신 상태 문구를 쓴다 - 이 단계에서는 플레이어가 할 일이 없다.
export const PHASE_INSTRUCTIONS = {
  OBSERVE: "투수를 관찰하세요",
  READ: "코스를 예측하세요",
  BET: "확인 후 승부하세요",
  REVEAL: "결과를 확인하는 중",
  AUTO: "자동 진행 중…",
  PITCH: "던질 코스를 고르세요",
};

// 페이즈마다 입력을 받는 영역은 정확히 하나다.
export const PHASE_INPUT_TARGET = {
  OBSERVE: "history",
  READ: "hand",
  BET: "sheet",
  REVEAL: "none",
  AUTO: "none",
  PITCH: "hand",
};

// pitchPhase: 기존 투구 단계머신("ready"|"windup"|"delivery"|"reveal"|"result")
export function resolveUiPhase({ isUserTurn, role, pitchPhase, zoneChosen }) {
  if (!isUserTurn) return "AUTO";
  if (role !== "batter") return "PITCH";
  if (pitchPhase === "result") return "REVEAL";
  if (pitchPhase === "reveal") return zoneChosen ? "BET" : "READ";
  return "OBSERVE";
}

export function phaseInstruction(uiPhase, autoLabel = "") {
  if (uiPhase === "AUTO" && autoLabel) return autoLabel;
  return PHASE_INSTRUCTIONS[uiPhase] || "진행 중";
}

export function phaseInputTarget(uiPhase) {
  return PHASE_INPUT_TARGET[uiPhase] ?? "none";
}
