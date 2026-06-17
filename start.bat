@echo off
echo ============================================
echo   Blood Donation Management System (BDMS)
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Check if server is already running
curl -s http://localhost:3001/api/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Backend is already running on port 3001
) else (
    echo Starting backend server...
    start "BDMS Server" cmd /k "cd server && npm run dev"
)

REM Check if client is already running
curl -s http://localhost:5173 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Frontend is already running on port 5173
) else (
    echo Starting frontend client...
    start "BDMS Client" cmd /k "cd client && npm run dev"
)

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo Access the application at: http://localhost:5173
echo Backend API: http://localhost:3001/api
echo.
echo Press any key to exit...
pause >nul