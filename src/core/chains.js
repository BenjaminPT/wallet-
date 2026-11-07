// Сетевой слой: балансы, комиссии, отправка, история. Все вызовы идут напрямую в публичные RPC/API из браузера.
import { JsonRpcProvider, Contract, Wallet, parseUnits, formatUnits, Interface, FetchRequest } from 'ethers';
import * as btc from '@scure/btc-signer';
import { secp256k1 } from '@noble/curves/secp256k1';
import { base58check } from '@scure/base';
import { sha256 } from '@noble/hashes/sha256';
import { Connection, PublicKey, SystemProgram, Transaction, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, createTransferCheckedInstruction, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';
import { TonClient, WalletContractV4, internal, toNano, fromNano, beginCell, Address } from '@ton/ton';
import { netOf } from './assets.js';
import { toHex, fromHex } from './derive.js';
import { units, verifyTronTx } from './guard.js';

const ERC20 = ['function balanceOf(address) view returns (uint256)', 'function transfer(address,uint256) returns (bool)', 'function approve(address,uint256) returns (bool)', 'function allowance(address,address) view returns (uint256)'];
const providers = {};
export function evmProvider(netId) {
  const n = netOf(netId);
  if (!providers[netId]) providers[netId] = new JsonRpcProvider(n.rpc, n.chainId, { staticNetwork: true, batchMaxCount: 10 });
  return providers[netId];
}
const j = async (url, init) => {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url.split('?')[0]}`);
  return r.json();
};
const num = (raw, dec) => Number(formatUnits(raw, dec));

// ---------- БАЛАНСЫ ----------
export async function getBalance(asset, addrs) {
  const n = netOf(asset.net);
  switch (n.fam) {
    case 'evm': {
      const p = evmProvider(n.id);
      if (asset.native) return num(await p.getBalance(addrs.evm), 18);
      return num(await new Contract(asset.contract, ERC20, p).balanceOf(addrs.evm), asset.decimals);
    }
    case 'btc': {
      const d = await j(`${n.api}/address/${addrs.btc}`);
      const s = d.chain_stats, m = d.mempool_stats;
      return (s.funded_txo_sum - s.spent_txo_sum + m.funded_txo_sum - m.spent_txo_sum) / 1e8;
    }
    case 'sol': {
      const c = new Connection(n.rpc, 'confirmed');
      const owner = new PublicKey(addrs.sol);
      if (asset.native) return (await c.getBalance(owner)) / LAMPORTS_PER_SOL;
      // публичные RPC запрещают «индексные» методы (getTokenAccountsByOwner), поэтому читаем стандартный ATA-аккаунт напрямую
      const ata = getAssociatedTokenAddressSync(new PublicKey(asset.contract), owner, true);
      try { return (await c.getTokenAccountBalance(ata)).value.uiAmount || 0; }
      catch (e) { if (/could not find account|Invalid param/i.test(String(e.message))) return 0; throw e; }
    }
    case 'ton': {
      if (!asset.native) {
        const d = await j(`https://toncenter.com/api/v3/jetton/wallets?owner_address=${addrs.ton}&jetton_address=${asset.contract}&limit=1`);
        const w = d.jetton_wallets?.[0];
        return w ? Number(w.balance) / 10 ** asset.decimals : 0;
      }
      const d = await j(`${n.api}/getAddressBalance?address=${addrs.ton}`);
      return Number(fromNano(d.result));
    }
    case 'tron': {
      const d = await j(`${n.api}/v1/accounts/${addrs.tron}`);
      const acc = d.data?.[0];
      if (!acc) return 0;
      if (asset.native) return (acc.balance || 0) / 1e6;
      const row = (acc.trc20 || []).find((o) => o[asset.contract]);
      return row ? Number(row[asset.contract]) / 10 ** asset.decimals : 0;
    }
  }
  return 0;
}

// ---------- АДРЕС ПОЛУЧАТЕЛЯ: валидация ----------
export function validateAddress(netId, a) {
  const n = netOf(netId);
  a = (a || '').trim();
  try {
    switch (n.fam) {
      case 'evm': return /^0x[0-9a-fA-F]{40}$/.test(a);
      case 'btc': btc.Address(btc.NETWORK).decode(a); return true;
      case 'sol': return new PublicKey(a).toBytes().length === 32;
      case 'ton': return /^[A-Za-z0-9_-]{48}$/.test(a) || /^-?\d:[0-9a-fA-F]{64}$/.test(a);
      case 'tron': return a[0] === 'T' && base58check(sha256).decode(a).length === 21;
    }
  } catch { return false; }
  return false;
}

