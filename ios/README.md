# Noir Wallet на iPhone через xtool (без Xcode-проекта)

Оболочка открывает https://benjaminpt.github.io/wallet-/ в окне WKWebView. Данные хранятся внутри приложения, Safari их не стирает. Обновления сайта приходят сами.

**Не проверено:** Swift-код написан без запуска на устройстве. Если `xtool dev` выдаст ошибку, пришлите её текст.
Инструкция по установке сверена с официальной документацией xtool (репозиторий xtool-org/xtool, папка Documentation).

## Что нужно заранее
- iPhone и USB-кабель.
- Apple ID. Бесплатный подходит: приложение живёт 7 дней, потом снова `xtool dev` (данные остаются, если не менять bundleID). Для входа без платного аккаунта xtool использует закрытые API Apple, поэтому разумно завести отдельный Apple ID.
- На iPhone включите режим разработчика: Настройки → Конфиденциальность и безопасность → Режим разработчика (после включения iPhone перезагрузится).

## Windows (через WSL)
1. Включите WSL (PowerShell от администратора: `wsl --install`, перезагрузка, создайте пользователя Ubuntu).
2. Пробросьте USB в WSL по инструкции Microsoft: https://learn.microsoft.com/en-us/windows/wsl/connect-usb (usbipd). Если в xtool будет ошибка `AFCClient.Error.muxError`, см. https://github.com/xtool-org/xtool/issues/19#issuecomment-2898986718.
3. В Ubuntu установите Swift с https://swift.org/install/linux, проверьте `swift --version`.
4. `sudo apt-get install usbmuxd libimobiledevice-utils`
5. Скачайте Xcode.xip на Windows-стороне в браузере со страницы https://developer.apple.com/download/all/?q=Xcode (нужен вход по Apple ID). Версию укажет документация xtool, сейчас 27.1. Файл ~3 ГБ+, положите его туда, где его видит WSL (например `/mnt/c/Users/ИМЯ/Downloads/`).
6. Скачайте и поставьте xtool:
   ```
   curl -fL "https://github.com/xtool-org/xtool/releases/latest/download/xtool-$(uname -m).AppImage" -o xtool
   chmod +x xtool && sudo mv xtool /usr/local/bin/
   xtool --help
   ```
7. `xtool setup`: выберите вход `1` (пароль, любой Apple ID), введите Apple ID, пароль и код 2FA. Затем укажите путь к Xcode.xip. Проверка: `swift sdk list` покажет `darwin`.

## Linux
То же, что для WSL, но без шага 1–2.

## macOS
Поставьте Xcode, откройте его один раз, затем `brew install xtool-org/tap/xtool` и `xtool setup`.

## Сборка и установка Noir
1. `xtool new Noir` и `cd Noir`.
2. Замените содержимое `Sources/Noir/*.swift` одним файлом `ios/Sources/NoirApp.swift` из этого репозитория (в шаблоне уже есть файл с `@main`, удалите его, иначе будет конфликт).
3. В `xtool.yml` поставьте уникальный `bundleID`, например `com.ваше-имя.noirwallet`.
4. Подключите разблокированный iPhone, нажмите «Доверять», выполните `xtool dev`. Первая сборка занимает несколько минут. Если после «Доверять» будет ошибка, запустите `xtool dev` ещё раз.
5. Настройки → Основные → VPN и управление устройством → ваш Apple ID → Доверять. Теперь значок Noir можно открывать.

## Ограничения
- Вход по Face ID через WebAuthn внутри такой оболочки, скорее всего, не заработает (нужна привязка к домену). Для этого есть значок, установленный через Safari («На экран Домой»).
- Данные значка из Safari и этой оболочки раздельны. Перенос: «Сохранить резервную копию» в Настройках, затем «Войти → Восстановить из резервной копии».
- xtool умеет собирать расширения приложения (виджеты WidgetKit), см. Documentation/xtool.docc/Appex.md в репозитории xtool. Виджеты с курсом и балансом можно добавить следующим шагом, но Dynamic Island (Live Activities) требует отдельной проверки и лучше всего работает с платным аккаунтом.
