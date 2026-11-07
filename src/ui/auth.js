import { useState } from 'preact/hooks';
import { html, Icon, Screen, Btn, Sheet, haptic } from './common.js';
import { TERMS } from '../legal.js';
import { getLang } from '../i18n.js';
import { t } from '../i18n.js';
import { push, pop, createVault, unlock, unlockBiometric, switchAccount, isUnlocked, hasAccounts, setSettings, resetTo, state } from '../store.js';
import { bioEnabled, bioAvailable } from '../core/bio.js';
import { Mark } from './mark.js';
import { listAccounts, getAccount } from '../core/accounts.js';
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
const signIn = () => push(hasAccounts() ? 'accounts' : 'import');
import { useEffect } from 'preact/hooks';
import { newMnemonic, isValidMnemonic, normalize } from '../core/vault.js';

export function Onboarding() {
  const [i, setI] = useState(0);
  const slides = [1, 2, 3, 4];
  const last = i === 3;
  return html`<div class="screen onb">
    <div class="onb-top"><b class="logo"><${Mark} s=${24}/></b><span class="onb-links">${!last && html`<button class="link" onClick=${() => setI(3)}>${t('skip')}</button>`}<button class="link signin" onClick=${signIn}>${t('signIn')}</button></span></div>
    <div class="onb-art" key=${i}><div class="ring r1"/><div class="ring r2"/><div class="ring r3"/><div class="onb-ic"><${Icon} n=${['globe', 'key', 'lock', 'eye'][i]} s=${54} w=${1.4}/></div></div>
    <div class="onb-txt" key=${'t' + i}><h1>${t(`ob${i + 1}t`)}</h1><p class="dim">${t(`ob${i + 1}d`)}</p></div>
    <div class="onb-bot">
      <div class="bars">${slides.map((s, k) => html`<i class=${k <= i ? 'on' : ''}/>`)}</div>
      ${last
        ? html`<${Btn} onClick=${() => push('setPass', { mode: 'create' })}>${t('createWallet')}<//><${Btn} kind="ghost" onClick=${signIn}>${t('signInFull')}<//>`
        : html`<${Btn} onClick=${() => { haptic(); setI(i + 1); }}>${t('next')}<//>`}
    </div>
  </div>`;
}

export const TermsSheet = ({ onClose }) => {
  const T = TERMS[getLang()] || TERMS.en;
  return html`<${Sheet} title=${T.title} onClose=${onClose}>${T.body.map(([h, p]) => html`<div class="terms"><b>${h}</b><p class="dim">${p}</p></div>`)}<//>`;
};
const Check = ({ on, onChange, children }) => html`<button class=${on ? 'chk on' : 'chk'} role="checkbox" aria-checked=${on} onClick=${() => { haptic(6); onChange(!on); }}><i><${Icon} n="check" s=${16} w=${3}/></i><span>${children}</span></button>`;

