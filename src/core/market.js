// Цены и графики: Binance (реальное время, без ключа) → запасной CoinGecko. Обмен: LI.FI (EVM/Tron) и Jupiter (Solana). Стейкинг: Lido.
import { Contract, Wallet, parseUnits } from 'ethers';
import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { evmProvider, tronApprove, tronAllowance, tronBroadcast, rememberPending } from './chains.js';
import { netOf } from './assets.js';
import { toHex } from './derive.js';
import { units, verifyTronTx, verifyLifiEvm } from './guard.js';

const CG = 'https://api.coingecko.com/api/v3';
const BN = 'https://data-api.binance.vision/api/v3'; // публичное зеркало рыночных данных Binance (CORS открыт)
const cache = new Map();
async function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}
const getJson = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };

export const FIAT = { usd: '$', eur: '€', rub: '₽' };

// id CoinGecko -> тикер Binance
const BSYM = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', 'the-open-network': 'TON', tron: 'TRX', binancecoin: 'BNB', 'matic-network': 'POL' };
const STABLE = new Set(['usd-coin', 'tether']);

// курс USD -> фиат (Binance: EURUSDT, USDTRUB)
async function fiatRate(fiat) {
  if (fiat === 'usd') return 1;
  return cached(`fx:${fiat}`, 300000, async () => {
    try {
      if (fiat === 'eur') return 1 / Number((await getJson(`${BN}/ticker/price?symbol=EURUSDT`)).price);
      if (fiat === 'rub') return Number((await getJson(`${BN}/ticker/price?symbol=USDTRUB`)).price);
    } catch { /* запасной вариант ниже */ }
    const d = await getJson(`${CG}/simple/price?ids=tether&vs_currencies=${fiat}`);
    return d.tether[fiat];
  });
}

// ids: ['bitcoin', ...] -> { bitcoin: { p, ch } }  (p — цена в выбранной валюте, ch — изменение за 24ч, %)
export function getPrices(ids, fiat = 'usd') {
  const list = [...new Set(ids.filter(Boolean))].sort();
  return cached(`p:${list.join(',')}:${fiat}`, 8000, async () => {
    const fx = await fiatRate(fiat);
    const out = {};
    for (const id of list) if (STABLE.has(id)) out[id] = { p: fx, ch: 0 };
    const syms = list.filter((id) => BSYM[id]);
    try {
      const q = encodeURIComponent(JSON.stringify(syms.map((id) => `${BSYM[id]}USDT`)));
      const rows = await getJson(`${BN}/ticker/24hr?symbols=${q}`);
      for (const r of rows) {
        const id = syms.find((x) => `${BSYM[x]}USDT` === r.symbol);
        if (id) out[id] = { p: Number(r.lastPrice) * fx, ch: Number(r.priceChangePercent) };
      }
    } catch { /* Binance недоступен (регион/сеть) — берём CoinGecko */ }
    const missing = list.filter((id) => !out[id] && !STABLE.has(id));
    if (missing.length) {
      const d = await getJson(`${CG}/simple/price?ids=${missing.join(',')}&vs_currencies=${fiat}&include_24hr_change=true`);
      for (const k in d) out[k] = { p: d[k][fiat], ch: d[k][`${fiat}_24h_change`] || 0 };
    }
    return out;
  });
}

// days: 1 | 7 | 30 | 365 -> [[ts, price], ...]
const KL = { 1: ['15m', 96], 7: ['1h', 168], 30: ['4h', 180], 365: ['1d', 365] };
export function getChart(id, days, fiat = 'usd') {
  return cached(`c:${id}:${days}:${fiat}`, 60000, async () => {
    if (STABLE.has(id)) { const fx = await fiatRate(fiat); const now = Date.now(); return Array.from({ length: 40 }, (_, i) => [now - (40 - i) * 3600e3, fx]); }
    if (BSYM[id]) {
      try {
        const [iv, n] = KL[days] || KL[7];
        const fx = await fiatRate(fiat);
        const rows = await getJson(`${BN}/klines?symbol=${BSYM[id]}USDT&interval=${iv}&limit=${n}`);
        return rows.map((k) => [k[0], Number(k[4]) * fx]);
      } catch { /* CoinGecko ниже */ }
    }
    return (await getJson(`${CG}/coins/${id}/market_chart?vs_currency=${fiat}&days=${days}`)).prices;
  });
}

