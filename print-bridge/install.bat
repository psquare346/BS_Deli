@echo off
echo.
echo ================================
echo   B's Deli Print Bridge Setup
echo ================================
echo.

:: Check Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please download and install from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [1/2] Installing dependencies...
cd /d "%~dp0"
call npm install

if errorlevel 1 (
    echo.
    echo ERROR: Could not install dependencies.
    echo Make sure you have an internet connection.
    pause
    exit /b 1
)

echo.
echo [2/2] Listing available printers...
node print-bridge.js --list

echo.
echo ================================
echo   Setup Complete!
echo ================================
echo.
echo To test printing, run:
echo   node print-bridge.js --test
echo.
echo To start the print bridge, run:
echo   node print-bridge.js
echo.
echo Or double-click START-PRINT-BRIDGE.bat
echo.
pause
