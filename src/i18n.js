const D = {
  ru: {
    skip: 'Пропустить', next: 'Далее', start: 'Начать', back: 'Назад', done: 'Готово', cancel: 'Отмена', copy: 'Скопировать', copied: 'Скопировано', paste: 'Вставить', confirm: 'Подтвердить', close: 'Закрыть', max: 'Макс', save: 'Сохранить', delete: 'Удалить', add: 'Добавить',
    ob1t: 'Все ваши сети в одном месте', ob1d: 'Ethereum, Bitcoin, Solana, TON, Tron и L2. Один seed — один интерфейс.',
    ob2t: 'Ваши ключи — ваши деньги', ob2d: 'Мы не храним ничего на сервере. Ключи шифруются паролем и живут только на этом устройстве.',
    ob3t: 'Seed-фраза — это и есть кошелёк', ob3d: 'Потеряете её — потеряете доступ. Покажете кому-то — потеряете деньги. Запишите на бумаге.',
    ob4t: 'Сначала — демо', ob4d: 'Попробуйте всё на тестовых данных. Реальный режим включается в любой момент в настройках.',
    tryDemo: 'Попробовать демо', createWallet: 'Создать кошелёк', importWallet: 'Импортировать',
    setPass: 'Придумайте пароль', passHint: 'Минимум 8 символов. Он шифрует seed на этом устройстве и не восстанавливается.', pass: 'Пароль', pass2: 'Повторите пароль', passShort: 'Минимум 8 символов', passMismatch: 'Пароли не совпадают',
    seedTitle: 'Ваша seed-фраза', seedWarn: 'Запишите слова по порядку и храните офлайн. Никому не показывайте.', reveal: 'Нажмите, чтобы показать', seedSaved: 'Я записал(а)',
    verifyTitle: 'Проверка', verifyDesc: 'Введите слова под номерами', word: 'Слово', wrong: 'Неверно, проверьте записи',
    importTitle: 'Импорт кошелька', importDesc: 'Введите 12 или 24 слова через пробел', badSeed: 'Фраза недействительна',
    unlock: 'Разблокировать', unlockTitle: 'С возвращением', wrongPass: 'Неверный пароль',
    total: 'Общий баланс', demoBadge: 'Демо', send: 'Отправить', receive: 'Получить', swap: 'Обмен', stake: 'Стейкинг', assets: 'Активы', activity: 'Операции', noActivity: 'Пока нет операций', day: 'День', week: 'Неделя', month: 'Месяц', year: 'Год',
    home: 'Главная', market: 'Рынок', nft: 'NFT', settings: 'Настройки',
    chooseAsset: 'Выберите актив', to: 'Кому', address: 'Адрес', amount: 'Сумма', network: 'Сеть', fee: 'Комиссия', youSend: 'Вы отправляете', available: 'Доступно', review: 'Проверка', pasteQr: 'Вставить / QR', scan: 'Сканировать QR', badAddr: 'Некорректный адрес для этой сети', insufficient: 'Недостаточно средств', poison: 'Проверьте адрес целиком, а не только начало и конец. Транзакции необратимы.', sendNow: 'Отправить', sent: 'Отправлено', sending: 'Отправка…', demoSent: 'Демо: средства не двигались', failed: 'Ошибка отправки', viewTx: 'Открыть в обозревателе', newAddr: 'Новый адрес — проверьте внимательно',
    recvTitle: 'Получить', recvHint: 'Отправляйте только активы этой сети на этот адрес',
    from: 'Отдаёте', toGet: 'Получаете', getQuote: 'Получить котировку', quoting: 'Ищем лучший курс…', rate: 'Минимум', via: 'Через', doSwap: 'Обменять', swapSame: 'Выберите разные активы', swapSupport: 'Обмен: EVM-сети (в т.ч. кросс-чейн) и Solana', swapDemo: 'Демо: обмен смоделирован',
    stakeTitle: 'Стейкинг ETH через Lido', stakeDesc: 'Вы получите stETH, который растёт в цене. Вывод занимает от 1 до нескольких дней.', apr: 'Годовых', doStake: 'Застейкать',
    nftTitle: 'NFT', nftNeedKey: 'Для просмотра NFT нужен бесплатный ключ Alchemy. Добавьте в настройках.', nftEmpty: 'NFT не найдены', demoNft: 'Демо-коллекция',
    marketTitle: 'Рынок', search: 'Поиск',
    language: 'Язык', currency: 'Валюта', mode: 'Режим', modeDemo: 'Демо', modeReal: 'Реальный', testnets: 'Тестовые сети', autolock: 'Автоблокировка', min: 'мин', showSeed: 'Показать seed-фразу', changePass: 'Сменить пароль', addrBook: 'Адресная книга', customTokens: 'Свои токены', alchemyKey: 'Ключ Alchemy (NFT)', resetWallet: 'Удалить кошелёк с устройства', resetWarn: 'Без seed-фразы доступ будет потерян. Продолжить?', lock: 'Заблокировать', about: 'О кошельке', aboutText: 'Некастодиальный кошелёк с открытым кодом. Не проходил независимый аудит: начните с малых сумм.',
    needRealWallet: 'Чтобы работать с реальными средствами, создайте или импортируйте кошелёк', label: 'Название', noContacts: 'Контактов нет',
    coach1: 'Это ваш баланс. Тап по активу откроет детали и график.', coach2: 'Быстрые действия: отправить, получить, обменять, застейкать.', coach3: 'Вкладки внизу: рынок, NFT и настройки. Режим демо/реальный переключается в настройках.', gotIt: 'Понятно',
    slippage: 'Проскальзывание', feeEst: 'Комиссии ≈', time: 'Время', priceImpact: 'Курс хуже рыночного на {v}%. Проверьте сумму и пару.', swapNoRoute: 'Для этой пары обмен недоступен. Работает: EVM↔EVM, EVM↔Tron, Solana↔Solana.', needGas: 'Нужен {sym} на балансе для комиссии сети', poolTip: '', search2: 'Поиск актива',
    offline: 'Нет сети — показаны последние данные', refresh: 'Обновить', contractAddr: 'Адрес контракта', symbol: 'Символ', decimals: 'Знаков', addToken: 'Добавить токен',
  },
  en: {
    skip: 'Skip', next: 'Next', start: 'Start', back: 'Back', done: 'Done', cancel: 'Cancel', copy: 'Copy', copied: 'Copied', paste: 'Paste', confirm: 'Confirm', close: 'Close', max: 'Max', save: 'Save', delete: 'Delete', add: 'Add',
    ob1t: 'All your networks in one place', ob1d: 'Ethereum, Bitcoin, Solana, TON, Tron and L2s. One seed, one interface.',
    ob2t: 'Your keys, your money', ob2d: 'Nothing is stored on a server. Keys are encrypted with your password and stay on this device.',
    ob3t: 'The seed phrase is the wallet', ob3d: 'Lose it and you lose access. Show it and you lose funds. Write it down on paper.',
    ob4t: 'Demo first', ob4d: 'Try everything with test data. Switch to real mode any time in settings.',
    tryDemo: 'Try demo', createWallet: 'Create wallet', importWallet: 'Import',
    setPass: 'Set a password', passHint: 'At least 8 characters. It encrypts the seed on this device and cannot be recovered.', pass: 'Password', pass2: 'Repeat password', passShort: 'At least 8 characters', passMismatch: 'Passwords do not match',
    seedTitle: 'Your seed phrase', seedWarn: 'Write the words down in order and keep them offline. Never share them.', reveal: 'Tap to reveal', seedSaved: 'I wrote it down',
    verifyTitle: 'Verify', verifyDesc: 'Enter the words number', word: 'Word', wrong: 'Incorrect, check your notes',
    importTitle: 'Import wallet', importDesc: 'Enter 12 or 24 words separated by spaces', badSeed: 'Invalid phrase',
    unlock: 'Unlock', unlockTitle: 'Welcome back', wrongPass: 'Wrong password',
    total: 'Total balance', demoBadge: 'Demo', send: 'Send', receive: 'Receive', swap: 'Swap', stake: 'Stake', assets: 'Assets', activity: 'Activity', noActivity: 'No activity yet', day: 'Day', week: 'Week', month: 'Month', year: 'Year',
    home: 'Home', market: 'Market', nft: 'NFT', settings: 'Settings',
    chooseAsset: 'Choose asset', to: 'To', address: 'Address', amount: 'Amount', network: 'Network', fee: 'Fee', youSend: 'You send', available: 'Available', review: 'Review', pasteQr: 'Paste / QR', scan: 'Scan QR', badAddr: 'Invalid address for this network', insufficient: 'Insufficient funds', poison: 'Check the whole address, not just the start and end. Transactions are irreversible.', sendNow: 'Send', sent: 'Sent', sending: 'Sending…', demoSent: 'Demo: no funds moved', failed: 'Send failed', viewTx: 'Open in explorer', newAddr: 'New address, double-check it',
    recvTitle: 'Receive', recvHint: 'Only send assets of this network to this address',
    from: 'You pay', toGet: 'You get', getQuote: 'Get quote', quoting: 'Finding best rate…', rate: 'Minimum', via: 'Via', doSwap: 'Swap', swapSame: 'Pick different assets', swapSupport: 'Swaps: EVM networks (incl. cross-chain) and Solana', swapDemo: 'Demo: swap simulated',
    stakeTitle: 'Stake ETH with Lido', stakeDesc: 'You receive stETH which grows in value. Withdrawals take from one to several days.', apr: 'APR', doStake: 'Stake',
    nftTitle: 'NFT', nftNeedKey: 'A free Alchemy key is needed to show NFTs. Add it in settings.', nftEmpty: 'No NFTs found', demoNft: 'Demo collection',
    marketTitle: 'Market', search: 'Search',
    language: 'Language', currency: 'Currency', mode: 'Mode', modeDemo: 'Demo', modeReal: 'Real', testnets: 'Testnets', autolock: 'Auto-lock', min: 'min', showSeed: 'Show seed phrase', changePass: 'Change password', addrBook: 'Address book', customTokens: 'Custom tokens', alchemyKey: 'Alchemy key (NFT)', resetWallet: 'Remove wallet from device', resetWarn: 'Without the seed phrase access is lost. Continue?', lock: 'Lock', about: 'About', aboutText: 'Open-source non-custodial wallet. Not independently audited: start with small amounts.',
    needRealWallet: 'Create or import a wallet to use real funds', label: 'Label', noContacts: 'No contacts',
    coach1: 'This is your balance. Tap an asset for details and a chart.', coach2: 'Quick actions: send, receive, swap, stake.', coach3: 'Tabs below: market, NFT and settings. Switch demo/real mode in settings.', gotIt: 'Got it',
    slippage: 'Slippage', feeEst: 'Fees ≈', time: 'Time', priceImpact: 'Rate is {v}% worse than market. Check amount and pair.', swapNoRoute: 'Swap unavailable for this pair. Supported: EVM↔EVM, EVM↔Tron, Solana↔Solana.', needGas: 'You need {sym} for network fees', poolTip: '', search2: 'Search asset',
    offline: 'Offline — showing last data', refresh: 'Refresh', contractAddr: 'Contract address', symbol: 'Symbol', decimals: 'Decimals', addToken: 'Add token',
  },
};
let lang = 'ru';
export const setLang = (l) => { lang = D[l] ? l : 'en'; };
export const getLang = () => lang;
export const t = (k, v) => {
  let s = D[lang][k] ?? D.en[k] ?? k;
  if (v) for (const x in v) s = s.replace(`{${x}}`, v[x]);
  return s;
};
export const detectLang = () => (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
