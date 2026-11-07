// Живые проверки против реальных публичных API (запускаются в GitHub Actions, где есть интернет).
// Деньги не двигаются: только чтение, котировки и симуляции.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { getPrices, getChart, getMarket, lifiQuote, jupQuote, lidoApr, jupGuard, SOL_MINT } from '../src/core/market.js';
import { getBalance, getEvmHistory, getHistory, estimateFee, evmProvider, validateAddress } from '../src/core/chains.js';
import { assetList, NETS } from '../src/core/assets.js';
import { verifyTronTx, verifyLifiEvm, LIFI_DIAMOND } from '../src/core/guard.js';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';

const T = { timeout: 90000 };
const A = assetList(false, []);
const asset = (net, sym, native) => A.find((a) => a.net === net && a.sym === sym && (native === undefined || !!a.native === native));
const VITALIK = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const BTC_ADDR = 'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97';
const SOL_ADDR = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
const TON_ADDR = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';
const TRON_ADDR = 'TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9';
const TRON_ADDR2 = 'TNXoiAJ3dct8Fjg4M9fkLFh9S2v9TXc32G';
const addrs = { evm: VITALIK, btc: BTC_ADDR, sol: SOL_ADDR, ton: TON_ADDR, tron: TRON_ADDR };

test('курсы: USD/EUR/RUB в реальном времени', T, async () => {
  const ids = ['bitcoin', 'ethereum', 'solana', 'the-open-network', 'tron', 'binancecoin', 'matic-network', 'tether', 'usd-coin'];
  for (const fiat of ['usd', 'eur', 'rub']) {
    const p = await getPrices(ids, fiat);
    for (const id of ids) assert.ok(p[id] && p[id].p > 0, `${fiat}:${id} нет цены`);
    console.log(fiat, 'BTC', p.bitcoin.p, 'ETH', p.ethereum.p, 'USDT', p.tether.p);
  }
});
test('графики и рынок', T, async () => {
  for (const d of [1, 7, 30, 365]) assert.ok((await getChart('bitcoin', d)).length > 30, `chart ${d}`);
  const m = await getMarket('usd');
  assert.ok(m.length >= 10 && m.some((r) => r.symbol === 'BTC'));
});
test('EVM RPC: все сети отвечают, chainId верный', T, async () => {
  for (const n of Object.values(NETS).filter((x) => x.fam === 'evm')) {
    const net = await evmProvider(n.id).getNetwork();
    assert.equal(Number(net.chainId), n.chainId, n.id);
    assert.ok((await evmProvider(n.id).getBlockNumber()) > 1000, n.id);
  }
});
test('балансы известных кошельков во всех сетях', T, async () => {
  assert.ok((await getBalance(asset('eth', 'ETH', true), addrs)) > 0, 'ETH');
  assert.ok((await getBalance(asset('btc', 'BTC', true), addrs)) > 0, 'BTC');
  assert.ok((await getBalance(asset('sol', 'SOL', true), addrs)) > 0, 'SOL');
  assert.ok((await getBalance(asset('ton', 'TON', true), addrs)) > 0, 'TON');
  assert.ok((await getBalance(asset('tron', 'TRX', true), addrs)) > 0, 'TRX');
  for (const [net, sym] of [['eth', 'USDC'], ['sol', 'USDC'], ['tron', 'USDT'], ['ton', 'USDT']]) {
    const b = await getBalance(asset(net, sym, false), addrs);
    assert.ok(Number.isFinite(b) && b >= 0, `${sym}@${net}`); console.log(sym, net, b);
  }
});
test('история и комиссии', T, async () => {
  assert.ok((await getEvmHistory(VITALIK)).length > 0, 'EVM history (Blockscout)');
  assert.ok((await getHistory('btc', addrs)).length > 0, 'BTC history');
  assert.ok((await getHistory('sol', addrs)).length > 0, 'SOL history');
  assert.ok((await getHistory('ton', addrs)).length > 0, 'TON history');
  assert.ok((await getHistory('tron', addrs)).length > 0, 'TRON history');
  for (const [net, sym] of [['eth', 'ETH'], ['btc', 'BTC'], ['sol', 'SOL'], ['tron', 'USDT'], ['ton', 'USDT']]) {
    const f = await estimateFee(asset(net, sym), addrs, VITALIK, 1);
    assert.ok(f.fee > 0, `fee ${net}`); console.log('fee', net, sym, f.fee, f.unit);
  }
});
test('валидация адресов', () => {
  assert.ok(validateAddress('eth', VITALIK)); assert.ok(!validateAddress('eth', '0x123'));
  assert.ok(validateAddress('btc', BTC_ADDR)); assert.ok(!validateAddress('btc', VITALIK));
  assert.ok(validateAddress('sol', SOL_ADDR)); assert.ok(validateAddress('ton', TON_ADDR)); assert.ok(validateAddress('tron', TRON_ADDR));
  assert.ok(!validateAddress('tron', TRON_ADDR.slice(0, -1) + 'x'));
});
test('Lido APR', T, async () => { const a = await lidoApr(); assert.ok(a > 0 && a < 30, String(a)); });

