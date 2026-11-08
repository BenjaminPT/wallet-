// Каталог токенов: поиск по сетям, добавление в кошелёк. Добавленный токен сразу доступен для отправки, получения и обмена.
import { useEffect, useState } from 'preact/hooks';
import { html, Coin, Screen, haptic } from './common.js';
import { t } from '../i18n.js';
import { state, setSettings, refresh, toast } from '../store.js';
import { netOf, stdOf } from '../core/assets.js';
import { loadCatalog, searchCatalog } from '../core/market.js';

export function Catalog() {
  const [all, setAll] = useState(null), [q, setQ] = useState(''), [err, setErr] = useState(false), [, force] = useState(0);
  useEffect(() => { loadCatalog().then(setAll).catch(() => setErr(true)); }, []);
  const have = (x) => state.s.custom.some((c) => c.net === x.net && c.contract?.toLowerCase() === x.contract.toLowerCase());
  const add = (x) => {
    if (have(x)) return;
    setSettings({ custom: [...state.s.custom, { net: x.net, sym: x.sym, name: x.name, decimals: x.decimals, contract: x.contract, cg: `lf:${x.chain}:${x.contract}`, color: '#666', img: x.img }] });
    haptic(8); toast(t('tokenAdded', { s: x.sym })); refresh(); force((n) => n + 1);
  };
  const res = all ? searchCatalog(all, q) : [];
  return html`<${Screen} title=${t('catalogTitle')}>
    <input class="field glass" placeholder=${t('catalogSearch')} value=${q} autocapitalize="none" spellcheck="false" onInput=${(e) => setQ(e.target.value)}/>
    <p class="dim small">${t('catalogWarn')}</p>
    ${!all && !err && Array.from({ length: 8 }, (_, i) => html`<div class="row glass skel" key=${i}><i class="sk-c"/><div class="grow-l"><i class="sk-l"/><i class="sk-l s"/></div></div>`)}
    ${err && html`<p class="err">${t('catalogErr')}</p>`}
    <div class="list">${res.map((x) => html`<div class="row glass" key=${x.net + x.contract}>
      <${Coin} a=${{ sym: x.sym, color: '#666', img: x.img, net: x.net }}/>
      <div class="grow-l"><b>${x.sym}</b><span class="dim">${x.name} · ${netOf(x.net).name}${stdOf(x) ? ' · ' + stdOf(x) : ''}</span></div>
      <button class=${have(x) ? 'chip on' : 'chip'} disabled=${have(x)} onClick=${() => add(x)}>${have(x) ? t('added') : t('addToken')}</button></div>`)}</div>
    ${all && !res.length && html`<p class="dim center">${t('nothingFound')}</p>`}
    <div style="height:30px"/>
  <//>`;
}
