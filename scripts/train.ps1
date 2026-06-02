# Artifact-only training wrapper for Windows PowerShell.
# This delegates to train-artifacts.bat so the BAT and PS entrypoints stay aligned.
# It does not seed/reset databases, run SQL, deploy, or read .env files.

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$bat = Join-Path $root "scripts\train-artifacts.bat"

& $bat @args
exit $LASTEXITCODE
