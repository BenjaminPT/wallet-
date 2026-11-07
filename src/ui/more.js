import { useEffect, useRef, useState } from 'preact/hooks';
import { html, Icon, Coin, Screen, Btn, Sheet, fmtFiat, fmtNum, short, pct, copyText, haptic } from './common.js';
import { t } from '../i18n.js';
import { state, push, pop, assets, balanceOf, priceOf, currentKeys, toast, setSettings, refresh, lock, logout, deleteAccount, hasAccounts, resetTo, addrFor } from '../store.js';
import { netOf, assetId, tag, label } from '../core/assets.js';
import { explorerTx } from '../core/chains.js';
import { lifiQuote, lifiExecute, jupQuote, jupExecute, lidoStake, lidoApr, getMarket } from '../core/market.js';
import { Avatar } from './accounts.js';
import { getAccount, unlockAccount, changeAccountPassword, renameAccount, listAccounts } from '../core/accounts.js';
import { TermsSheet } from './auth.js';
import { bioAvailable, bioEnabled, bioEnable, bioDisable } from '../core/bio.js';

// ---------------- ОБМЕН ----------------
// Маршруты: Solana↔Solana — Jupiter; EVM↔EVM, EVM↔Tron — LI.FI (в Tron из Tron нельзя). Остальное не поддерживается.
const routeOf = (a, b) => {
  const f = netOf(a.net).fam, g = netOf(b.net).fam;
  if (a === b || (a.net === b.net && a.contract === b.contract)) return null;
  if (f === 'sol' && g === 'sol') return 'jup';
  if (['evm', 'tron'].includes(f) && ['evm', 'tron'].includes(g) && !(f === 'tron' && g === 'tron')) return 'lifi';
  return null;
};
export function Swap() {
  const list = assets().filter((a) => ['evm', 'sol', 'tron'].includes(netOf(a.net).fam));
  const [from, setFrom] = useState(list.find((a) => a.net === 'eth' && a.native) || list[0]);
  const [to, setTo] = useState(list.find((a) => a.sym === 'USDT' && a.net === 'tron') || list[1]);
  const [amt, setAmt] = useState(''), [slip, setSlip] = useState(0.005);
  const [pick, setPick] = useState(null), [q, setQ] = useState(null), [busy, setBusy] = useState(''), [err, setErr] = useState(''), [done, setDone] = useState('');
  const route = routeOf(from, to);
  const amount = Number(amt || 0);
  const bal = balanceOf(from);
  const nativeOf = (a) => assets().find((x) => x.net === a.net && x.native);
  const gasBal = balanceOf(nativeOf(from));
  const needGas = !from.native && gasBal <= 0;
  const addrs = state.addrs;

  const quote = async (silent) => {
    if (!route || amount <= 0) return;
    if (!silent) { setQ(null); setBusy('q'); }
    setErr('');
    try {
      let r;
      if (route === 'lifi') r = await lifiQuote({ from, to, amount, fromAddress: addrFor(from.net), toAddress: addrFor(to.net), slippage: slip });
      else r = await jupQuote(from, to, amount, slip);
      setQ({ ...r, at: Date.now() });
    } catch (e) { setErr(e.message); setQ(null); }
    if (!silent) setBusy('');
  };
  // авто-котировка: через 0.7 с после ввода и обновление каждые 20 с, чтобы курс был свежим
  useEffect(() => {
    setQ(null);
    if (!route || amount <= 0) return;
    const d = setTimeout(() => quote(false), 700);
    const iv = setInterval(() => { if (!busy) quote(true); }, 20000);
    return () => { clearTimeout(d); clearInterval(iv); };
  }, [amt, from, to, slip]);

  const exec = async () => {
    setBusy('x'); setErr('');
    try {
      {
        const k = await currentKeys();
        setDone(route === 'lifi' ? await lifiExecute(q, from, k, addrs, amount) : await jupExecute(q, k.sol, addrs.sol, from, amount));
        setTimeout(refresh, 5000);
      }
    } catch (e) { setErr(e.shortMessage || e.message); }
    setBusy('');
  };
  const impact = q && priceOf(from) && priceOf(to) ? (1 - (q.out * priceOf(to)) / (amount * priceOf(from))) * 100 : 0;
  const maxAmt = () => setAmt(String(Math.max(0, from.native ? bal - (netOf(from.net).fam === 'evm' ? 0.002 : netOf(from.net).fam === 'tron' ? 1 : 0.01) : bal)).slice(0, 12));
  if (done) return html`<${Screen} title=${t('swap')}><div class="center result"><div class="okc"><${Icon} n="check" s=${44} w=${2.4}/></div><h2>${t('done')}</h2><p class="dim">${done === 'demo' ? t('swapDemo') : short(done)}</p>${done !== 'demo' && html`<a class="link" href=${explorerTx(from.net, done)} target="_blank" rel="noopener">${t('viewTx')}</a>`}<${Btn} onClick=${pop}>${t('done')}<//></div><//>`;
  const side = (key, a, onPick) => html`<button class="pill" onClick=${() => setPick(key)}><${Coin} a=${a} s=${26}/>${label(a)}<${Icon} n="down" s=${16}/></button>`;
  return html`<${Screen} title=${t('swap')}>
    <div class="glass card"><div class="rowi between"><span class="dim small">${t('from')}</span><button class="link tiny" onClick=${maxAmt}>${t('available')}: ${fmtNum(bal)} · ${t('max')}</button></div>
      <div class="rowi"><input class="plain big-in" inputmode="decimal" placeholder="0" value=${amt} onInput=${(e) => setAmt(e.target.value.replace(',', '.'))}/>${side('from', from)}</div>
      <div class="dim small">≈ ${fmtFiat(amount * priceOf(from))}</div></div>
    <button class="flip glass" onClick=${() => { setFrom(to); setTo(from); }} aria-label="swap"><${Icon} n="swap" s=${18}/></button>
    <div class="glass card"><div class="dim small">${t('toGet')}</div>
      <div class="rowi"><div class="big-in">${busy === 'q' ? html`<span class="spin"/>` : q ? fmtNum(q.out) : '0'}</div>${side('to', to)}</div>
      <div class="dim small">${q ? `≈ ${fmtFiat(q.out * priceOf(to))}` : tag(to)}</div></div>
    <div class="chips left"><span class="dim small" style="align-self:center">${t('slippage')}</span>${[0.005, 0.01, 0.03].map((v) => html`<button class=${slip === v ? 'chip on' : 'chip'} onClick=${() => setSlip(v)}>${v * 100}%</button>`)}</div>
    ${q && html`<div class="glass card"><div class="kv"><span class="dim">${t('rate')}</span><b>${fmtNum(q.min)} ${to.sym}</b></div><div class="kv"><span class="dim">${t('via')}</span><b>${q.tool}</b></div>${q.feeUsd ? html`<div class="kv"><span class="dim">${t('feeEst')}</span><b>≈ ${fmtFiat(q.feeUsd)}</b></div>` : null}${q.secs ? html`<div class="kv"><span class="dim">${t('time')}</span><b>~${Math.max(1, Math.round(q.secs / 60 * 10) / 10)} ${t('min')}</b></div>` : null}</div>`}
    ${q && impact > 3 && html`<div class="warn glass"><${Icon} n="warn"/><span>${t('priceImpact', { v: impact.toFixed(1) })}</span></div>`}
    ${!route && from !== to && html`<p class="err small">${t('swapNoRoute')}</p>`}
    ${needGas && html`<p class="err small">${t('needGas', { sym: nativeOf(from).sym })}</p>`}
    ${err && html`<p class="err small">${err.slice(0, 180)}</p>`}
    <div class="grow"/>
    <${Btn} busy=${busy === 'x'} disabled=${!q || !route || amount <= 0 || amount > bal + 1e-12 || busy === 'q'} onClick=${exec}>${amount > bal ? t('insufficient') : t('doSwap')}<//>
    ${pick && html`<${Sheet} title=${t('chooseAsset')} onClose=${() => setPick(null)}><div class="list">${list.map((a) => html`<button class="row" key=${assetId(a)} onClick=${() => { (pick === 'from' ? setFrom : setTo)(a); setPick(null); }}><${Coin} a=${a} s=${36}/><div class="grow-l"><b>${a.sym}</b><span class="dim">${tag(a)}</span></div><div class="right"><span class="dim">${fmtNum(balanceOf(a))}</span></div></button>`)}</div><//>`}
  <//>`;
}

