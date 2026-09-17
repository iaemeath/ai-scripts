@echo off
setlocal
title ai-scripts launcher
set "ROOT=%~dp0"
set "UI=http://localhost:5175"
set "API=http://localhost:8792"

rem ---- already running? just open the UI ----
curl -s -m 2 "%API%/api/health" >nul 2>&1
if %errorlevel%==0 (
    echo [ai-scripts] already running, open UI: %UI%
    start "" "%UI%"
    exit /b 0
)

rem ---- deps fallback: npm install when node_modules missing ----
if not exist "%ROOT%node_modules\" (
    echo [ai-scripts] node_modules missing, running npm install ...
    pushd "%ROOT%"
    call npm install
    popd
)

echo [ai-scripts] starting minimized console window "ai-scripts-dev" ...
start "ai-scripts-dev" /min cmd /c "cd /d %ROOT% && npm run dev"

rem ---- wait until API ready, up to ~20s ----
set /a tries=0
:waitloop
ping -n 2 127.0.0.1 >nul
curl -s -m 2 "%API%/api/health" >nul 2>&1
if %errorlevel%==0 goto ready
set /a tries+=1
if %tries% lss 20 goto waitloop
echo [ai-scripts] start timeout - check the minimized window "ai-scripts-dev" for errors.
exit /b 1

:ready
echo [ai-scripts] started: UI %UI% , API %API%
start "" "%UI%"
exit /b 0
