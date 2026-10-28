@echo off
REM ============================================================
REM  Start an ngrok HTTPS tunnel for the frontend (port 5173).
REM  Requires ngrok to be installed first (see docs\NGROK_LOCAL_HTTPS.md).
REM  This sets your authtoken, then opens the tunnel.
REM ============================================================
setlocal

where ngrok >nul 2>nul
if errorlevel 1 (
  echo [ERROR] ngrok is not installed or not on PATH.
  echo Install it first: https://ngrok.com/download
  echo Then run this file again.
  echo.
  pause
  exit /b 1
)

echo [setup] Configuring ngrok authtoken...
ngrok config add-authtoken 3LKiH2BqBt67CUdMkK5u6EpWqoO_4HdQ288fgvXxKJZGrU6qd

echo.
echo ============================================================
echo  Opening HTTPS tunnel to http://localhost:5173
echo.
echo  1. Make sure the frontend is running (START.bat).
echo  2. Copy the "https://....ngrok-free.app" URL shown below.
echo  3. Put it in backend\.env as MINI_APP_URL and add it to
echo     CORS_ORIGINS, then restart the backend.
echo  4. Send /start to your bot and tap "Open App".
echo.
echo  Keep THIS window open (closing it drops the tunnel).
echo ============================================================
echo.
ngrok http 5173

endlocal