// ---------------- СТЕЙКИНГ ----------------
export function Stake() {
  const [apr, setApr] = useState(null), [amt, setAmt] = useState(''), [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const eth = assets().find((a) => a.net === 'eth' && a.native);
  useEffect(() => { lidoApr().then(setApr); }, []);
  const amount = Number(amt || 0);
  const go = async () => {
    setBusy(true); setErr('');
    try {
      { const k = await currentKeys(); setMsg(await lidoStake(k.evm, amount)); setTimeout(refresh, 5000); }
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
export function NftTab() {
  const [items, setItems] = useState(null), [err, setErr] = useState('');
  useEffect(() => {
    if (!state.s.alchemy) return setErr('key');
    fetch(`https://eth-mainnet.g.alchemy.com/nft/v3/${state.s.alchemy}/getNFTsForOwner?owner=${state.addrs.evm}&withMetadata=true&pageSize=40`).then((r) => r.json()).then((d) => setItems((d.ownedNfts || []).map((x) => ({ n: x.name || `#${x.tokenId}`, img: x.image?.thumbnailUrl || x.image?.cachedUrl })))).catch(() => setErr('net'));
  }, [state.s.alchemy, state.s.mode]);
  return html`<div class="tab"><h2>${t('nftTitle')}<span class="beta">${t('betaTag')}</span></h2>
    <p class="dim small beta-note">${t('nftBeta')}</p>
    ${err === 'key' && html`<p class="dim">${t('nftNeedKey')}</p>`}
    ${items && !items.length && html`<p class="dim">${t('nftEmpty')}</p>`}
    <div class="grid">${(items || []).map((x) => html`<div class="nft glass">${x.img ? html`<img class="nft-img" src=${x.img} loading="lazy" referrerpolicy="no-referrer" alt=""/>` : html`<div class="nft-img" style=${`background:${x.c}`}/>`}<b>${x.n}</b></div>`)}</div><div style="height:110px"/></div>`;
}

// ---------------- РЫНОК ----------------
export function MarketTab() {
  const [rows, setRows] = useState(null), [q, setQ] = useState('');
  const prev = useRef({});
  const [flash, setFlash] = useState({});
  useEffect(() => {
    let off = false;
    const load = async () => {
      try {
        const d = await getMarket(state.s.fiat);
        if (off) return;
        const fl = {};
        for (const r of d) { const o = prev.current[r.symbol]; if (o !== undefined && o !== r.current_price) fl[r.symbol] = r.current_price > o ? 'up' : 'down'; prev.current[r.symbol] = r.current_price; }
        setFlash(fl); setRows(d);
      } catch { if (!off) setRows((x) => x || []); }
    };
    load();
    const iv = setInterval(() => { if (!document.hidden) load(); }, 8000);
    return () => { off = true; clearInterval(iv); };
  }, [state.s.mode, state.s.fiat]);
  const f = (rows || []).filter((r) => (r.name + r.symbol).toLowerCase().includes(q.toLowerCase()));
  return html`<div class="tab"><h2>${t('marketTitle')}<span class="live"><i/>LIVE</span></h2>
    <input class="field glass" placeholder=${t('search')} value=${q} onInput=${(e) => setQ(e.target.value)}/>
    <div class="list">${f.map((r) => html`<div class="row glass" key=${r.symbol}><${Coin} a=${{ sym: r.symbol.toUpperCase(), color: '#444' }}/><div class="grow-l"><b>${r.symbol.toUpperCase()}</b><span class="dim">${r.name}</span></div><div class="right"><b class=${flash[r.symbol] ? `flash-${flash[r.symbol]}` : ''} key=${r.current_price}>${fmtFiat(r.current_price, r.current_price < 1 ? 4 : 2)}</b><span class=${r.price_change_percentage_24h >= 0 ? 'up' : 'down'}>${pct(r.price_change_percentage_24h)}</span></div></div>`)}</div><div style="height:110px"/></div>`;
}

// ---------------- НАСТРОЙКИ ----------------
const Seg = ({ value, options, onChange }) => {
  const i = Math.max(0, options.findIndex((o) => o[0] === value));
  return html`<div class="seg2" role="radiogroup" style=${`--n:${options.length};--i:${i}`}><i class="thumb"/>${options.map(([v, label]) => html`<button role="radio" aria-checked=${v === value} class=${v === value ? 'on' : ''} onClick=${() => { haptic(6); onChange(v); }}>${label}</button>`)}</div>`;
};
const Switch = ({ on, onChange, label }) => html`<button class=${on ? 'sw on' : 'sw'} role="switch" aria-checked=${on} aria-label=${label} onClick=${() => { haptic(6); onChange(!on); }}><i/></button>`;
const Group = ({ title, children }) => html`<section class="grp"><h4>${title}</h4><div class="grp-b glass">${children}</div></section>`;
const SRow = ({ ic, label, hint, right, onClick, danger }) => {
  const Tag = onClick ? 'button' : 'div';
  return html`<${Tag} class=${`srow${danger ? ' danger' : ''}`} onClick=${onClick}><span class="sic"><${Icon} n=${ic} s=${18}/></span><span class="grow-l"><b>${label}</b>${hint && html`<span class="dim small">${hint}</span>`}</span>${right}${onClick && !right && html`<span class="dim"><${Icon} n="chev" s=${16}/></span>`}<//>`;
};

export function SettingsTab() {
  const s = state.s;
  const [sheet, setSheet] = useState(null);
  const [bioOk, setBioOk] = useState(false), [, force] = useState(0);
  const acc = getAccount(state.account), bioOn = bioEnabled(state.account);
  useEffect(() => { bioAvailable().then(setBioOk); }, []);
  const toggleBio = async (v) => { if (!bioOk) return toast(t('bioUnsupported')); try { if (v) { await bioEnable(state.account, state.mnemonic, acc?.name); toast(t('bioOnToast')); } else bioDisable(state.account); force((n) => n + 1); } catch { toast(t('bioFail')); } };
  const real = !!state.addrs;
  const addr = real ? state.addrs.evm : null;
  return html`<div class="tab set-tab"><h2>${t('settings')}</h2>
    <div class="prof glass">
      <${Avatar} a=${acc || { name: 'N', color: 0 }} s=${44}/>
      <div class="grow-l"><b>${acc?.name || 'Noir Wallet'}</b><span class="dim small mono">${short(addr)}</span></div>
      ${real && html`<button class="icon-btn" aria-label=${t('copy')} onClick=${async () => { await copyText(addr); toast(t('copied')); }}><${Icon} n="copy" s=${18}/></button>`}
    </div>

    <${Group} title=${t('secGeneral')}>
      <${SRow} ic="globe" label=${t('language')} right=${html`<${Seg} value=${s.lang} options=${[['ru', 'RU'], ['en', 'EN']]} onChange=${(v) => setSettings({ lang: v })}/>`}/>
      <${SRow} ic="market" label=${t('currency')} right=${html`<${Seg} value=${s.fiat} options=${[['usd', 'USD'], ['eur', 'EUR'], ['rub', 'RUB']]} onChange=${(v) => setSettings({ fiat: v })}/>`}/>
      <${SRow} ic="eye" label=${t('appIcon')} right=${html`<${Seg} value=${s.icon || 'dark'} options=${[['dark', t('iconDark')], ['light', t('iconLight')]]} onChange=${(v) => setSettings({ icon: v })}/>`}/>
      <${SRow} ic="swap" label=${t('testnets')} right=${html`<${Switch} on=${s.testnets} label=${t('testnets')} onChange=${(v) => setSettings({ testnets: v })}/>`}/>
    <//>

    <${Group} title=${t('secSecurity')}>
      <${SRow} ic="lock" label=${t('autolock')} right=${html`<${Seg} value=${s.autolock} options=${[[1, '1'], [5, '5'], [15, '15'], [0, '∞']]} onChange=${(v) => setSettings({ autolock: v })}/>`}/>
      ${real && html`<${SRow} ic="eye" label=${t('bio')} hint=${bioOk ? t('bioHint') : t('bioUnsupported')} right=${html`<${Switch} on=${bioOn} label=${t('bio')} onChange=${toggleBio}/>`}/>`}
      ${real && html`<${SRow} ic="key" label=${t('showSeed')} onClick=${() => setSheet('seed')}/><${SRow} ic="lock" label=${t('changePass')} onClick=${() => setSheet('pass')}/><${SRow} ic="close" label=${t('lock')} onClick=${lock}/>`}
    <//>

    <${Group} title=${t('accountsTitle')}>
      <${SRow} ic="user" label=${t('switchAccount')} hint=${acc ? `${listAccounts().length} · ${acc.name}` : null} onClick=${() => push('accounts')}/>
      ${!hasAccounts() && html`<${SRow} ic="plus" label=${t('signInFull')} onClick=${() => push('import')}/>`}
      ${real && html`<${SRow} ic="plus" label=${t('addAccountNew')} onClick=${() => push('setPass', { mode: 'create' })}/><${SRow} ic="key" label=${t('rename')} onClick=${() => { const n = (prompt(t('renamePrompt'), acc?.name || '') || '').trim(); if (n) { renameAccount(state.account, n.slice(0, 24)); force((x) => x + 1); } }}/><${SRow} ic="close" label=${t('logout')} onClick=${() => logout()}/>`}
    <//>

    <${Group} title=${t('secData')}>
      <${SRow} ic="user" label=${t('addrBook')} right=${html`<span class="dim">${s.book.length}</span>`} onClick=${() => setSheet('book')}/>
      <${SRow} ic="plus" label=${t('customTokens')} right=${html`<span class="dim">${s.custom.length}</span>`} onClick=${() => setSheet('token')}/>
      <${SRow} ic="nft" label=${t('alchemyKey')} right=${html`<span class="dim">${s.alchemy ? '••••' : ''}</span>`} onClick=${() => setSheet('alchemy')}/>
    <//>

    ${real && html`<${Group} title=${t('secDanger')}><${SRow} danger ic="close" label=${t('resetWallet')} onClick=${() => { if (confirm(t('resetWarn'))) deleteAccount(); }}/><//>`}
    <p class="dim small about">${t('aboutText')}</p>
    <button class="link tiny" style="margin:6px 6px 0" onClick=${() => setSheet('terms')}>${t('termsLink')}</button>
    <p class="dim tiny2">${t('build')}: ${typeof BUILD_ID !== 'undefined' ? BUILD_ID : 'dev'}</p><div style="height:110px"/>
    ${sheet === 'book' && html`<${BookSheet} onClose=${() => setSheet(null)}/>`}
    ${sheet === 'token' && html`<${TokenSheet} onClose=${() => setSheet(null)}/>`}
    ${sheet === 'alchemy' && html`<${KeySheet} onClose=${() => setSheet(null)}/>`}
    ${sheet === 'seed' && html`<${SeedSheet} onClose=${() => setSheet(null)}/>`}
    ${sheet === 'pass' && html`<${PassSheet} onClose=${() => setSheet(null)}/>`}
    ${sheet === 'terms' && html`<${TermsSheet} onClose=${() => setSheet(null)}/>`}
  </div>`;
}

const PassSheet = ({ onClose }) => {
  const [o, setO] = useState(''), [n, setN] = useState(''), [n2, setN2] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const go = async () => {
    if (n.length < 10) return setErr(t('passShort'));
    if (n !== n2) return setErr(t('passMismatch'));
    setBusy(true);
    try { await changeAccountPassword(state.account, o, n); toast(t('passChanged')); onClose(); }
    catch { setErr(t('wrongPass')); setBusy(false); }
  };
  return html`<${Sheet} title=${t('changePass')} onClose=${onClose}>
    <input class="field glass" type="password" autocomplete="current-password" placeholder=${t('oldPass')} value=${o} onInput=${(e) => { setO(e.target.value); setErr(''); }}/>
    <input class="field glass" type="password" autocomplete="new-password" placeholder=${t('newPass')} value=${n} onInput=${(e) => { setN(e.target.value); setErr(''); }}/>
    <input class="field glass" type="password" autocomplete="new-password" placeholder=${t('pass2')} value=${n2} onInput=${(e) => { setN2(e.target.value); setErr(''); }}/>
    ${err && html`<p class="err">${err}</p>`}<${Btn} busy=${busy} disabled=${!o || !n} onClick=${go}>${t('save')}<//><//>`;
};

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
  const go = async () => { try { setM(await unlockAccount(state.account, p)); } catch { setErr(t('wrongPass')); } };
  return html`<${Sheet} title=${t('showSeed')} onClose=${onClose}>${m ? html`<div class="seed glass"><div class="words">${m.split(' ').map((x, i) => html`<div class="w"><i>${i + 1}</i>${x}</div>`)}</div></div>` : html`<input class="field glass" type="password" placeholder=${t('pass')} value=${p} onInput=${(e) => { setP(e.target.value); setErr(''); }}/>${err && html`<p class="err">${err}</p>`}<${Btn} onClick=${go}>${t('confirm')}<//>`}<//>`;
};
