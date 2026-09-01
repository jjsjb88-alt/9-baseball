param(
  [int]$MaxRounds = -1,
  [int]$WaitSeconds = -1,
  [int]$MaxTurns = -1,
  [int]$SessionTimeoutSeconds = -1,
  [switch]$SmokeTest
)

$ErrorActionPreference = 'Stop'
$BashExe = 'C:\Program Files\Git\bin\bash.exe'

if ($PSScriptRoot -notmatch '^([A-Za-z]):(.*)$') {
  throw "Cannot convert project path for Git Bash: $PSScriptRoot"
}
$BashScript = '/' + $Matches[1].ToLower() + ($Matches[2] -replace '\\', '/') + '/loop.sh'

if ($MaxRounds -ge 0) { $env:LOOP_MAX_ROUNDS = [string]$MaxRounds }
if ($WaitSeconds -ge 0) { $env:LOOP_WAIT_SECONDS = [string]$WaitSeconds }
if ($MaxTurns -ge 0) { $env:LOOP_MAX_TURNS = [string]$MaxTurns }
if ($SessionTimeoutSeconds -ge 0) { $env:LOOP_SESSION_TIMEOUT_SECONDS = [string]$SessionTimeoutSeconds }
if ($SmokeTest) { $env:LOOP_SMOKE_TEST = '1' }

& $BashExe --noprofile --norc $BashScript
exit $LASTEXITCODE

