import { useEffect, useState } from 'preact/hooks';
import { hasVault, saveVault, unlockVault, wipeVault } from './core/vault.js';
import { deriveAll, getKeys } from './core/derive.js';
import { assetList, assetId, netOf } from './core/assets.js';
import { getBalance, getHistory } from './core/chains.js';
import { getPrices } from './core/market.js';
import { DEMO_ADDRS, DEMO_BAL, DEMO_PRICES, DEMO_TXS } from './core/demo.js';
import { setLang, detectLang } from './i18n.js';

const SKEY = 'noir.settings.v1';
const defaults = { lang: detectLang(), fiat: 'usd', mode: 'demo', testnets: false, autolock: 5, onboarded: false, coached: false, book: [], custom: [], alchemy: '' };
const load = () => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(SKEY)) }; } catch { return { ...defaults }; } };

const S = {
  s: load(),
  locked: true,
  mnemonic: null,
  addrs: null,
  balances: {},
  prices: {},
  txs: [],
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
export function setSettings(patch) {
  S.s = { ...S.s, ...patch };
  try { localStorage.setItem(SKEY, JSON.stringify(S.s)); } catch {}
  if (patch.lang) setLang(patch.lang);
  emit();
  if (patch.fiat || patch.testnets !== undefined || patch.custom) refresh();
}

export const isDemo = () => S.s.mode === 'demo' || !S.addrs;
export const assets = () => assetList(S.s.testnets, S.s.custom);

// ---------- жизненный цикл ----------
let lockTimer;
function armLock() {
  clearTimeout(lockTimer);
  if (S.s.mode === 'real' && !S.locked && S.s.autolock > 0) lockTimer = setTimeout(lock, S.s.autolock * 60000);
}
['pointerdown', 'keydown'].forEach((e) => typeof window !== 'undefined' && window.addEventListener(e, armLock, { passive: true }));
document.addEventListener?.('visibilitychange', () => { if (document.hidden && S.s.mode === 'real' && S.s.autolock === 0) lock(); });

export function init() {
  if (S.s.mode === 'real' && hasVault()) { S.locked = true; resetTo('unlock'); }
  else if (S.s.mode === 'real' && !hasVault()) { S.s.mode = 'demo'; enterDemo(); }
  else if (!S.s.onboarded) resetTo('onboarding');
  else enterDemo();
}

export function enterDemo() {
  S.s = { ...S.s, mode: 'demo', onboarded: true };
  localStorage.setItem(SKEY, JSON.stringify(S.s));
  S.addrs = DEMO_ADDRS; S.mnemonic = null; S.locked = false;
  S.balances = { ...DEMO_BAL }; S.prices = DEMO_PRICES; S.txs = DEMO_TXS;
  resetTo('home');
}

export async function createVault(mnemonic, password) {
  await saveVault(password, { mnemonic });
  S.s = { ...S.s, mode: 'real', onboarded: true };
  localStorage.setItem(SKEY, JSON.stringify(S.s));
  await openSession(mnemonic);
}

export async function unlock(password) {
  const { mnemonic } = await unlockVault(password);
  S.s = { ...S.s, mode: 'real' };
  await openSession(mnemonic);
}

async function openSession(mnemonic) {
  S.mnemonic = mnemonic;
  S.addrs = await deriveAll(mnemonic, { testnet: false });
  S.locked = false;
  S.balances = {}; S.txs = [];
  resetTo('home');
  armLock();
  refresh();
}

export function lock() {
  if (S.s.mode !== 'real') return;
  S.mnemonic = null; S.addrs = null; S.locked = true; S.balances = {};
  resetTo('unlock');
}

export function resetWallet() {
  wipeVault();
  S.mnemonic = null; S.addrs = null;
  S.s = { ...S.s, mode: 'demo' };
  localStorage.setItem(SKEY, JSON.stringify(S.s));
  enterDemo();
}

export async function currentKeys() {
  if (!S.mnemonic) throw new Error('locked');
  return getKeys(S.mnemonic);
}

// ---------- данные ----------
export async function refresh() {
  if (S.s.mode === 'demo') { S.balances = { ...DEMO_BAL }; S.prices = DEMO_PRICES; S.txs = DEMO_TXS; emit(); return; }
  if (!S.addrs) return;
  S.loading = true; emit();
  const list = assets();
  const cgs = list.map((a) => a.cg);
  try { S.prices = await getPrices(cgs, S.s.fiat); S.offline = false; } catch { S.offline = true; }
  await Promise.all(list.map(async (a) => {
    try { S.balances[assetId(a)] = await getBalance(a, S.addrs); emit(); } catch { /* оставить предыдущее */ }
  }));
  const hist = await Promise.all(['btc', 'sol', 'ton', 'tron'].map((n) => getHistory(n, S.addrs)));
  S.txs = hist.flat().sort((a, b) => b.ts - a.ts).slice(0, 30);
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
