# Безопасность Noir Wallet / Security

## Главный риск для пользователей: подмена обновления
Кошелёк обновляется автоматически (PWA). Если злоумышленник получит доступ к репозиторию или аккаунту GitHub, он сможет опубликовать версию, которая крадёт seed-фразы. Защита строится на настройках GitHub, которые **включает владелец вручную** (из кода это сделать нельзя):

1. **Двухфакторная аутентификация** на аккаунте владельца: GitHub → Settings → Password and authentication → Two-factor authentication. Лучше ключи доступа (passkey / аппаратный ключ), а не SMS.
2. **Защита ветки main**: репозиторий → Settings → Branches → Add branch ruleset → цель `main` → включить: *Require a pull request before merging*, *Require status checks to pass* (выберите `build`), *Block force pushes*, *Restrict deletions*. После этого автоматический коммит lock-файла в Actions перестанет работать: файл `package-lock.json` уже будет в репозитории.
3. **Подписанные коммиты**: Settings → Branches → ruleset → *Require signed commits* (SSH-подпись или GPG).
4. **Среда деплоя**: Settings → Environments → `github-pages` → *Required reviewers* (вы сами): каждая публикация сайта будет требовать вашего подтверждения.
5. **Права токенов**: Settings → Actions → General → Workflow permissions → *Read repository contents*. Workflow сам запрашивает только нужные права.
6. **Закрепление действий по SHA** (рекомендуется): замените `actions/checkout@v4` и остальные на полные SHA коммитов (Dependabot делает это автоматически).
7. **Dependabot**: Settings → Code security → включите *Dependabot alerts* и *security updates*.

## Что уже сделано в коде
- Lock-файл и `npm ci --ignore-scripts`: сборка берёт ровно проверенные версии, скрипты установки зависимостей не выполняются.
- `npm audit signatures` и `npm audit` в каждой сборке.
- Строгая CSP: нет внешних скриптов, `script-src 'self'`, сетевые запросы только к перечисленным API.
- SRI (контрольные суммы) для `app.js` и `style.css` в `index.html`, версия в URL против устаревшего кэша.
- Защита от встраивания в чужой сайт (clickjacking).
- `SHA256SUMS.txt` в релизе и `version.json` на сайте: сверяйте хэш `app.js` с опубликованным.
- Проверка подписи: транзакции Tron, LI.FI и Jupiter сверяются с намерением пользователя до подписи (получатель, сумма, контракт, программы, симуляция).
- Ограничения комиссий (BTC, EVM) от аномальных ответов API/RPC.
- Задержка после неудачных попыток ввода пароля; PBKDF2-SHA256 600 000 итераций + AES-GCM.

## Известные замечания `npm audit` (production)
- `@ton/ton` → `zod` (high, исправления нет): возможна исчерпывающая память обработка чрезмерно больших данных, пришедших от API toncenter. Риск: отказ в обслуживании на вкладке пользователя, не кража ключей.
- `@solana/web3.js` → `jayson` → `stream-json`, `uuid` (moderate): серверные утилиты JSON-RPC; в браузерной сборке кошелька не обрабатывают недоверенный ввод. Обновление до web3.js 3.x ломает совместимость; следим за релизами.
- Убрано: `@solana/spl-token` (уязвимый `bigint-buffer`), вместо него собственный минимальный код `src/core/spl.js`.

## Что НЕ покрыто
- Независимый аудит криптографии и логики: не проводился. Автор кода — ИИ-ассистент; перед запуском для других людей заказывайте внешний аудит.
- Компрометация устройства пользователя (вредоносные расширения, вирусы) и фишинговые копии сайта.
- Сторонние API (RPC, LI.FI, Jupiter, Binance, CoinGecko, Blockscout) видят IP и адреса; их ответы мы проверяем частично.

## Сообщить об уязвимости
Создайте приватный Security Advisory в репозитории (Security → Advisories → Report a vulnerability).
