import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { html, Icon } from './ui/common.js';
import { Onboarding, SetPass, Seed, Verify, Import, Unlock } from './ui/auth.js';
import { Home, AssetPage, SendPick, ReceivePick, Receive, Send } from './ui/wallet.js';
import { Swap, Stake, NftTab, MarketTab, SettingsTab } from './ui/more.js';
import { useStore, init, setSettings } from './store.js';
import { t } from './i18n.js';

const SCREENS = { onboarding: Onboarding, setPass: SetPass, seed: Seed, verify: Verify, import: Import, unlock: Unlock, asset: AssetPage, send: Send, receive: Receive, swap: Swap, stake: Stake };
const TABS = [['home', 'home'], ['market', 'market'], ['nft', 'nft'], ['settings', 'gear']];

function Coach() {
  const s = useStore();
  const [i, setI] = useState(0);
  if (s.s.coached || s.s.mode !== 'demo' && false) return null;
  const steps = ['coach1', 'coach2', 'coach3'];
  const next = () => (i === 2 ? setSettings({ coached: true }) : setI(i + 1));
  return html`<div class="coach" onClick=${next}><div class=${`coach-card glass-strong pos${i}`}><p>${t(steps[i])}</p><b>${i === 2 ? t('gotIt') : t('next')} →</b></div></div>`;
}

function App() {
  const s = useStore();
  const [tab, setTab] = useState('home');
  const top = s.stack[s.stack.length - 1];
  useEffect(() => { document.documentElement.lang = s.s.lang; }, [s.s.lang]);
  const AUTH = ['onboarding', 'setPass', 'seed', 'verify', 'import', 'unlock'];
  useEffect(() => { if (top && AUTH.includes(top.name)) setTab('home'); }, [top?.name]);
  if (!top) return null;
  let view;
  if (top.name === 'home') view = tab === 'home' ? html`<${Home}/>` : tab === 'market' ? html`<${MarketTab}/>` : tab === 'nft' ? html`<${NftTab}/>` : html`<${SettingsTab}/>`;
  else if (top.name === 'sendPick') view = html`<${Home}/><${SendPick}/>`;
  else if (top.name === 'receivePick') view = html`<${Home}/><${ReceivePick}/>`;
  else { const C = SCREENS[top.name]; view = html`<${C} key=${top.name + s.stack.length} ...${top.props}/>`; }
  const showTabs = top.name === 'home';
  return html`<div class="app">
    <div class="view" key=${top.name === 'home' ? tab : top.name}>${view}</div>
    ${showTabs && html`<nav class="tabbar glass-strong">${TABS.map(([k, ic]) => html`<button class=${tab === k ? 'on' : ''} onClick=${() => setTab(k)} aria-label=${t(k)}><${Icon} n=${ic} s=${22}/></button>`)}</nav>`}
    ${showTabs && !s.s.coached && tab === 'home' && html`<${Coach}/>`}
    ${s.toast && html`<div class="toast glass-strong">${s.toast}</div>`}
  </div>`;
}

// Telegram Mini App: растянуть на весь экран и подогнать цвета
try {
  const tg = window.Telegram?.WebApp;
  if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#000000'); tg.setBackgroundColor?.('#000000'); }
} catch {}

init();
render(html`<${App}/>`, document.getElementById('root'));
