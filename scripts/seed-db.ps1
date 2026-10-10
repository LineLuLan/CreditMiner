# Apply the SQL schema and seed files to an explicitly selected PostgreSQL database.
# Spring's prod profile can load DATABASE_URL, DB_USER, and DB_PASSWORD from the
# git-ignored backend/.env file. This script does not read that file or print secrets.
$ErrorActionPreference = "Stop"

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "MISSING: psql is required."
}
if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is not set. Export it in this shell. Do not pass a secret on the command line."
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Write-Host "==> Applying db/schema.sql" -ForegroundColor Cyan
& psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f (Join-Path $root "db\schema.sql")
if ($LASTEXITCODE -ne 0) { throw "Schema application failed." }

Write-Host "==> Applying db/seed.sql" -ForegroundColor Cyan
& psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f (Join-Path $root "db\seed.sql")
if ($LASTEXITCODE -ne 0) { throw "Seed application failed." }

Write-Host "Database seed complete." -ForegroundColor Green
