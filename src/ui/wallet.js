import { useEffect, useMemo, useState } from 'preact/hooks';
import { html, Icon, Coin, Screen, Btn, Sheet, Chart, Keypad, QR, Scanner, fmtFiat, fmtNum, short, pct, ago, copyText, haptic } from './common.js';
import { t } from '../i18n.js';
import { state, push, pop, assets, balanceOf, priceOf, changeOf, valueOf, total, addrFor, refresh, isDemo, currentKeys, toast, setSettings } from '../store.js';
import { netOf, assetId } from '../core/assets.js';
import { getChart } from '../core/market.js';
import { demoChart } from '../core/demo.js';
import { validateAddress, estimateFee, send as sendTx, explorerTx } from '../core/chains.js';

const PERIODS = [['day', 1], ['week', 7], ['month', 30], ['year', 365]];

export function Home() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [cursor, setCursor] = useState(null);
  const list = assets().filter((a) => balanceOf(a) > 0 || a.native).sort((a, b) => valueOf(b) - valueOf(a));
  const tot = total();
  // график портфеля: показываем динамику самого крупного актива как ориентир
  const lead = list[0];
  useEffect(() => {
    let off = false;
    setData(null);
    if (isDemo()) return setData(demoChart(days, days));
    if (!lead?.cg) return;
    getChart(lead.cg, days, state.s.fiat).then((d) => !off && setData(d)).catch(() => {});
    return () => { off = true; };
  }, [days, lead?.cg, state.s.mode]);
  const shown = cursor ? (cursor[1] / (data?.[data.length - 1]?.[1] || 1)) * tot : tot;
  const first = data?.[0]?.[1], last = data?.[data.length - 1]?.[1];
  const delta = first ? ((last - first) / first) * 100 : 0;
  const [whole, frac] = (shown || 0).toFixed(2).split('.');
  const acts = [['send', 'send', () => push('sendPick')], ['receive', 'receive', () => push('receivePick')], ['swap', 'swap', () => push('swap')], ['stake', 'stake', () => push('stake')]];
  return html`<div class="home">
    <div class="home-top"><b class="logo">noir</b>${isDemo() && html`<span class="badge">${t('demoBadge')}</span>`}<button class="icon-btn" onClick=${refresh} aria-label=${t('refresh')}><${Icon} n="refresh" s=${20}/></button></div>
    <div class="balance coach-1"><div class="dim">${t('total')}</div><div class="big">${fmtFiat(Number(whole)).replace(/\.\d+$/, '')}<small>.${frac}</small></div><div class=${delta >= 0 ? 'up' : 'down'}>${pct(delta)}</div></div>
    <${Chart} data=${data} onCursor=${setCursor}/>
    <div class="chips">${PERIODS.map(([k, d]) => html`<button class=${days === d ? 'chip on' : 'chip'} onClick=${() => { haptic(); setDays(d); }}>${t(k)}</button>`)}</div>
    <div class="actions coach-2">${acts.map(([ic, k, fn]) => html`<button class="act glass" onClick=${fn}><${Icon} n=${ic} s=${22}/><span>${t(k)}</span></button>`)}</div>
    <h3>${t('assets')}</h3>
    <div class="list">${list.map((a) => html`<button class="row glass" key=${assetId(a)} onClick=${() => push('asset', { id: assetId(a) })}>
      <${Coin} a=${a}/><div class="grow-l"><b>${a.sym}</b><span class="dim">${netOf(a.net).name}</span></div>
      <div class="right"><b>${fmtFiat(valueOf(a))}</b><span class=${changeOf(a) >= 0 ? 'up' : 'down'}>${fmtNum(balanceOf(a))} · ${pct(changeOf(a))}</span></div></button>`)}</div>
    <h3>${t('activity')}</h3>
    <div class="list">${state.txs.length ? state.txs.slice(0, 8).map((x) => html`<a class="row glass" key=${x.id} href=${isDemo() ? null : explorerTx(x.net, x.id)} target="_blank" rel="noopener">
      <span class=${`dir ${x.dir}`}><${Icon} n=${x.dir === 'out' ? 'send' : 'receive'} s=${18}/></span><div class="grow-l"><b>${x.dir === 'out' ? t('send') : t('receive')}</b><span class="dim">${netOf(x.net)?.name} · ${ago(x.ts)}</span></div>
      <div class="right"><b>${x.amount === null ? '' : `${x.dir === 'out' ? '−' : '+'}${fmtNum(x.amount)} ${x.sym}`}</b></div></a>`) : html`<p class="dim center">${t('noActivity')}</p>`}</div>
    <div style="height:110px"/>
  </div>`;
}

