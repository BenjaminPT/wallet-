// Дымовой UI-тест + скриншоты: онбординг, создание аккаунта, несколько аккаунтов, перевод между ними, настройки.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('shots', { recursive: true });
const srv = spawn('node', ['server/server.mjs', '--dir', 'dist', '--port', '8099'], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 800));
const errors = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ru-RU' });
const p = await ctx.newPage();
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR|telegram|CORS|Access to fetch/i.test(m.text()) && errors.push(m.text()));
const shot = (n) => p.screenshot({ path: `shots/${n}.png` });
const step = async (name, fn) => { try { await fn(); } catch (e) { errors.push(`${name}: ${e.message.split('\n').slice(0, 4).join(' / ')}`); await shot('fail-' + name).catch(() => {}); errors.push('  body: ' + (await p.textContent('body').catch(() => '')).slice(0, 300)); } };

await p.goto('http://localhost:8099/');
await p.waitForSelector('.onb h1');
const create = async (pass) => {
  const pw = p.locator('input[type=password]'); await pw.nth(0).fill(pass); await pw.nth(1).fill(pass);
  await p.click('.chk i >> nth=0'); await p.click('.chk i >> nth=1');
  await p.click('.btn.primary'); await p.waitForSelector('.seed'); await p.click('.seed');
  const words = await p.$$eval('.w', (els) => els.map((e) => e.textContent.replace(/^\d+/, '')));
  await p.click('.btn.primary'); await p.waitForSelector('.field');
  const nums = (await p.textContent('.body p')).match(/\d+/g).map(Number);
  const inputs = p.locator('input.field');
  for (let i = 0; i < 3; i++) await inputs.nth(i).fill(words[nums[i] - 1]);
  await p.click('.btn.primary'); await p.waitForSelector('.home .big', { timeout: 15000 });
};
const tab = (i) => p.locator('.tabbar button').nth(i).click();
await step('onb', async () => {
  await shot('01-onboarding');
  if (!(await p.locator('.signin').count())) throw new Error('нет кнопки «Войти»');
  if (await p.locator('text=демо').count()) throw new Error('демо-режим должен быть удалён');
  for (let i = 0; i < 3; i++) await p.click('.onb-bot .btn');
  await p.waitForTimeout(500); await shot('02-onboarding-last');
  await p.click('.onb-bot .btn >> nth=0'); await p.waitForSelector('.field');
});
await step('create', async () => { await create('testpass123'); await p.waitForTimeout(1200); await shot('03-home'); });
await step('coach', async () => { for (let i = 0; i < 3; i++) await p.click('.coach'); await p.waitForTimeout(400); await shot('04-home-after-coach'); });
await step('mainname', async () => {
  await p.click('.acc-btn'); await p.waitForSelector('.sheet'); await shot('05-accounts-sheet');
  if (!(await p.textContent('.sheet')).includes('Основной аккаунт')) throw new Error('первый аккаунт должен называться «Основной аккаунт»');
  await p.click('.sheet .alist .icon-btn >> nth=0'); await p.waitForSelector('.swatches');
  await p.fill('.sheet input.field', 'Личный'); await p.click('.sw >> nth=5'); await shot('06-edit-account');
  await p.click('.sheet .btn.primary'); await p.waitForTimeout(300);
  if (!(await p.textContent('.sheet')).includes('Личный')) throw new Error('переименование не сохранилось');
  await p.click('.sheet-h .icon-btn');
});
await step('asset', async () => { await p.click('.list .row >> nth=0'); await p.waitForSelector('.screen .big'); await p.waitForTimeout(1200); await shot('07-asset'); await p.click('.icon-btn.glass'); });
await step('receive', async () => { await p.click('.act >> nth=1'); await p.waitForSelector('.sheet'); await p.click('.sheet .row >> nth=0'); await p.waitForSelector('.qr'); await shot('08-receive'); await p.click('.icon-btn.glass'); });
await step('tabs', async () => {
  await tab(1); await p.waitForTimeout(700); await shot('09-market');
  await tab(2); await p.waitForTimeout(700); await shot('10-nft');
  if (!(await p.textContent('.tab')).includes('бета')) throw new Error('у NFT нет пометки теста');
  await tab(3); await p.waitForTimeout(700); await shot('11-settings');
  await p.click('button:text-is("Светлая")');
  const href = await p.getAttribute('link[rel=icon]', 'href');
  if (!/icon-light\.svg/.test(href)) throw new Error('иконка не переключилась: ' + href);
  await p.click('button:text-is("Тёмная")'); await tab(0);
});
await step('unlock', async () => {
  await p.reload(); await p.waitForSelector('input[type=password]'); await shot('12-unlock');
  await p.fill('input[type=password]', 'testpass123'); await p.click('.btn.primary'); await p.waitForSelector('.home .big', { timeout: 15000 });
});
await step('second', async () => {
  await p.click('.acc-btn'); await p.waitForSelector('.sheet'); await p.click('text=Создать новый аккаунт'); await p.waitForSelector('.field');
  await create('second-pass-123');
  await p.click('.acc-btn'); await p.waitForSelector('.sheet'); await shot('13-two-accounts');
  if ((await p.locator('.sheet .row.acc').count()) !== 2) throw new Error('ожидалось 2 аккаунта');
  // переход на открытый аккаунт без пароля
  await p.locator('.sheet .acc-main').nth(0).click(); await p.waitForSelector('.home .big', { timeout: 15000 });
  if (await p.locator('input[type=password]').count()) throw new Error('открытый аккаунт не должен просить пароль');
});
await step('transfer', async () => {
  await p.click('.acc-btn'); await p.waitForSelector('.sheet'); await p.click('text=Перевод между аккаунтами'); await p.waitForSelector('.sheet .row.acc');
  await shot('14-transfer'); await p.click('.sheet .row.acc >> nth=0'); await p.waitForSelector('.sheet .row');
  await p.click('.sheet .row >> nth=0'); await p.waitForSelector('.plain');
  const v = await p.inputValue('.plain'); if (v.length < 20) throw new Error('адрес получателя не подставился');
  await shot('15-transfer-send'); await p.click('.icon-btn.glass');
});
await step('lock', async () => {
  await tab(3); await p.click('text=Заблокировать'); await p.waitForSelector('input[type=password]'); await shot('16-locked');
  await p.click('text=Сменить аккаунт'); await p.waitForSelector('.row.acc'); await shot('17-accounts');
  if ((await p.locator('.row.acc').count()) !== 2) throw new Error('ожидалось 2 аккаунта');
  await p.locator('.row.acc').nth(0).click(); await p.fill('input[type=password]', 'testpass123'); await p.click('.btn.primary'); await p.waitForSelector('.home .big', { timeout: 15000 });
});
await b.close(); srv.kill();
if (errors.length) { console.error('ОШИБКИ:\n' + errors.join('\n')); console.log('::error title=ui-smoke::' + errors.join(' ;; ').replace(/\n/g, ' ')); process.exit(1); }
console.log('ui smoke ok');
