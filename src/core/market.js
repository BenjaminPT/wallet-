// Цены, графики (CoinGecko), обмен (LI.FI для EVM, Jupiter для Solana), стейкинг (Lido).
import { Contract, Wallet, parseUnits, MaxUint256, Interface } from 'ethers';
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { evmProvider } from './chains.js';
import { netOf } from './assets.js';
import { toHex } from './derive.js';

const CG = 'https://api.coingecko.com/api/v3';
const cache = new Map();
async function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}

export const FIAT = { usd: '$', eur: '€', rub: '₽' };

// ids: ['bitcoin', ...] -> { bitcoin: { usd, usd_24h_change } }
export function getPrices(ids, fiat = 'usd') {
  const list = [...new Set(ids.filter(Boolean))].sort().join(',');
  return cached(`p:${list}:${fiat}`, 45000, async () => {
    const r = await fetch(`${CG}/simple/price?ids=${list}&vs_currencies=${fiat}&include_24hr_change=true`);
    if (!r.ok) throw new Error('prices');
    const d = await r.json();
    const out = {};
    for (const k in d) out[k] = { p: d[k][fiat], ch: d[k][`${fiat}_24h_change`] || 0 };
    return out;
  });
}

// days: 1 | 7 | 30 | 365 -> [[ts, price], ...]
export function getChart(id, days, fiat = 'usd') {
  return cached(`c:${id}:${days}:${fiat}`, 120000, async () => {
    const r = await fetch(`${CG}/coins/${id}/market_chart?vs_currency=${fiat}&days=${days}`);
    if (!r.ok) throw new Error('chart');
    return (await r.json()).prices;
  });
}

export function getMarket(fiat = 'usd') {
  return cached(`m:${fiat}`, 90000, async () => {
    const r = await fetch(`${CG}/coins/markets?vs_currency=${fiat}&order=market_cap_desc&per_page=30&page=1&sparkline=false&price_change_percentage=24h`);
    if (!r.ok) throw new Error('market');
    return r.json();
  });
}

// ---------- LI.FI (EVM ↔ EVM, кросс-чейн) ----------
const ZERO = '0x0000000000000000000000000000000000000000';
export async function lifiQuote({ fromNet, toNet, from, to, amount, address }) {
  const fa = netOf(fromNet), ta = netOf(toNet);
  const q = new URLSearchParams({
    fromChain: fa.chainId, toChain: ta.chainId,
    fromToken: from.native ? ZERO : from.contract, toToken: to.native ? ZERO : to.contract,
    fromAmount: parseUnits(String(amount), from.decimals).toString(),
    fromAddress: address, slippage: '0.005',
  });
  const r = await fetch(`https://li.quest/v1/quote?${q}`);
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || 'lifi_quote');
  return {
    out: Number(d.estimate.toAmount) / 10 ** to.decimals,
    min: Number(d.estimate.toAmountMin) / 10 ** to.decimals,
    tool: d.toolDetails?.name || d.tool,
    approval: d.estimate.approvalAddress,
    tx: d.transactionRequest,
    raw: d,
  };
}

export async function lifiExecute(quote, from, fromNet, evmPriv, amount) {
  const w = new Wallet(toHex(evmPriv), evmProvider(fromNet));
  if (!from.native) {
    const c = new Contract(from.contract, ['function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'], w);
    const need = parseUnits(String(amount), from.decimals);
    if ((await c.allowance(w.address, quote.approval)) < need) {
      await (await c.approve(quote.approval, need)).wait();
    }
  }
  const t = quote.tx;
  const sent = await w.sendTransaction({ to: t.to, data: t.data, value: BigInt(t.value || 0), gasLimit: t.gasLimit ? BigInt(t.gasLimit) : undefined });
  return sent.hash;
}

// ---------- Jupiter (Solana) ----------
const JUP = 'https://lite-api.jup.ag/swap/v1';
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export async function jupQuote(from, to, amount) {
  const im = from.native ? SOL_MINT : from.contract, om = to.native ? SOL_MINT : to.contract;
  const r = await fetch(`${JUP}/quote?inputMint=${im}&outputMint=${om}&amount=${Math.round(amount * 10 ** from.decimals)}&slippageBps=50`);
  const d = await r.json();
  if (!r.ok || d.error) throw new Error(d.error || 'jup_quote');
  return { out: Number(d.outAmount) / 10 ** to.decimals, min: Number(d.otherAmountThreshold) / 10 ** to.decimals, tool: 'Jupiter', raw: d };
}
export async function jupExecute(quote, secret32, address) {
  const r = await fetch(`${JUP}/swap`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quoteResponse: quote.raw, userPublicKey: address, wrapAndUnwrapSol: true }) });
  const d = await r.json();
  if (!d.swapTransaction) throw new Error(d.error || 'jup_swap');
  const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(d.swapTransaction), (c) => c.charCodeAt(0)));
  tx.sign([Keypair.fromSeed(secret32)]);
  const c = new Connection(netOf('sol').rpc, 'confirmed');
  return c.sendRawTransaction(tx.serialize(), { skipPreflight: false });
}

// ---------- Стейкинг: Lido (ETH → stETH) ----------
export const LIDO = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84';
export async function lidoStake(evmPriv, amount) {
  const w = new Wallet(toHex(evmPriv), evmProvider('eth'));
  const c = new Contract(LIDO, ['function submit(address) payable returns (uint256)'], w);
  const tx = await c.submit(ZERO, { value: parseUnits(String(amount), 18) });
  return tx.hash;
}
export async function lidoApr() {
  try {
    const r = await fetch('https://eth-api.lido.fi/v1/protocol/steth/apr/sma');
    const d = await r.json();
    return Number(d.data.smaApr);
  } catch { return null; }
}
