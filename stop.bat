@echo off
setlocal enabledelayedexpansion
title ai-scripts stop
set "FOUND=0"

rem ---- kill by port: 8792 api / 5175 vite. Does NOT touch started card apps ----
for %%P in (8792 5175) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%P" ^| findstr "LISTENING"') do (
        echo [ai-scripts] killing PID %%a on port %%P
        taskkill /F /T /PID %%a >nul 2>&1
        set "FOUND=1"
    )
)

if "!FOUND!"=="0" (
    echo [ai-scripts] nothing running - 8792/5175 not listening.
) else (
    echo [ai-scripts] stopped.
)
ping -n 3 127.0.0.1 >nul
exit /b 0
