// The Mine: one shift a year. Swing your pickaxe at the rock wall. You can see how hard each block is,
// but not what's inside. Ore runs in veins — once you find some, the ore next to it sparkles.
import * as E from '../engine.js';
import { SETTINGS } from '../scenarios.js';
import { h, money, sound, toast } from '../ui.js';

const M = SETTINGS.mine;
const T = 16, PAD = 8, TOPH = 6, CART_H = 30;
const W = PAD * 2 + M.cols * T, H = TOPH + M.rows * T + CART_H, SC = 4;
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const ORE = {
  coal:   { name: 'Coal',   a: '#2E2A26', b: '#5A544C' },
  iron:   { name: 'Iron',   a: '#C98A5A', b: '#E8B48A' },
  silver: { name: 'Silver', a: '#C9CED6', b: '#FFFFFF' },
  gold:   { name: 'Gold',   a: '#F2D45C', b: '#FFF4B0' },
};
const ROCK = {
  dirt:    { name: 'Dirt',    hits: 1, a: '#8A6440', b: '#A27A52', c: '#6B4A2E' },
  rock:    { name: 'Rock',    hits: 2, a: '#8D8A84', b: '#A9A6A0', c: '#6E6A64' },
  granite: { name: 'Granite', hits: 3, a: '#5C5866', b: '#7A7584', c: '#403C48' },
};

