@echo off
setlocal
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

title BillAndSlip

:: ── Pre-flight checks ──────────────────────────────────────────────────────
if not exist "%ROOT%\server\target\release\server.exe" (
    echo.
    echo  ERROR: Backend not built.
    echo  Please run install.bat first.
    echo.
    pause
    exit /b 1
)

if not exist "%ROOT%\web\node_modules" (
    echo.
    echo  ERROR: Frontend dependencies missing.
    echo  Please run install.bat first.
    echo.
    pause
    exit /b 1
)

:: ── Start backend ──────────────────────────────────────────────────────────
echo.
echo  Starting BillAndSlip...
echo.
echo  [1/2] Starting backend server  (port 8080)...
start "BillAndSlip - Server" cmd /k "cd /d "%ROOT%\server" && .\target\release\server.exe"

:: ── Start frontend ─────────────────────────────────────────────────────────
echo  [2/2] Starting frontend server (port 5173)...
start "BillAndSlip - Frontend" cmd /k "cd /d "%ROOT%\web" && npm run dev"

:: ── Wait then open browser ─────────────────────────────────────────────────
echo.
echo  Waiting for servers to start...
timeout /t 5 /nobreak >nul

echo  Opening browser...
start "" "http://localhost:5173"

echo.
echo  ============================================
echo   BillAndSlip is running!
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8080
echo  ============================================
echo.
echo  To stop: close the Server and Frontend windows.
echo.
exit /b 0
