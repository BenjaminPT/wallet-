#!/bin/bash
# macOS: двойной клик. Если система не даёт открыть: правый клик → Открыть.
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js не найден. Открываю автономную версию..."
  open "app/single.html"
  echo "Для режима сервера установите Node.js: https://nodejs.org"
  read -n 1 -s -r -p "Нажмите любую клавишу"
  exit 0
fi
(sleep 1; open "http://localhost:8080") &
node server.mjs --port 8080
