// Комиссия: расчёт, пороги и проверка адресов получателя (опечатка в адресе не пройдёт сборку).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEE, feeEnabled, serviceFee } from '../src/core/fees.js';
import { validateAddress } from '../src/core/chains.js';

test('адреса комиссии: либо пусто, либо валидный адрес своей сети', () => {
  const net = { evm: 'eth', btc: 'btc', sol: 'sol', ton: 'ton', tron: 'tron' };
  for (const [fam, a] of Object.entries(FEE.addrs)) if (a) assert.ok(validateAddress(net[fam], a), `неверный адрес комиссии для ${fam}`);
});
test('расчёт 0,3 %, порог и исключения', () => {
  const saved = { ...FEE.addrs };
  try {
    FEE.addrs.evm = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    assert.ok(feeEnabled('evm') && !feeEnabled('btc'));
    assert.equal(serviceFee({ fam: 'evm', amount: 1000, price: 1, decimals: 6 }), 3);
    assert.equal(serviceFee({ fam: 'evm', amount: 10, price: 1, decimals: 6 }), 0, 'ниже порога 0,05: не берём');
    assert.equal(serviceFee({ fam: 'evm', amount: 1000, price: 1, decimals: 6, exempt: true }), 0, 'между своими аккаунтами бесплатно');
    assert.equal(serviceFee({ fam: 'btc', amount: 1, price: 90000, decimals: 8 }), 0, 'сеть без адреса комиссии');
    assert.equal(serviceFee({ fam: 'evm', amount: 1, price: 0, decimals: 18 }), 0, 'нет цены: не берём');
    const f = serviceFee({ fam: 'evm', amount: 0.5, price: 3000, decimals: 18 });
    assert.ok(Math.abs(f - 0.0015) < 1e-12);
  } finally { Object.assign(FEE.addrs, saved); }
});
