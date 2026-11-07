// Хранилище: seed-фраза шифруется паролем (PBKDF2-SHA256 600k + AES-GCM-256) и лежит в localStorage.
// Пароль и расшифрованная фраза нигде не сохраняются, только в памяти на время сессии.
import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

const KEY = 'noir.vault.v1';
const ITER = 600000;
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(password, salt, iter) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export const newMnemonic = (words = 12) => generateMnemonic(wordlist, words === 24 ? 256 : 128);
export const isValidMnemonic = (m) => validateMnemonic(normalize(m), wordlist);
export const normalize = (m) => m.trim().toLowerCase().split(/\s+/).join(' ');
export const toSeed = (m) => mnemonicToSeedSync(normalize(m));
export const words = wordlist;

export async function encryptPayload(password, payload, iter = ITER) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iter);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(payload))));
  return { v: 1, iter, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

export async function decryptPayload(password, blob) {
  const key = await deriveKey(password, unb64(blob.salt), blob.iter);
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) }, key, unb64(blob.ct));
    return JSON.parse(dec.decode(pt));
  } catch {
    throw new Error('wrong_password');
  }
}

export const hasVault = () => !!localStorage.getItem(KEY);
export const readVault = () => {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
};
export async function saveVault(password, payload) {
  localStorage.setItem(KEY, JSON.stringify(await encryptPayload(password, payload)));
}
export async function unlockVault(password) {
  const blob = readVault();
  if (!blob) throw new Error('no_vault');
  return decryptPayload(password, blob);
}
export const wipeVault = () => localStorage.removeItem(KEY);
