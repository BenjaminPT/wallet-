import { useEffect, useState } from 'preact/hooks';
import { listAccounts, hasAccounts, activeId, setActive, addAccount, unlockAccount, removeAccount, migrateLegacy } from './core/accounts.js';
import { deriveAll, getKeys } from './core/derive.js';
import { assetList, assetId, netOf } from './core/assets.js';
import { getBalance, getHistory, getEvmHistory, loadPending, refreshPending, bumpPending } from './core/chains.js';
import { getPrices } from './core/market.js';
import { setLang, detectLang, t } from './i18n.js';
import { bioUnlock, bioDisable, bioMigrate } from './core/bio.js';

const SKEY = 'noir.settings.v1';
const defaults = { lang: detectLang(), fiat: 'usd', mode: 'real', icon: 'dark', testnets: false, autolock: 5, onboarded: false, coached: false, book: [], custom: [], alchemy: '' };
const load = () => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(SKEY)), mode: 'real' }; } catch { return { ...defaults }; } };

const S = {
  s: load(),
  locked: true,
  account: null,
  accounts: [],
  mnemonic: null,
  addrs: null,
  balances: {},
  prices: {},
  txs: [],
  pending: loadPending(),
  loading: false,
  offline: false,
  stack: [],
  toast: null,
};
setLang(S.s.lang);

const subs = new Set();
const emit = () => subs.forEach((f) => f());
export const state = S;
export function useStore() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((n) => n + 1); subs.add(f); return () => subs.delete(f); }, []);
  return S;
}

// ---------- роутер ----------
export const push = (name, props = {}) => { S.stack = [...S.stack, { name, props }]; emit(); };
export const pop = () => { S.stack = S.stack.slice(0, -1); emit(); };
export const resetTo = (name, props = {}) => { S.stack = [{ name, props }]; emit(); };
export const toast = (msg) => { S.toast = msg; emit(); setTimeout(() => { if (S.toast === msg) { S.toast = null; emit(); } }, 2200); };

// ---------- настройки ----------
// Иконка приложения (тёмная/светлая): меняет значок вкладки и apple-touch-icon (для следующей установки на экран «Домой»)
export function applyIcon(v = S.s.icon) {
  const sfx = v === 'light' ? '-light' : '';
  document.querySelector('link[rel="icon"]')?.setAttribute('href', `icon${sfx}.svg`);
  document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href', `icon${sfx}-192.png`);
}
export function setSettings(patch) {
  S.s = { ...S.s, ...patch };
  try { localStorage.setItem(SKEY, JSON.stringify(S.s)); } catch {}
  if (patch.lang) setLang(patch.lang);
  if (patch.icon) applyIcon(patch.icon);
  emit();
  if (patch.fiat || patch.testnets !== undefined || patch.custom) refresh();
}

export const assets = () => assetList(S.s.testnets, S.s.custom);

// ---------- жизненный цикл ----------
// Разблокированные в этой сессии аккаунты: id -> seed (только в памяти). Переключение между ними мгновенное.
const sessions = {};
const syncAccounts = () => { S.accounts = listAccounts(); };
export const isUnlocked = (id) => !!sessions[id];

let lockTimer;
function armLock() {
  clearTimeout(lockTimer);
  if (S.s.mode === 'real' && !S.locked && S.s.autolock > 0) lockTimer = setTimeout(lock, S.s.autolock * 60000);
}
['pointerdown', 'keydown'].forEach((e) => typeof window !== 'undefined' && window.addEventListener(e, armLock, { passive: true }));
document.addEventListener?.('visibilitychange', () => { if (document.hidden && S.s.mode === 'real' && S.s.autolock === 0) lock(); });

export function init() {
  applyIcon();
  const mid = migrateLegacy(t('mainAccount')); if (mid) bioMigrate(mid);
  syncAccounts();
  if (hasAccounts()) { S.account = activeId(); S.locked = true; resetTo('unlock'); }
  else resetTo('onboarding');
}

// Открыть (сделать активным) уже разблокированный аккаунт
async function activate(id) {
  const mnemonic = sessions[id];
  S.account = id; setActive(id);
  S.mnemonic = mnemonic;
  S.addrs = await deriveAll(mnemonic, { testnet: false });
  S.s = { ...S.s, mode: 'real', onboarded: true };
  try { localStorage.setItem(SKEY, JSON.stringify(S.s)); } catch {}
  S.locked = false;
  S.balances = {}; S.txs = [];
  syncAccounts();
  resetTo('home');
  armLock();
  refresh();
}

// Создать/импортировать аккаунт (может быть уже не первым)
export async function createVault(mnemonic, password, name) {
  const n = listAccounts().length;
  const id = await addAccount({ name: name || (n === 0 ? t('mainAccount') : `${t('accountWord')} ${n + 1}`), password, mnemonic });
  sessions[id] = mnemonic;
  await activate(id);
}

