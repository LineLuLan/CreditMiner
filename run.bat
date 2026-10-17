@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "CHECK_ONLY=0"
set "NO_BROWSER=0"

:parse_args
if "%~1"=="" goto resolve_tools
if /I "%~1"=="--check" (
  set "CHECK_ONLY=1"
  shift
  goto parse_args
)
if /I "%~1"=="--no-browser" (
  set "NO_BROWSER=1"
  shift
  goto parse_args
)
echo Unknown option: %~1
echo Usage: run.bat [--check] [--no-browser]
exit /b 1

:resolve_tools
set "JAVA_EXE="
set "MVN_CMD="
set "NODE_EXE="
set "COREPACK_CMD="
set "PS_EXE="
set "MISSING=0"

if defined JAVA_HOME (
  if exist "%JAVA_HOME%\bin\java.exe" set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
) else (
  if exist "D:\tools\jdk-21.0.12.1+1\bin\java.exe" (
    set "JAVA_HOME=D:\tools\jdk-21.0.12.1+1"
    set "JAVA_EXE=D:\tools\jdk-21.0.12.1+1\bin\java.exe"
  )
  if not defined JAVA_EXE for /f "delims=" %%I in ('where java 2^>nul') do if not defined JAVA_EXE set "JAVA_EXE=%%I"
)
if exist "D:\tools\apache-maven-3.9.16\bin\mvn.cmd" set "MVN_CMD=D:\tools\apache-maven-3.9.16\bin\mvn.cmd"
if not defined MVN_CMD for /f "delims=" %%I in ('where mvn 2^>nul') do if not defined MVN_CMD set "MVN_CMD=%%I"
for /f "delims=" %%I in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
for /f "delims=" %%I in ('where corepack.cmd 2^>nul') do if not defined COREPACK_CMD set "COREPACK_CMD=%%I"
if not defined COREPACK_CMD for /f "delims=" %%I in ('where corepack.exe 2^>nul') do if not defined COREPACK_CMD set "COREPACK_CMD=%%I"
for /f "delims=" %%I in ('where powershell 2^>nul') do if not defined PS_EXE set "PS_EXE=%%I"

echo CreditMiner demo launcher
echo Root: %ROOT%
if defined JAVA_EXE (echo OK Java: %JAVA_EXE%) else (echo MISSING Java: set JAVA_HOME to a JDK or put java on PATH& set "MISSING=1")
if defined MVN_CMD (echo OK Maven: %MVN_CMD%) else (echo MISSING Maven: install Maven or put mvn on PATH& set "MISSING=1")
if defined NODE_EXE (echo OK Node: %NODE_EXE%) else (echo MISSING Node: install Node 20 and put node on PATH& set "MISSING=1")
if defined COREPACK_CMD (echo OK Corepack: %COREPACK_CMD%) else (echo MISSING Corepack: enable Corepack and put it on PATH& set "MISSING=1")
if defined PS_EXE (echo OK PowerShell: %PS_EXE%) else (echo MISSING PowerShell: put powershell on PATH& set "MISSING=1")
if "%MISSING%"=="1" exit /b 1

if "%CHECK_ONLY%"=="1" goto check_only

if not exist "%ROOT%backend\target\creditminer-0.1.0-SNAPSHOT.jar" (
  echo Backend JAR missing. Building offline first...
  pushd "%ROOT%backend"
  call "%MVN_CMD%" -o -q -DskipTests package
  if errorlevel 1 (
    echo Offline Maven build failed. Retrying online...
    call "%MVN_CMD%" -q -DskipTests package
    if errorlevel 1 (popd& echo ERROR: Backend build failed.& exit /b 1)
  )
  popd
  if not exist "%ROOT%backend\target\creditminer-0.1.0-SNAPSHOT.jar" (echo ERROR: Backend JAR was not created.& exit /b 1)
)

"%PS_EXE%" -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:8091/api/overview' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>nul
if errorlevel 1 (
  echo Starting CreditMiner Backend :8091...
  start "CreditMiner Backend :8091" /D "%ROOT%backend" "%JAVA_EXE%" -Xmx1g -jar target\creditminer-0.1.0-SNAPSHOT.jar --spring.profiles.active=demo --server.port=8091 --creditminer.cors.allowed-origins=http://localhost:3001,http://127.0.0.1:3001
) else (
  echo Reusing backend at http://localhost:8091
)

