# Run the offline TrainPipeline (CSV -> .model + DB seed). Windows.
$ErrorActionPreference = "Stop"

if (-not (Test-Path "backend/data/raw/BankChurners.csv")) {
  Write-Host "MISSING: backend/data/raw/BankChurners.csv" -ForegroundColor Red
  Write-Host "Download from https://www.kaggle.com/datasets/sakshigoyal7/credit-card-customers" -ForegroundColor Yellow
  exit 1
}

Push-Location backend
mvn -q exec:java -Dexec.mainClass="com.creditminer.pipeline.TrainPipeline"
Pop-Location
