@echo off
chcp 65001 >nul
rem Публичная HTTPS-ссылка для телефона через Cloudflare (бесплатно, без аккаунта).
rem Нужен cloudflared: winget install Cloudflare.cloudflared
where cloudflared >nul 2>nul || (echo Установите: winget install Cloudflare.cloudflared & pause & exit /b)
echo Сначала запустите start.bat, потом это окно. Ссылка вида https://xxxx.trycloudflare.com появится ниже:
cloudflared tunnel --url http://localhost:8080
pause