if not exist "%ROOT%web\node_modules" (
  echo Installing web dependencies...
  pushd "%ROOT%web"
  call "%COREPACK_CMD%" pnpm install --frozen-lockfile
  if errorlevel 1 (popd& echo ERROR: Web dependency install failed.& exit /b 1)
  popd
)
if not exist "%ROOT%web\.next\BUILD_ID" (
  echo Building the web app...
  pushd "%ROOT%web"
  set "NEXT_PUBLIC_API_URL=http://localhost:8091/api"
  call "%COREPACK_CMD%" pnpm build
  if errorlevel 1 (popd& echo ERROR: Web build failed.& exit /b 1)
  popd
  if not exist "%ROOT%web\.next\BUILD_ID" (echo ERROR: Web BUILD_ID was not created.& exit /b 1)
)

"%PS_EXE%" -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3001' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>nul
if errorlevel 1 (
  echo Starting CreditMiner Web :3001...
  start "CreditMiner Web :3001" /D "%ROOT%web" cmd /k call "%COREPACK_CMD%" pnpm next start -p 3001
) else (
  echo Reusing web app at http://localhost:3001
)

echo Waiting for seeded backend clusters (up to 240 seconds)...
"%PS_EXE%" -NoProfile -Command "$deadline=(Get-Date).AddSeconds(240); do { try { $c=(Invoke-WebRequest -Uri 'http://localhost:8091/api/clusters' -UseBasicParsing -TimeoutSec 3).Content | ConvertFrom-Json; $f=@($c)[0]; if (@($c).Count -gt 0 -and [int]$f.baseline.size -gt 0) { Write-Host ''; exit 0 } } catch {}; Write-Host -NoNewline '.'; Start-Sleep -Seconds 5 } while ((Get-Date) -lt $deadline); Write-Host ''; exit 1"
if errorlevel 1 (echo ERROR: Backend clusters were not seeded within 240 seconds.& exit /b 1)

echo Waiting for web HTTP 200 (up to 60 seconds)...
"%PS_EXE%" -NoProfile -Command "$deadline=(Get-Date).AddSeconds(60); do { try { $r=Invoke-WebRequest -Uri 'http://localhost:3001' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { Write-Host ''; exit 0 } } catch {}; Write-Host -NoNewline '.'; Start-Sleep -Seconds 5 } while ((Get-Date) -lt $deadline); Write-Host ''; exit 1"
if errorlevel 1 (echo ERROR: Web app did not return HTTP 200 within 60 seconds.& exit /b 1)

echo Web: http://localhost:3001
echo API: http://localhost:8091/api
if "%NO_BROWSER%"=="0" (
  start "" "http://localhost:3001"
)
exit /b 0

:check_only
echo.
echo Commands that run when artifacts or servers are missing:
echo [backend directory] call "%MVN_CMD%" -o -q -DskipTests package
echo [backend directory, online fallback] call "%MVN_CMD%" -q -DskipTests package
echo start "CreditMiner Backend :8091" /D "%ROOT%backend" "%JAVA_EXE%" -Xmx1g -jar target\creditminer-0.1.0-SNAPSHOT.jar --spring.profiles.active=demo --server.port=8091 --creditminer.cors.allowed-origins=http://localhost:3001,http://127.0.0.1:3001
echo [web directory] call "%COREPACK_CMD%" pnpm install --frozen-lockfile
echo [web directory] set "NEXT_PUBLIC_API_URL=http://localhost:8091/api"
echo [web directory] call "%COREPACK_CMD%" pnpm build
echo start "CreditMiner Web :3001" /D "%ROOT%web" cmd /k call "%COREPACK_CMD%" pnpm next start -p 3001
echo Readiness: GET http://localhost:8091/api/clusters until first baseline.size is greater than 0 (240 seconds).
echo Readiness: GET http://localhost:3001 until HTTP 200 (60 seconds).
if "%NO_BROWSER%"=="0" echo Browser: http://localhost:3001
echo Check complete. No servers were started.
exit /b 0
