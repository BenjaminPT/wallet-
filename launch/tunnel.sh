#!/bin/bash
# Публичная HTTPS-ссылка для телефона через Cloudflare (macOS: brew install cloudflared).
command -v cloudflared >/dev/null 2>&1 || { echo "Установите cloudflared: brew install cloudflared  (Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)"; exit 1; }
echo "Сначала запустите start.sh/start.command. Ссылка https://xxxx.trycloudflare.com появится ниже:"
cloudflared tunnel --url http://localhost:8080
