import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import htm from 'htm';
import qrcode from 'qrcode-generator';
import jsQR from 'jsqr';
import { t } from '../i18n.js';
import { pop, state } from '../store.js';
import { FIAT } from '../core/market.js';
import { iconUrls, chainLogo } from '../core/assets.js';

export const html = htm.bind(h);

// ---------- форматирование ----------
export const fmtFiat = (v, d = 2) => {
  const sym = FIAT[state.s.fiat] || '$';
  const n = Math.abs(v) >= 1000 ? Math.round(v) : v;
  return sym + n.toLocaleString('en-US', { minimumFractionDigits: Math.abs(v) >= 1000 ? 0 : d, maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : d });
};
export const fmtNum = (v, max = 6) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: v >= 1000 ? 2 : max }));
export const short = (a) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-5)}` : a || '');
export const pct = (v) => `${v >= 0 ? '+' : ''}${(v || 0).toFixed(1)}%`;
export const ago = (ts) => {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `${m} ${t('min')}`;
  const hr = Math.round(m / 60);
  return hr < 48 ? `${hr} h` : new Date(ts).toLocaleDateString();
};
export const haptic = (ms = 8) => { try { navigator.vibrate?.(ms); } catch {} };
export const copyText = async (s) => { try { await navigator.clipboard.writeText(s); } catch { const i = document.createElement('textarea'); i.value = s; document.body.appendChild(i); i.select(); document.execCommand('copy'); i.remove(); } };

// ---------- иконки ----------
const P = {
  send: 'M7 17 17 7M9 7h8v8', receive: 'M17 7 7 17M15 17H7V9', swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7', stake: 'M12 3v18M5 10l7-7 7 7M6 21h12',
  home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4z', market: 'M4 19V9M10 19V5M16 19v-7M21 19H3', nft: 'M4 4h16v16H4zM4 15l5-5 5 5 2-2 4 4', gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-1-2 3.5 2 1.5A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.5 2 3.5 2.3-1a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z',
  dots: 'M5 12h.01M12 12h.01M19 12h.01', back: 'm15 5-7 7 7 7', close: 'M6 6l12 12M18 6 6 18', copy: 'M9 9h10v10H9zM5 15V5h10', qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v6h-3', check: 'm5 12 5 5 9-10', lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', arrow: 'M5 12h14M13 6l6 6-6 6', plus: 'M12 5v14M5 12h14', chev: 'm9 5 7 7-7 7', down: 'm6 9 6 6 6-6', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5', warn: 'M12 3 2 20h20zM12 10v5M12 18v.5', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18', key: 'M14 10a4 4 0 1 0-3 4l8 6v-3h3v-3h-3l-2-2',
};
export const Icon = ({ n, s = 22, w = 1.8 }) => html`<svg viewBox="0 0 24 24" width=${s} height=${s} fill="none" stroke="currentColor" stroke-width=${w} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${P[n] || ''}/></svg>`;

export function Coin({ a, s = 40 }) {
  const urls = iconUrls(a);
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [a.img]);
  const [bad, setBad] = useState(false);
  const net = a.net || a.id;
  const showBadge = a.contract || ['bsc', 'pol', 'arb', 'opt', 'base'].includes(net);
  return html`<span class="coinw" style=${`width:${s}px;height:${s}px`}>
    ${i < urls.length
      ? html`<img class="ci" src=${urls[i]} width=${s} height=${s} alt="" loading="lazy" onError=${() => setI(i + 1)}/>`
      : html`<span class="coin" style=${`width:${s}px;height:${s}px;font-size:${s * 0.38}px;background:${a.color || '#444'}`}>${(a.sym || '?').slice(0, (a.sym || '').length > 3 ? 2 : 3)}</span>`}
    ${showBadge && !bad && html`<img class="cbadge" src=${chainLogo(net)} alt="" onError=${() => setBad(true)}/>`}
  </span>`;
}

// ---------- каркас экрана ----------
export const Screen = ({ title, onBack, right, children, noPad }) => html`
  <div class="screen">
    <div class="topbar">
      ${onBack !== false ? html`<button class="icon-btn glass" onClick=${onBack || pop} aria-label=${t('back')}><${Icon} n="back"/></button>` : html`<span style="width:44px"/>`}
      <div class="title">${title}</div>
      <div style="min-width:44px;display:flex;justify-content:flex-end">${right}</div>
    </div>
    <div class=${noPad ? 'body nopad' : 'body'}>${children}</div>
  </div>`;

export const Btn = ({ children, onClick, kind = 'primary', disabled, busy, ...r }) =>
  html`<button class=${`btn ${kind}`} disabled=${disabled || busy} onClick=${(e) => { haptic(); onClick?.(e); }} ...${r}>${busy ? html`<span class="spin"/>` : children}</button>`;

// ---------- нижний лист ----------
// Пока открыт нижний лист, нижняя панель вкладок уезжает вниз (иначе она перекрывает кнопки листа);
// лист закрывается тапом вне окна или крестиком, и панель возвращается.
let openSheets = 0;
const useSheetOpen = () => useEffect(() => {
  openSheets++; document.body.classList.add('sheet-open');
  return () => { openSheets--; if (!openSheets) document.body.classList.remove('sheet-open'); };
}, []);
export const Sheet = ({ title, onClose, children }) => { useSheetOpen(); return html`
  <div class="sheet-wrap" onClick=${onClose}>
    <div class="sheet glass-strong" onClick=${(e) => e.stopPropagation()}>
      <div class="grab"/>
      <div class="sheet-h"><b>${title}</b><button class="icon-btn" onClick=${onClose} aria-label=${t('close')}><${Icon} n="close"/></button></div>
      <div class="sheet-b">${children}</div>
    </div>
  </div>`;
};

// ---------- график ----------
export function Chart({ data, h: H = 150, up = true, onCursor }) {
  const ref = useRef();
  const [cur, setCur] = useState(null);
  const W = 360;
  if (!data || data.length < 2) return html`<div style=${`height:${H}px`} class="chart-empty"/>`;
  const ys = data.map((d) => d[1]);
  const lo = Math.min(...ys), hi = Math.max(...ys), rg = hi - lo || 1;
  const pts = data.map((d, i) => [(i / (data.length - 1)) * W, H - 14 - ((d[1] - lo) / rg) * (H - 34)]);
  // сглаженная кривая (Catmull-Rom → Bezier)
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += `C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  const idx = cur ?? pts.length - 1;
  const [cx, cy] = pts[idx];
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = ((e.touches?.[0]?.clientX ?? e.clientX) - r.left) / r.width;
    const i = Math.max(0, Math.min(pts.length - 1, Math.round(x * (pts.length - 1))));
    setCur(i); onCursor?.(data[i]);
  };
  const end = () => { setCur(null); onCursor?.(null); };
  return html`<svg ref=${ref} viewBox=${`0 0 ${W} ${H}`} class="chart" style=${`height:${H}px`} onPointerMove=${move} onPointerDown=${move} onPointerLeave=${end} onPointerUp=${end} onPointerCancel=${end}>
    <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <path d=${`${d}L${W},${H}L0,${H}Z`} fill="url(#cg)" class="chart-fill"/>
    <path d=${d} fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" class="chart-line" pathLength="1"/>
    <line x1=${cx} x2=${cx} y1=${cy} y2=${H} stroke="#fff" stroke-opacity=".35" stroke-dasharray="3 4"/>
    <circle cx=${cx} cy=${cy} r="9" fill="#fff" fill-opacity=".18"/><circle cx=${cx} cy=${cy} r="4.5" fill="#fff"/>
  </svg>`;
}

