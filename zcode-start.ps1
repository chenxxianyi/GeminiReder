<#
.SYNOPSIS
  ZCode-style launcher for this Tauri/Vite reader project.

.EXAMPLE
  .\zcode-start.ps1
  Starts the Tauri desktop dev app.

.EXAMPLE
  .\zcode-start.ps1 -Web
  Starts only the Vite web dev server.

.EXAMPLE
  .\zcode-start.ps1 -Build
  Builds the Tauri desktop app.

.EXAMPLE
  .\zcode-start.ps1 -CheckOnly
  Checks Node/npm/Cargo and exits without starting the app.
#>

[CmdletBinding()]
param(
  [switch]$Web,
  [switch]$Build,
  [switch]$CheckOnly,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $ProjectRoot

function Write-ZcLine {
  param(
    [string]$Text = '',
    [ConsoleColor]$Color = 'DarkGray'
  )
  Write-Host $Text -ForegroundColor $Color
}

function Write-ZcHeader {
  Write-Host ''
  Write-Host '  ZCode Reader' -ForegroundColor White
  Write-Host '  Stealth Workbench Launcher' -ForegroundColor DarkGray
  Write-Host ''
  Write-Host '  +--------------------------------------------------------+' -ForegroundColor DarkGray
  Write-Host '  | Project  GeminiReder                                   |' -ForegroundColor Gray
  Write-Host '  | Runtime  Tauri 2 + Vite 4 + Vue 3                       |' -ForegroundColor Gray
  Write-Host '  | Port     http://localhost:4310                          |' -ForegroundColor Gray
  Write-Host '  +--------------------------------------------------------+' -ForegroundColor DarkGray
  Write-Host ''
}

function Write-ZcStep {
  param([string]$Text)
  Write-Host "  > $Text" -ForegroundColor Cyan
}

function Write-ZcOk {
  param([string]$Text)
  Write-Host "    ok  $Text" -ForegroundColor Green
}

function Write-ZcWarn {
  param([string]$Text)
  Write-Host "    warn  $Text" -ForegroundColor Yellow
}

function Write-ZcFail {
  param([string]$Text)
  Write-Host "    fail  $Text" -ForegroundColor Red
}

function Add-PathOnce {
  param([string]$PathToAdd)

  if (-not $PathToAdd -or -not (Test-Path -LiteralPath $PathToAdd)) {
    return
  }

  $parts = $env:PATH -split ';'
  if ($parts -notcontains $PathToAdd) {
    $env:PATH = "$PathToAdd;$env:PATH"
  }
}

function Get-Tool {
  param([string]$Name)
  return Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Invoke-ZcCommand {
  param(
    [string]$File,
    [string[]]$Arguments,
    [string]$Label
  )

  Write-ZcStep $Label
  Write-ZcLine "    $File $($Arguments -join ' ')" 'DarkGray'
  Write-Host ''

  & $File @Arguments
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    throw "$Label failed with exit code $exitCode."
  }
}

function Test-PortInUse {
  param([int]$Port)

  try {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
    return [bool]$connections
  } catch {
    try {
      $result = netstat -ano -p TCP | Select-String -Pattern ":$Port\s"
      return [bool]$result
    } catch {
      return $false
    }
  }
}

function Assert-Tool {
  param(
    [string]$Name,
    [string]$InstallHint
  )

  $tool = Get-Tool $Name
  if (-not $tool) {
    Write-ZcFail "$Name was not found."
    Write-ZcLine "    $InstallHint" 'Yellow'
    exit 1
  }

  return $tool
}

Write-ZcHeader

Write-ZcStep 'Preparing workspace'
Add-PathOnce -PathToAdd (Join-Path $env:USERPROFILE '.cargo\bin')
Add-PathOnce -PathToAdd (Join-Path $ProjectRoot '.cargo\bin')
Write-ZcOk $ProjectRoot

Write-ZcStep 'Checking frontend toolchain'
$node = Assert-Tool -Name 'node' -InstallHint 'Install Node.js LTS from https://nodejs.org/'
$npm = Assert-Tool -Name 'npm.cmd' -InstallHint 'Install Node.js LTS, then reopen PowerShell.'
$nodeVersion = (& $node.Source --version)
$npmVersion = (& $npm.Source --version)
Write-ZcOk "node $nodeVersion"
Write-ZcOk "npm  $npmVersion"

if (-not $Web) {
  Write-ZcStep 'Checking desktop toolchain'
  $cargo = Assert-Tool -Name 'cargo' -InstallHint 'Install Rust from https://rustup.rs/ or reopen PowerShell after Rust installation.'
  $cargoVersion = (& $cargo.Source --version)
  Write-ZcOk $cargoVersion
}

Write-ZcStep 'Checking dependencies'
if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'node_modules'))) {
  if ($SkipInstall) {
    Write-ZcFail 'node_modules is missing and -SkipInstall was supplied.'
    exit 1
  }

  if (Test-Path -LiteralPath (Join-Path $ProjectRoot 'package-lock.json')) {
    Invoke-ZcCommand -File $npm.Source -Arguments @('ci') -Label 'Installing npm dependencies with npm ci'
  } else {
    Invoke-ZcCommand -File $npm.Source -Arguments @('install') -Label 'Installing npm dependencies'
  }
} else {
  Write-ZcOk 'node_modules ready'
}

if (Test-PortInUse -Port 4310) {
  Write-ZcWarn 'Port 4310 is already in use. Close the old Vite/Tauri session if startup fails.'
} else {
  Write-ZcOk 'port 4310 free'
}

if ($CheckOnly) {
  Write-Host ''
  Write-ZcOk 'Environment check complete.'
  Write-Host ''
  exit 0
}

Write-Host ''
Write-Host '  ZCode boot sequence' -ForegroundColor White
Write-Host '  --------------------------------------------------------' -ForegroundColor DarkGray
Write-Host '  Ctrl+C stops the dev process.' -ForegroundColor DarkGray
Write-Host ''

if ($Build) {
  Invoke-ZcCommand -File $npm.Source -Arguments @('run', 'desktop:build') -Label 'Building desktop app'
} elseif ($Web) {
  Invoke-ZcCommand -File $npm.Source -Arguments @('run', 'dev') -Label 'Starting Vite web workspace'
} else {
  Invoke-ZcCommand -File $npm.Source -Arguments @('run', 'desktop:dev') -Label 'Starting ZCode desktop workspace'
}
