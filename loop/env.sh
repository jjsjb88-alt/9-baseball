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

# Scheduled tasks do not inherit the interactive shell PATH. Keep every runtime
# used by the loop explicit here. Update CODEX_BIN after a Codex app upgrade if
# the versioned executable directory changes.
export CODEX_HOME="${CODEX_HOME:-/c/Users/정현아/.codex}"
export CODEX_BIN="${CODEX_BIN:-/c/Users/정현아/AppData/Local/OpenAI/Codex/bin/b99306303521e97e/codex.exe}"
export PATH="/c/Users/정현아/AppData/Local/OpenAI/Codex/bin/b99306303521e97e:/c/Users/정현아/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/c/Users/정현아/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:/c/Program Files/Git/bin:/c/Program Files/Git/cmd:/c/Windows/System32:/c/Windows/System32/WindowsPowerShell/v1.0:${PATH:-}"
