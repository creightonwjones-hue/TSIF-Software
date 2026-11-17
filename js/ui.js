// Small shared helpers for building screens: elements, money, sounds, toasts, confetti, charts.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function money(n) {
  const neg = n < 0;
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return (neg ? '−$' : '$') + s;
}

export function pct(change) {
  const p = Math.round(change * 100);
  if (p === 0) return { text: '0%', cls: 'flat', arrow: '•' };
  return p > 0 ? { text: `+${p}%`, cls: 'up', arrow: '▲' } : { text: `${p}%`, cls: 'down', arrow: '▼' };
}

export function changeTag(change) {
  const c = pct(change);
  return h('span', { class: `chg ${c.cls}` }, `${c.arrow} ${c.text}`);
}

export const RISK = [null,
  { dots: '🟢', label: 'Steady' },
  { dots: '🟡', label: 'Medium' },
  { dots: '🟠', label: 'Bumpy' },
  { dots: '🔴', label: 'Wild' }];

export function riskMeter(risk) {
  const bar = h('span', { class: 'risk-bar' });
  for (let i = 1; i <= 4; i++) bar.append(h('i', { class: i <= risk ? `on r${risk}` : '' }));
  return h('span', { class: 'risk', title: `Risk: ${RISK[risk].label}` }, bar, h('small', {}, RISK[risk].label));
}

// ---------- Sound (tiny Web Audio beeps, no files) ----------
let ctx = null;
let muted = false;
try { muted = localStorage.getItem('sprout-muted') === '1'; } catch { /* storage blocked */ }
export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('sprout-muted', m ? '1' : '0'); } catch { /* ignore */ }
}
function tone(freq, start, dur, type = 'sine', vol = 0.08) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + dur + 0.05);
}
export function sound(kind) {
  if (muted) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (kind === 'coin') { tone(988, 0, 0.08, 'square', 0.05); tone(1319, 0.08, 0.25, 'square', 0.05); }
    else if (kind === 'click') tone(660, 0, 0.06, 'triangle', 0.06);
    else if (kind === 'bad') { tone(330, 0, 0.15, 'sawtooth', 0.04); tone(247, 0.15, 0.3, 'sawtooth', 0.04); }
    else if (kind === 'door') { tone(523, 0, 0.08, 'triangle'); tone(784, 0.07, 0.12, 'triangle'); }
    else if (kind === 'bell') { tone(784, 0, 0.6, 'sine', 0.1); tone(1175, 0.02, 0.8, 'sine', 0.05); }
    else if (kind === 'tada') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle', 0.08)); }
  } catch { /* audio not available */ }
}

// ---------- Toasts ----------
export function toast(text, kind = 'info') {
  const box = document.getElementById('toasts');
  while (box.children.length >= 2) box.firstChild.remove();
  const t = h('div', { class: `toast ${kind}` }, text);
  box.append(t);
  setTimeout(() => t.classList.add('out'), kind === 'lesson' ? 5200 : 2600);
  setTimeout(() => t.remove(), kind === 'lesson' ? 5800 : 3200);
}

// ---------- Confetti ----------
export function confetti(count = 120) {
  const c = h('canvas', { class: 'confetti' });
  document.body.append(c);
  const dpr = window.devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const colors = ['#FF8A5B', '#FFD23F', '#2ECC71', '#8ED1FC', '#FF6FB5', '#7BD389'];
  const bits = Array.from({ length: count }, () => ({
    x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5,
    vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 6, color: colors[(Math.random() * colors.length) | 0],
  }));
  const t0 = performance.now();
  (function frame(t) {
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.x += b.vx; b.y += b.vy; b.r += b.vr; b.vy += 0.03;
      g.save(); g.translate(b.x, b.y); g.rotate(b.r);
      g.fillStyle = b.color; g.fillRect(-b.w / 2, -b.w / 4, b.w, b.w / 2); g.restore();
    }
    if (t - t0 < 3500) requestAnimationFrame(frame); else c.remove();
  })(t0);
}

// ---------- Charts (inline SVG) ----------
export function sparkline(values, w = 90, hgt = 28) {
  if (values.length < 2) values = [values[0], values[0]];
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (w - 4) + 2},${hgt - 3 - ((v - min) / span) * (hgt - 6)}`);
  const up = values[values.length - 1] >= values[0];
  const svg = `<svg class="spark" viewBox="0 0 ${w} ${hgt}" width="${w}" height="${hgt}" aria-hidden="true">
    <polyline points="${pts.join(' ')}" fill="none" stroke="${up ? 'var(--up)' : 'var(--down)'}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  return h('span', { html: svg });
}

export function worthChart(history, crashYear) {
  const W = 640, H = 240, pad = { l: 64, r: 16, t: 16, b: 34 };
  const max = Math.max(...history) * 1.1, min = Math.min(0, ...history);
  const x = (i) => pad.l + (i / (history.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const pts = history.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const area = `${x(0)},${y(min)} ${pts} ${x(history.length - 1)},${y(min)}`;
  const ticks = [0, 0.5, 1].map((f) => min + f * (max - min));
  let s = `<svg class="worth-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Your net worth over 10 years">`;
  for (const t of ticks) {
    s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/>`;
    s += `<text x="${pad.l - 8}" y="${y(t) + 5}" text-anchor="end" class="axis">${money(Math.round(t))}</text>`;
  }
  history.forEach((_, i) => { s += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" class="axis">${i === 0 ? 'Start' : i}</text>`; });
  if (crashYear) {
    s += `<line x1="${x(crashYear)}" x2="${x(crashYear)}" y1="${pad.t}" y2="${H - pad.b}" class="crash"/>`;
    s += `<text x="${x(crashYear) + 6}" y="${pad.t + 14}" class="crash-label">😱 crash</text>`;
  }
  s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(1000)}" y2="${y(1000)}" class="start-line"/>`;
  s += `<polygon points="${area}" class="area"/><polyline points="${pts}" class="line"/>`;
  history.forEach((v, i) => { s += `<circle cx="${x(i)}" cy="${y(v)}" r="5" class="dot"/>`; });
  return h('div', { class: 'chart-wrap', html: s + '</svg>' });
}

// ---------- Amount picker (number box with − / + and quick buttons) ----------
export function amountPicker({ value = 1, step = 1, min = 1, max = () => Infinity, onChange = () => {}, label = 'amount', quick = [] }) {
  const input = h('input', { type: 'number', min, step, value, inputmode: 'numeric', 'aria-label': label });
  const get = () => Math.max(0, Math.floor(Number(input.value) || 0));
  const set = (v) => { input.value = Math.max(min, Math.floor(v)); onChange(get()); };
  input.addEventListener('input', () => onChange(get()));
  const wrap = h('div', { class: 'picker' },
    h('button', { class: 'step', type: 'button', 'aria-label': 'less', onclick: () => { sound('click'); set(get() - step); } }, '−'),
    input,
    h('button', { class: 'step', type: 'button', 'aria-label': 'more', onclick: () => { sound('click'); set(get() + step); } }, '+'),
    ...quick.map((q) => h('button', { class: 'quick', type: 'button', onclick: () => { sound('click'); set(typeof q.value === 'function' ? q.value() : q.value); } }, q.label)),
  );
  return { el: wrap, get, set };
}
