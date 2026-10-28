@echo off
REM ============================================================
REM  Telegram Mini App - One-click launcher (Windows)
REM  Double-click this file to start BOTH servers.
REM  - First run: installs dependencies + seeds the database.
REM  - Opens the backend and frontend in two separate windows.
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo ============================================================
echo   Telegram Mini App - Starting...
echo ============================================================
echo.

REM ---- Check Node is installed ----
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not on PATH.
  echo Install Node.js 20/22/24 from https://nodejs.org then re-run.
  echo.
  pause
  exit /b 1
)

REM ---- BACKEND: ensure .env ----
if not exist "backend\.env" (
  echo [setup] Creating backend\.env from example...
  copy /y "backend\.env.example" "backend\.env" >nul
)

REM ---- FRONTEND: ensure .env ----
if not exist "frontend\.env" (
  echo [setup] Creating frontend\.env from example...
  copy /y "frontend\.env.example" "frontend\.env" >nul
)

REM ---- BACKEND: install deps on first run ----
if not exist "backend\node_modules" (
  echo [setup] Installing backend dependencies ^(first run, please wait^)...
  pushd backend
  call npm install
  popd
)

REM ---- BACKEND: seed database on first run ----
if not exist "backend\data\app.sqlite" (
  echo [setup] Seeding database ^(creating admin + demo content^)...
  pushd backend
  call npm run seed
  popd
)

REM ---- FRONTEND: install deps on first run ----
if not exist "frontend\node_modules" (
  echo [setup] Installing frontend dependencies ^(first run, please wait^)...
  pushd frontend
  call npm install
  popd
)

echo.
echo [start] Launching backend window  -> http://localhost:8080
start "TMA Backend"  cmd /k "cd /d "%~dp0backend" && npm run dev"

echo [start] Launching frontend window -> http://localhost:5173
start "TMA Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ============================================================
echo   Both servers are starting in their own windows.
echo.
echo   Admin panel : http://localhost:5173/admin/login
echo   Backend API : http://localhost:8080/health
echo.
echo   NOTE: the Vite frontend can take ~15s on the FIRST launch.
echo   NOTE: the user UI needs Telegram; the admin panel works in
echo         a normal browser.
echo ============================================================
echo.
echo This window can be closed. Press any key to close it.
pause >nul
endlocal
