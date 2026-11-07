// Защитные проверки: мы не подписываем «вслепую» то, что вернул сторонний API.
// Любая подпись сначала сверяется с тем, что пользователь действительно хотел сделать.
import { sha256 } from '@noble/hashes/sha256';
import { base58check } from '@scure/base';
import { parseUnits } from 'ethers';

const b58 = base58check(sha256);
const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (h) => Uint8Array.from((h.replace(/^0x/, '').match(/../g) || []), (x) => parseInt(x, 16));

// Число → целое в минимальных единицах без экспоненты и «шума» плавающей точки
export function units(amount, decimals) {
  let s = Number(amount).toFixed(Math.min(decimals, 12));
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return parseUnits(s || '0', decimals);
}

export const LIFI_DIAMOND = '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae';
export const LIFI_TRON = 'TU3ymitEKCWQFtASkEeHaPb8NfZcJtCHLt'; // проверено живой котировкой LI.FI (test/live.test.mjs)

// ----- Tron -----
const tronAddrEq = (a, b) => {
  const norm = (x) => { if (!x) return ''; if (/^T/.test(x)) return hex(b58.decode(x)); return x.toLowerCase(); };
  return norm(a) === norm(b);
};

// tx — объект транзакции Tron (txID, raw_data, raw_data_hex). exp: {owner, kind, to, amount(BigInt), contract, maxCallValue(BigInt)}
export function verifyTronTx(tx, exp) {
  if (!tx?.txID || !tx.raw_data_hex || !tx.raw_data?.contract?.length) throw new Error('guard: tron tx malformed');
  if (hex(sha256(unhex(tx.raw_data_hex))) !== tx.txID.toLowerCase()) throw new Error('guard: txID does not match raw data');
  if (tx.raw_data.contract.length !== 1) throw new Error('guard: unexpected contract count');
  const c = tx.raw_data.contract[0], v = c.parameter.value;
  if (!tronAddrEq(v.owner_address, exp.owner)) throw new Error('guard: owner mismatch');
  if (exp.kind === 'native') {
    if (c.type !== 'TransferContract') throw new Error('guard: not a TRX transfer');
    if (!tronAddrEq(v.to_address, exp.to)) throw new Error('guard: recipient mismatch');
    if (BigInt(v.amount) !== exp.amount) throw new Error('guard: amount mismatch');
  } else if (exp.kind === 'trc20') {
    if (c.type !== 'TriggerSmartContract') throw new Error('guard: not a contract call');
    if (!tronAddrEq(v.contract_address, exp.contract)) throw new Error('guard: token contract mismatch');
    if (BigInt(v.call_value || 0) !== 0n) throw new Error('guard: unexpected TRX value');
    const d = (v.data || '').toLowerCase();
    const want = 'a9059cbb' + hex(b58.decode(exp.to)).slice(2).padStart(64, '0') + exp.amount.toString(16).padStart(64, '0');
    if (d !== want) throw new Error('guard: transfer data mismatch');
  } else if (exp.kind === 'lifi') {
    if (c.type !== 'TriggerSmartContract') throw new Error('guard: not a contract call');
    if (BigInt(v.call_value || 0) > (exp.maxCallValue ?? 0n)) throw new Error('guard: TRX value too high');
    if (LIFI_TRON && !tronAddrEq(v.contract_address, LIFI_TRON)) throw new Error('guard: unexpected Tron contract');
  }
  return true;
}

// ----- EVM / LI.FI -----
export function verifyLifiEvm(quote, { chainId, amountWei, native }) {
  const t = quote.tx;
  if (!t?.to || !t.data) throw new Error('guard: empty transaction');
  const to = t.to.toLowerCase();
  if (to !== LIFI_DIAMOND && to !== (quote.approval || '').toLowerCase()) throw new Error('guard: unexpected LI.FI contract');
  if (t.chainId && Number(t.chainId) !== chainId) throw new Error('guard: wrong chain');
  const value = BigInt(t.value || 0);
  const cap = (native ? amountWei : 0n) + (quote.nativeFeeWei * 105n) / 100n;
  if (value > cap) throw new Error('guard: value exceeds quoted amount');
  return true;
}