export function SetPass({ mode, mnemonic }) {
  const [p, setP] = useState(''), [p2, setP2] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const [a1, setA1] = useState(false), [a2, setA2] = useState(false), [terms, setTerms] = useState(false);
  const go = async () => {
    if (p.length < 10) return setErr(t('passShort'));
    if (p !== p2) return setErr(t('passMismatch'));
    if (mode === 'import') { setBusy(true); try { await createVault(mnemonic, p); } catch (e) { setErr(e.message === 'duplicate_account' ? t('dupAccount') : t('bioFail')); setBusy(false); } return; }
    push('seed', { password: p, mnemonic: newMnemonic(12) });
  };
  return html`<${Screen} title=${t('setPass')}>
    <p class="dim">${t('passHint')}</p>
    <input class="field glass" type="password" autocomplete="new-password" placeholder=${t('pass')} value=${p} onInput=${(e) => { setP(e.target.value); setErr(''); }}/>
    <input class="field glass" type="password" autocomplete="new-password" placeholder=${t('pass2')} value=${p2} onInput=${(e) => { setP2(e.target.value); setErr(''); }}/>
    ${err && html`<p class="err">${err}</p>`}
    <div class="chks"><${Check} on=${a1} onChange=${setA1}>${t('accRisk')}<//><${Check} on=${a2} onChange=${setA2}>${t('accTerms')} <u onClick=${(e) => { e.stopPropagation(); setTerms(true); }}>(${t('termsLink')})</u><//></div>
    <div class="grow"/><${Btn} onClick=${go} busy=${busy} disabled=${!a1 || !a2 || !p}>${t('next')}<//>
    ${terms && html`<${TermsSheet} onClose=${() => setTerms(false)}/>`}
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
    if (idx.every((k, n) => v[n].trim().toLowerCase() === w[k])) { setBusy(true); try { await createVault(mnemonic, password); } catch (e) { setErr(e.message === 'duplicate_account' ? t('dupAccount') : String(e.message)); setBusy(false); } }
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

export function Accounts() {
  const list = listAccounts(), act = state.account;
  const first = state.stack.length < 2;
  return html`<${Screen} title=${t('accountsTitle')} onBack=${first ? false : undefined}>
    ${!list.length && html`<p class="dim">${t('noAccounts')}</p>`}
    <div class="list">${list.map((a) => html`<button class=${`row glass acc${a.id === act ? ' cur' : ''}`} key=${a.id} onClick=${() => { haptic(); switchAccount(a.id); }}>
      <span class="prof-av"><${Icon} n=${isUnlocked(a.id) ? 'check' : 'lock'} s=${20}/></span>
      <div class="grow-l"><b>${a.name}</b><span class="dim small mono">${short(a.addr) || '—'}</span></div>
      <span class="dim small">${a.id === act ? t('active') : isUnlocked(a.id) ? t('unlockedLbl') : ''}</span></button>`)}</div>
    <div class="grow"/>
    <${Btn} onClick=${() => push('setPass', { mode: 'create' })}>${t('addAccountNew')}<//>
    <${Btn} kind="ghost" onClick=${() => push('import')}>${t('signInFull')}<//>
  <//>`;
}

export function Unlock() {
  const id = state.account, acc = getAccount(id);
  const [p, setP] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [bio, setBio] = useState(false);
  useEffect(() => { if (bioEnabled(id)) bioAvailable().then((ok) => { setBio(ok); if (ok) unlockBiometric(id).catch(() => {}); }); }, [id]);
  const goBio = async () => { setErr(''); try { await unlockBiometric(id); } catch { setErr(t('bioFail')); } };
  const go = async () => {
    setBusy(true); setErr('');
    try { await unlock(p, id); } catch (e) { const m = /locked_out:(\d+)/.exec(e.message); setErr(m ? t('lockedOut', { s: m[1] }) : t('wrongPass')); setBusy(false); }
  };
  return html`<div class="screen onb">
    <div class="onb-top"><b class="logo"><${Mark} s=${24}/></b></div>
    <div class="onb-art"><div class="ring r1"/><div class="ring r2"/><div class="ring r3"/><div class="onb-ic"><${Icon} n="lock" s=${54} w=${1.4}/></div></div>
    <div class="onb-txt"><h1>${t('unlockTitle')}</h1>${acc && html`<p class="dim mono">${acc.name} · ${short(acc.addr)}</p>`}</div>
    <div class="onb-bot">
      <input class="field glass" type="password" autocomplete="current-password" placeholder=${t('pass')} value=${p} onInput=${(e) => { setP(e.target.value); setErr(''); }} onKeyDown=${(e) => e.key === 'Enter' && go()}/>
      ${err && html`<p class="err">${err}</p>`}
      <${Btn} onClick=${go} busy=${busy} disabled=${!p}>${t('unlock')}<//>
      ${bio && html`<${Btn} kind="ghost" onClick=${goBio}>${t('bioUnlock')}<//>`}
      <button class="link center" onClick=${() => push('accounts')}>${t('switchAccount')}</button>
      
    </div>
  </div>`;
}