// ---------- КОМИССИИ ----------
export async function estimateFee(asset, addrs, to, amount) {
  const n = netOf(asset.net);
  try {
    switch (n.fam) {
      case 'evm': {
        const p = evmProvider(n.id);
        const fd = await p.getFeeData();
        const gasPrice = fd.maxFeePerGas || fd.gasPrice || 0n;
        const gas = asset.native ? 21000n : 70000n;
        return { fee: num(gasPrice * gas, 18), unit: n.sym };
      }
      case 'btc': {
        const f = await j(`${n.api}/fee-estimates`);
        const rate = Math.ceil(f['3'] || f['6'] || 10);
        return { fee: (rate * 141) / 1e8, unit: 'BTC', rate };
      }
      case 'sol': return { fee: 0.000005 + (asset.native ? 0 : 0.002), unit: 'SOL' };
      case 'ton': return { fee: asset.native ? 0.01 : 0.06, unit: 'TON' };
      case 'tron': return { fee: asset.native ? 0.3 : 15, unit: 'TRX' };
    }
  } catch { /* fallthrough */ }
  return { fee: 0, unit: n.sym };
}

// ---------- ОТПРАВКА ----------
// keys = результат getKeys(mnemonic). Возвращает id транзакции.
export async function send(asset, keys, addrs, to, amount) {
  const n = netOf(asset.net);
  switch (n.fam) {
    case 'evm': {
      const prov = evmProvider(n.id);
      const fd = await prov.getFeeData();
      if ((fd.maxFeePerGas || fd.gasPrice || 0n) > parseUnits('2000', 'gwei')) throw new Error('guard: gas price is abnormally high, refusing to send');
      const w = new Wallet(toHex(keys.evm), prov);
      let resp;
      if (asset.native) resp = await w.sendTransaction({ to, value: units(amount, 18) });
      else resp = await new Contract(asset.contract, ERC20, w).transfer(to, units(amount, asset.decimals));
      rememberPending(n.id, resp);
      return resp.hash;
    }
    case 'btc': return sendBtc(n, keys.btc, addrs.btc, to, amount);
    case 'sol': return sendSol(n, asset, keys.sol, addrs.sol, to, amount);
    case 'ton': return sendTon(n, keys.ton, to, amount, asset, addrs.ton);
    case 'tron': return sendTron(n, asset, keys.tron, addrs.tron, to, amount);
  }
}

async function sendBtc(n, priv, from, to, amount) {
  const pub = secp256k1.getPublicKey(priv, true);
  const pay = btc.p2wpkh(pub, btc.NETWORK);
  const utxos = await j(`${n.api}/address/${from}/utxo`);
  const fees = await j(`${n.api}/fee-estimates`);
  const rate = Math.min(500, Math.ceil(fees['3'] || 10));
  const tx = new btc.Transaction();
  const sats = units(amount, 8);
  let total = 0n;
  for (const u of utxos.filter((x) => x.status?.confirmed || true)) {
    tx.addInput({ txid: u.txid, index: u.vout, witnessUtxo: { script: pay.script, amount: BigInt(u.value) } });
    total += BigInt(u.value);
    const estFee = BigInt(rate * (10 + 68 * tx.inputsLength + 31 * 2));
    if (total >= sats + estFee) break;
  }
  const fee = BigInt(rate * (10 + 68 * tx.inputsLength + 31 * 2));
  if (total < sats + fee) throw new Error('insufficient_funds');
  tx.addOutputAddress(to, sats, btc.NETWORK);
  const change = total - sats - fee;
  if (change > 546n) tx.addOutputAddress(from, change, btc.NETWORK);
  tx.sign(priv);
  tx.finalize();
  const res = await fetch(`${n.api}/tx`, { method: 'POST', body: tx.hex });
  if (!res.ok) throw new Error(await res.text());
  return tx.id;
}