// Вкладка «Рынок»: топ монет по Binance, обновляется каждые несколько секунд
const TOP = { BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana', XRP: 'XRP', DOGE: 'Dogecoin', TON: 'Toncoin', TRX: 'Tron', ADA: 'Cardano', AVAX: 'Avalanche', LINK: 'Chainlink', DOT: 'Polkadot', POL: 'Polygon', LTC: 'Litecoin', BCH: 'Bitcoin Cash', ATOM: 'Cosmos', UNI: 'Uniswap', NEAR: 'NEAR', APT: 'Aptos', ARB: 'Arbitrum', OP: 'Optimism', SUI: 'Sui', ETC: 'Ethereum Classic', XLM: 'Stellar', FIL: 'Filecoin', AAVE: 'Aave', INJ: 'Injective', PEPE: 'Pepe', SHIB: 'Shiba Inu', WLD: 'Worldcoin' };
export async function getMarket(fiat = 'usd') {
  const key = `m:${fiat}`;
  const fx = await fiatRate(fiat);
  try {
    const q = encodeURIComponent(JSON.stringify(Object.keys(TOP).map((s) => `${s}USDT`)));
    const rows = await getJson(`${BN}/ticker/24hr?symbols=${q}`);
    const out = rows.map((r) => { const s = r.symbol.replace(/USDT$/, ''); return { name: TOP[s], symbol: s, current_price: Number(r.lastPrice) * fx, price_change_percentage_24h: Number(r.priceChangePercent), vol: Number(r.quoteVolume) }; });
    out.sort((a, b) => b.vol - a.vol);
    return out;
  } catch {
    return cached(key, 60000, async () => getJson(`${CG}/coins/markets?vs_currency=${fiat}&order=market_cap_desc&per_page=30&page=1&sparkline=false&price_change_percentage=24h`));
  }
}

// ---------- LI.FI: EVM ↔ EVM, EVM ↔ Tron (кросс-чейн), в том числе USDT TRC20 ----------
const ZERO = '0x0000000000000000000000000000000000000000';
const TRX_NATIVE = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
const TRON_CHAIN = 728126428;
const lifiChain = (net) => (netOf(net).fam === 'tron' ? TRON_CHAIN : netOf(net).chainId);
const lifiToken = (a) => (a.native ? (netOf(a.net).fam === 'tron' ? TRX_NATIVE : ZERO) : a.contract);

export async function lifiQuote({ from, to, amount, fromAddress, toAddress, slippage = 0.005 }) {
  const q = new URLSearchParams({
    fromChain: lifiChain(from.net), toChain: lifiChain(to.net),
    fromToken: lifiToken(from), toToken: lifiToken(to),
    fromAmount: units(amount, from.decimals).toString(),
    fromAddress, toAddress: toAddress || fromAddress, slippage: String(slippage),
  });
  const r = await fetch(`https://li.quest/v1/quote?${q}`);
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || 'lifi_quote');
  const usd = (d.estimate.gasCosts || []).reduce((s, g) => s + Number(g.amountUSD || 0), 0) + (d.estimate.feeCosts || []).reduce((s, g) => s + Number(g.amountUSD || 0), 0);
  let nativeFeeWei = 0n;
  for (const f of d.estimate.feeCosts || []) {
    const a = (f.token?.address || '').toLowerCase();
    if (a === ZERO || a === TRX_NATIVE.toLowerCase()) { try { nativeFeeWei += BigInt(f.amount); } catch {} }
  }
  return {
    out: Number(d.estimate.toAmount) / 10 ** to.decimals,
    min: Number(d.estimate.toAmountMin) / 10 ** to.decimals,
    tool: d.toolDetails?.name || d.tool,
    nativeFeeWei,
    approval: d.estimate.approvalAddress,
    skipApproval: !!d.estimate.skipApproval,
    feeUsd: usd,
    secs: d.estimate.executionDuration,
    tx: d.transactionRequest,
    raw: d,
  };
}

