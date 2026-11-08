// Мультиаккаунт: хранилище, дубликаты, пароли, миграция старого хранилища, цвета и имена.
import { test } from 'node:test';
import assert from 'node:assert/strict';
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const A = await import('../src/core/accounts.js');
const { encryptPayload } = await import('../src/core/vault.js');

const M1 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const M2 = 'legal winner thank year wave sausage worth useful legal winner thank yellow';

test('несколько аккаунтов: свой пароль у каждого, дубликаты запрещены', async () => {
  const a = await A.addAccount({ name: 'Основной аккаунт', password: 'password-one-1', mnemonic: M1 });
  const b = await A.addAccount({ name: 'Второй', password: 'password-two-2', mnemonic: M2 });
  assert.equal(A.listAccounts().length, 2);
  assert.equal(await A.unlockAccount(a, 'password-one-1'), M1);
  assert.equal(await A.unlockAccount(b, 'password-two-2'), M2);
  await assert.rejects(A.unlockAccount(a, 'password-two-2'));
  await assert.rejects(A.addAccount({ password: 'x-password-123', mnemonic: M1 }), /duplicate_account/);
  const l = A.listAccounts();
  assert.ok(l.every((x) => x.addrs?.evm && x.addrs.btc && x.addrs.sol && x.addrs.tron && x.addrs.ton));
  assert.ok(!JSON.stringify([...mem.values()]).includes('abandon'), 'seed не должен лежать открытым текстом');
  assert.equal(A.activeId(), b);
});

test('имя, цвет, смена пароля, удаление', async () => {
  const [a, b] = A.listAccounts().map((x) => x.id);
  A.renameAccount(a, 'Личный'); A.setAccountColor(a, 5); A.setAccountColor(a, 99);
  const x = A.getAccount(a); assert.equal(x.name, 'Личный'); assert.equal(x.color, 5);
  await A.changeAccountPassword(a, 'password-one-1', 'new-password-1');
  await assert.rejects(A.unlockAccount(a, 'password-one-1'));
  assert.equal(await A.unlockAccount(a, 'new-password-1'), M1);
  A.removeAccount(b);
  assert.equal(A.listAccounts().length, 1);
  assert.equal(A.activeId(), a);
});

test('миграция старого одиночного хранилища', async () => {
  mem.clear();
  mem.set('noir.vault.v1', JSON.stringify(await encryptPayload('legacy-pass-123', { mnemonic: M2 })));
  const id = A.migrateLegacy('Основной аккаунт');
  assert.ok(id && !mem.has('noir.vault.v1'));
  assert.equal(await A.unlockAccount(id, 'legacy-pass-123'), M2);
  assert.ok(A.getAccount(id).addrs.evm, 'адреса досчитаны при первом входе');
});

test('резервная копия: восстановление с прежним паролем, дубликаты и мусор отклоняются', async () => {
  mem.clear();
  const a = await A.addAccount({ name: 'Основной аккаунт', password: 'backup-pass-123', mnemonic: M1 });
  const file = A.exportBackup();
  assert.ok(!file.includes('abandon'), 'seed в файле только зашифрованный');
  mem.clear(); // «новое устройство»
  const r = A.importBackup(file);
  assert.equal(r.added, 1);
  assert.equal(await A.unlockAccount(r.firstId, 'backup-pass-123'), M1);
  assert.equal(A.importBackup(file).added, 0, 'повторный импорт не дублирует');
  assert.throws(() => A.importBackup('{"app":"x"}'), /bad_backup/);
  assert.throws(() => A.importBackup('not json'), /bad_backup/);
  const evil = JSON.parse(file); evil.accounts[0].blob.iter = 2e9; evil.accounts[0].blob.ct = 'zzzzzzzzzz';
  assert.equal(A.importBackup(JSON.stringify(evil)).added, 0, 'огромное число итераций PBKDF2 отклоняется');
});
