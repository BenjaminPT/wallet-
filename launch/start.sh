#!/bin/bash
# Linux / сервер / Raspberry Pi. LAN=1 — слушать всю сеть.
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Нужен Node.js 18+"; exit 1; }
exec node server.mjs --port "${PORT:-8080}" "$@"