async function sendSol(n, asset, secret32, from, to, amount) {
  const c = new Connection(n.rpc, 'confirmed');
  const kp = Keypair.fromSeed(secret32);
  const toPk = new PublicKey(to);
  const tx = new Transaction();
  if (asset.native) {
    tx.add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: toPk, lamports: Math.round(amount * LAMPORTS_PER_SOL) }));
  } else {
    const mint = new PublicKey(asset.contract);
    const src = getAssociatedTokenAddressSync(mint, kp.publicKey);
    const dst = getAssociatedTokenAddressSync(mint, toPk, true);
    tx.add(createAssociatedTokenAccountIdempotentInstruction(kp.publicKey, dst, toPk, mint));
    tx.add(createTransferCheckedInstruction(src, mint, dst, kp.publicKey, units(amount, asset.decimals), asset.decimals));
  }
  const { blockhash, lastValidBlockHeight } = await c.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = kp.publicKey;
  tx.sign(kp);
  const sig = await c.sendRawTransaction(tx.serialize());
  c.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }).catch(() => {});
  return sig;
}

async function sendTon(n, key, to, amount, asset, owner) {
  const client = new TonClient({ endpoint: `${n.api}/jsonRPC` });
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: Buffer.from(key.publicKey) });
  const contract = client.open(wallet);
  const seqno = await contract.getSeqno();
  let msg;
  if (asset.native) msg = internal({ to, value: toNano(Number(amount).toFixed(9)), bounce: false });
  else {
    // джеттон (USDT): сообщение на jetton-кошелёк отправителя, op transfer (TEP-74)
    const d = await j(`https://toncenter.com/api/v3/jetton/wallets?owner_address=${owner}&jetton_address=${asset.contract}&limit=1`);
    const jw = d.jetton_wallets?.[0]?.address;
    if (!jw) throw new Error('jetton_wallet_not_found');
    const body = beginCell().storeUint(0xf8a7ea5, 32).storeUint(0, 64).storeCoins(units(amount, asset.decimals))
      .storeAddress(Address.parse(to)).storeAddress(Address.parse(owner)).storeBit(0).storeCoins(1n).storeBit(0).endCell();
    msg = internal({ to: Address.parse(jw), value: toNano('0.05'), bounce: true, body });
  }
  await contract.sendTransfer({ seqno, secretKey: Buffer.from(key.secretKey), messages: [msg] });
  return `seqno:${seqno}`;
}

