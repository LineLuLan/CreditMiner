@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
pushd "%ROOT%" >nul
set "ROOT=%CD%"
popd >nul

set "CHECK_ONLY=0"
if /I "%~1"=="--check" set "CHECK_ONLY=1"

echo.
echo CreditMiner local runner
echo Root: %ROOT%
echo.
echo This script starts dev servers only. It does not seed/reset databases,
echo run training, read .env files, deploy, or write to external systems.
echo.

set "BACKEND_READY=1"
set "FRONTEND_READY=1"

echo Checking shared prerequisites...
call :check_cmd powershell || (
  set "BACKEND_READY=0"
  set "FRONTEND_READY=0"
)

echo.
echo Checking backend prerequisites...
call :check_cmd java || set "BACKEND_READY=0"
call :check_cmd mvn || set "BACKEND_READY=0"

echo.
echo Checking frontend prerequisites...
call :check_cmd node || set "FRONTEND_READY=0"
call :check_cmd corepack || set "FRONTEND_READY=0"

echo.
if "%BACKEND_READY%"=="1" (
  echo Backend: ready to start on http://localhost:8080
  if not defined DATABASE_URL (
    echo Backend DATABASE_URL is not set; Spring dev profile will use its local default.
  )
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
  echo Starting backend window...
  start "CreditMiner Backend :8080" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%ROOT%\backend'; mvn spring-boot:run"
) else (
  echo Skipping backend because prerequisites are missing.
)

if "%FRONTEND_READY%"=="1" (
  echo Starting frontend window...
  start "CreditMiner Frontend :3000" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%ROOT%\web'; if (-not (Test-Path -LiteralPath 'node_modules')) { corepack pnpm install --frozen-lockfile }; corepack pnpm dev"
) else (
  echo Skipping frontend because prerequisites are missing.
)

echo.
echo Done. Close the opened terminal windows to stop the servers.
echo.
exit /b 0

:check_cmd
where "%~1" >nul 2>nul
if errorlevel 1 (
  echo   MISSING %~1
  exit /b 1
)
echo   OK      %~1
exit /b 0