export function AssetPage({ id }) {
  const a = assets().find((x) => assetId(x) === id);
  const [days, setDays] = useState(7), [data, setData] = useState(null);
  useEffect(() => { if (isDemo()) return setData(demoChart(days, a.sym.length + days)); getChart(a.cg, days, state.s.fiat).then(setData).catch(() => {}); }, [days]);
  return html`<${Screen} title=${a.sym}>
    <div class="center"><${Coin} a=${a} s=${56}/><div class="big" style="margin-top:12px">${fmtNum(balanceOf(a))} <small>${a.sym}</small></div><div class="dim">${fmtFiat(valueOf(a))} · <span class=${changeOf(a) >= 0 ? 'up' : 'down'}>${pct(changeOf(a))}</span></div></div>
    <${Chart} data=${data}/>
    <div class="chips">${PERIODS.map(([k, d]) => html`<button class=${days === d ? 'chip on' : 'chip'} onClick=${() => setDays(d)}>${t(k)}</button>`)}</div>
    <div class="row-btns"><${Btn} onClick=${() => push('send', { id })}>${t('send')}<//><${Btn} kind="ghost" onClick=${() => push('receive', { id })}>${t('receive')}<//></div>
  <//>`;
}

function AssetPicker({ onPick, onClose, only }) {
  const list = assets().filter((a) => (only ? only(a) : true)).sort((a, b) => valueOf(b) - valueOf(a));
  return html`<${Sheet} title=${t('chooseAsset')} onClose=${onClose}><div class="list">${list.map((a) => html`<button class="row" key=${assetId(a)} onClick=${() => onPick(a)}><${Coin} a=${a} s=${36}/><div class="grow-l"><b>${a.sym}</b><span class="dim">${netOf(a.net).name}</span></div><div class="right"><span class="dim">${fmtNum(balanceOf(a))}</span></div></button>`)}</div><//>`;
}

export const SendPick = () => html`<${AssetPicker} onClose=${pop} onPick=${(a) => { pop(); push('send', { id: assetId(a) }); }}/>`;
export const ReceivePick = () => html`<${AssetPicker} onClose=${pop} only=${(a) => a.native} onPick=${(a) => { pop(); push('receive', { id: assetId(a) }); }}/>`;

export function Receive({ id }) {
  const a = assets().find((x) => assetId(x) === id);
  const n = netOf(a.net), addr = addrFor(n.id);
  const [ok, setOk] = useState(false);
  return html`<${Screen} title=${`${t('receive')} ${a.sym}`}>
    <div class="center recv"><${QR} text=${addr}/><div class="addr glass">${addr}</div>
    <p class="dim small">${t('recvHint')}: <b>${n.name}</b></p></div>
    <div class="grow"/><${Btn} onClick=${async () => { await copyText(addr); setOk(true); toast(t('copied')); }}>${ok ? t('copied') : t('copy')}<//>
  <//>`;
}