const b58 = base58check(sha256);
export const tronHex = (addr) => toHex(b58.decode(addr)); // 41 + 20 байт
async function sendTron(n, asset, priv, from, to, amount) {
  const post = (path, body) => j(`${n.api}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let tx;
  if (asset.native) {
    tx = await post('/wallet/createtransaction', { owner_address: from, to_address: to, amount: Number(units(amount, 6)), visible: true });
    verifyTronTx(tx, { owner: from, kind: 'native', to, amount: units(amount, 6) });
  } else {
    const raw = units(amount, asset.decimals);
    const param = tronHex(to).slice(2).padStart(64, '0') + raw.toString(16).padStart(64, '0');
    const r = await post('/wallet/triggersmartcontract', {
      owner_address: from, contract_address: asset.contract, function_selector: 'transfer(address,uint256)',
      parameter: param, fee_limit: 30000000, call_value: 0, visible: true,
    });
    tx = r.transaction;
    verifyTronTx(tx, { owner: from, kind: 'trc20', to, amount: raw, contract: asset.contract });
  }
  if (!tx?.txID) throw new Error('tron_build_failed');
  const sig = secp256k1.sign(fromHex(tx.txID), priv);
  tx.signature = [toHex(sig.toCompactRawBytes()) + (sig.recovery).toString(16).padStart(2, '0')];
  const res = await post('/wallet/broadcasttransaction', tx);
  if (!res.result) throw new Error(res.message ? decodeURIComponent(escape(atob(res.message))) : 'tron_broadcast_failed');
  return tx.txID;
}

// ---------- ИСТОРИЯ ----------
export async function getHistory(netId, addrs) {
  const n = netOf(netId);
  try {
    switch (n.fam) {
      case 'btc': {
        const txs = await j(`${n.api}/address/${addrs.btc}/txs`);
        return txs.slice(0, 15).map((t) => {
          const out = t.vout.filter((o) => o.scriptpubkey_address === addrs.btc).reduce((s, o) => s + o.value, 0);
          const spent = t.vin.filter((i) => i.prevout?.scriptpubkey_address === addrs.btc).reduce((s, i) => s + i.prevout.value, 0);
          const d = (out - spent) / 1e8;
          return { id: t.txid, net: 'btc', sym: 'BTC', dir: d >= 0 ? 'in' : 'out', amount: Math.abs(d), ts: (t.status.block_time || Date.now() / 1000) * 1000 };
        });
      }
      case 'tron': {
        const d = await j(`${n.api}/v1/accounts/${addrs.tron}/transactions?limit=15`);
        return (d.data || []).map((t) => {
          const c = t.raw_data?.contract?.[0]?.parameter?.value || {};
          return { id: t.txID, net: 'tron', sym: 'TRX', dir: c.owner_address && c.owner_address.toLowerCase() === tronHex(addrs.tron) ? 'out' : 'in', amount: (c.amount || 0) / 1e6, ts: t.block_timestamp };
        });
      }
      case 'sol': {
        const c = new Connection(n.rpc, 'confirmed');
        const sigs = await c.getSignaturesForAddress(new PublicKey(addrs.sol), { limit: 10 });
        return sigs.map((s) => ({ id: s.signature, net: 'sol', sym: 'SOL', dir: 'tx', amount: null, ts: (s.blockTime || 0) * 1000 }));
      }
      case 'ton': {
        const d = await j(`${n.api}/getTransactions?address=${addrs.ton}&limit=10`);
        return (d.result || []).map((t) => {
          const inV = Number(t.in_msg?.value || 0);
          const outV = (t.out_msgs || []).reduce((s, m) => s + Number(m.value || 0), 0);
          return { id: t.transaction_id.hash, net: 'ton', sym: 'TON', dir: outV > 0 ? 'out' : 'in', amount: (outV > 0 ? outV : inV) / 1e9, ts: t.utime * 1000 };
        });
      }
      default: return []; // EVM: нужен индексатор; показываем ссылку на обозреватель в UI
    }
  } catch { return []; }
}

export const explorerTx = (netId, id) => (netOf(netId)?.explorer || '') + id;

// ---------- Tron: подпись и широковещание готовой транзакции, approve, allowance ----------
const tronApi = () => netOf('tron').api;
const tronPost = (path, body) => j(`${tronApi()}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const pad32 = (hex) => hex.padStart(64, '0');

export async function tronBroadcast(priv, tx) {
  const sig = secp256k1.sign(fromHex(tx.txID), priv);
  const signed = { ...tx, signature: [toHex(sig.toCompactRawBytes()) + sig.recovery.toString(16).padStart(2, '0')] };
  const res = await tronPost('/wallet/broadcasttransaction', signed);
  if (!res.result) { let m = res.message || res.code || 'tron_broadcast_failed'; try { m = decodeURIComponent(escape(atob(res.message))); } catch {} throw new Error(m); }
  return tx.txID;
}

export async function tronAllowance(owner, token, spender) {
  const r = await tronPost('/wallet/triggerconstantcontract', {
    owner_address: owner, contract_address: token, function_selector: 'allowance(address,address)',
    parameter: pad32(tronHex(owner).slice(2)) + pad32(tronHex(spender).slice(2)), visible: true,
  });
  return BigInt('0x' + (r.constant_result?.[0] || '0'));
}

async function tronWaitConfirmed(txid) {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const info = await tronPost('/wallet/gettransactioninfobyid', { value: txid }).catch(() => ({}));
    if (info.blockNumber) { if (info.receipt?.result && info.receipt.result !== 'SUCCESS') throw new Error('approve_failed'); return; }
  }
  throw new Error('approve_timeout');
}

export async function tronApprove(priv, owner, token, spender, amount) {
  const r = await tronPost('/wallet/triggersmartcontract', {
    owner_address: owner, contract_address: token, function_selector: 'approve(address,uint256)',
    parameter: pad32(tronHex(spender).slice(2)) + pad32(amount.toString(16)), fee_limit: 50000000, call_value: 0, visible: true,
  });
  if (!r.transaction?.txID) throw new Error('tron_approve_build_failed');
  const id = await tronBroadcast(priv, r.transaction);
  await tronWaitConfirmed(id);
  return id;
}

// ---------- Ожидающие EVM-транзакции (для статуса, ускорения и отмены) ----------
const PKEY = 'noir.pending.v1';
export const loadPending = () => { try { return JSON.parse(localStorage.getItem(PKEY)) || []; } catch { return []; } };
const savePending = (l) => { try { localStorage.setItem(PKEY, JSON.stringify(l.slice(-30))); } catch {} };
export function rememberPending(net, resp, extra = {}) {
  const l = loadPending();
  l.push({ net, hash: resp.hash, nonce: resp.nonce, from: resp.from, to: resp.to, value: String(resp.value ?? 0n), data: resp.data, gasLimit: String(resp.gasLimit), maxFeePerGas: String(resp.maxFeePerGas ?? resp.gasPrice ?? 0n), maxPriorityFeePerGas: String(resp.maxPriorityFeePerGas ?? 0n), ts: Date.now(), status: 'pending', ...extra });
  savePending(l);
}
export async function refreshPending() {
  const l = loadPending();
  let changed = false;
  for (const p of l) {
    if (p.status !== 'pending') continue;
    try {
      const r = await evmProvider(p.net).getTransactionReceipt(p.hash);
      if (r) { p.status = r.status === 1 ? 'confirmed' : 'failed'; changed = true; }
      else {
        // заменена другой транзакцией с тем же nonce?
        const cnt = await evmProvider(p.net).getTransactionCount(p.from, 'latest');
        if (cnt > p.nonce) { p.status = 'replaced'; changed = true; }
      }
    } catch { /* сеть недоступна */ }
  }
  if (changed) savePending(l);
  return l;
}
// Ускорить (тот же nonce, комиссия +30%) или отменить (0 ETH себе, комиссия +30%)
export async function bumpPending(keys, p, cancel) {
  const w = new Wallet(toHex(keys.evm), evmProvider(p.net));
  if (w.address.toLowerCase() !== p.from.toLowerCase()) throw new Error('wrong_account');
  const bump = (x) => (BigInt(x) * 130n) / 100n + 1n;
  const fd = await evmProvider(p.net).getFeeData();
  const maxFee = bump(BigInt(p.maxFeePerGas) > (fd.maxFeePerGas ?? 0n) ? p.maxFeePerGas : String(fd.maxFeePerGas ?? p.maxFeePerGas));
  const tip = bump(p.maxPriorityFeePerGas);
  if (maxFee > parseUnits('2000', 'gwei')) throw new Error('guard: gas price is abnormally high');
  const tx = cancel
    ? { to: p.from, value: 0n, nonce: p.nonce, gasLimit: 21000n, maxFeePerGas: maxFee, maxPriorityFeePerGas: tip > maxFee ? maxFee : tip }
    : { to: p.to, value: BigInt(p.value), data: p.data, nonce: p.nonce, gasLimit: BigInt(p.gasLimit), maxFeePerGas: maxFee, maxPriorityFeePerGas: tip > maxFee ? maxFee : tip };
  const resp = await w.sendTransaction(tx);
  const l = loadPending();
  const old = l.find((x) => x.hash === p.hash);
  if (old) old.status = 'replaced';
  savePending(l);
  rememberPending(p.net, resp, { replaces: p.hash, cancel: !!cancel });
  return resp.hash;
}

// ---------- История EVM через Blockscout (без ключей) ----------
const BS = { eth: 'https://eth.blockscout.com', base: 'https://base.blockscout.com', opt: 'https://optimism.blockscout.com', arb: 'https://arbitrum.blockscout.com', pol: 'https://polygon.blockscout.com' };
export async function getEvmHistory(addr) {
  const out = [];
  await Promise.all(Object.entries(BS).map(async ([net, base]) => {
    try {
      const [tx, tk] = await Promise.all([j(`${base}/api/v2/addresses/${addr}/transactions`), j(`${base}/api/v2/addresses/${addr}/token-transfers`)]);
      const me = addr.toLowerCase();
      for (const t of (tx.items || []).slice(0, 8)) {
        const v = Number(t.value || 0) / 1e18;
        if (!v && t.method) continue; // контрактные вызовы без value показываются токен-переводами
        out.push({ id: t.hash, net, sym: netOf(net).sym, dir: t.from?.hash?.toLowerCase() === me ? 'out' : 'in', amount: v, ts: Date.parse(t.timestamp), failed: t.status === 'error' });
      }
      for (const t of (tk.items || []).slice(0, 8)) {
        const dec = Number(t.total?.decimals ?? t.token?.decimals ?? 18);
        out.push({ id: t.transaction_hash || t.tx_hash, net, sym: t.token?.symbol || '?', dir: t.from?.hash?.toLowerCase() === me ? 'out' : 'in', amount: Number(t.total?.value || 0) / 10 ** dec, ts: Date.parse(t.timestamp) });
      }
    } catch { /* индексатор недоступен для этой сети */ }
  }));
  return out.sort((a, b) => b.ts - a.ts).slice(0, 25);
}
