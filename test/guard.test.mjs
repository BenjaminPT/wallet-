import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyTronTx, verifyLifiEvm, units, LIFI_DIAMOND } from '../src/core/guard.js';
import { deriveAll } from '../src/core/derive.js';

const M = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const sha = (hex) => createHash('sha256').update(Buffer.from(hex, 'hex')).digest('hex');

test('units: без экспоненты и шума плавающей точки', () => {
  assert.equal(units(0.1, 18), 100000000000000000n);
  assert.equal(units(1e-7, 18), 100000000000n);
  assert.equal(units(1234.5, 6), 1234500000n);
  assert.equal(units(0.00000001, 8), 1n);
});

test('Tron: защита от подмены получателя, суммы и txID', async () => {
  const a = await deriveAll(M);
  const other = 'TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9';
  const raw = 'deadbeef00112233';
  const mk = (over = {}) => ({ txID: sha(raw), raw_data_hex: raw, raw_data: { contract: [{ type: 'TransferContract', parameter: { value: { owner_address: a.tron, to_address: other, amount: 1000000, ...over } } }] } });
  const exp = { owner: a.tron, kind: 'native', to: other, amount: 1000000n };
  assert.ok(verifyTronTx(mk(), exp));
  assert.throws(() => verifyTronTx(mk({ to_address: a.tron }), exp), /recipient/);
  assert.throws(() => verifyTronTx(mk({ amount: 9000000 }), exp), /amount/);
  assert.throws(() => verifyTronTx(mk({ owner_address: other }), exp), /owner/);
  const bad = mk(); bad.txID = '00'.repeat(32);
  assert.throws(() => verifyTronTx(bad, exp), /txID/);
});

test('LI.FI EVM: чужой контракт и завышенный value отклоняются', () => {
  const q = (over) => ({ approval: LIFI_DIAMOND, nativeFeeWei: 0n, tx: { to: LIFI_DIAMOND, data: '0x1234', value: '1000', chainId: 1, ...over } });
  assert.ok(verifyLifiEvm(q(), { chainId: 1, amountWei: 1000n, native: true }));
  assert.throws(() => verifyLifiEvm(q({ to: '0x000000000000000000000000000000000000dEaD' }), { chainId: 1, amountWei: 1000n, native: true }), /contract/);
  assert.throws(() => verifyLifiEvm(q({ value: '999999' }), { chainId: 1, amountWei: 1000n, native: true }), /value/);
  assert.throws(() => verifyLifiEvm(q({ value: '1' }), { chainId: 1, amountWei: 1000n, native: false }), /value/);
  assert.throws(() => verifyLifiEvm(q({ chainId: 56 }), { chainId: 1, amountWei: 1000n, native: true }), /chain/);
});