export function Send({ id }) {
  const a = assets().find((x) => assetId(x) === id);
  const n = netOf(a.net);
  const [step, setStep] = useState(0);
  const [to, setTo] = useState(''), [amt, setAmt] = useState('');
  const [fee, setFee] = useState(null), [scan, setScan] = useState(false), [st, setSt] = useState(null), [tx, setTx] = useState('');
  const bal = balanceOf(a), price = priceOf(a);
  const known = state.s.book.find((b) => b.addr.toLowerCase() === to.toLowerCase());
  const okAddr = to && validateAddress(a.net, to);
  const amount = Number(amt || 0);
  const nativeFee = a.native ? (fee?.fee || 0) : 0;
  const enough = amount > 0 && amount + nativeFee <= bal + 1e-12;
  useEffect(() => { if (okAddr && amount > 0) estimateFee(a, state.addrs, to, amount).then(setFee); }, [okAddr, amt]);
  const fill = (f) => setAmt(String(Math.max(0, f === 1 ? bal - (a.native ? (fee?.fee || 0) * 1.2 : 0) : bal * f)).slice(0, 12));
  const handleScan = (txt) => { setScan(false); setTo(txt.replace(/^[a-z]+:/i, '').split('?')[0]); };
  const run = async () => {
    setSt('sending');
    try {
      if (isDemo()) { await new Promise((r) => setTimeout(r, 900)); setTx('demo'); }
      else { const keys = await currentKeys(); setTx(await sendTx(a, keys, state.addrs, to.trim(), amount)); setTimeout(refresh, 4000); }
      setSt('ok'); haptic(20);
    } catch (e) { setSt('err:' + (e.shortMessage || e.message || '')); }
  };
  if (st) return html`<div class="screen"><div class="center result">
    ${st === 'sending' ? html`<div class="spin big-spin"/>` : st === 'ok' ? html`<div class="okc"><${Icon} n="check" s=${44} w=${2.4}/></div>` : html`<div class="okc bad"><${Icon} n="close" s=${44} w=${2.4}/></div>`}
    <h2>${st === 'sending' ? t('sending') : st === 'ok' ? t('sent') : t('failed')}</h2>
    <p class="dim">${st === 'ok' ? (isDemo() ? t('demoSent') : `${fmtNum(amount)} ${a.sym} → ${short(to)}`) : st.startsWith('err') ? st.slice(4, 140) : ''}</p>
    ${st === 'ok' && !isDemo() && html`<a class="link" href=${explorerTx(a.net, tx)} target="_blank" rel="noopener">${t('viewTx')}</a>`}
    ${st !== 'sending' && html`<${Btn} onClick=${() => { pop(); }}>${t('done')}<//>`}</div></div>`;
  return html`<${Screen} title=${`${t('send')} ${a.sym}`} onBack=${step ? () => setStep(0) : pop}>
    ${step === 0 ? html`
      <div class="glass card"><div class="dim small">${t('network')}</div><div class="rowi"><${Coin} a=${n} s=${28}/><b>${n.name}</b></div></div>
      <div class="glass card"><div class="dim small">${t('to')}</div>
        <div class="rowi"><input class="plain" placeholder=${t('address')} value=${to} onInput=${(e) => setTo(e.target.value.trim())} spellcheck="false" autocapitalize="none"/>
        <button class="icon-btn" onClick=${async () => setTo((await navigator.clipboard.readText().catch(() => '')).trim())} aria-label=${t('paste')}><${Icon} n="copy" s=${20}/></button>
        <button class="icon-btn" onClick=${() => setScan(true)} aria-label=${t('scan')}><${Icon} n="qr" s=${20}/></button></div>
        ${to && !okAddr && html`<div class="err small">${t('badAddr')}</div>`}
        ${okAddr && known && html`<div class="up small">${known.label}</div>`}
        ${okAddr && !known && html`<div class="dim small">${t('newAddr')}</div>`}
        ${state.s.book.length > 0 && html`<div class="chips left">${state.s.book.map((b) => html`<button class="chip" onClick=${() => setTo(b.addr)}>${b.label}</button>`)}</div>`}
      </div>
      <div class="center amount"><div class="dim small">${t('youSend')}</div><div class=${`amt ${amount > 0 && !enough ? 'down' : ''}`}>${amt || '0'}</div><div class="dim">${a.sym} · ≈ ${fmtFiat(amount * price)}</div></div>
      <div class="chips"><button class="chip" onClick=${() => fill(0.25)}>25%</button><button class="chip" onClick=${() => fill(0.5)}>50%</button><button class="chip" onClick=${() => fill(1)}>${t('max')}</button></div>
      <div class="dim center small">${t('available')}: ${fmtNum(bal)} ${a.sym}</div>
      <${Keypad} value=${amt} onChange=${setAmt}/>
      <${Btn} disabled=${!okAddr || amount <= 0 || !enough} onClick=${() => setStep(1)}>${amount > 0 && !enough ? t('insufficient') : t('review')}<//>
    ` : html`
      <div class="glass card">
        <div class="kv"><span class="dim">${t('youSend')}</span><b>${fmtNum(amount)} ${a.sym}</b></div>
        <div class="kv"><span class="dim">≈</span><b>${fmtFiat(amount * price)}</b></div>
        <div class="kv"><span class="dim">${t('to')}</span><b class="mono wrap">${to}</b></div>
        <div class="kv"><span class="dim">${t('network')}</span><b>${n.name}</b></div>
        <div class="kv"><span class="dim">${t('fee')}</span><b>≈ ${fmtNum(fee?.fee ?? 0)} ${fee?.unit || n.sym}</b></div>
      </div>
      <div class="warn glass"><${Icon} n="warn"/><span>${t('poison')}</span></div>
      <div class="grow"/><${Btn} onClick=${run}>${t('sendNow')}<//>
    `}
    ${scan && html`<${Scanner} onResult=${handleScan} onClose=${() => setScan(false)}/>`}
  <//>`;
}
