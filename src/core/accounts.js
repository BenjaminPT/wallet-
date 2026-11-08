// Несколько аккаунтов на одном устройстве. У каждого свой пароль и своя зашифрованная seed-фраза.
// Публичный EVM-адрес хранится открыто (только для отображения в списке), ключей в нём нет.
import { encryptPayload, decryptPayload, toSeed } from './vault.js';
import { evmKey, evmAddress, deriveAll } from './derive.js';

export const COLORS = ['#8e8e93', '#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac'];
const KEY = 'noir.accounts.v1', LEGACY = 'noir.vault.v1';
const read = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.list)) return d; } catch {} return { list: [], active: null }; };
const write = (d) => localStorage.setItem(KEY, JSON.stringify(d));
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('');

// Перенос старого одиночного хранилища (версия до мультиаккаунтов)
export function migrateLegacy(name = 'Account 1') {
  const legacy = localStorage.getItem(LEGACY);
  if (!legacy) return null;
  let id = null;
  try {
    const d = read();
    if (!d.list.length) { id = newId(); d.list.push({ id, name, addr: null, color: 0, blob: JSON.parse(legacy) }); d.active = id; write(d); }
  } catch { return null; }
  localStorage.removeItem(LEGACY);
  return id;
}

export const listAccounts = () => read().list.map(({ id, name, addr, addrs, color }, i) => ({ id, name, addr, addrs: addrs || (addr ? { evm: addr } : null), color: color ?? i % COLORS.length }));
export const hasAccounts = () => read().list.length > 0;
export const activeId = () => { const d = read(); return d.list.some((a) => a.id === d.active) ? d.active : d.list[0]?.id || null; };
export const setActive = (id) => { const d = read(); if (d.list.some((a) => a.id === id)) { d.active = id; write(d); } };
export const getAccount = (id) => listAccounts().find((a) => a.id === id) || null;

export const addrFromMnemonic = (m) => evmAddress(evmKey(toSeed(m)));

export async function addAccount({ name, password, mnemonic }) {
  const d = read();
  const addrs = await deriveAll(mnemonic, { testnet: false }), addr = addrs.evm;
  if (d.list.some((a) => a.addr && a.addr.toLowerCase() === addr.toLowerCase())) throw new Error('duplicate_account');
  const id = newId();
  d.list.push({ id, name: name || `Account ${d.list.length + 1}`, addr, addrs, color: d.list.length % COLORS.length, blob: await encryptPayload(password, { mnemonic }) });
  d.active = id;
  write(d);
  return id;
}

export async function unlockAccount(id, password) {
  const d = read();
  const a = d.list.find((x) => x.id === id);
  if (!a) throw new Error('no_account');
  const { mnemonic } = await decryptPayload(password, a.blob);
  if (!a.addrs) { a.addrs = await deriveAll(mnemonic, { testnet: false }); a.addr = a.addrs.evm; write(d); }
  return mnemonic;
}

export async function changeAccountPassword(id, oldPw, newPw) {
  const d = read();
  const a = d.list.find((x) => x.id === id);
  const { mnemonic } = await decryptPayload(oldPw, a.blob);
  a.blob = await encryptPayload(newPw, { mnemonic });
  write(d);
}

export function renameAccount(id, name) {
  const d = read();
  const a = d.list.find((x) => x.id === id);
  if (a && name.trim()) { a.name = name.trim().slice(0, 24); write(d); }
}

export function removeAccount(id) {
  const d = read();
  d.list = d.list.filter((a) => a.id !== id);
  if (d.active === id) d.active = d.list[0]?.id || null;
  write(d);
}

export function setAccountColor(id, color) {
  const d = read();
  const a = d.list.find((x) => x.id === id);
  if (a && Number.isInteger(color) && color >= 0 && color < COLORS.length) { a.color = color; write(d); }
}

// ---------- Резервная копия: зашифрованные хранилища (пароли остаются прежними, seed в файле только в зашифрованном виде)
export function exportBackup() {
  const d = read();
  return JSON.stringify({ app: 'noir-wallet', v: 1, created: new Date().toISOString(), accounts: d.list.map(({ name, addr, addrs, color, blob }) => ({ name, addr, addrs, color, blob })) });
}
const okBlob = (b) => b && b.v === 1 && Number.isInteger(b.iter) && b.iter >= 100000 && b.iter <= 3000000 && ['salt', 'iv', 'ct'].every((k) => typeof b[k] === 'string' && b[k].length > 8 && b[k].length < 4096);
// Возвращает { added, skipped, firstId }. Дубликаты (тот же адрес или то же шифрование) пропускаются.
export function importBackup(text) {
  if (typeof text !== 'string' || text.length > 2e6) throw new Error('bad_backup');
  let j; try { j = JSON.parse(text); } catch { throw new Error('bad_backup'); }
  if (j?.app !== 'noir-wallet' || !Array.isArray(j.accounts) || !j.accounts.length || j.accounts.length > 50) throw new Error('bad_backup');
  const d = read(); let added = 0, skipped = 0, firstId = null;
  for (const a of j.accounts) {
    if (!okBlob(a?.blob)) { skipped++; continue; }
    const addr = typeof a.addr === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a.addr) ? a.addr : null;
    if (d.list.some((x) => (addr && x.addr && x.addr.toLowerCase() === addr.toLowerCase()) || x.blob?.ct === a.blob.ct)) { skipped++; continue; }
    const id = newId();
    const addrs = a.addrs && typeof a.addrs === 'object' ? Object.fromEntries(Object.entries(a.addrs).filter(([k, v]) => /^[a-z]{2,6}$/.test(k) && typeof v === 'string' && v.length < 128)) : null;
    d.list.push({ id, name: String(a.name || 'Account').slice(0, 24), addr, addrs, color: Number.isInteger(a.color) ? a.color % COLORS.length : 0, blob: a.blob });
    firstId = firstId || id; added++;
  }
  if (added) { d.active = firstId; write(d); }
  return { added, skipped, firstId };
}
