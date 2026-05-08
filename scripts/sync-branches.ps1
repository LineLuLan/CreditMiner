# =============================================================================
# CreditMiner — branch sync helper (Windows / PowerShell)
# NEVER rebases. Always merges --no-ff. Pushes when done.
#
# Usage:
#   .\scripts\sync-branches.ps1                 # default: develop <-> backend <-> frontend
#   .\scripts\sync-branches.ps1 -Direction down # develop -> backend & frontend
#   .\scripts\sync-branches.ps1 -Direction up   # backend & frontend -> develop
# =============================================================================

param(
  [ValidateSet("both", "down", "up")]
  [string]$Direction = "both"
)

$ErrorActionPreference = "Stop"

function Sync-Merge($source, $target, $msg) {
  Write-Host "  -> $source  ===>  $target" -ForegroundColor Cyan
  git checkout $target | Out-Null
  git merge --no-ff $source -m $msg
  git push origin $target
}

git fetch origin

if ($Direction -in @("both", "up")) {
  Write-Host "==> Pulling backend and frontend INTO develop..." -ForegroundColor Yellow
  Sync-Merge "backend"  "develop" "chore: sync backend -> develop"
  Sync-Merge "frontend" "develop" "chore: sync frontend -> develop"
}

if ($Direction -in @("both", "down")) {
  Write-Host "==> Pushing develop INTO backend and frontend..." -ForegroundColor Yellow
  Sync-Merge "develop" "backend"  "chore: sync develop -> backend"
  Sync-Merge "develop" "frontend" "chore: sync develop -> frontend"
}

Write-Host ""
Write-Host "Done. All branches synced (no rebase)." -ForegroundColor Green
