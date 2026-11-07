// Виджеты главного экрана. Включаются в Настройках. (Виджеты уровня iOS/Dynamic Island требуют нативного приложения.)
import { useEffect, useState } from 'preact/hooks';
import { html, Coin, fmtFiat, fmtNum, pct } from './common.js';
import { t } from '../i18n.js';
import { state, assets, priceOf, changeOf, valueOf, total, push } from '../store.js';
import { getChart } from '../core/market.js';

export const WIDGET_IDS = ['balance', 'rates', 'chart'];

function Balance() {
  const tot = total();
  const ch = tot ? assets().reduce((s, a) => s + valueOf(a) * changeOf(a), 0) / tot : 0;
  return html`<div class="wd glass"><div class="dim small">${t('wdBalance')}</div><div class="wd-big">${fmtFiat(tot)}</div><div class=${ch >= 0 ? 'up small' : 'down small'}>${pct(ch)} · 24h</div></div>`;
}

function Rates() {
  const seen = new Set();
  const list = assets().filter((a) => a.native && !seen.has(a.sym) && seen.add(a.sym)).slice(0, 5);
  return html`<div class="wd glass wd-rates"><div class="dim small">${t('wdRates')}</div>${list.map((a) => html`<div class="wd-row" key=${a.sym}><${Coin} a=${a} s=${22}/><b>${a.sym}</b><span class="grow"/><span>${fmtFiat(priceOf(a))}</span><span class=${changeOf(a) >= 0 ? 'up small' : 'down small'}>${pct(changeOf(a))}</span></div>`)}</div>`;
}

function Spark() {
  const lead = assets().find((a) => a.native && a.cg === 'bitcoin') || assets()[0];
  const [d, setD] = useState(null);
  useEffect(() => { getChart(lead.cg, 7, state.s.fiat).then(setD).catch(() => {}); }, [lead.cg, state.s.fiat]);
  let path = '', up = true;
  if (d?.length > 2) {
    const v = d.map((x) => x[1]), mn = Math.min(...v), mx = Math.max(...v) || 1;
    path = v.map((y, i) => `${i ? 'L' : 'M'}${((i / (v.length - 1)) * 160).toFixed(1)} ${(46 - ((y - mn) / (mx - mn || 1)) * 42).toFixed(1)}`).join('');
    up = v[v.length - 1] >= v[0];
  }
  return html`<div class="wd glass"><div class="dim small">${lead.sym} · 7d</div><div class="wd-big">${fmtFiat(priceOf(lead))}</div>
    <svg viewBox="0 0 160 50" width="100%" height="50" preserveAspectRatio="none" aria-hidden="true"><path d=${path} fill="none" stroke=${up ? 'var(--up)' : 'var(--down)'} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg></div>`;
}

const MAP = { balance: Balance, rates: Rates, chart: Spark };
export function Widgets() {
  const on = (state.s.widgets || []).filter((w) => MAP[w]);
  if (!on.length) return null;
  return html`<div class="wd-strip" role="list">${on.map((w) => { const C = MAP[w]; return html`<div class="wd-item" role="listitem" key=${w}><${C}/></div>`; })}</div>`;
}
