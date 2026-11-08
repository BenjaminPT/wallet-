// Покупка криптовалюты банковской картой через партнёра (как в Trust Wallet): оплату и проверку личности делает партнёр.
import { useState } from 'preact/hooks';
import { html, Coin, Screen, Btn, short, haptic } from './common.js';
import { t } from '../i18n.js';
import { addrFor } from '../store.js';
import { assetList, netOf } from '../core/assets.js';
import { buyAvailable, rampUrl } from '../core/partners.js';

const SYMS = ['USDT', 'USDC', 'ETH', 'BTC', 'SOL', 'TON', 'TRX', 'BNB'];
export function Buy() {
  const [sym, setSym] = useState('USDT');
  const opts = assetList(false, []).filter((a) => a.sym === sym && (a.native || a.contract));
  const [net, setNet] = useState(opts[0]?.net);
  const cur = opts.find((o) => o.net === net) || opts[0];
  const address = cur ? addrFor(cur.net) : '';
  const url = cur ? rampUrl({ net: cur.net, sym, address }) : null;
  return html`<${Screen} title=${t('buyTitle')}>
    <p class="dim">${t('buyHint')}</p>
    <div class="dim small">${t('buyAsset')}</div>
    <div class="chips left">${SYMS.map((s) => html`<button class=${sym === s ? 'chip on' : 'chip'} onClick=${() => { setSym(s); setNet(undefined); }}>${s}</button>`)}</div>
    <div class="dim small">${t('buyNet')}</div>
    <div class="chips left">${opts.map((o) => html`<button class=${cur?.net === o.net ? 'chip on' : 'chip'} onClick=${() => setNet(o.net)}>${netOf(o.net).name}</button>`)}</div>
    ${cur && html`<div class="glass card"><div class="dim small">${t('buyAddress')}</div><div class="rowi"><${Coin} a=${cur} s=${28}/><b class="mono wrap">${short(address)}</b></div></div>`}
    ${!buyAvailable() && html`<div class="warn glass"><span>${t('buyNotConnected')}</span></div>`}
    <p class="dim small">${t('buyDisclaimer')}</p>
    <div class="grow"/>
    <${Btn} disabled=${!url} onClick=${() => { haptic(); window.open(url, '_blank', 'noopener,noreferrer'); }}>${t('buyOpen')}<//>
  <//>`;
}