export function mineScreen(app) {
  const s = app.state;
  const wall = E.mineWall(s);
  const saved = s.mineTrip && s.mineTrip.year === s.year ? s.mineTrip : null;
  const hits = saved ? [...saved.hits] : [];
  let prog = E.mineProgress(wall, hits);
  let cursor = Math.floor(M.rows / 2) * M.cols + Math.floor(M.cols / 2);
  let swing = null, cartCount = prog.found.length;
  const parts = [], pops = [], flying = [];

  const cv = h('canvas', { class: 'mine-canvas', width: W * SC, height: H * SC, tabindex: '0',
    'aria-label': 'The mine wall. Tap a block, or use the arrow keys and Space, to swing your pickaxe.' });
  const g = cv.getContext('2d');
  const side = h('section', { class: 'box mine-side' });
  const done = () => E.mineDone(s);
  const blockXY = (i) => [PAD + (i % M.cols) * T, TOPH + Math.floor(i / M.cols) * T];

  // ---------- swinging ----------
  function hit(i) {
    if (done() || prog.swingsLeft <= 0 || prog.broken[i]) { if (prog.broken[i]) sound('click'); return; }
    const before = prog;
    hits.push(i);
    prog = E.mineProgress(wall, hits);
    s.mineTrip = { year: s.year, hits: [...hits] };
    app.save();
    cursor = i;
    swing = { i, t: 0 };
    const [x, y] = blockXY(i);
    for (let k = 0; k < 5; k++) parts.push({ x: x + 8, y: y + 8, vx: (Math.random() - 0.5) * 1.6, vy: -Math.random() * 1.4, t: 0, col: ROCK[wall.blocks[i].kind].b });
    if (prog.broken[i]) {
      sound(wall.blocks[i].ore ? 'coin' : 'click');
      for (let k = 0; k < 7; k++) parts.push({ x: x + 4 + Math.random() * 8, y: y + 6, vx: (Math.random() - 0.5) * 1.2, vy: Math.random() * 0.6, t: 0, col: ROCK[wall.blocks[i].kind].c, chunk: true });
      const f = prog.found.find((q) => q.i === i);
      if (f) {
        flying.push({ x: x + 8, y: y + 8, t: 0, ore: f.ore });
        const px = Math.min(W - 22, Math.max(22, x + 8)); // keep the label inside the wall
        // one label per find; a vein bonus shows as a gold "+$3!" instead of a second label
        pops.push({ x: px, y: y + 2, t: 0, text: '+' + money(f.value + (f.bonus || 0)) + (f.bonus ? '!' : ''), col: f.bonus ? '#F2D45C' : ORE[f.ore].a });
        if (f.bonus) sound('tada');
        if (before.found.length === 0) app.lessonOnce('mineVein', 'You found ore! Ore runs in veins — keep digging next to it. Ore blocks next to your find will sparkle.');
      } else if (!REDUCED) sound('click');
    } else sound('click');
    if (prog.swingsLeft <= 0) setTimeout(finish, 650);
    renderSide();
  }

  function finish() {
    if (done()) return;
    const r = E.runMine(s, hits);
    if (!r.ok) { toast(r.error, 'error'); return; }
    s.mineTrip = { year: s.year, hits: [...hits], done: true };
    app.refresh();
    sound('tada');
    toast(`Shift done! +${money(r.earned)}`);
    for (let k = 0; k < 20; k++) parts.push({ x: W - 30, y: H - 18, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 1.6, t: 0, col: '#F2D45C', coin: true });
    app.lessonOnce('mineIncome', 'Mining is income: money you earn by working. Cash doesn\'t grow on its own — investing it is what makes it grow.');
    renderSide();
  }

  // ---------- drawing ----------
  const R = (x, y, w, hh, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, hh); };
  const seed = (i, k) => ((i * 2654435761) ^ (k * 40503)) >>> 0;
  function drawBlock(i, t) {
    const [x, y] = blockXY(i), b = wall.blocks[i], look = ROCK[b.kind];
    if (prog.broken[i]) {
      R(x, y, T, T, '#1E1A16'); R(x + 1, y + 1, T - 2, T - 2, '#2B2520'); R(x + 1, y + T - 4, T - 2, 3, '#3A332C');
      if (b.ore) { const o = ORE[b.ore]; R(x + 4, y + 9, 2, 2, o.a); R(x + 10, y + 6, 2, 2, o.a); R(x + 7, y + 12, 1, 1, o.b); }
      return;
    }
    R(x, y, T, T, look.a);
    R(x, y, T, 2, look.b); R(x, y, 2, T, look.b); R(x, y + T - 2, T, 2, look.c); R(x + T - 2, y, 2, T, look.c);
    for (let k = 0; k < 5; k++) { const v = seed(i, k); R(x + 3 + (v % 10), y + 3 + ((v >> 5) % 10), b.kind === 'granite' ? 1 : 2, 1, look.c); }
    if (b.kind === 'granite') for (let k = 0; k < 3; k++) { const v = seed(i, k + 9); R(x + 3 + (v % 10), y + 3 + ((v >> 5) % 10), 1, 1, '#A898B0'); }
    // cracks from earlier hits
    const d = prog.dmg[i];
    if (d > 0) {
      g.strokeStyle = 'rgba(20,16,12,.9)'; g.lineWidth = 1; g.beginPath();
      g.moveTo(x + 8, y + 2); g.lineTo(x + 6, y + 7); g.lineTo(x + 9, y + 10);
      if (d > 1) { g.moveTo(x + 6, y + 7); g.lineTo(x + 2, y + 9); g.moveTo(x + 9, y + 10); g.lineTo(x + 13, y + 13); }
      g.stroke();
    }
    if (prog.sparkle[i]) { // follow the vein: a twinkle (no hint about which ore)
      const ph = REDUCED ? 0.6 : (t * 1.6 + (i % 7) * 0.37) % 1;
      if (ph < 0.7) { const k = Math.round((ph < 0.35 ? ph : 0.7 - ph) * 14) + 1; R(x + 8 - Math.floor(k / 2), y + 7, k, 1, '#FFFFFF'); R(x + 8, y + 7 - Math.floor(k / 2), 1, k, '#FFFFFF'); }
      R(x + 3, y + 3, 1, 1, '#FFF4B0'); R(x + 12, y + 11, 1, 1, '#FFF4B0');
    }
  }

  function draw(time) {
    const t = time / 1000, dt = 1 / 60;
    g.setTransform(SC, 0, 0, SC, 0, 0);
    R(0, 0, W, H, '#1E1A16');
    for (let k = 0; k < 40; k++) { const v = seed(k, 3); R(v % W, (v >> 7) % H, 2, 1, '#2B2520'); }
    // timber frame
    R(0, 0, W, TOPH - 1, '#7A5A40'); R(0, TOPH - 2, W, 1, '#5E4430'); R(1, 0, 4, H - CART_H + 4, '#7A5A40'); R(W - 5, 0, 4, H - CART_H + 4, '#7A5A40');
    for (const lx of [PAD + 2, W - PAD - 6]) { R(lx, TOPH, 4, 4, '#26313F'); R(lx + 1, TOPH + 1, 2, 2, REDUCED ? '#F8E08A' : (Math.floor(t * 3) % 5 ? '#F8E08A' : '#E8C860')); }
    for (let i = 0; i < wall.blocks.length; i++) drawBlock(i, t);
    // cursor
    if (!done()) {
      const [cx, cy] = blockXY(cursor);
      g.strokeStyle = prog.broken[cursor] ? 'rgba(242,212,92,.4)' : '#F2D45C'; g.lineWidth = 1;
      g.strokeRect(cx + 0.5, cy + 0.5, T - 1, T - 1);
    }
    // floor, rails and the cart
    const fy = TOPH + M.rows * T;
    R(0, fy, W, CART_H, '#2B2520'); R(0, fy + 22, W, 2, '#9AA0A8'); R(0, fy + 26, W, 2, '#9AA0A8');
    for (let x = 2; x < W; x += 8) R(x, fy + 21, 3, 8, '#5E4430');
    const kx = W - 44, ky = fy + 8;
    R(kx, ky, 34, 14, '#26313F'); R(kx + 1, ky + 1, 32, 12, '#6E7480'); R(kx + 1, ky + 1, 32, 2, '#848A96');
    const pile = Math.min(cartCount, 16);
    for (let k = 0; k < pile; k++) { const f = prog.found[k % Math.max(1, prog.found.length)]; R(kx + 3 + (k % 8) * 4, ky - 1 - Math.floor(k / 8) * 3, 3, 3, f ? ORE[f.ore].a : '#5A544C'); }
    R(kx + 4, ky + 13, 5, 5, '#26313F'); R(kx + 25, ky + 13, 5, 5, '#26313F');
    // pickaxe swing
    if (swing) {
      swing.t += dt;
      const [x, y] = blockXY(swing.i);
      const a = swing.t < 0.08 ? -0.9 : 0.2;
      g.save(); g.translate(x + 14, y + 14); g.rotate(a);
      R(-1, -12, 2, 13, '#8C6A4A'); R(-6, -13, 12, 2, '#B9BEC6'); R(-6, -12, 2, 2, '#B9BEC6'); R(4, -12, 2, 2, '#B9BEC6');
      g.restore();
      if (swing.t > 0.2) swing = null;
    }
    // ore flying into the cart
    for (const f of flying) {
      f.t += dt * 1.6;
      const p = Math.min(1, f.t), tx = kx + 17, ty = ky + 2;
      const x = f.x + (tx - f.x) * p, y = f.y + (ty - f.y) * p - Math.sin(p * Math.PI) * 20;
      R(x - 2, y - 2, 4, 4, ORE[f.ore].a); R(x - 2, y - 2, 1, 1, ORE[f.ore].b);
      if (p >= 1 && !f.landed) { f.landed = true; cartCount += 1; }
    }
    while (flying.length && flying[0].landed) flying.shift();
    // dust, rubble, coins
    for (const q of parts) {
      q.t += dt; q.x += q.vx; q.y += q.vy; q.vy += q.chunk || q.coin ? 0.08 : 0.02;
      g.globalAlpha = Math.max(0, 1 - q.t / (q.coin ? 1.4 : 0.8)); R(q.x, q.y, q.chunk || q.coin ? 2 : 1, q.chunk || q.coin ? 2 : 1, q.col);
    }
    g.globalAlpha = 1;
    while (parts.length && parts[0].t > 1.4) parts.shift();
    g.font = '8px "Jersey 10", monospace'; g.textAlign = 'center';
    for (const p of pops) {
      p.t += dt * 1.3;
      if (p.t < 0) continue;
      g.globalAlpha = Math.max(0, 1 - p.t);
      g.fillStyle = '#000'; g.fillText(p.text, p.x + 0.5, p.y - p.t * 12 + 0.5);
      g.fillStyle = p.col; g.fillText(p.text, p.x, p.y - p.t * 12);
    }
    g.globalAlpha = 1;
    while (pops.length && pops[0].t > 1) pops.shift();
    if (cv.isConnected) requestAnimationFrame(draw);
  }

  // ---------- side panel ----------
  function renderSide() {
    const over = done();
    const counts = {};
    for (const f of prog.found) counts[f.ore] = (counts[f.ore] || 0) + 1;
    const kids = [h('h2', {}, over ? 'Shift done!' : 'Today\'s shift')];
    if (over) {
      kids.push(h('p', { class: 'done-line' }, `You earned ${money(s.mine[s.year])} at the mine this year.`));
      kids.push(h('p', { class: 'hint' }, 'The mine is closed until next year.'));
    } else {
      kids.push(h('div', { class: 'swings' },
        h('div', { class: 'energy-top' }, h('small', {}, 'Swings left'), h('b', {}, String(prog.swingsLeft))),
        h('div', { class: 'energy-bar' }, ...Array.from({ length: M.swings }, (_, k) => h('i', { class: k < prog.swingsLeft ? 'have' : '' })))));
    }
    kids.push(h('div', { class: 'shift-count' }, h('span', {}, 'In your cart'), h('b', {}, money(prog.earned))));
    if (prog.found.length) kids.push(h('div', { class: 'found-row' }, ...Object.entries(counts).map(([ore, n]) =>
      h('span', { class: 'chip' }, h('i', { class: 'ore-dot', style: `background:${ORE[ore].a}` }), ` ${ORE[ore].name} ×${n}`))));
    if (!over) kids.push(h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', type: 'button', id: 'mine-finish', disabled: hits.length === 0, onclick: finish }, `Finish shift (+${money(prog.earned)})`)));
    kids.push(h('div', { class: 'mine-rules' },
      h('p', {}, h('b', {}, 'Ore hides inside the rock '), 'and runs in veins. Found some? Dig right next to it — ore that belongs to your vein ',
        h('b', {}, 'sparkles'), '. Three in a row from one vein earns a bonus!'),
      h('div', { class: 'ore-legend' },
        ...Object.entries(ROCK).map(([k, r]) => h('div', {}, h('i', { class: 'ore-dot', style: `background:${r.a}` }), r.name, h('b', {}, `${r.hits} swing${r.hits > 1 ? 's' : ''}`))),
        ...Object.entries(M.ore).map(([k, v]) => h('div', {}, h('i', { class: 'ore-dot', style: `background:${ORE[k].a}` }), ORE[k].name, h('b', {}, money(v)))))));
    side.replaceChildren(...kids);
  }

  // ---------- input ----------
  const pick = (e) => {
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W - PAD, y = (e.clientY - r.top) / r.height * H - TOPH;
    const c = Math.floor(x / T), row = Math.floor(y / T);
    return c >= 0 && c < M.cols && row >= 0 && row < M.rows ? row * M.cols + c : -1;
  };
  cv.addEventListener('pointermove', (e) => { const i = pick(e); if (i >= 0) cursor = i; });
  cv.addEventListener('pointerdown', (e) => { const i = pick(e); if (i >= 0) hit(i); });
  const onKey = (e) => {
    if (!cv.isConnected) { window.removeEventListener('keydown', onKey); return; }
    if (e.target.closest('input, select, textarea, button')) return;
    const r = Math.floor(cursor / M.cols), c = cursor % M.cols;
    const mv = { ArrowLeft: [0, -1], a: [0, -1], ArrowRight: [0, 1], d: [0, 1], ArrowUp: [-1, 0], w: [-1, 0], ArrowDown: [1, 0], s: [1, 0] }[e.key];
    if (mv) { e.preventDefault(); cursor = Math.min(M.rows - 1, Math.max(0, r + mv[0])) * M.cols + Math.min(M.cols - 1, Math.max(0, c + mv[1])); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hit(cursor); }
  };
  window.addEventListener('keydown', onKey);

  app.screenRefresh = () => {};
  app.open({
    title: 'Mine', theme: 'mine',
    body: h('div', { class: 'two-col mine' }, h('section', { class: 'box mine-cave' }, cv), side),
    onClose: () => { if (!done() && hits.length > 0) finish(); }, // leaving mid-shift banks what you found
  });
  if (!done()) app.lessonOnce('mineRules', 'Tap a block (or use the arrow keys + Space) to swing your pickaxe. You can see how hard each block is — but not what\'s inside!');
  renderSide();
  requestAnimationFrame(draw);
}
