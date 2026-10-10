@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
pushd "%ROOT%" >nul
set "ROOT=%CD%"
popd >nul
set "RAW=%ROOT%\backend\data\raw\default_credit_card_clients.csv"

set "CHECK_ONLY=0"
if /I "%~1"=="--check" set "CHECK_ONLY=1"

echo.
echo CreditMiner local runner
echo Root: %ROOT%
echo Training dataset: %RAW%
echo.
echo This script starts local demo servers only. It seeds an in-memory H2 database,
echo but does not seed/reset external databases, run training, read .env files,
echo deploy, or write to external systems.
echo.

set "BACKEND_READY=1"
set "FRONTEND_READY=1"

echo Checking shared prerequisites...
where powershell >nul 2>nul
if errorlevel 1 (
  echo   MISSING powershell
  set "BACKEND_READY=0"
  set "FRONTEND_READY=0"
) else (
  echo   OK      powershell
)

echo.
echo Checking backend prerequisites...
where java >nul 2>nul
if errorlevel 1 (
  echo   MISSING java
  set "BACKEND_READY=0"
) else (
  echo   OK      java
)
where mvn >nul 2>nul
if errorlevel 1 (
  echo   MISSING mvn
  set "BACKEND_READY=0"
) else (
  echo   OK      mvn
)

echo.
echo Checking frontend prerequisites...
where node >nul 2>nul
if errorlevel 1 (
  echo   MISSING node
  set "FRONTEND_READY=0"
) else (
  echo   OK      node
)
where corepack >nul 2>nul
if errorlevel 1 (
  echo   MISSING corepack
  set "FRONTEND_READY=0"
) else (
  echo   OK      corepack
)

echo.
if "%BACKEND_READY%"=="1" (
  echo Backend: ready to start on http://localhost:8091
  echo Backend will use Spring demo profile with an in-memory H2 database.
  echo The normal dev profile uses PostgreSQL on port 8080.
) else (
  echo Backend: not ready. Install JDK 17 and Maven, then run this file again.
)

if "%FRONTEND_READY%"=="1" (
  echo Frontend: ready to start on http://localhost:3000
) else (
  echo Frontend: not ready. Install Node.js 20+ with Corepack, then run this file again.
)

if "%CHECK_ONLY%"=="1" (
  echo.
  echo Check complete. No servers were started.
  exit /b 0
)

echo.
if "%BACKEND_READY%"=="1" (
  echo Checking backend health on http://localhost:8091...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $h = Invoke-RestMethod -Uri 'http://localhost:8091/actuator/health' -TimeoutSec 3; if ($h.status -eq 'UP') { exit 0 } } catch { }; exit 1"
  if errorlevel 1 (
    echo Starting backend window...
    start "CreditMiner Backend :8091" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%ROOT%\backend'; $env:SPRING_PROFILES_ACTIVE='demo'; $env:SERVER_PORT='8091'; mvn spring-boot:run"
    echo Waiting for backend to become healthy...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(120); do { try { $h = Invoke-RestMethod -Uri 'http://localhost:8091/actuator/health' -TimeoutSec 3; if ($h.status -eq 'UP') { exit 0 } } catch { }; Start-Sleep -Seconds 2 } while ((Get-Date) -lt $deadline); exit 1"
    if errorlevel 1 (
      echo Backend did not report healthy within 120 seconds.
      echo Frontend will still start, but refresh the browser after backend finishes booting.
    ) else (
      echo Backend health is UP.
    )
  ) else (
    echo Backend is already healthy on http://localhost:8091.
  )
) else (
  echo Skipping backend because prerequisites are missing.
)

if "%FRONTEND_READY%"=="1" (
  echo Checking frontend on http://localhost:3000...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 3; if ([int]$r.StatusCode -lt 500) { exit 0 } } catch { }; exit 1"
  if errorlevel 1 (
    echo Starting frontend window...
    start "CreditMiner Frontend :3000" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%ROOT%\web'; $env:NEXT_PUBLIC_API_URL='http://localhost:8091/api'; if (-not (Test-Path -LiteralPath 'node_modules')) { corepack pnpm install --frozen-lockfile }; corepack pnpm dev"
  ) else (
    echo Frontend is already running on http://localhost:3000.
  )
) else (
  echo Skipping frontend because prerequisites are missing.
)

echo.
echo Done. Close the opened terminal windows to stop the servers.
echo.
exit /b 0
