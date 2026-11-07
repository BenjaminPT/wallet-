@echo off
title Noir Wallet tunnel
where cloudflared >nul 2>nul
if errorlevel 1 goto nocf
echo  Make sure start.bat is running in another window.
echo  Your public HTTPS link (https://xxxx.trycloudflare.com) will appear below:
echo.
cloudflared tunnel --url http://localhost:8080
pause
exit /b
:nocf
echo  cloudflared not found. Install it: open Command Prompt and run
echo      winget install Cloudflare.cloudflared
echo  then close this window and run tunnel.bat again.
pause