// Задержка после неудачных попыток ввода пароля (защита интерфейса; офлайн-перебор останавливает только стойкость PBKDF2)
const FKEY = 'noir.fails.v1';
const fails = () => { try { return JSON.parse(localStorage.getItem(FKEY)) || { n: 0, until: 0 }; } catch { return { n: 0, until: 0 }; } };
export const lockoutLeft = () => Math.max(0, Math.ceil((fails().until - Date.now()) / 1000));
export async function unlock(password, id = S.account || activeId()) {
  const left = lockoutLeft();
  if (left) throw new Error(`locked_out:${left}`);
  let mnemonic;
  try { mnemonic = await unlockAccount(id, password); }
  catch (e) {
    const f = fails(); f.n++;
    if (f.n >= 5) f.until = Date.now() + Math.min(3600, 30 * 2 ** (f.n - 5)) * 1000;
    try { localStorage.setItem(FKEY, JSON.stringify(f)); } catch {}
    throw e;
  }
  try { localStorage.removeItem(FKEY); } catch {}
  sessions[id] = mnemonic;
  await activate(id);
}

export async function unlockBiometric(id = S.account || activeId()) {
  sessions[id] = await bioUnlock(id);
  await activate(id);
}

// Переключиться на аккаунт: если он уже разблокирован — сразу, иначе спросить пароль/биометрию
export async function switchAccount(id) {
  S.account = id; setActive(id);
  if (sessions[id]) return activate(id);
  S.mnemonic = null; S.addrs = null; S.locked = true;
  resetTo('unlock');
}

// Заблокировать всё: забыть все seed в памяти
export function lock() {
  if (S.s.mode !== 'real') return;
  for (const k of Object.keys(sessions)) delete sessions[k];
  S.mnemonic = null; S.addrs = null; S.locked = true; S.balances = {};
  syncAccounts(); S.account = activeId();
  resetTo(hasAccounts() ? 'unlock' : 'onboarding');
}

// Выйти из текущего аккаунта (остальные разблокированные остаются)
export async function logout(id = S.account) {
  delete sessions[id];
  const other = Object.keys(sessions)[0];
  if (other) return activate(other);
  lock();
}

// Удалить аккаунт с устройства (seed без резервной копии будет потерян)
export async function deleteAccount(id = S.account) {
  removeAccount(id); bioDisable(id); delete sessions[id];
  syncAccounts();
  if (S.account === id) {
    S.account = activeId();
    const other = Object.keys(sessions)[0];
    if (other) return activate(other);
    S.mnemonic = null; S.addrs = null;
    if (hasAccounts()) { S.locked = true; return resetTo('accounts'); }
    return resetTo('onboarding');
  }
  emit();
}
export const resetWallet = () => deleteAccount(S.account);
export { hasAccounts };

export async function currentKeys() {
  if (!S.mnemonic) throw new Error('locked');
  return getKeys(S.mnemonic);
}

// ---------- данные ----------
export async function refresh() {
  if (!S.addrs) return;
  const addrs = S.addrs, stale = () => S.addrs !== addrs; // аккаунт мог смениться или заблокироваться, пока шли запросы
  S.loading = true; emit();
  const list = assets();
  const cgs = list.map((a) => a.cg);
  try { const pr = await getPrices(cgs, S.s.fiat); if (stale()) return; S.prices = pr; S.offline = false; } catch { S.offline = true; }
  await Promise.all(list.map(async (a) => {
    try { const b = await getBalance(a, addrs); if (!stale()) { S.balances[assetId(a)] = b; emit(); } } catch { /* оставить предыдущее */ }
  }));
  if (stale()) return;
  const hist = await Promise.all([...['btc', 'sol', 'ton', 'tron'].map((n) => getHistory(n, addrs)), getEvmHistory(addrs.evm)]);
  if (stale()) return;
  S.txs = hist.flat().sort((a, b) => b.ts - a.ts).slice(0, 40);
  S.pending = await refreshPending();
  S.loading = false; emit();
}

export const balanceOf = (a) => S.balances[assetId(a)] || 0;
export const priceOf = (a) => S.prices[a.cg]?.p || 0;
export const changeOf = (a) => S.prices[a.cg]?.ch || 0;
export const valueOf = (a) => balanceOf(a) * priceOf(a);
export const total = () => assets().reduce((s, a) => s + valueOf(a), 0);
export const addrFor = (netId) => {
  const fam = netOf(netId).fam;
  return S.addrs?.[fam];
};

// Живые курсы: цены обновляются каждые ~12 с, балансы раз в минуту (пока вкладка открыта)
export async function refreshPrices() {
  if (S.s.mode !== 'real' || !S.addrs || document.hidden) return;
  try { S.prices = await getPrices(assets().map((a) => a.cg), S.s.fiat); S.offline = false; emit(); } catch { S.offline = true; emit(); }
}
let tick = 0;
setInterval(() => { tick++; if (tick % 5 === 0) { if (S.s.mode === 'real' && S.addrs && !document.hidden) refresh(); } else refreshPrices(); }, 12000);

export async function bump(p, cancel) {
  const k = await currentKeys();
  await bumpPending(k, p, cancel);
  S.pending = loadPending(); emit();
}
export async function pollPending() {
  if (S.s.mode !== 'real' || document.hidden) return;
  if (!S.pending.some((p) => p.status === 'pending')) return;
  S.pending = await refreshPending(); emit();
}
setInterval(pollPending, 10000);
