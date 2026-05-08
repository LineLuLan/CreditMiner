# =============================================================================
# CreditMiner — one-shot setup (Windows / PowerShell)
# Usage:  .\scripts\setup.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==> Checking prerequisites..." -ForegroundColor Cyan
function Require-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host "MISSING: $name — install it before continuing." -ForegroundColor Red
    exit 1
  }
  Write-Host "  OK  $name" -ForegroundColor Green
}
Require-Cmd "java"
Require-Cmd "mvn"
Require-Cmd "node"
Require-Cmd "pnpm"
Require-Cmd "git"
Require-Cmd "docker"

Write-Host ""
Write-Host "==> Starting Postgres via docker compose..." -ForegroundColor Cyan
docker compose up -d postgres

Write-Host ""
Write-Host "==> Building backend (mvn compile, no tests)..." -ForegroundColor Cyan
Push-Location backend
mvn -q clean compile -DskipTests
Pop-Location

Write-Host ""
Write-Host "==> Installing frontend dependencies..." -ForegroundColor Cyan
Push-Location web
if (-not (Test-Path ".env.local")) {
  Copy-Item ".env.local.example" ".env.local"
  Write-Host "    Created web/.env.local from example." -ForegroundColor Yellow
}
pnpm install --silent
Pop-Location

Write-Host ""
Write-Host "==> Setup complete." -ForegroundColor Green
Write-Host "    Next steps:"
Write-Host "      1. Place BankChurners.csv at backend/data/raw/"
Write-Host "      2. Run training:  .\scripts\train.ps1"
Write-Host "      3. Start backend: cd backend; mvn spring-boot:run"
Write-Host "      4. Start frontend: cd web; pnpm dev"
