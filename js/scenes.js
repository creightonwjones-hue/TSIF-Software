// Little animated pixel scenes shown at the top of each building's screen.
// Drawn in the same pixel style as the town. Each scene stops animating once it leaves the page.
import { drawPerson, OUTLINE } from './town.js';
import { STOCKS } from './scenarios.js';

const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

function makeCanvas(w, h, cls) {
  const SC = 3;
  const cv = document.createElement('canvas');
  cv.width = w * SC; cv.height = h * SC;
  cv.className = `scene ${cls}`;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.setTransform(SC, 0, 0, SC, 0, 0);
  return { cv, c };
}
function animate(cv, draw) {
  const t0 = performance.now();
  const frame = (t) => {
    draw((t - t0) / 1000);
    if (cv.isConnected && !REDUCED) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  draw(0);
  return draw;
}
function text(c, s, x, y, size, col, align = 'left') {
  c.font = `${size}px "Jersey 10", monospace`; c.fillStyle = col; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y);
}
function floorAndWall(c, W, H, wall, trim, floorA, floorB) {
  R(c, 0, 0, W, H, wall);
  for (let x = 0; x < W; x += 8) R(c, x, 0, 1, H - 16, 'rgba(0,0,0,.04)');
  R(c, 0, H - 22, W, 6, trim); R(c, 0, H - 22, W, 1, 'rgba(255,255,255,.4)');
  for (let x = 0; x < W; x += 8) for (let y = H - 16; y < H; y += 8) R(c, x, y, 8, 8, ((x + y) / 8) % 2 ? floorA : floorB);
}
function plant(c, x, y, sway = 0) {
  R(c, x, y + 10, 10, 8, '#B5563F'); R(c, x + 1, y + 10, 8, 1, '#C8664F');
  R(c, x + 2 + sway, y, 6, 11, '#3F7F38'); R(c, x - 1 + sway, y + 3, 5, 6, '#5A9A48'); R(c, x + 6 + sway, y + 2, 5, 6, '#4E8A3C');
}