// ---------- клавиатура ----------
export const Keypad = ({ value, onChange }) => {
  const press = (k) => {
    haptic(6);
    if (k === '⌫') return onChange(value.slice(0, -1));
    if (k === '.') { if (value.includes('.')) return; return onChange(value === '' ? '0.' : value + '.'); }
    if (value === '0') return onChange(k);
    if ((value.split('.')[1] || '').length >= 9) return;
    onChange(value + k);
  };
  return html`<div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => html`<button key=${k} onClick=${() => press(k)}>${k}</button>`)}</div>`;
};

// ---------- QR ----------
export function QR({ text, size = 220 }) {
  const q = qrcode(0, 'M');
  q.addData(text); q.make();
  const n = q.getModuleCount();
  let p = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) p += `M${c},${r}h1v1h-1z`;
  return html`<div class="qr" style=${`width:${size}px;height:${size}px`}><svg viewBox=${`-2 -2 ${n + 4} ${n + 4}`} shape-rendering="crispEdges"><rect x="-2" y="-2" width=${n + 4} height=${n + 4} fill="#fff"/><path d=${p} fill="#000"/></svg></div>`;
}

export function Scanner({ onResult, onClose }) {
  const v = useRef(), [err, setErr] = useState('');
  useEffect(() => {
    let stop = false, stream, raf;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        v.current.srcObject = stream; await v.current.play();
        const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
        const tick = () => {
          if (stop) return;
          if (v.current.videoWidth) {
            cv.width = v.current.videoWidth; cv.height = v.current.videoHeight;
            cx.drawImage(v.current, 0, 0);
            const code = jsQR(cx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height);
            if (code?.data) { onResult(code.data); return; }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) { setErr(String(e.message || e)); }
    })();
    return () => { stop = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((x) => x.stop()); };
  }, []);
  return html`<${Sheet} title=${t('scan')} onClose=${onClose}><div class="scan"><video ref=${v} playsinline muted/><div class="scan-frame"/></div>${err && html`<p class="dim">${err}</p>`}<//>`;
}

// Сохранить текстовый файл: на телефоне через системное меню «Поделиться», иначе обычная загрузка
export async function saveTextFile(name, text) {
  const file = new File([text], name, { type: 'application/json' });
  try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const standalone = !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches);
