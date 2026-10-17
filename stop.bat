@echo off
setlocal EnableExtensions
where powershell >nul 2>nul
if errorlevel 1 (echo MISSING PowerShell: cannot inspect listening ports.& exit /b 1)

powershell -NoProfile -Command "$pids=@(Get-NetTCPConnection -LocalPort 8091,3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); if ($pids.Count -eq 0) { Write-Host 'nothing listening on ports 8091 and 3001'; exit 0 }; foreach ($listenerPid in $pids) { Write-Host ('Stopping listener PID ' + $listenerPid); try { Stop-Process -Id $listenerPid -ErrorAction Stop } catch { Write-Error ('Could not stop PID ' + $listenerPid + ': ' + $_.Exception.Message); exit 1 } }"
if errorlevel 1 (echo ERROR: One or more listeners could not be stopped.& exit /b 1)
exit /b 0
