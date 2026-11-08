# Заявка на партнёрство с Ramp Network (готовый текст)

Форма: https://share.hsforms.com/1TKWT1ksNQZ6AURRV0ssvqg5awa0
Почта партнёров: partner@ramp.network
Документация по ключам: https://docs.rampnetwork.com/api-keys

Форму и договор должен заполнить и подписать владелец проекта: Ramp спросит данные юрлица или ИП, страну и согласие с условиями. Ниже готовый текст на английском (так принимают).

## Короткое письмо (partner@ramp.network)
Subject: Partnership request: Noir Wallet (non-custodial multi-chain wallet, PWA)

Hello Ramp team,

We are building Noir Wallet, a free, open-source, non-custodial multi-chain wallet (PWA, also usable as a Telegram Mini App). Supported networks: Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, Base, Bitcoin, Solana, TON and Tron. Keys never leave the user's device and we do not process fiat or hold customer funds.

We would like to integrate the Ramp hosted widget (https://app.rampnetwork.com) as the card on-ramp, pre-filling the user's own address and asset (primarily USDT on TRON, Ethereum, BSC, Solana, TON; also USDC, ETH, BTC, SOL, TON, TRX). We open the widget in a new browser tab, so a hosted-widget (hostApiKey) integration fits us.

Could you please:
1. issue a hostApiKey (staging first, then production);
2. confirm the exact asset codes for the networks above (we plan e.g. TRON_USDT, ETH_USDT, BSC_USDT, SOLANA_USDT, TON_USDT);
3. share the partner revenue-share terms and any country restrictions you apply to our users.

Project: https://github.com/BenjaminPT/wallet-   Live app: https://benjaminpt.github.io/wallet-/
Contact: vstepnov2009@gmail.com

Best regards,
[имя / название компании]

## Данные, которые вас попросят (подготовьте)
- Юрлицо или ИП, страна регистрации, адрес, сайт (ссылка на приложение выше), контактное лицо.
- Ожидаемый объём (честная оценка на старте: десятки пользователей, объём небольшой).
- Целевые страны пользователей.
- Описание продукта и того, что кошелёк некастодиальный: ключи у пользователя.
- Политика конфиденциальности и условия: в приложении есть «Условия и отказ от ответственности» (пункт 11 про комиссии и покупку картой).

## После получения ключа
1. Впишите `hostApiKey` в `src/core/partners.js` (ключ публичный).
2. Сверьте коды активов (`TRON_USDT` и т.д.) со списком `GET /host-api/assets` и поправьте `RAMP_CHAIN` при расхождении.
3. Купите на минимальную сумму в staging и затем в production.
