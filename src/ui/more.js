import { useEffect, useState } from 'preact/hooks';
import { html, Icon, Coin, Screen, Btn, Sheet, fmtFiat, fmtNum, short, pct, copyText } from './common.js';
import { t } from '../i18n.js';
import { state, push, pop, assets, balanceOf, priceOf, isDemo, currentKeys, toast, setSettings, refresh, lock, resetWallet, resetTo, enterDemo, addrFor } from '../store.js';
import { netOf, assetId } from '../core/assets.js';
import { lifiQuote, lifiExecute, jupQuote, jupExecute, lidoStake, lidoApr, getMarket } from '../core/market.js';
import { hasVault, unlockVault } from '../core/vault.js';

// ---------------- ОБМЕН ----------------
export function Swap() {
  const list = assets().filter((a) => ['evm', 'sol'].includes(netOf(a.net).fam));
  const [from, setFrom] = useState(list.find((a) => a.net === 'eth' && a.native) || list[0]);
  const [to, setTo] = useState(list.find((a) => a.sym === 'USDC' && a.net === 'eth') || list[1]);
  const [amt, setAmt] = useState('');
  const [pick, setPick] = useState(null), [q, setQ] = useState(null), [busy, setBusy] = useState(''), [err, setErr] = useState(''), [done, setDone] = useState('');
  const fam = netOf(from.net).fam;
  const compatible = netOf(to.net).fam === fam;
  const amount = Number(amt || 0);
  const quote = async () => {
    setErr(''); setQ(null); setBusy('q');
    try {
      if (isDemo()) { await new Promise((r) => setTimeout(r, 700)); const out = (amount * priceOf(from)) / (priceOf(to) || 1) * 0.997; setQ({ out, min: out * 0.995, tool: 'Demo' }); }
      else if (fam === 'evm') setQ(await lifiQuote({ fromNet: from.net, toNet: to.net, from, to, amount, address: state.addrs.evm }));
      else setQ(await jupQuote(from, to, amount));
    } catch (e) { setErr(e.message); }
    setBusy('');
  };
  const exec = async () => {
    setBusy('x'); setErr('');
    try {
      if (isDemo()) { await new Promise((r) => setTimeout(r, 900)); setDone('demo'); }
      else { const k = await currentKeys(); setDone(fam === 'evm' ? await lifiExecute(q, from, from.net, k.evm, amount) : await jupExecute(q, k.sol, state.addrs.sol)); setTimeout(refresh, 4000); }
    } catch (e) { setErr(e.shortMessage || e.message); }
    setBusy('');
  };
  useEffect(() => { setQ(null); }, [amt, from, to]);
  if (done) return html`<${Screen} title=${t('swap')}><div class="center result"><div class="okc"><${Icon} n="check" s=${44} w=${2.4}/></div><h2>${t('done')}</h2><p class="dim">${done === 'demo' ? t('swapDemo') : short(done)}</p><${Btn} onClick=${pop}>${t('done')}<//></div><//>`;
  return html`<${Screen} title=${t('swap')}>
    <div class="glass card"><div class="dim small">${t('from')}</div><div class="rowi"><input class="plain big-in" inputmode="decimal" placeholder="0" value=${amt} onInput=${(e) => setAmt(e.target.value.replace(',', '.'))}/><button class="pill" onClick=${() => setPick('from')}><${Coin} a=${from} s=${22}/>${from.sym}<${Icon} n="down" s=${16}/></button></div><div class="dim small">${t('available')}: ${fmtNum(balanceOf(from))} · ${netOf(from.net).name}</div></div>
    <button class="flip glass" onClick=${() => { setFrom(to); setTo(from); }}><${Icon} n="swap" s=${18}/></button>
    <div class="glass card"><div class="dim small">${t('toGet')}</div><div class="rowi"><div class="big-in">${q ? fmtNum(q.out) : '0'}</div><button class="pill" onClick=${() => setPick('to')}><${Coin} a=${to} s=${22}/>${to.sym}<${Icon} n="down" s=${16}/></button></div><div class="dim small">${netOf(to.net).name}</div></div>
    ${q && html`<div class="glass card"><div class="kv"><span class="dim">${t('rate')}</span><b>${fmtNum(q.min)} ${to.sym}</b></div><div class="kv"><span class="dim">${t('via')}</span><b>${q.tool}</b></div></div>`}
    ${!compatible && html`<p class="err small">${fam === 'sol' ? t('swapSame') : ''}</p>`}
    ${err && html`<p class="err small">${err.slice(0, 160)}</p>`}
    <p class="dim small center">${t('swapSupport')}</p>
    <div class="grow"/>
    ${q ? html`<${Btn} busy=${busy === 'x'} onClick=${exec}>${t('doSwap')}<//>` : html`<${Btn} busy=${busy === 'q'} disabled=${amount <= 0 || (from === to) || (fam === 'sol' && !compatible)} onClick=${quote}>${t('getQuote')}<//>`}
    ${pick && html`<${Sheet} title=${t('chooseAsset')} onClose=${() => setPick(null)}><div class="list">${list.map((a) => html`<button class="row" key=${assetId(a)} onClick=${() => { (pick === 'from' ? setFrom : setTo)(a); setPick(null); }}><${Coin} a=${a} s=${36}/><div class="grow-l"><b>${a.sym}</b><span class="dim">${netOf(a.net).name}</span></div></button>`)}</div><//>`}
  <//>`;
}

