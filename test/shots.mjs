// Дымовой UI-тест + скриншоты: проходит онбординг, демо-режим, отправку, обмен, настройки.
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
await step('onb', async () => {
  await shot('01-onboarding');
  for (let i = 0; i < 3; i++) await p.click('.onb-bot .btn');
  await p.waitForTimeout(500); await shot('02-onboarding-last');
  await p.click('text=Попробовать демо');
  await p.waitForSelector('.home .big');
  await p.waitForTimeout(1500); await shot('03-home');
});
await step('coach', async () => { for (let i = 0; i < 3; i++) await p.click('.coach'); await p.waitForTimeout(400); await shot('04-home-after-coach'); });
await step('asset', async () => { await p.click('.list .row >> nth=0'); await p.waitForSelector('.screen .big'); await p.waitForTimeout(1200); await shot('05-asset'); await p.click('.icon-btn.glass'); });
await step('receive', async () => { await p.click('.act >> nth=1'); await p.waitForSelector('.sheet'); await shot('06-receive-pick'); await p.click('.sheet .row >> nth=0'); await p.waitForSelector('.qr'); await shot('07-receive'); await p.click('.icon-btn.glass'); });
await step('send', async () => {
  await p.click('.act >> nth=0'); await p.waitForSelector('.sheet'); await p.click('.sheet .row >> nth=0');
  await p.fill('.plain', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
  for (const k of ['0', '.', '0', '1']) await p.click(`.keypad button:text-is("${k}")`);
  await shot('08-send'); await p.click('.btn.primary'); await p.waitForTimeout(400); await shot('09-send-review');
  await p.click('.btn.primary'); await p.waitForSelector('.okc'); await p.waitForTimeout(700); await shot('10-send-done'); await p.click('.btn.primary');
});
await step('swap', async () => { await p.click('.act >> nth=2'); await p.fill('.big-in >> nth=0', '0.5'); await p.click('.btn.primary'); await p.waitForTimeout(1200); await shot('11-swap'); await p.click('.icon-btn.glass'); });
await step('tabs', async () => {
  const tabs = p.locator('.tabbar button');
  for (const [i, n] of [[1, 'market'], [2, 'nft'], [3, 'settings']]) { await tabs.nth(i).click(); await p.waitForTimeout(700); await shot(`12-${n}`); }
});
await step('create', async () => {
  await p.locator('.set-tab > .seg2 button').nth(1).click();
  await p.waitForSelector('.field');
  const pw = p.locator('input[type=password]'); await pw.nth(0).fill('testpass123'); await pw.nth(1).fill('testpass123');
  await p.click('.chk >> nth=0'); await p.click('.chk >> nth=1');
  await p.click('.btn.primary'); await p.waitForSelector('.seed'); await p.click('.seed');
  const words = await p.$$eval('.w', (els) => els.map((e) => e.textContent.replace(/^\d+/, '')));
  await shot('13-seed'); await p.click('.btn.primary'); await p.waitForSelector('.field');
  const nums = (await p.textContent('.body p')).match(/\d+/g).map(Number);
  const inputs = p.locator('input.field');
  for (let i = 0; i < 3; i++) await inputs.nth(i).fill(words[nums[i] - 1]);
  await p.click('.btn.primary'); await p.waitForSelector('.home .big', { timeout: 15000 }); await shot('14-real-home');
});
await step('unlock', async () => {
  await p.reload(); await p.waitForSelector('input[type=password]'); await shot('15-unlock');
  await p.fill('input[type=password]', 'testpass123'); await p.click('.btn.primary'); await p.waitForSelector('.home .big', { timeout: 15000 });
});
await b.close(); srv.kill();
if (errors.length) { console.error('ОШИБКИ:\n' + errors.join('\n')); process.exit(1); }
console.log('ui smoke ok');