// ---------- Bank: teller counter and a big vault door ----------
export function bankScene() {
  const W = 480, H = 60, { cv, c } = makeCanvas(W, H, 'banner');
  animate(cv, (t) => {
    floorAndWall(c, W, H, '#EADFCB', '#8A6E55', '#D9CFBC', '#C9BEA9');
    // clock
    R(c, 70, 6, 14, 14, OUTLINE); R(c, 71, 7, 12, 12, '#FBF6EA'); R(c, 77, 9, 1, 5, OUTLINE); R(c, 77, 13, 4, 1, OUTLINE);
    // teller counter with barred windows
    R(c, 110, 18, 160, 26, '#5E4632'); R(c, 110, 18, 160, 3, '#7A5A40');
    for (const wx of [124, 182, 240 - 6]) {
      R(c, wx, 22, 36, 18, '#CFE0EC'); for (let i = 0; i < 6; i++) R(c, wx + 3 + i * 6, 22, 1, 18, '#8D8A84');
    }
    drawPerson(c, 142, 41, 'down', 0, '#3F7F6A', '#2E2420', true);
    drawPerson(c, 200, 41, 'down', 0, '#B5563F', '#C9A15B', true);
    R(c, 110, 40, 160, 4, '#7A5A40');
    // coins
    for (let i = 0; i < 5; i++) { R(c, 286, 38 - i * 3, 12, 3, i % 2 ? '#E0B42E' : '#F2D45C'); }
    const glint = Math.floor(t * 2) % 3 === 0;
    if (glint) { R(c, 293, 22, 1, 5, '#FFFFFF'); R(c, 291, 24, 5, 1, '#FFFFFF'); }
    // vault door
    R(c, 340, 2, 92, 42, '#6E7480');
    c.fillStyle = OUTLINE; c.beginPath(); c.arc(386, 23, 19, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#B9BEC6'; c.beginPath(); c.arc(386, 23, 17, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9AA0A8'; c.beginPath(); c.arc(386, 23, 12, 0, Math.PI * 2); c.fill();
    const a = t * 0.6;
    for (let i = 0; i < 3; i++) { const ang = a + i * Math.PI * 2 / 3; R(c, 386 + Math.cos(ang) * 9 - 1.5, 23 + Math.sin(ang) * 9 - 1.5, 3, 3, OUTLINE); }
    R(c, 384, 21, 4, 4, '#F2D45C');
    plant(c, 20, 26, Math.round(Math.sin(t) * 0.6)); plant(c, 450, 26);
  });
  return cv;
}

// ---------- Stock Exchange: a trading board with live prices ----------
export function exchangeScene(state, stockPrice) {
  const W = 480, H = 40, { cv, c } = makeCanvas(W, H, 'banner');
  const i = state.year - 1;
  const cells = STOCKS.map((s) => {
    const p = stockPrice(state, s.id, i), prev = i > 0 ? stockPrice(state, s.id, i - 1) : p;
    return { t: s.ticker, ch: Math.round((p / prev - 1) * 100), p };
  });
  animate(cv, (t) => {
    R(c, 0, 0, W, H, '#2F6655'); R(c, 0, H - 6, W, 6, '#3D4A5A'); R(c, 0, H - 7, W, 1, '#1E4A3C');
    // the board
    R(c, 60, 2, 360, 30, OUTLINE); R(c, 62, 4, 356, 26, '#141C24');
    cells.forEach((cell, k) => {
      const col = k % 6, row = Math.floor(k / 6);
      const x = 66 + col * 59, y = 10 + row * 13;
      const blink = Math.floor(t * 1.5 + k) % 9 === 0;
      text(c, cell.t, x, y, 9, blink ? '#FFFFFF' : '#F4EFE0');
      const s = i === 0 ? '—' : cell.ch === 0 ? '0%' : `${cell.ch > 0 ? '▲' : '▼'}${Math.abs(cell.ch)}%`;
      text(c, s, x + 27, y, 9, i === 0 || cell.ch === 0 ? '#B9C2CC' : cell.ch > 0 ? '#7FD88A' : '#FF8A7A');
    });
    // traders cheering / groaning
    const up = cells.filter((x) => x.ch > 0).length >= cells.length / 2;
    for (const [x, shirt, hair, ph] of [[40, '#F6E7A8', '#2E2420', 0], [440, '#CFE0EC', '#C9A15B', 1.3]]) {
      const bob = REDUCED ? 0 : Math.round(Math.abs(Math.sin(t * 3 + ph)) * 2);
      drawPerson(c, x, 38 - bob, 'down', 0, shirt, hair);
      if (up) { R(c, x - 7, 23 - bob, 2, 6, '#F2CDA6'); R(c, x + 5, 23 - bob, 2, 6, '#F2CDA6'); }
    }
    // bell
    R(c, 236, 33, 8, 4, '#E0B42E');
  });
  return cv;
}

// ---------- News Stand: newspaper kiosk with a paper-waving newsie ----------
export function newsScene(hasTip) {
  const W = 480, H = 60, { cv, c } = makeCanvas(W, H, 'banner');
  animate(cv, (t) => {
    R(c, 0, 0, W, H, '#BFD8E8');
    R(c, 0, 40, W, 20, '#9E978C'); for (let x = 0; x < W; x += 6) R(c, x, 40 + (x % 12 ? 0 : 3), 5, 3, '#B3AC9F');
    // kiosk
    R(c, 150, 8, 180, 34, '#F1E7D2'); R(c, 150, 8, 180, 34, 'rgba(0,0,0,0)');
    for (let i = 0; i < 180; i += 12) R(c, 150 + i, 2, 12, 8, (i / 12) % 2 ? '#FFFFFF' : '#4A6A9A');
    R(c, 150, 10, 180, 1, OUTLINE);
    // paper stacks
    for (const [x, n] of [[160, 4], [190, 5], [220, 3], [290, 4]]) for (let k = 0; k < n; k++) { R(c, x, 38 - k * 3, 22, 3, k % 2 ? '#FFFFFF' : '#E8E2D4'); R(c, x + 3, 38 - k * 3 + 1, 14, 1, '#8D8A84'); }
    // "EXTRA!" board
    R(c, 250, 14, 34, 20, OUTLINE); R(c, 251, 15, 32, 18, '#FFFFFF');
    text(c, hasTip ? 'TIP!' : 'NEWS', 267, 24, 11, hasTip ? '#C2483A' : OUTLINE, 'center');
    // newsie waving a paper
    const wave = REDUCED ? 0 : Math.round(Math.sin(t * 5) * 2);
    drawPerson(c, 360, 56, 'left', 0, '#C8664F', '#5A3A28');
    R(c, 346, 30 + wave, 10, 12, '#FFFFFF'); R(c, 348, 33 + wave, 6, 1, OUTLINE); R(c, 348, 36 + wave, 6, 1, OUTLINE);
    // pigeon
    const peck = !REDUCED && Math.floor(t * 2) % 2;
    R(c, 90, 50, 8, 4, '#8D8A84'); R(c, 96, 48 + peck, 3, 3, '#6E7480'); R(c, 99, 49 + peck, 1, 1, '#E8A23A');
  });
  return cv;
}

// ---------- Home: a bedroom; night before you sleep, morning after ----------
export function homeScene(color, morning = false) {
  const W = 480, H = 60, { cv, c } = makeCanvas(W, H, 'banner');
  animate(cv, (t) => {
    floorAndWall(c, W, H, morning ? '#DCE8F0' : '#8E9BB0', '#8A6E55', '#C9A26B', '#B9925B');
    // window
    R(c, 300, 6, 60, 30, '#FFFFFF');
    R(c, 302, 8, 56, 26, morning ? '#9CC6E0' : '#1E2A44');
    if (morning) { R(c, 340, 12, 10, 10, '#F2D45C'); R(c, 338, 14, 14, 6, '#F2D45C'); R(c, 306, 26, 20, 4, '#FFFFFF'); }
    else {
      R(c, 342, 12, 8, 8, '#F4EFE0'); R(c, 345, 12, 5, 6, '#1E2A44');
      for (let k = 0; k < 6; k++) if (Math.floor(t * 2 + k) % 4) R(c, 306 + (k * 17) % 50, 10 + (k * 7) % 20, 1, 1, '#FFFFFF');
    }
    R(c, 329, 8, 2, 26, '#FFFFFF'); R(c, 302, 20, 56, 2, '#FFFFFF');
    // bed
    R(c, 120, 26, 110, 18, '#8A6E55'); R(c, 120, 18, 8, 26, '#6B4A30');
    R(c, 128, 24, 100, 14, color); R(c, 128, 24, 100, 2, 'rgba(255,255,255,.35)');
    R(c, 130, 20, 22, 8, '#FFFFFF');
    if (!morning) drawPerson(c, 141, 30, 'down', 0, color, '#5A3A28', true);
    // nightstand + lamp
    R(c, 240, 30, 18, 14, '#8A6E55'); R(c, 246, 20, 6, 10, '#F2D45C');
    if (!morning) { c.fillStyle = 'rgba(242,212,92,.18)'; c.fillRect(234, 12, 30, 30); }
    // piggy bank on a shelf
    R(c, 40, 22, 40, 3, '#8A6E55'); R(c, 50, 15, 14, 7, '#E8A0B8'); R(c, 62, 17, 3, 2, '#E8A0B8'); R(c, 53, 14, 4, 1, OUTLINE);
    // rug
    R(c, 150, 46, 80, 8, '#C8664F'); R(c, 152, 48, 76, 4, '#E0B42E');
    // Zzz
    if (!morning && !REDUCED) for (let k = 0; k < 3; k++) { const p = (t * 0.6 + k / 3) % 1; text(c, 'z', 158 + p * 20, 18 - p * 14, 7 + k * 2, `rgba(255,255,255,${1 - p})`); }
  });
  return cv;
}

// ---------- Lemonade Stand: you behind the counter, serving a line of customers ----------
const SHIRTS = ['#C8664F', '#4A6A9A', '#3F7F6A', '#8C6BB1', '#D08A3A', '#2E8C8C', '#C97B9A'];
const HAIRS = ['#2E2420', '#C9A15B', '#5A3A28', '#7A4A22'];
export function lemonadeScene({ color, waiting, owned }) {
  const W = 240, H = 90, { cv, c } = makeCanvas(W, H, 'stand-scene');
  let queue = Array.from({ length: waiting }, (_, k) => ({ k, x: 120 + k * 16 }));
  const leaving = [], pops = [];
  let pour = 0, served = 0;
  const api = {
    el: cv,
    serve(amount) { // front customer gets a cup and walks off
      const f = queue.shift();
      if (f) leaving.push({ ...f, y: 76, t: 0 });
      pops.push({ t: 0, amount });
      pour = 0.5; served += 1;
      if (REDUCED) { queue.forEach((q, n) => { q.x = 120 + n * 16; }); leaving.length = 0; pops.length = 0; redraw(0); }
    },
  };
  const redraw = animate(cv, (t) => {
    const dt = 1 / 60;
    // sky, grass, sidewalk
    R(c, 0, 0, W, 50, '#BFD8E8'); R(c, 20, 10, 24, 6, '#FFFFFF'); R(c, 160, 16, 30, 6, '#FFFFFF');
    R(c, 0, 50, W, 40, '#6AA046'); R(c, 0, 66, W, 24, '#B3AC9F'); for (let x = 0; x < W; x += 6) R(c, x, 70 + (x % 12 ? 0 : 6), 5, 3, '#A8A194');
    // stand
    R(c, 18, 26, 3, 40, '#8A6E55'); R(c, 92, 26, 3, 40, '#8A6E55');
    R(c, 12, 16, 90, 13, OUTLINE);
    for (let i = 0; i < 90; i += 9) R(c, 12 + i, 17, 9, 11, (i / 9) % 2 ? '#FFFFFF' : '#F2C230');
    for (let i = 0; i < 90; i += 9) { R(c, 13 + i, 28, 7, 2, (i / 9) % 2 ? '#FFFFFF' : '#F2C230'); R(c, 13 + i, 30, 7, 1, OUTLINE); }
    if (owned.recipe) { R(c, 46, 6, 20, 10, OUTLINE); R(c, 47, 7, 18, 8, '#F2D45C'); text(c, '★', 56, 11, 9, OUTLINE, 'center'); }
    // you (and a helper) behind the counter
    drawPerson(c, owned.helper ? 40 : 56, 54, 'down', 0, color, '#5A3A28', true);
    if (owned.helper) drawPerson(c, 74, 54, 'down', 0, '#5B8DB8', '#C9A15B', true);
    // counter
    R(c, 10, 50, 94, 22, OUTLINE); R(c, 11, 53, 92, 18, '#F6E7A8'); R(c, 10, 49, 94, 5, '#D9B77A');
    text(c, 'LEMONADE', 57, 62, 11, OUTLINE, 'center');
    // pitcher (tilts while pouring) and cups
    const tilt = pour > 0 ? 3 : 0;
    R(c, 20 + tilt, 38 - tilt, 9, 11, OUTLINE); R(c, 21 + tilt, 39 - tilt, 7, 9, '#E8F4FA'); R(c, 21 + tilt, 42 - tilt, 7, 6, '#F2D45C');
    if (pour > 0) R(c, 30, 40, 1, 8, '#F2D45C');
    for (let k = 0; k < 3; k++) R(c, 34, 46 - k * 2, 6, 2, k % 2 ? '#FFFFFF' : '#E8EEF2');
    if (owned.stand) { R(c, 104, 56, 12, 16, '#8A6E55'); R(c, 106, 52, 3, 4, '#FFFFFF'); R(c, 110, 52, 3, 4, '#FFFFFF'); }
    pour = Math.max(0, pour - dt);
    // the line moves up to the counter
    queue.forEach((q, n) => {
      const target = 120 + n * 16; q.x += (target - q.x) * 0.15;
      drawPerson(c, q.x, 80, 'left', 0, SHIRTS[q.k % SHIRTS.length], HAIRS[q.k % HAIRS.length]);
    });
    // happy customers walk off with a cup
    for (const l of leaving) {
      l.t += dt; l.y += 0.6; l.x += 0.9;
      drawPerson(c, l.x, l.y, 'down', Math.floor(l.t * 6) % 2, SHIRTS[l.k % SHIRTS.length], HAIRS[l.k % HAIRS.length]);
      R(c, l.x + 5, l.y - 8, 3, 4, '#FFFFFF'); R(c, l.x + 5, l.y - 7, 3, 2, '#F2D45C');
    }
    while (leaving.length && leaving[0].t > 1.2) leaving.shift();
    for (const p of pops) {
      p.t += dt;
      const a = Math.max(0, 1 - p.t);
      text(c, `+$${p.amount}`, 112, 50 - p.t * 18, 12, `rgba(61,138,72,${a})`, 'center');
      R(c, 104, 44 - p.t * 18, 4, 4, `rgba(242,212,92,${a})`);
    }
    while (pops.length && pops[0].t > 1) pops.shift();
    if (!queue.length && served) text(c, 'All served!', 170, 40, 12, '#3D8A48', 'center');
  });
  return api;
}
