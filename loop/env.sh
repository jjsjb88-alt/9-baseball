#!/usr/bin/env bash

# 9ZONE SHOWDOWN autonomous-loop settings.
# Every value can be overridden for one invocation, for example:
# LOOP_MAX_ROUNDS=2 LOOP_WAIT_SECONDS=1 bash loop/loop.sh

export LOOP_MODEL="${LOOP_MODEL:-gpt-5.6-sol}"
export LOOP_REASONING_EFFORT="${LOOP_REASONING_EFFORT:-high}"
export LOOP_MAX_TURNS="${LOOP_MAX_TURNS:-12}"
export LOOP_WAIT_SECONDS="${LOOP_WAIT_SECONDS:-30}"
export LOOP_MAX_ROUNDS="${LOOP_MAX_ROUNDS:-0}" # 0 means no round limit.
export LOOP_SESSION_TIMEOUT_SECONDS="${LOOP_SESSION_TIMEOUT_SECONDS:-3600}"
export LOOP_SMOKE_TEST="${LOOP_SMOKE_TEST:-0}"

# Resolve the Codex install from the environment rather than hard-coding one machine's paths.
# Codex puts its executables in a hash-named directory that changes on every upgrade; a pinned path
# here silently breaks the loop with exit 3, which is exactly what happened between 09-10 and 09-13.
loop_local="${LOCALAPPDATA:-$HOME/AppData/Local}"
if command -v cygpath >/dev/null 2>&1; then loop_local="$(cygpath -u "$loop_local")"; fi

export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
if [[ -z "${CODEX_BIN:-}" || ! -x "${CODEX_BIN:-}" ]]; then
  CODEX_BIN="$(ls -t "$loop_local"/OpenAI/Codex/bin/*/codex.exe 2>/dev/null | head -1 || true)"
fi
export CODEX_BIN

# Scheduled tasks do not inherit the interactive shell PATH, so every runtime the loop uses is explicit.
loop_runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies"
loop_codex_dir="."
if [[ -n "${CODEX_BIN:-}" ]]; then loop_codex_dir="$(dirname "$CODEX_BIN")"; fi
export PATH="$loop_codex_dir:$loop_runtime/node/bin:$loop_runtime/bin/fallback:/c/Program Files/Git/usr/bin:/c/Program Files/Git/bin:/c/Program Files/Git/cmd:/c/Windows/System32:/c/Windows/System32/WindowsPowerShell/v1.0:/usr/bin:/bin:${PATH:-}"
