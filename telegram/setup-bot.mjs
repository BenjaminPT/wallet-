// Подключение к Telegram как Mini App (без сервера бота: кнопка меню открывает ваш сайт).
// Использование:  BOT_TOKEN=123:ABC node setup-bot.mjs https://ваш-сайт
// Токен выдаёт @BotFather (/newbot). Токен никуда не сохраняется.
const token = process.env.BOT_TOKEN, url = process.argv[2];
if (!token || !url?.startsWith('https://')) { console.error('Нужны BOT_TOKEN и https-ссылка на сайт'); process.exit(1); }
const call = async (m, body) => (await fetch(`https://api.telegram.org/bot${token}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
console.log(await call('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Кошелёк', web_app: { url } } }));
console.log(await call('setMyDescription', { description: 'Noir Wallet: некастодиальный мульти-чейн кошелёк' }));
console.log('Готово: откройте бота и нажмите кнопку «Кошелёк» слева от поля ввода.');
