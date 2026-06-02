@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
pushd "%ROOT%" >nul
set "ROOT=%CD%"
popd >nul

set "LOG=%ROOT%\docs\TRAINING_LOG.md"
set "RAW=%ROOT%\backend\data\raw\BankChurners.csv"
set "CHECK_ONLY=0"
if /I "%~1"=="--check" set "CHECK_ONLY=1"

echo.
echo CreditMiner artifact training runner
echo Root: %ROOT%
echo.
echo This runner creates local data/model artifacts only.
echo It does not seed/reset databases, run SQL, deploy, or read .env files.
echo.

call :check_cmd java || exit /b 1
call :check_cmd mvn || exit /b 1
call :check_cmd powershell || exit /b 1

if not exist "%RAW%" (
  echo.
  echo MISSING: %RAW%
  echo Put BankChurners.csv there before training.
  echo.
  exit /b 1
)

if "%CHECK_ONLY%"=="1" (
  echo.
  echo Check complete. Training prerequisites are available.
  exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$log = '%LOG%';" ^
  "$dir = Split-Path -Parent $log;" ^
  "New-Item -ItemType Directory -Force -Path $dir | Out-Null;" ^
  "'# CreditMiner Training Log' | Set-Content -LiteralPath $log -Encoding UTF8;" ^
  "'' | Add-Content -LiteralPath $log;" ^
  "('Started: ' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss zzz')) | Add-Content -LiteralPath $log;" ^
  "('Root: %ROOT%') | Add-Content -LiteralPath $log;" ^
  "'' | Add-Content -LiteralPath $log;" ^
  "'Safety: artifact-only run; no database seed/reset SQL, deployment, or .env reads.' | Add-Content -LiteralPath $log;" ^
  "'' | Add-Content -LiteralPath $log"

call :run_phase "Phase 1 - data understanding" "com.creditminer.pipeline.Phase1Report" || exit /b 1
call :run_phase "Phase 2 - preprocessing" "com.creditminer.pipeline.Phase2Report" || exit /b 1
call :run_phase "Phase 3 - feature engineering" "com.creditminer.pipeline.Phase3Report" || exit /b 1
call :run_phase "Phase 5 - classification" "com.creditminer.pipeline.Phase5Pipeline" || exit /b 1
call :run_phase "Phase 6 - clustering and anomaly" "com.creditminer.pipeline.Phase6Pipeline" || exit /b 1
call :run_phase "Phase 7 - association rules" "com.creditminer.pipeline.Phase7Pipeline" || exit /b 1

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$log = '%LOG%';" ^
  "'' | Add-Content -LiteralPath $log;" ^
  "'## Artifact Inventory' | Add-Content -LiteralPath $log;" ^
  "'' | Add-Content -LiteralPath $log;" ^
  "$files = Get-ChildItem -LiteralPath '%ROOT%\backend\data\processed','%ROOT%\backend\models' -File -ErrorAction SilentlyContinue | Sort-Object FullName;" ^
  "foreach ($f in $files) { ('- ' + $f.FullName.Replace('%ROOT%\','') + ' (' + $f.Length + ' bytes)') | Add-Content -LiteralPath $log };" ^
  "'' | Add-Content -LiteralPath $log;" ^
  "('Finished: ' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss zzz')) | Add-Content -LiteralPath $log"

echo.
echo Training complete.
echo Log: %LOG%
exit /b 0

:run_phase
set "PHASE_LABEL=%~1"
set "MAIN_CLASS=%~2"
echo.
echo Running %PHASE_LABEL%...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$log = '%LOG%';" ^
  "'' | Add-Content -LiteralPath $log;" ^
  "('## %PHASE_LABEL%') | Add-Content -LiteralPath $log;" ^
  "'```text' | Add-Content -LiteralPath $log;" ^
  "Set-Location -LiteralPath '%ROOT%\backend';" ^
  "& mvn -q exec:java '-Dexec.mainClass=%MAIN_CLASS%' 2>&1 | Tee-Object -FilePath $log -Append;" ^
  "$code = $LASTEXITCODE;" ^
  "'```' | Add-Content -LiteralPath $log;" ^
  "exit $code"
if errorlevel 1 (
  echo FAILED: %PHASE_LABEL%
  echo See %LOG%
  exit /b 1
)
echo OK: %PHASE_LABEL%
exit /b 0

:check_cmd
where "%~1" >nul 2>nul
if errorlevel 1 (
  echo MISSING: %~1
  exit /b 1
)
echo OK: %~1
exit /b 0
