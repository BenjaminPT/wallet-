// Биометрический вход через WebAuthn + расширение PRF: ключ шифрования seed выводится самим аутентификатором
// (Face ID / Touch ID / отпечаток / Windows Hello) и не хранится нигде. Своя запись для каждого аккаунта.
const KEY = 'noir.bio.v2', LEGACY = 'noir.bio.v1';
const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const readMap = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const writeMap = (m) => localStorage.setItem(KEY, JSON.stringify(m));

export const bioEnabled = (id) => !!readMap()[id];
export const bioDisable = (id) => { const m = readMap(); delete m[id]; writeMap(m); };
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

export async function bioEnable(id, mnemonic, label = 'Noir Wallet') {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: rnd(32), rp: { name: 'Noir Wallet' }, user: { id: rnd(16), name: label, displayName: label },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
    extensions: { prf: {} }, timeout: 60000,
  } });
  const cid = new Uint8Array(cred.rawId), salt = rnd(32), iv = rnd(12);
  const key = await prfKey(cid, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(mnemonic)));
  const m = readMap(); m[id] = { id: b64(cid), salt: b64(salt), iv: b64(iv), ct: b64(ct) }; writeMap(m);
}

export async function bioUnlock(id) {
  const b = readMap()[id];
  if (!b) throw new Error('bio_off');
  const key = await prfKey(unb64(b.id), unb64(b.salt));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(b.iv) }, key, unb64(b.ct));
  return new TextDecoder().decode(pt);
}
