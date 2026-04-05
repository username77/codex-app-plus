param(
  [string]$Source = "$HOME\.codex",
  [string]$Destination = "$HOME\.codex-app-plus",
  [switch]$IncludeSessions,
  [switch]$Overwrite,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[migrate] $Message"
}

function Ensure-Dir {
  param([string]$PathValue)
  if (-not (Test-Path -LiteralPath $PathValue -PathType Container)) {
    if ($DryRun) {
      Write-Step "would create directory: $PathValue"
    } else {
      New-Item -ItemType Directory -Path $PathValue -Force | Out-Null
      Write-Step "created directory: $PathValue"
    }
  }
}

function Resolve-EnvValue {
  param([string]$Name)
  $processValue = [Environment]::GetEnvironmentVariable($Name, "Process")
  if (-not [string]::IsNullOrWhiteSpace($processValue)) { return $processValue }
  $userValue = [Environment]::GetEnvironmentVariable($Name, "User")
  if (-not [string]::IsNullOrWhiteSpace($userValue)) { return $userValue }
  $machineValue = [Environment]::GetEnvironmentVariable($Name, "Machine")
  if (-not [string]::IsNullOrWhiteSpace($machineValue)) { return $machineValue }
  return $null
}

function Ensure-AuthApiKeyFromEnvironment {
  param([string]$DestinationRoot)

  $destinationAuth = Join-Path $DestinationRoot "auth.json"
  $key = Resolve-EnvValue -Name "OPENAI_API_KEY"
  if ([string]::IsNullOrWhiteSpace($key)) {
    $key = Resolve-EnvValue -Name "OPENROUTER_API_KEY"
  }

  if ([string]::IsNullOrWhiteSpace($key)) {
    Write-Step "skip env key import (OPENAI_API_KEY / OPENROUTER_API_KEY not found)"
    return
  }

  $auth = [pscustomobject]@{}
  if (Test-Path -LiteralPath $destinationAuth) {
    try {
      $text = Get-Content -LiteralPath $destinationAuth -Raw
      if (-not [string]::IsNullOrWhiteSpace($text)) {
        $parsed = ConvertFrom-Json -InputObject $text
        if ($null -ne $parsed) {
          $auth = $parsed
        }
      }
    } catch {
      Write-Step "skip env key import (invalid auth.json): $destinationAuth"
      return
    }
  }

  $existing = $null
  $hasOpenAiProperty = $false
  if ($auth -is [hashtable]) {
    $hasOpenAiProperty = $auth.ContainsKey("OPENAI_API_KEY")
    if ($hasOpenAiProperty) {
      $existing = [string]$auth["OPENAI_API_KEY"]
    }
  } else {
    $property = $auth.PSObject.Properties["OPENAI_API_KEY"]
    if ($null -ne $property) {
      $hasOpenAiProperty = $true
      $existing = [string]$property.Value
    }
  }
  if (-not [string]::IsNullOrWhiteSpace($existing)) {
    Write-Step "skip env key import (destination auth.json already has OPENAI_API_KEY)"
    return
  }

  if ($DryRun) {
    Write-Step "would set OPENAI_API_KEY in: $destinationAuth (from environment)"
    return
  }

  if ($hasOpenAiProperty) {
    if ($auth -is [hashtable]) {
      $auth["OPENAI_API_KEY"] = $key
    } else {
      $auth.OPENAI_API_KEY = $key
    }
  } else {
    if ($auth -is [hashtable]) {
      $auth["OPENAI_API_KEY"] = $key
    } else {
      $auth | Add-Member -NotePropertyName "OPENAI_API_KEY" -NotePropertyValue $key
    }
  }
  $json = ($auth | ConvertTo-Json -Depth 100)
  Set-Content -LiteralPath $destinationAuth -Value ($json + "`n")
  Write-Step "set OPENAI_API_KEY in: $destinationAuth (from environment)"
}

function Copy-Path {
  param(
    [string]$SourcePath,
    [string]$DestinationPath,
    [string]$BackupRoot
  )

  if (-not (Test-Path -LiteralPath $SourcePath)) {
    Write-Step "skip (missing source): $SourcePath"
    return
  }

  $destinationExists = Test-Path -LiteralPath $DestinationPath
  if ($destinationExists -and -not $Overwrite) {
    Write-Step "skip (already exists, use -Overwrite to replace): $DestinationPath"
    return
  }

  if ($destinationExists -and $Overwrite) {
    Ensure-Dir -PathValue $BackupRoot
    $relativeBackup = $DestinationPath.Substring($Destination.Length).TrimStart('\', '/')
    $backupPath = Join-Path $BackupRoot $relativeBackup
    $backupParent = Split-Path -Parent $backupPath
    Ensure-Dir -PathValue $backupParent
    if ($DryRun) {
      Write-Step "would backup destination: $DestinationPath -> $backupPath"
    } else {
      Copy-Item -LiteralPath $DestinationPath -Destination $backupPath -Recurse -Force
      Write-Step "backed up destination: $DestinationPath -> $backupPath"
    }
  }

  $destinationParent = Split-Path -Parent $DestinationPath
  Ensure-Dir -PathValue $destinationParent

  if ($DryRun) {
    Write-Step "would copy: $SourcePath -> $DestinationPath"
  } else {
    Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Recurse -Force
    Write-Step "copied: $SourcePath -> $DestinationPath"
  }
}

if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
  throw "Source Codex home not found: $Source"
}

Ensure-Dir -PathValue $Destination
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $Destination ("migration-backup-" + $timestamp)

# Core profile files used by Codex App Plus.
$targets = @(
  "config.toml",
  "auth.json",
  "AGENTS.md",
  "approvals.json",
  "prompts",
  "agents",
  "plugins",
  "skills"
)

if ($IncludeSessions) {
  $targets += "sessions"
}

Write-Step "source: $Source"
Write-Step "destination: $Destination"
Write-Step "include sessions: $($IncludeSessions.IsPresent)"
Write-Step "overwrite existing: $($Overwrite.IsPresent)"
Write-Step "dry run: $($DryRun.IsPresent)"

foreach ($target in $targets) {
  $src = Join-Path $Source $target
  $dst = Join-Path $Destination $target
  Copy-Path -SourcePath $src -DestinationPath $dst -BackupRoot $backupRoot
}

Ensure-AuthApiKeyFromEnvironment -DestinationRoot $Destination

if ($DryRun) {
  Write-Step "dry-run completed. No files were changed."
} else {
  Write-Step "migration completed."
  if ($Overwrite) {
    Write-Step "backup folder: $backupRoot"
  }
  Write-Step "restart Codex App Plus to apply the migrated profile."
}