// keys = результат getKeys(); addrs = адреса кошелька
export async function lifiExecute(quote, from, keys, addrs, amount) {
  const need = units(amount, from.decimals);
  if (netOf(from.net).fam === 'tron') {
    if (!from.native && !quote.skipApproval) {
      const have = await tronAllowance(addrs.tron, from.contract, quote.approval);
      if (have < need) await tronApprove(keys.tron, addrs.tron, from.contract, quote.approval, need);
    }
    const tx = quote.tx.customData?.tronTransaction;
    if (!tx) throw new Error('lifi_no_tron_tx');
    verifyTronTx(tx, { owner: addrs.tron, kind: 'lifi', maxCallValue: (from.native ? need : 0n) + (quote.nativeFeeWei * 105n) / 100n });
    return tronBroadcast(keys.tron, tx);
  }
  verifyLifiEvm(quote, { chainId: netOf(from.net).chainId, amountWei: need, native: from.native });
  const w = new Wallet(toHex(keys.evm), evmProvider(from.net));
  if (!from.native && !quote.skipApproval) {
    const c = new Contract(from.contract, ['function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'], w);
    if ((await c.allowance(w.address, quote.approval)) < need) await (await c.approve(quote.approval, need)).wait();
  }
  const t = quote.tx;
  const sent = await w.sendTransaction({ to: t.to, data: t.data, value: BigInt(t.value || 0), gasLimit: t.gasLimit ? BigInt(t.gasLimit) : undefined });
  rememberPending(from.net, sent);
  return sent.hash;
}

// ---------- Jupiter (Solana) ----------
const JUP = 'https://lite-api.jup.ag/swap/v1';
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export async function jupQuote(from, to, amount, slippage = 0.005) {
  const im = from.native ? SOL_MINT : from.contract, om = to.native ? SOL_MINT : to.contract;
  const r = await fetch(`${JUP}/quote?inputMint=${im}&outputMint=${om}&amount=${Math.round(amount * 10 ** from.decimals)}&slippageBps=${Math.round(slippage * 10000)}`);
  const d = await r.json();
  if (!r.ok || d.error) throw new Error(d.error || 'jup_quote');
  return { out: Number(d.outAmount) / 10 ** to.decimals, min: Number(d.otherAmountThreshold) / 10 ** to.decimals, tool: 'Jupiter', raw: d };
}
const JUP_PROGRAMS = new Set(['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', 'ComputeBudget111111111111111111111111111111', '11111111111111111111111111111111', 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr']);
// Проверка транзакции Jupiter до подписи: плательщик — мы, только известные программы, и симуляция не списывает больше суммы обмена
export async function jupGuard(c, tx, owner, outLamports) {
  const msg = tx.message;
  const keys = msg.staticAccountKeys;
  if (!keys[0].equals(owner)) throw new Error('guard: fee payer mismatch');
  for (const ix of msg.compiledInstructions) {
    const pid = keys[ix.programIdIndex]?.toBase58();
    if (!JUP_PROGRAMS.has(pid)) throw new Error(`guard: unexpected program ${pid}`);
  }
  const before = await c.getBalance(owner);
  const sim = await c.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: 'base64', addresses: [owner.toBase58()] } });
  if (sim.value.err) throw new Error('guard: simulation failed ' + JSON.stringify(sim.value.err).slice(0, 120));
  const after = sim.value.accounts?.[0]?.lamports;
  if (after === undefined) throw new Error('guard: simulation returned no balance');
  if (before - after > outLamports + 5_000_000) throw new Error('guard: transaction would spend more SOL than the swap amount');
}
export async function jupExecute(quote, secret32, address, from, amount) {
  const r = await fetch(`${JUP}/swap`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quoteResponse: quote.raw, userPublicKey: address, wrapAndUnwrapSol: true }) });
  const d = await r.json();
  if (!d.swapTransaction) throw new Error(d.error || 'jup_swap');
  const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(d.swapTransaction), (x) => x.charCodeAt(0)));
  const c = new Connection(netOf('sol').rpc, 'confirmed');
  await jupGuard(c, tx, new PublicKey(address), from?.native ? Number(units(amount, 9)) : 0);
  tx.sign([Keypair.fromSeed(secret32)]);
  return c.sendRawTransaction(tx.serialize(), { skipPreflight: false });
}

// ---------- Стейкинг: Lido (ETH → stETH) ----------
export const LIDO = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84';
export async function lidoStake(evmPriv, amount) {
  const w = new Wallet(toHex(evmPriv), evmProvider('eth'));
  const c = new Contract(LIDO, ['function submit(address) payable returns (uint256)'], w);
  const tx = await c.submit(ZERO, { value: units(amount, 18) });
  rememberPending('eth', tx);
  return tx.hash;
}
export async function lidoApr() {
  try {
    const r = await fetch('https://eth-api.lido.fi/v1/protocol/steth/apr/sma');
    const d = await r.json();
    return Number(d.data.smaApr);
  } catch { return null; }
}
