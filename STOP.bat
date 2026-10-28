@echo off
REM ============================================================
REM  Stop all running backend/frontend Node processes for this app.
REM  (Closes the two server windows opened by START.bat.)
REM ============================================================
echo Stopping TMA server windows...
taskkill /FI "WINDOWTITLE eq TMA Backend*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq TMA Frontend*" /T /F >nul 2>nul
echo Done.
timeout /t 2 >nul
