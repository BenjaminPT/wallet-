// Биометрический вход через WebAuthn + расширение PRF: ключ шифрования seed выводится самим аутентификатором
// (Face ID / Touch ID / отпечаток / Windows Hello) и не хранится нигде. Своя запись для каждого аккаунта.
const KEY = 'noir.bio.v2', LEGACY = 'noir.bio.v1';
const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const readMap = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const writeMap = (m) => localStorage.setItem(KEY, JSON.stringify(m));

export const bioEnabled = (id) => !!readMap()[id];
export const bioDisable = (id) => { const m = readMap(); delete m[id]; writeMap(m); idbDel('k:' + id); };
// перенос записи из версии без мультиаккаунтов
export function bioMigrate(id) {
  const old = localStorage.getItem(LEGACY);
  if (old && id) { const m = readMap(); m[id] = JSON.parse(old); writeMap(m); }
  localStorage.removeItem(LEGACY);
}
export async function bioAvailable() {
  try { return !!(window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())); } catch { return false; }
}

async function prfKey(credId, salt) {
  const r = await navigator.credentials.get({ publicKey: { challenge: rnd(32), allowCredentials: [{ id: credId, type: 'public-key' }], userVerification: 'required', timeout: 60000, extensions: { prf: { eval: { first: salt } } } } });
  const out = r.getClientExtensionResults().prf?.results?.first;
  if (!out) throw new Error('bio_unsupported');
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', out), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

// Запасной режим, если устройство/браузер не поддерживают PRF (часть Windows Hello, Android, встроенные браузеры):
// ключ AES несекретный-неэкспортируемый лежит в IndexedDB, а доступ к нему защищён проверкой биометрии (WebAuthn, userVerification).
// Это слабее режима PRF: защита держится на коде страницы, а не на аппаратном ключе. Поэтому режим помечается отдельно.
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('noir-bio', 1); r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const idbPut = async (k, v) => { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction('k', 'readwrite'); t.objectStore('k').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); };
const idbGet = async (k) => { const d = await idb(); return new Promise((res, rej) => { const q = d.transaction('k').objectStore('k').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); };
const idbDel = async (k) => { try { const d = await idb(); d.transaction('k', 'readwrite').objectStore('k').delete(k); } catch {} };
const verifyUser = (credId) => navigator.credentials.get({ publicKey: { challenge: rnd(32), allowCredentials: [{ id: credId, type: 'public-key' }], userVerification: 'required', timeout: 60000 } });
export const bioMode = (id) => readMap()[id]?.mode || null;

export async function bioEnable(id, mnemonic, label = 'Noir Wallet') {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: rnd(32), rp: { name: 'Noir Wallet' }, user: { id: rnd(16), name: label, displayName: label },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
    extensions: { prf: {} }, timeout: 60000,
  } });
  const cid = new Uint8Array(cred.rawId), iv = rnd(12), enc = new TextEncoder().encode(mnemonic);
  const m = readMap();
  try {
    const salt = rnd(32), key = await prfKey(cid, salt);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc));
    m[id] = { mode: 'prf', id: b64(cid), salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  } catch {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc));
    await idbPut('k:' + id, key);
    m[id] = { mode: 'gate', id: b64(cid), iv: b64(iv), ct: b64(ct) };
  }
  writeMap(m);
}

export async function bioUnlock(id) {
  const b = readMap()[id];
  if (!b) throw new Error('bio_off');
  let key;
  if (b.mode === 'gate') { await verifyUser(unb64(b.id)); key = await idbGet('k:' + id); if (!key) throw new Error('bio_key_lost'); }
  else key = await prfKey(unb64(b.id), unb64(b.salt));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(b.iv) }, key, unb64(b.ct));
  return new TextDecoder().decode(pt);
}
