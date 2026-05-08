# Seed the database (schema + insights). Windows.
$ErrorActionPreference = "Stop"

$dbUrl = $env:DATABASE_URL
if (-not $dbUrl) {
  $dbUrl = "postgresql://creditminer:creditminer@localhost:5432/creditminer_db"
  Write-Host "Using default DATABASE_URL: $dbUrl" -ForegroundColor Yellow
}

Write-Host "==> Applying db/schema.sql..." -ForegroundColor Cyan
psql $dbUrl -f db/schema.sql

Write-Host "==> Applying db/seed.sql..." -ForegroundColor Cyan
psql $dbUrl -f db/seed.sql

Write-Host "Done." -ForegroundColor Green
