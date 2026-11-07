@echo off
title Noir Wallet
cd /d "%~dp0"
echo.
echo  Noir Wallet - starting...
echo.
where node >nul 2>nul
if errorlevel 1 goto nonode
if not exist "app\index.html" goto noapp
node server.mjs --port 8080 --open
echo.
echo  Server stopped. If you see an error above, send it to the developer.
pause
exit /b

:nonode
echo  Node.js is not installed. Opening the standalone version (single file)...
echo  For server mode and phone access install Node.js LTS: https://nodejs.org
start "" "%~dp0app\single.html"
echo.
pause
exit /b

:noapp
echo  ERROR: folder "app" not found next to start.bat.
echo  Extract the whole ZIP first (right click - Extract All), do not run from inside the archive.
pause
exit /b
