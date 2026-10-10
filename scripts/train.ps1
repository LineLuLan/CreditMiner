# Regenerate all CreditMiner data-mining artifacts without network access.
$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backend = Join-Path $root "backend"
$raw = Join-Path $backend "data\raw\default_credit_card_clients.csv"

foreach ($command in @("java", "mvn")) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "MISSING: $command is required."
  }
}

if (-not (Test-Path -LiteralPath $raw -PathType Leaf)) {
  throw "MISSING: $raw. Place the UCI dataset CSV at that path before training."
}

$mainClasses = @(
  "com.creditminer.pipeline.Phase1Report",
  "com.creditminer.pipeline.Phase2Report",
  "com.creditminer.pipeline.Phase3Report",
  "com.creditminer.pipeline.Phase5Pipeline",
  "com.creditminer.pipeline.Phase6Pipeline",
  "com.creditminer.pipeline.Phase7Pipeline",
  "com.creditminer.pipeline.InsightFactsReport",
  "com.creditminer.pipeline.Phase10Pipeline"
)

Push-Location $backend
try {
  foreach ($mainClass in $mainClasses) {
    Write-Host "==> Running $mainClass" -ForegroundColor Cyan
    & mvn -o -q compile exec:java "-Dexec.mainClass=$mainClass"
    if ($LASTEXITCODE -ne 0) {
      throw "$mainClass failed with exit code $LASTEXITCODE."
    }
  }
}
finally {
  Pop-Location
}

Write-Host "Artifact regeneration complete." -ForegroundColor Green