// ---------------- СТЕЙКИНГ ----------------
export function Stake() {
  const [apr, setApr] = useState(null), [amt, setAmt] = useState(''), [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const eth = assets().find((a) => a.net === 'eth' && a.native);
  useEffect(() => { if (isDemo()) setApr(2.9); else lidoApr().then(setApr); }, []);
  const amount = Number(amt || 0);
  const go = async () => {
    setBusy(true); setErr('');
    try {
      if (isDemo()) { await new Promise((r) => setTimeout(r, 900)); setMsg('demo'); }
      else { const k = await currentKeys(); setMsg(await lidoStake(k.evm, amount)); setTimeout(refresh, 5000); }
    } catch (e) { setErr(e.shortMessage || e.message); }
    setBusy(false);
  };
  if (msg) return html`<${Screen} title=${t('stake')}><div class="center result"><div class="okc"><${Icon} n="check" s=${44} w=${2.4}/></div><h2>${t('done')}</h2><p class="dim">${msg === 'demo' ? t('demoSent') : short(msg)}</p><${Btn} onClick=${pop}>${t('done')}<//></div><//>`;
  return html`<${Screen} title=${t('stakeTitle')}>
    <div class="glass card center"><div class="dim">${t('apr')}</div><div class="big">${apr ? apr.toFixed(2) + '%' : '—'}</div></div>
    <p class="dim">${t('stakeDesc')}</p>
    <div class="glass card"><div class="dim small">ETH · ${t('available')}: ${fmtNum(balanceOf(eth))}</div><input class="plain big-in" inputmode="decimal" placeholder="0" value=${amt} onInput=${(e) => setAmt(e.target.value.replace(',', '.'))}/></div>
    ${err && html`<p class="err small">${err.slice(0, 160)}</p>`}
    <div class="grow"/><${Btn} busy=${busy} disabled=${amount <= 0 || amount > balanceOf(eth)} onClick=${go}>${t('doStake')}<//>
  <//>`;
}

// ---------------- NFT ----------------
const DEMO_NFTS = [['#3a3a3a', 'Noir #1'], ['#555', 'Noir #2'], ['#222', 'Noir #3'], ['#777', 'Noir #4']];
export function NftTab() {
  const [items, setItems] = useState(null), [err, setErr] = useState('');
  useEffect(() => {
    if (isDemo()) return setItems(DEMO_NFTS.map(([c, n]) => ({ n, c })));
    if (!state.s.alchemy) return setErr('key');
    fetch(`https://eth-mainnet.g.alchemy.com/nft/v3/${state.s.alchemy}/getNFTsForOwner?owner=${state.addrs.evm}&withMetadata=true&pageSize=40`).then((r) => r.json()).then((d) => setItems((d.ownedNfts || []).map((x) => ({ n: x.name || `#${x.tokenId}`, img: x.image?.thumbnailUrl || x.image?.cachedUrl })))).catch(() => setErr('net'));
  }, [state.s.alchemy, state.s.mode]);
  return html`<div class="tab"><h2>${t('nftTitle')}</h2>
    ${err === 'key' && html`<p class="dim">${t('nftNeedKey')}</p>`}
    ${items && !items.length && html`<p class="dim">${t('nftEmpty')}</p>`}
    <div class="grid">${(items || []).map((x) => html`<div class="nft glass"><div class="nft-img" style=${x.img ? `background-image:url(${x.img})` : `background:${x.c}`}/><b>${x.n}</b></div>`)}</div><div style="height:110px"/></div>`;
}

// ---------------- РЫНОК ----------------
export function MarketTab() {
  const [rows, setRows] = useState(null), [q, setQ] = useState('');
  useEffect(() => {
    if (isDemo()) return setRows([['Bitcoin', 'BTC', 100200, 1.2], ['Ethereum', 'ETH', 2650, -0.4], ['Solana', 'SOL', 145, 5.1], ['TON', 'TON', 3.1, 0.8], ['Tron', 'TRX', 0.27, -1.1]].map(([name, symbol, p, c]) => ({ name, symbol, current_price: p, price_change_percentage_24h: c })));
    getMarket(state.s.fiat).then(setRows).catch(() => setRows([]));
  }, [state.s.mode, state.s.fiat]);
  const f = (rows || []).filter((r) => (r.name + r.symbol).toLowerCase().includes(q.toLowerCase()));
  return html`<div class="tab"><h2>${t('marketTitle')}</h2>
    <input class="field glass" placeholder=${t('search')} value=${q} onInput=${(e) => setQ(e.target.value)}/>
    <div class="list">${f.map((r) => html`<div class="row glass">${r.image ? html`<img class="coin" src=${r.image} alt="" width="40" height="40"/>` : html`<${Coin} a=${{ sym: r.symbol.toUpperCase(), color: '#444' }}/>`}<div class="grow-l"><b>${r.symbol.toUpperCase()}</b><span class="dim">${r.name}</span></div><div class="right"><b>${fmtFiat(r.current_price, r.current_price < 1 ? 4 : 2)}</b><span class=${r.price_change_percentage_24h >= 0 ? 'up' : 'down'}>${pct(r.price_change_percentage_24h)}</span></div></div>`)}</div><div style="height:110px"/></div>`;
}

// ---------------- НАСТРОЙКИ ----------------
export function SettingsTab() {
  const s = state.s;
  const [sheet, setSheet] = useState(null);
  const goReal = () => (hasVault() ? resetTo('unlock') : push('setPass', { mode: 'create' }));
  const Row = ({ ic, label, value, onClick }) => html`<button class="row glass set" onClick=${onClick}><${Icon} n=${ic} s=${20}/><span class="grow-l"><b>${label}</b></span><span class="dim">${value}</span></button>`;
  return html`<div class="tab"><h2>${t('settings')}</h2>
    <div class="seg glass"><button class=${s.mode === 'demo' ? 'on' : ''} onClick=${enterDemo}>${t('modeDemo')}</button><button class=${s.mode === 'real' ? 'on' : ''} onClick=${() => s.mode !== 'real' && goReal()}>${t('modeReal')}</button></div>
    <div class="list">
      <${Row} ic="globe" label=${t('language')} value=${s.lang === 'ru' ? 'Русский' : 'English'} onClick=${() => setSettings({ lang: s.lang === 'ru' ? 'en' : 'ru' })}/>
      <${Row} ic="market" label=${t('currency')} value=${s.fiat.toUpperCase()} onClick=${() => setSettings({ fiat: { usd: 'eur', eur: 'rub', rub: 'usd' }[s.fiat] })}/>
      <${Row} ic="lock" label=${t('autolock')} value=${s.autolock ? `${s.autolock} ${t('min')}` : '0'} onClick=${() => setSettings({ autolock: { 1: 5, 5: 15, 15: 0, 0: 1 }[s.autolock] })}/>
      <${Row} ic="swap" label=${t('testnets')} value=${s.testnets ? 'ON' : 'OFF'} onClick=${() => setSettings({ testnets: !s.testnets })}/>
      <${Row} ic="user" label=${t('addrBook')} value=${s.book.length} onClick=${() => setSheet('book')}/>
      <${Row} ic="plus" label=${t('customTokens')} value=${s.custom.length} onClick=${() => setSheet('token')}/>
      <${Row} ic="nft" label=${t('alchemyKey')} value=${s.alchemy ? '•••' : ''} onClick=${() => setSheet('alchemy')}/>
      ${s.mode === 'real' && html`<${Row} ic="key" label=${t('showSeed')} value="" onClick=${() => setSheet('seed')}/><${Row} ic="lock" label=${t('lock')} value="" onClick=${lock}/>`}
      ${hasVault() && html`<${Row} ic="close" label=${t('resetWallet')} value="" onClick=${() => { if (confirm(t('resetWarn'))) resetWallet(); }}/>`}
    </div>
    <p class="dim small">${t('aboutText')}</p><div style="height:110px"/>
    ${sheet === 'book' && html`<${BookSheet} onClose=${() => setSheet(null)}/>`}
    ${sheet === 'token' && html`<${TokenSheet} onClose=${() => setSheet(null)}/>`}
    ${sheet === 'alchemy' && html`<${KeySheet} onClose=${() => setSheet(null)}/>`}
    ${sheet === 'seed' && html`<${SeedSheet} onClose=${() => setSheet(null)}/>`}
  </div>`;
}

const BookSheet = ({ onClose }) => {
  const [l, setL] = useState(''), [a, setA] = useState('');
  const book = state.s.book;
  return html`<${Sheet} title=${t('addrBook')} onClose=${onClose}>
    ${!book.length && html`<p class="dim">${t('noContacts')}</p>`}
    ${book.map((b, i) => html`<div class="row"><div class="grow-l"><b>${b.label}</b><span class="dim mono">${short(b.addr)}</span></div><button class="icon-btn" onClick=${() => setSettings({ book: book.filter((_, k) => k !== i) })}><${Icon} n="close" s=${18}/></button></div>`)}
    <input class="field glass" placeholder=${t('label')} value=${l} onInput=${(e) => setL(e.target.value)}/><input class="field glass" placeholder=${t('address')} value=${a} onInput=${(e) => setA(e.target.value.trim())}/>
    <${Btn} disabled=${!l || a.length < 20} onClick=${() => { setSettings({ book: [...book, { label: l, addr: a }] }); setL(''); setA(''); }}>${t('add')}<//><//>`;
};
const TokenSheet = ({ onClose }) => {
  const [n, setN] = useState('eth'), [c, setC] = useState(''), [sy, setSy] = useState(''), [d, setD] = useState('18');
  return html`<${Sheet} title=${t('customTokens')} onClose=${onClose}>
    <select class="field glass" value=${n} onChange=${(e) => setN(e.target.value)}>${['eth', 'bsc', 'pol', 'arb', 'opt', 'base', 'sol', 'tron'].map((x) => html`<option value=${x}>${netOf(x).name}</option>`)}</select>
    <input class="field glass" placeholder=${t('contractAddr')} value=${c} onInput=${(e) => setC(e.target.value.trim())}/><input class="field glass" placeholder=${t('symbol')} value=${sy} onInput=${(e) => setSy(e.target.value.toUpperCase())}/><input class="field glass" inputmode="numeric" placeholder=${t('decimals')} value=${d} onInput=${(e) => setD(e.target.value)}/>
    <${Btn} disabled=${!c || !sy} onClick=${() => { setSettings({ custom: [...state.s.custom, { net: n, sym: sy, name: sy, decimals: Number(d), contract: c, cg: null, color: '#666' }] }); onClose(); }}>${t('addToken')}<//><//>`;
};
const KeySheet = ({ onClose }) => { const [k, setK] = useState(state.s.alchemy); return html`<${Sheet} title=${t('alchemyKey')} onClose=${onClose}><input class="field glass" value=${k} onInput=${(e) => setK(e.target.value.trim())} placeholder="Alchemy API key"/><${Btn} onClick=${() => { setSettings({ alchemy: k }); onClose(); }}>${t('save')}<//><//>`; };
const SeedSheet = ({ onClose }) => {
  const [p, setP] = useState(''), [m, setM] = useState(null), [err, setErr] = useState('');
  const go = async () => { try { setM((await unlockVault(p)).mnemonic); } catch { setErr(t('wrongPass')); } };
  return html`<${Sheet} title=${t('showSeed')} onClose=${onClose}>${m ? html`<div class="seed glass"><div class="words">${m.split(' ').map((x, i) => html`<div class="w"><i>${i + 1}</i>${x}</div>`)}</div></div>` : html`<input class="field glass" type="password" placeholder=${t('pass')} value=${p} onInput=${(e) => { setP(e.target.value); setErr(''); }}/>${err && html`<p class="err">${err}</p>`}<${Btn} onClick=${go}>${t('confirm')}<//>`}<//>`;
};
