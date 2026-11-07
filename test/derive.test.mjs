import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveAll } from '../src/core/derive.js';
import { encryptPayload, decryptPayload, isValidMnemonic, newMnemonic } from '../src/core/vault.js';

const M = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

test('известные векторы адресов', async () => {
  const a = await deriveAll(M);
  assert.equal(a.evm, '0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
  assert.equal(a.btc, 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
  assert.equal(a.sol, 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk');
  assert.match(a.tron, /^T[1-9A-HJ-NP-Za-km-z]{33}$/);
  assert.match(a.ton, /^UQ/);
});

test('валидация мнемоники', () => {
  assert.ok(isValidMnemonic(M));
  assert.ok(!isValidMnemonic('abandon abandon abandon'));
  assert.ok(isValidMnemonic(newMnemonic(12)));
  assert.equal(newMnemonic(24).split(' ').length, 24);
});

test('шифрование хранилища', async () => {
  const blob = await encryptPayload('pass123', { mnemonic: M }, 1000);
  assert.deepEqual(await decryptPayload('pass123', blob), { mnemonic: M });
  await assert.rejects(decryptPayload('bad', blob), /wrong_password/);
});
