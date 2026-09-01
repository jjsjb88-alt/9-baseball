param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Register', 'Start', 'Stop', 'Status', 'Disable')]
  [string]$Action
)

$ErrorActionPreference = 'Stop'
$TaskName = '9ZONE SHOWDOWN Codex Loop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$StopFile = Join-Path $PSScriptRoot 'STOP'
$PowerShellExe = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$LoopScript = Join-Path $PSScriptRoot 'loop.ps1'

switch ($Action) {
  'Register' {
    if (-not (Test-Path -LiteralPath $PowerShellExe)) {
      throw "PowerShell not found: $PowerShellExe"
    }

    $taskAction = New-ScheduledTaskAction `
      -Execute $PowerShellExe `
      -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$LoopScript`"" `
      -WorkingDirectory $ProjectRoot
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
    $settings = New-ScheduledTaskSettingsSet `
      -StartWhenAvailable `
      -MultipleInstances IgnoreNew `
      -RestartCount 999 `
      -RestartInterval (New-TimeSpan -Minutes 1) `
      -ExecutionTimeLimit ([TimeSpan]::Zero)
    $principal = New-ScheduledTaskPrincipal `
      -UserId "$env:USERDOMAIN\$env:USERNAME" `
      -LogonType Interactive `
      -RunLevel Limited

    Register-ScheduledTask `
      -TaskName $TaskName `
      -Action $taskAction `
      -Trigger $trigger `
      -Settings $settings `
      -Principal $principal `
      -Description 'Fresh ephemeral Codex session per 9ZONE SHOWDOWN development round.' `
      -Force | Out-Null
    Disable-ScheduledTask -TaskName $TaskName | Out-Null
    Write-Output "Registered and disabled: $TaskName"
  }
  'Start' {
    Remove-Item -LiteralPath $StopFile -Force -ErrorAction SilentlyContinue
    Enable-ScheduledTask -TaskName $TaskName | Out-Null
    Start-ScheduledTask -TaskName $TaskName
    Write-Output "Enabled and started: $TaskName"
  }
  'Stop' {
    New-Item -ItemType File -Path $StopFile -Force | Out-Null
    Disable-ScheduledTask -TaskName $TaskName | Out-Null
    Write-Output 'STOP requested. The current round will finish, then the loop will exit.'
  }
  'Disable' {
    Disable-ScheduledTask -TaskName $TaskName | Out-Null
    Write-Output "Disabled: $TaskName"
  }
  'Status' {
    $task = Get-ScheduledTask -TaskName $TaskName
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    [pscustomobject]@{
      TaskName = $TaskName
      State = $task.State
      Enabled = $task.State -ne 'Disabled'
      LastRunTime = $info.LastRunTime
      LastTaskResult = $info.LastTaskResult
      NextRunTime = $info.NextRunTime
      StopRequested = Test-Path -LiteralPath $StopFile
    }
  }
}
