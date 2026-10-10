@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "BACKEND=%ROOT%\backend"
set "RAW=%BACKEND%\data\raw\default_credit_card_clients.csv"

where java >nul 2>nul || (
  echo MISSING: java is required. 1>&2
  exit /b 1
)
where mvn >nul 2>nul || (
  echo MISSING: mvn is required. 1>&2
  exit /b 1
)
if not exist "%RAW%" (
  echo MISSING: %RAW% 1>&2
  echo Place the UCI dataset CSV at that path before training. 1>&2
  exit /b 1
)

pushd "%BACKEND%" || exit /b 1
call :run com.creditminer.pipeline.Phase1Report || goto :failed
call :run com.creditminer.pipeline.Phase2Report || goto :failed
call :run com.creditminer.pipeline.Phase3Report || goto :failed
call :run com.creditminer.pipeline.Phase5Pipeline || goto :failed
call :run com.creditminer.pipeline.Phase6Pipeline || goto :failed
call :run com.creditminer.pipeline.Phase7Pipeline || goto :failed
call :run com.creditminer.pipeline.InsightFactsReport || goto :failed
call :run com.creditminer.pipeline.Phase10Pipeline || goto :failed
popd

echo Artifact regeneration complete.
exit /b 0

:run
echo ==^> Running %~1
call mvn -o -q compile exec:java "-Dexec.mainClass=%~1"
exit /b %ERRORLEVEL%

:failed
set "RESULT=%ERRORLEVEL%"
popd
echo Artifact regeneration failed with exit code %RESULT%. 1>&2
exit /b %RESULT%
