import { useState } from 'preact/hooks';
import { html, Icon, Screen, Btn, haptic } from './common.js';
import { t } from '../i18n.js';
import { push, pop, enterDemo, createVault, unlock, setSettings, resetTo, state } from '../store.js';
import { newMnemonic, isValidMnemonic, normalize } from '../core/vault.js';

export function Onboarding() {
  const [i, setI] = useState(0);
  const slides = [1, 2, 3, 4];
  const last = i === 3;
  return html`<div class="screen onb">
    <div class="onb-top"><b>noir</b>${!last && html`<button class="link" onClick=${() => setI(3)}>${t('skip')}</button>`}</div>
    <div class="onb-art" key=${i}><div class="ring r1"/><div class="ring r2"/><div class="ring r3"/><div class="onb-ic"><${Icon} n=${['globe', 'key', 'lock', 'eye'][i]} s=${54} w=${1.4}/></div></div>
    <div class="onb-txt" key=${'t' + i}><h1>${t(`ob${i + 1}t`)}</h1><p class="dim">${t(`ob${i + 1}d`)}</p></div>
    <div class="onb-bot">
      <div class="bars">${slides.map((s, k) => html`<i class=${k <= i ? 'on' : ''}/>`)}</div>
      ${last
        ? html`<${Btn} onClick=${enterDemo}>${t('tryDemo')}<//><${Btn} kind="ghost" onClick=${() => push('setPass', { mode: 'create' })}>${t('createWallet')}<//><button class="link center" onClick=${() => push('import')}>${t('importWallet')}</button>`
        : html`<${Btn} onClick=${() => { haptic(); setI(i + 1); }}>${t('next')}<//>`}
    </div>
  </div>`;
}

export function SetPass({ mode, mnemonic }) {
  const [p, setP] = useState(''), [p2, setP2] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const go = async () => {
    if (p.length < 8) return setErr(t('passShort'));
    if (p !== p2) return setErr(t('passMismatch'));
    if (mode === 'import') { setBusy(true); await createVault(mnemonic, p); return; }
    push('seed', { password: p, mnemonic: newMnemonic(12) });
  };
  return html`<${Screen} title=${t('setPass')}>
    <p class="dim">${t('passHint')}</p>
    <input class="field glass" type="password" autocomplete="new-password" placeholder=${t('pass')} value=${p} onInput=${(e) => { setP(e.target.value); setErr(''); }}/>
    <input class="field glass" type="password" autocomplete="new-password" placeholder=${t('pass2')} value=${p2} onInput=${(e) => { setP2(e.target.value); setErr(''); }}/>
    ${err && html`<p class="err">${err}</p>`}
    <div class="grow"/><${Btn} onClick=${go} busy=${busy}>${t('next')}<//>
  <//>`;
}

export function Seed({ mnemonic, password }) {
  const [show, setShow] = useState(false);
  const w = mnemonic.split(' ');
  return html`<${Screen} title=${t('seedTitle')}>
    <div class="warn glass"><${Icon} n="warn"/><span>${t('seedWarn')}</span></div>
    <div class="seed glass" onClick=${() => setShow(true)}>
      <div class=${show ? 'words' : 'words blur'}>${w.map((x, i) => html`<div class="w"><i>${i + 1}</i>${x}</div>`)}</div>
      ${!show && html`<div class="reveal"><${Icon} n="eye"/> ${t('reveal')}</div>`}
    </div>
    <div class="grow"/><${Btn} disabled=${!show} onClick=${() => push('verify', { mnemonic, password })}>${t('seedSaved')}<//>
  <//>`;
}

export function Verify({ mnemonic, password }) {
  const w = mnemonic.split(' ');
  const [idx] = useState(() => { const s = new Set(); while (s.size < 3) s.add(Math.floor(Math.random() * w.length)); return [...s].sort((a, b) => a - b); });
  const [v, setV] = useState(['', '', '']), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const go = async () => {
    if (idx.every((k, n) => v[n].trim().toLowerCase() === w[k])) { setBusy(true); await createVault(mnemonic, password); }
    else setErr(t('wrong'));
  };
  return html`<${Screen} title=${t('verifyTitle')}>
    <p class="dim">${t('verifyDesc')} ${idx.map((k) => k + 1).join(', ')}</p>
    ${idx.map((k, n) => html`<input class="field glass" autocapitalize="none" autocomplete="off" placeholder=${`${t('word')} #${k + 1}`} value=${v[n]} onInput=${(e) => { const c = [...v]; c[n] = e.target.value; setV(c); setErr(''); }}/>`)}
    ${err && html`<p class="err">${err}</p>`}
    <div class="grow"/><${Btn} onClick=${go} busy=${busy}>${t('done')}<//>
  <//>`;
}

export function Import() {
  const [m, setM] = useState(''), [err, setErr] = useState('');
  const go = () => { if (!isValidMnemonic(m)) return setErr(t('badSeed')); push('setPass', { mode: 'import', mnemonic: normalize(m) }); };
  return html`<${Screen} title=${t('importTitle')}>
    <p class="dim">${t('importDesc')}</p>
    <textarea class="field glass" rows="5" autocapitalize="none" autocomplete="off" spellcheck="false" value=${m} onInput=${(e) => { setM(e.target.value); setErr(''); }}/>
    ${err && html`<p class="err">${err}</p>`}
    <div class="grow"/><${Btn} onClick=${go} disabled=${!m.trim()}>${t('next')}<//>
  <//>`;
}

export function Unlock() {
  const [p, setP] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setErr('');
    try { await unlock(p); } catch { setErr(t('wrongPass')); setBusy(false); }
  };
  return html`<div class="screen onb">
    <div class="onb-top"><b>noir</b></div>
    <div class="onb-art"><div class="ring r1"/><div class="ring r2"/><div class="ring r3"/><div class="onb-ic"><${Icon} n="lock" s=${54} w=${1.4}/></div></div>
    <div class="onb-txt"><h1>${t('unlockTitle')}</h1></div>
    <div class="onb-bot">
      <input class="field glass" type="password" autocomplete="current-password" placeholder=${t('pass')} value=${p} onInput=${(e) => { setP(e.target.value); setErr(''); }} onKeyDown=${(e) => e.key === 'Enter' && go()}/>
      ${err && html`<p class="err">${err}</p>`}
      <${Btn} onClick=${go} busy=${busy} disabled=${!p}>${t('unlock')}<//>
      <button class="link center" onClick=${enterDemo}>${t('tryDemo')}</button>
    </div>
  </div>`;
}
