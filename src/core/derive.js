// Деривация адресов и ключей для всех сетей из одной seed-фразы.
import { HDKey } from '@scure/bip32';
import { ed25519 } from '@noble/curves/ed25519';
import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { sha512 } from '@noble/hashes/sha512';
import { base58, base58check } from '@scure/base';
import * as btc from '@scure/btc-signer';
import { WalletContractV4 } from '@ton/ton';
import { toSeed } from './vault.js';

const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');
export const toHex = hex;
export const fromHex = (h) => Uint8Array.from(h.replace(/^0x/, '').match(/../g) || [], (x) => parseInt(x, 16));

// --- EVM: m/44'/60'/0'/0/i ---
export function evmKey(seed, i = 0) {
  return HDKey.fromMasterSeed(seed).derive(`m/44'/60'/0'/0/${i}`).privateKey;
}
export function evmAddress(priv) {
  const pub = secp256k1.getPublicKey(priv, false).slice(1);
  const h = hex(keccak_256(pub).slice(12));
  // EIP-55 checksum
  const hh = hex(keccak_256(new TextEncoder().encode(h)));
  let out = '0x';
  for (let k = 0; k < 40; k++) out += parseInt(hh[k], 16) >= 8 ? h[k].toUpperCase() : h[k];
  return out;
}

// --- Bitcoin: BIP84 native segwit m/84'/0'/0'/0/i ---
export function btcKey(seed, i = 0) {
  return HDKey.fromMasterSeed(seed).derive(`m/84'/0'/0'/0/${i}`).privateKey;
}
export function btcAddress(priv, testnet = false) {
  const net = testnet ? btc.TEST_NETWORK : btc.NETWORK;
  return btc.p2wpkh(secp256k1.getPublicKey(priv, true), net).address;
}

// --- Solana: SLIP-10 ed25519 m/44'/501'/i'/0' (совместимо с Phantom/Trust) ---
function slip10Ed25519(seed, path) {
  let I = hmac(sha512, new TextEncoder().encode('ed25519 seed'), seed);
  let k = I.slice(0, 32), c = I.slice(32);
  for (const seg of path) {
    const data = new Uint8Array(37);
    data.set(k, 1);
    new DataView(data.buffer).setUint32(33, (seg | 0x80000000) >>> 0, false);
    I = hmac(sha512, c, data);
    k = I.slice(0, 32); c = I.slice(32);
  }
  return k;
}
export function solKey(seed, i = 0) {
  return slip10Ed25519(seed, [44, 501, i, 0]);
}
export function solAddress(priv32) {
  return base58.encode(ed25519.getPublicKey(priv32));
}

// --- Tron: m/44'/195'/0'/0/i, адрес = base58check(0x41 + keccak(pub)[12:]) ---
export function tronKey(seed, i = 0) {
  return HDKey.fromMasterSeed(seed).derive(`m/44'/195'/0'/0/${i}`).privateKey;
}
export function tronAddress(priv) {
  const pub = secp256k1.getPublicKey(priv, false).slice(1);
  const body = new Uint8Array(21);
  body[0] = 0x41;
  body.set(keccak_256(pub).slice(12), 1);
  return base58check(sha256).encode(body);
}

// --- TON: стандартная TON-деривация (не BIP39-деривация), кошелёк v4r2 ---
export async function tonKeys(mnemonic) {
  // BIP39-фраза → SLIP-10 ed25519 m/44'/607'/0' (путь, который используют многие кошельки для BIP39-фраз).
  // Родные TON-фразы (24 слова Tonkeeper) используют другую схему и дадут другой адрес.
  const seed = toSeed(mnemonic);
  const k = slip10Ed25519(seed, [44, 607, 0]);
  const kp = ed25519.getPublicKey(k);
  return { secretKey: Uint8Array.from([...k, ...kp]), publicKey: kp };
}
export function tonAddress(publicKey, testnet = false) {
  const w = WalletContractV4.create({ workchain: 0, publicKey: Buffer.from(publicKey) });
  return w.address.toString({ urlSafe: true, bounceable: false, testOnly: testnet });
}

// Все адреса сразу
export async function deriveAll(mnemonic, { testnet = false } = {}) {
  const seed = toSeed(mnemonic);
  const e = evmKey(seed), b = btcKey(seed), s = solKey(seed), t = tronKey(seed);
  const ton = await tonKeys(mnemonic);
  return {
    evm: evmAddress(e),
    btc: btcAddress(b, testnet),
    sol: solAddress(s),
    ton: tonAddress(ton.publicKey, testnet),
    tron: tronAddress(t),
  };
}

// Ключи достаются только в момент подписи
export async function getKeys(mnemonic) {
  const seed = toSeed(mnemonic);
  return { evm: evmKey(seed), btc: btcKey(seed), sol: solKey(seed), tron: tronKey(seed), ton: await tonKeys(mnemonic) };
}
