@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js не найден. Открываю автономную версию в браузере...
  start "" "%~dp0app\single.html"
  echo Для режима сервера и доступа с телефона установите Node.js: https://nodejs.org
  pause
  exit /b
)
start "" http://localhost:8080
node server.mjs --port 8080
pause