test('LI.FI: EVM→EVM (нативный и ERC20) проходит нашу защиту', T, async () => {
  const eth = asset('eth', 'ETH', true), usdcBase = asset('base', 'USDC'), usdcEth = asset('eth', 'USDC'), usdtArb = asset('arb', 'USDT');
  const q1 = await lifiQuote({ from: eth, to: usdcBase, amount: 0.01, fromAddress: VITALIK, toAddress: VITALIK });
  console.log('LI.FI native to=', q1.tx.to, 'approval=', q1.approval, 'value=', q1.tx.value, 'nativeFee=', q1.nativeFeeWei);
  assert.equal(q1.tx.to.toLowerCase(), LIFI_DIAMOND, 'адрес LI.FI Diamond изменился');
  assert.ok(verifyLifiEvm(q1, { chainId: 1, amountWei: 10n ** 16n, native: true }));
  const q2 = await lifiQuote({ from: usdcEth, to: usdtArb, amount: 100, fromAddress: VITALIK, toAddress: VITALIK });
  console.log('LI.FI erc20 to=', q2.tx.to, 'value=', q2.tx.value, 'nativeFee=', q2.nativeFeeWei, 'out=', q2.out);
  assert.ok(verifyLifiEvm(q2, { chainId: 1, amountWei: 100n * 10n ** 6n, native: false }));
});
test('LI.FI: Tron-USDT → EVM, транзакция Tron проходит проверку', T, async () => {
  const usdtTron = asset('tron', 'USDT'), usdtBsc = asset('bsc', 'USDT');
  const q = await lifiQuote({ from: usdtTron, to: usdtBsc, amount: 50, fromAddress: TRON_ADDR, toAddress: VITALIK });
  const tx = q.tx.customData?.tronTransaction;
  assert.ok(tx, 'нет tronTransaction');
  const c = tx.raw_data.contract[0];
  console.log('LI.FI Tron contract=', c.parameter.value.contract_address, 'type=', c.type, 'call_value=', c.parameter.value.call_value, 'approval=', q.approval, 'skipApproval=', q.skipApproval);
  assert.ok(verifyTronTx(tx, { owner: TRON_ADDR, kind: 'lifi', maxCallValue: (q.nativeFeeWei * 105n) / 100n }));
});
test('Tron: собственные транзакции (TRX и TRC20) проходят проверку подмены', T, async () => {
  const { units } = await import('../src/core/guard.js');
  const post = async (p, b) => (await fetch(`https://api.trongrid.io${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json();
  const t1 = await post('/wallet/createtransaction', { owner_address: TRON_ADDR, to_address: TRON_ADDR2, amount: 1000000, visible: true });
  assert.ok(verifyTronTx(t1, { owner: TRON_ADDR, kind: 'native', to: TRON_ADDR2, amount: 1000000n }));
  const { tronHex } = await import('../src/core/chains.js');
  const usdt = asset('tron', 'USDT').contract, raw = units(5, 6);
  const r = await post('/wallet/triggersmartcontract', { owner_address: TRON_ADDR, contract_address: usdt, function_selector: 'transfer(address,uint256)', parameter: tronHex(TRON_ADDR2).slice(2).padStart(64, '0') + raw.toString(16).padStart(64, '0'), fee_limit: 30000000, call_value: 0, visible: true });
  assert.ok(verifyTronTx(r.transaction, { owner: TRON_ADDR, kind: 'trc20', to: TRON_ADDR2, amount: raw, contract: usdt }));
});

test('Jupiter: котировка, сборка транзакции и симуляция проходят защиту', T, async () => {
  const sol = asset('sol', 'SOL', true), usdc = asset('sol', 'USDC');
  const q = await jupQuote(sol, usdc, 0.1);
  assert.ok(q.out > 0, 'нет котировки');
  const r = await fetch('https://lite-api.jup.ag/swap/v1/swap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quoteResponse: q.raw, userPublicKey: SOL_ADDR, wrapAndUnwrapSol: true }) });
  const d = await r.json();
  assert.ok(d.swapTransaction, JSON.stringify(d).slice(0, 200));
  const tx = VersionedTransaction.deserialize(Uint8Array.from(Buffer.from(d.swapTransaction, 'base64')));
  const progs = [...new Set(tx.message.compiledInstructions.map((i) => tx.message.staticAccountKeys[i.programIdIndex].toBase58()))];
  console.log('Jupiter programs:', progs.join(','));
  await jupGuard(new Connection(NETS.sol.rpc, 'confirmed'), tx, new PublicKey(SOL_ADDR), 100_000_000);
});
