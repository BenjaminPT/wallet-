// Кнопка «⋯» на главном экране и шторка с аккаунтами: переключение без пароля для открытых аккаунтов,
// переименование, цвет-метка, перевод между своими аккаунтами.
import { useState } from 'preact/hooks';
import { html, Icon, Btn, Sheet, haptic } from './common.js';
import { t } from '../i18n.js';
import { state, push, switchAccount, isUnlocked, dismissBioOffer, toast } from '../store.js';
import { bioEnable } from '../core/bio.js';
import { listAccounts, renameAccount, setAccountColor, COLORS } from '../core/accounts.js';

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
export const Avatar = ({ a, s = 40 }) => html`<span class="adot" style=${`width:${s}px;height:${s}px;background:${COLORS[a.color] || COLORS[0]}`}>${(a.name || '?').slice(0, 1).toUpperCase()}</span>`;

export function AccountButton() {
  const [open, setOpen] = useState(false);
  const acc = listAccounts().find((a) => a.id === state.account);
  return html`<button class="acc-btn glass" aria-label=${t('accountsTitle')} aria-haspopup="dialog" onClick=${() => { haptic(); setOpen(true); }}>
      <i class="cdot" style=${`background:${COLORS[acc?.color ?? 0]}`}/><${Icon} n="dots" s=${22} w=${3}/></button>
    ${open && html`<${AccountsSheet} onClose=${() => setOpen(false)}/>`}`;
}

export function AccountsSheet({ onClose }) {
  const [view, setView] = useState('list'), [editId, setEditId] = useState(null), [, force] = useState(0);
  const list = listAccounts(), cur = state.account;
  const others = list.filter((a) => a.id !== cur);

  if (view === 'edit') {
    const a = list.find((x) => x.id === editId) || list[0];
    return html`<${Sheet} title=${t('editAccount')} onClose=${onClose}>
      <div class="center"><${Avatar} a=${a} s=${64}/></div>
      <input class="field glass" maxlength="24" value=${a.name} aria-label=${t('renamePrompt')} onInput=${(e) => { renameAccount(a.id, e.target.value || a.name); }} onBlur=${() => force((n) => n + 1)}/>
      <div class="dim small">${t('colorTag')}</div>
      <div class="swatches">${COLORS.map((c, i) => html`<button class=${a.color === i ? 'cswatch on' : 'cswatch'} style=${`background:${c}`} aria-label=${`${t('colorTag')} ${i + 1}`} aria-pressed=${a.color === i} onClick=${() => { haptic(6); setAccountColor(a.id, i); force((n) => n + 1); }}/>`)}</div>
      <${Btn} onClick=${() => setView('list')}>${t('done')}<//><//>`;
  }

  if (view === 'transfer') {
    return html`<${Sheet} title=${t('transferTitle')} onClose=${onClose}>
      <p class="dim small">${t('transferHint')}</p>
      ${others.map((a) => html`<button class="row glass acc" key=${a.id} onClick=${() => { onClose(); push('sendPick', { toAcc: a.id }); }}>
        <${Avatar} a=${a}/><div class="grow-l"><b>${a.name}</b><span class="dim small mono">${short(a.addr)}</span></div><span class="dim"><${Icon} n="chev" s=${16}/></span></button>`)}
      <${Btn} kind="ghost" onClick=${() => setView('list')}>${t('back')}<//><//>`;
  }

  return html`<${Sheet} title=${t('accountsTitle')} onClose=${onClose}>
    <div class="alist">${list.map((a) => html`<div class=${`row glass acc${a.id === cur ? ' cur' : ''}`} key=${a.id}>
      <button class="acc-main" onClick=${() => { haptic(); onClose(); if (a.id !== cur) switchAccount(a.id); }} aria-current=${a.id === cur}>
        <${Avatar} a=${a}/><div class="grow-l"><b>${a.name}</b><span class="dim small mono">${short(a.addr) || '—'}</span></div>
        <span class="dim small">${a.id === cur ? t('active') : isUnlocked(a.id) ? t('unlockedLbl') : t('lockedLbl')}</span></button>
      <button class="icon-btn" aria-label=${t('editAccount')} onClick=${() => { setEditId(a.id); setView('edit'); }}><${Icon} n="key" s=${18}/></button></div>`)}</div>
    ${others.length > 0 && html`<${Btn} onClick=${() => setView('transfer')}>${t('transferTitle')}<//>`}
    <${Btn} kind="ghost" onClick=${() => { onClose(); push('setPass', { mode: 'create' }); }}>${t('addAccountNew')}<//>
    <button class="link center" onClick=${() => { onClose(); push('import'); }}>${t('signInFull')}</button>
  <//>`;
}

export function BioOffer() {
  const [busy, setBusy] = useState(false);
  const acc = listAccounts().find((a) => a.id === state.offerBio);
  const on = async () => { setBusy(true); try { await bioEnable(state.offerBio, state.mnemonic, acc?.name); toast(t('bioOnToast')); } catch { toast(t('bioFail')); } dismissBioOffer(); };
  return html`<${Sheet} title=${t('bio')} onClose=${dismissBioOffer}>
    <p class="dim">${t('bioOffer')}</p>
    <${Btn} busy=${busy} onClick=${on}>${t('bioEnableBtn')}<//>
    <${Btn} kind="ghost" onClick=${dismissBioOffer}>${t('notNow')}<//><//>`;
}
