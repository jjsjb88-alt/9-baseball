#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"

PROMPT_FILE="$SCRIPT_DIR/PROMPT.md"
STOP_FILE="$SCRIPT_DIR/STOP"
LOG_DIR="$PROJECT_ROOT/logs"
TIMEOUT_BIN="/c/Program Files/Git/usr/bin/timeout.exe"

mkdir -p "$LOG_DIR"
run_id="$(date '+%Y%m%d-%H%M%S')-$$"

if [[ ! -f "$PROMPT_FILE" ]]; then
  printf 'Missing prompt: %s\n' "$PROMPT_FILE" >&2
  exit 2
fi

if [[ ! -x "$CODEX_BIN" ]]; then
  printf 'Codex executable not found: %s\n' "$CODEX_BIN" >&2
  exit 3
fi

round=0
fast_failures=0
while :; do
  if [[ -f "$STOP_FILE" ]]; then
    printf 'STOP exists; no new round will start.\n'
    exit 0
  fi

  if (( LOOP_MAX_ROUNDS > 0 && round >= LOOP_MAX_ROUNDS )); then
    printf 'Reached LOOP_MAX_ROUNDS=%s.\n' "$LOOP_MAX_ROUNDS"
    exit 0
  fi

  round=$((round + 1))
  started_at="$(date '+%Y-%m-%dT%H:%M:%S%z')"
  log_file="$LOG_DIR/$(date '+%Y-%m-%d').log"
  last_message="$LOG_DIR/$(date '+%Y-%m-%d')-$run_id-round-$(printf '%04d' "$round")-last.md"

  {
    printf '\n===== RUN %s ROUND %04d START %s =====\n' "$run_id" "$round" "$started_at"
    printf 'model=%s reasoning=%s max_turns=%s timeout_seconds=%s\n' \
      "$LOOP_MODEL" "$LOOP_REASONING_EFFORT" "$LOOP_MAX_TURNS" "$LOOP_SESSION_TIMEOUT_SECONDS"
  } | tee -a "$log_file"

  if [[ "$LOOP_SMOKE_TEST" == "1" ]]; then
    run_instruction=$(cat <<EOF
이것은 자율 개발 루프의 설치 검증용 독립 세션이다. loop/PROMPT.md와 그 안에 적힌 문서를 실제로 읽어라.
이번 세션에서는 파일 수정, 개발, 테스트 실행, git 조작을 하지 말고 준비 상태와 누락된 입력만 짧게 보고하라.
이전 대화를 찾거나 resume/fork 하지 마라. 로그 파일은 런처가 관리한다.
EOF
)
  else
    run_instruction=$(cat <<EOF
이것은 서로 이어지지 않는 독립적인 자율 개발 세션이다. 이전 대화를 찾거나 resume/fork 하지 마라.
반드시 loop/PROMPT.md를 직접 읽고 그 지시를 따라 이번 한 바퀴만 수행하라.
내부 작업-검증 사이클은 최대 ${LOOP_MAX_TURNS}회까지만 사용하고, 범위를 넘기기 전에 안전한 체크포인트 커밋을 남겨라.
로그 파일은 런처가 관리하므로 수정하거나 커밋하지 마라.
EOF
)
  fi

  round_out="$LOG_DIR/.round-current"
  round_began=$(date '+%s')

  set +e
  "$TIMEOUT_BIN" --signal=TERM --kill-after=30s "${LOOP_SESSION_TIMEOUT_SECONDS}s" \
    "$CODEX_BIN" exec \
      --ephemeral \
      --json \
      --color never \
      --approve-for-me \
      --cd "$PROJECT_ROOT" \
      --model "$LOOP_MODEL" \
      --config "model_reasoning_effort=\"$LOOP_REASONING_EFFORT\"" \
      --output-last-message "$last_message" \
      "$run_instruction" 2>&1 | tee -a "$log_file" "$round_out"
  codex_status=${PIPESTATUS[0]}
  set -e
  round_seconds=$(( $(date '+%s') - round_began ))

  ended_at="$(date '+%Y-%m-%dT%H:%M:%S%z')"
  {
    printf '===== RUN %s ROUND %04d END %s exit=%s =====\n' "$run_id" "$round" "$ended_at" "$codex_status"
  } | tee -a "$log_file"

  if [[ -f "$STOP_FILE" ]]; then
    printf 'STOP detected after round %04d; exiting normally.\n' "$round" | tee -a "$log_file"
    exit 0
  fi

  if (( LOOP_MAX_ROUNDS > 0 && round >= LOOP_MAX_ROUNDS )); then
    printf 'Completed requested %s round(s).\n' "$LOOP_MAX_ROUNDS" | tee -a "$log_file"
    exit 0
  fi

  # A provider quota is not a transient error. Retrying it on the normal timer accomplishes nothing:
  # on 2026-09-13 this produced 187 identical five-second failures over two hours.
  if grep -qiE 'usage limit|rate limit|quota exceeded|insufficient_quota' "$round_out" 2>/dev/null; then
    {
      printf 'Round %04d stopped the loop: the provider reported a usage limit.\n' "$round"
      grep -oiE 'try again at [^"\\]*' "$round_out" | head -1
      printf 'Re-run bash loop/loop.sh once the limit resets.\n'
    } | tee -a "$log_file"
    exit 4
  fi

  if (( codex_status == 124 || codex_status == 137 )); then
    printf 'Round %04d hit the session timeout; the next round will start fresh.\n' "$round" | tee -a "$log_file"
    fast_failures=0
  elif (( codex_status != 0 )); then
    if (( round_seconds < LOOP_MIN_HEALTHY_SECONDS )); then
      fast_failures=$((fast_failures + 1))
      printf 'Round %04d failed after %ss (%s in a row under %ss).\n' \
        "$round" "$round_seconds" "$fast_failures" "$LOOP_MIN_HEALTHY_SECONDS" | tee -a "$log_file"
    else
      fast_failures=0
      printf 'Round %04d failed; the next round will start fresh.\n' "$round" | tee -a "$log_file"
    fi
  else
    fast_failures=0
  fi

  # Repeated failures that return in seconds mean the environment is broken, not the task.
  if (( fast_failures >= LOOP_MAX_FAST_FAILURES )); then
    printf 'Stopping after %s consecutive failures faster than %ss. Fix the cause, then re-run.\n' \
      "$fast_failures" "$LOOP_MIN_HEALTHY_SECONDS" | tee -a "$log_file"
    exit 5
  fi

  sleep "$LOOP_WAIT_SECONDS"
done
