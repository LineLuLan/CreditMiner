# Prepare the CreditMiner development environment on Windows.
$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "MISSING: $name is required."
  }
  Write-Host "  OK  $name" -ForegroundColor Green
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$raw = Join-Path $root "backend\data\raw\default_credit_card_clients.csv"

Write-Host "==> Checking prerequisites" -ForegroundColor Cyan
@("java", "mvn", "node", "corepack", "docker") | ForEach-Object { Require-Command $_ }

Write-Host "==> Starting local PostgreSQL for the dev profile" -ForegroundColor Cyan
Push-Location $root
try {
  & docker compose up -d postgres
  if ($LASTEXITCODE -ne 0) { throw "docker compose failed." }
}
finally {
  Pop-Location
}

Write-Host "==> Installing frontend dependencies" -ForegroundColor Cyan
Push-Location (Join-Path $root "web")
try {
  if (-not (Test-Path -LiteralPath ".env.local")) {
    Copy-Item -LiteralPath ".env.local.example" -Destination ".env.local"
    Write-Host "  Created web/.env.local from the example." -ForegroundColor Yellow
  }
  & corepack pnpm install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { throw "pnpm install failed." }
}
finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $raw -PathType Leaf)) {
  Write-Host "MISSING DATASET: $raw" -ForegroundColor Yellow
}

Write-Host "Setup complete." -ForegroundColor Green
Write-Host "  Artifacts: .\scripts\train.ps1"
Write-Host "  Dev API:   `$env:SPRING_PROFILES_ACTIVE='dev'; `$env:SERVER_PORT='8080'; cd backend; mvn spring-boot:run"
Write-Host "  Demo API:  `$env:SPRING_PROFILES_ACTIVE='demo'; `$env:SERVER_PORT='8091'; cd backend; mvn spring-boot:run"
Write-Host "  Web:       cd web; corepack pnpm dev  # http://localhost:3000"
