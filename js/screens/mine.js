// The Mine: one trip a year. Dig your own tunnel, find better ore deeper down,
// watch your energy (you need enough to climb home), and brace before digging next to cracked rock.
import * as E from '../engine.js';
import { SETTINGS } from '../scenarios.js';
import { h, money, sound, toast } from '../ui.js';
import { drawPerson } from '../town.js';

const M = SETTINGS.mine;
const T = 16, TOP = 24;                 // tile size and the surface strip, in pixels
const W = M.cols * T, H = TOP + M.rows * T, SC = 4;
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const ORE = {
  coal:   { name: 'Coal',   a: '#2E2A26', b: '#4A443E' },
  silver: { name: 'Silver', a: '#C9CED6', b: '#FFFFFF' },
  gold:   { name: 'Gold',   a: '#F2D45C', b: '#FFF4B0' },
  gem:    { name: 'Gem',    a: '#5FD3E0', b: '#E8A0F0' },
};
const KEYS = { ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R', ArrowDown: 'D', s: 'D', S: 'D', ArrowUp: 'U', w: 'U', W: 'U' };

export function mineScreen(app) {
  const s = app.state;
  const map = E.mineMap(s);
  // Resume a trip in progress (so reloading can't be used to peek and start over).
  let trip = E.mineStart();
  const saved = s.mineTrip && s.mineTrip.year === s.year ? s.mineTrip.moves : [];
  for (const m of saved) { const r = E.mineStep(trip, map, m); if (r.ok) trip = r.trip; }
  const done = () => E.mineDone(s);
  let face = 'down', swingT = 0, shake = 0;
  const parts = [], pops = [];

  const cv = h('canvas', { class: 'mine-canvas', width: W * SC, height: H * SC, 'aria-label': 'The mine. Use the arrow keys, or tap the tile next to your miner, to dig.' });
  const g = cv.getContext('2d');
  const side = h('section', { class: 'box mine-side' });

  // ---------- rules helpers ----------
  const at = (r, c) => map.tiles[r * M.cols + c];
  const inside = (r, c) => r >= 0 && r < M.rows && c >= 0 && c < M.cols;
  const dug = (r, c) => !!trip.dug[r * M.cols + c];
  const nearCracked = (r, c) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inside(r + a, c + b) && at(r + a, c + b).kind === 'cracked');
  const visible = (r, c) => {
    if (dug(r, c)) return true;
    if (Math.max(Math.abs(r - trip.r), Math.abs(c - trip.c)) <= 2) return true; // lantern light
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (inside(r + a, c + b) && dug(r + a, c + b)) return true; // your tunnel stays lit
    return r === 0 && Math.abs(c - map.entry) <= 1;
  };

  // ---------- moves ----------
  function move(m) {
    if (done() || trip.status !== 'digging') return;
    const before = trip;
    const r = E.mineStep(trip, map, m);
    if (!r.ok) { sound('bad'); toast(r.error, 'error'); return; }
    trip = r.trip;
    s.mineTrip = { year: s.year, moves: trip.moves };
    app.save();
    if ({ L: 'left', R: 'right', U: 'up', D: 'down' }[m]) face = { L: 'left', R: 'right', U: 'up', D: 'down' }[m];
    const dugNow = r.event === 'dig' || r.event === 'ore' || r.event === 'caved';
    if (dugNow) { swingT = 0.25; dust(trip.r, trip.c); sound('click'); }
    if (r.event === 'ore') {
      sound('coin');
      const v = M.ore[r.ore].value;
      pops.push({ x: trip.c * T + 8, y: TOP + trip.r * T, t: 0, text: `+$${v}`, col: ORE[r.ore].a });
      if (r.ore === 'gold' || r.ore === 'gem') app.lessonOnce('mineDeep', 'Deeper ore is worth more — but it costs more energy to reach and to climb back home. That\'s risk vs. reward!');
    }
    if (r.event === 'braced' || r.event === 'unbraced') sound('click');
    if (dugNow && before.beams > trip.beams) toast('Beam placed — the cracked rock is safe.');
    if (r.event === 'caved') { shake = 0.8; sound('bad'); setTimeout(() => sound('bad'), 180); for (let k = 0; k < 18; k++) dust(trip.r, trip.c, true); }
    if (['home', 'rescued', 'caved'].includes(trip.status)) finish();
    renderSide();
  }

  function finish() {
    const res = E.runMine(s, trip.moves);
    if (!res.ok) { toast(res.error, 'error'); return; }
    delete s.mineTrip;
    app.refresh();
    if (trip.status === 'home') {
      sound('tada');
      if (res.earned > 0) for (let k = 0; k < 24; k++) parts.push({ x: map.entry * T + 8, y: TOP - 4, vx: (Math.random() - 0.5) * 2.4, vy: -1.6 - Math.random() * 1.6, t: 0, col: '#F2D45C', coin: true });
      toast(`Banked ${money(res.earned)}!`);
    } else if (trip.status === 'rescued') toast(`Rescued! You kept half: ${money(res.earned)}.`);
    app.lessonOnce('mineIncome', 'Mining is income: money you earn by working. Cash doesn\'t grow on its own — investing it is what makes it grow.');
  }

  function dust(r, c, big = false) {
    for (let k = 0; k < (big ? 3 : 7); k++) parts.push({ x: c * T + 8 + (Math.random() - 0.5) * 10, y: TOP + r * T + 8 + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * (big ? 2.5 : 1.2), vy: (Math.random() - 0.5) * (big ? 2.5 : 1.2) - 0.3, t: 0, col: big ? '#8D8A84' : '#C9B48A' });
  }

  // ---------- drawing ----------
  const R = (x, y, w, hh, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, hh); };
  function tileSeed(r, c, k) { return ((r * 73856093) ^ (c * 19349663) ^ (k * 83492791)) >>> 0; }
  function drawTile(r, c, t) {
    const x = c * T, y = TOP + r * T, tile = at(r, c);
    if (dug(r, c)) {
      R(x, y, T, T, '#2B2520'); R(x, y + T - 3, T, 3, '#3A332C');
      if (trip.braced[r * M.cols + c]) { R(x + 1, y, 2, T, '#8C6A4A'); R(x + T - 3, y, 2, T, '#8C6A4A'); R(x + 1, y, T - 2, 2, '#A88660'); }
      return;
    }
    if (!visible(r, c)) { R(x, y, T, T, '#14110E'); if (tileSeed(r, c, 1) % 5 === 0) R(x + 6, y + 7, 1, 1, '#221D18'); return; }
    const stone = tile.kind !== 'dirt';
    R(x, y, T, T, stone ? '#6E6A64' : '#7A5A3A');
    for (let k = 0; k < 4; k++) { const v = tileSeed(r, c, k); R(x + (v % 13) + 1, y + ((v >> 4) % 13) + 1, 2, 1, stone ? '#5E5A54' : '#6B4A2E'); }
    if (stone) { R(x, y, T, 1, '#8D8A84'); R(x, y, 1, T, '#8D8A84'); }
    if (tile.kind === 'cracked') { // bold crack lines + loose pebbles
      g.strokeStyle = '#2A1A10'; g.lineWidth = 1.2; g.beginPath();
      g.moveTo(x + 3, y + 2); g.lineTo(x + 7, y + 7); g.lineTo(x + 5, y + 11); g.lineTo(x + 9, y + 14);
      g.moveTo(x + 7, y + 7); g.lineTo(x + 13, y + 5); g.moveTo(x + 9, y + 10); g.lineTo(x + 13, y + 12); g.stroke();
      R(x + 11, y + 13, 2, 2, '#8D8A84'); R(x + 2, y + 13, 2, 1, '#8D8A84');
      if (!REDUCED && Math.floor(t * 2 + r + c) % 6 === 0) R(x + 7, y + 15, 1, 1, '#8D8A84');
    }
    if (tile.ore) {
      const o = ORE[tile.ore];
      for (const [ox, oy] of [[4, 5], [9, 4], [7, 9], [11, 10]]) { R(x + ox, y + oy, 3, 3, o.a); R(x + ox, y + oy, 1, 1, o.b); }
      if ((tile.ore === 'gold' || tile.ore === 'gem') && !REDUCED && Math.floor(t * 1.5 + c) % 3 === 0) { R(x + 10, y + 3, 1, 3, '#FFFFFF'); R(x + 9, y + 4, 3, 1, '#FFFFFF'); }
    }
  }

  function draw(time) {
    const t = time / 1000;
    const dt = 1 / 60;
    g.setTransform(SC, 0, 0, SC, 0, 0);
    const sx = shake > 0 && !REDUCED ? Math.round((Math.random() - 0.5) * 4) : 0;
    g.translate(sx, 0);
    // surface
    R(0, 0, W, TOP - 6, '#9CC6E0'); R(0, TOP - 6, W, 6, '#6AA046'); R(0, TOP - 2, W, 2, '#4E7A34');
    const ex = map.entry * T;
    R(ex - 1, TOP - 14, T + 2, 3, '#8C6A4A'); R(ex - 1, TOP - 14, 2, 14, '#7A5A40'); R(ex + T - 1, TOP - 14, 2, 14, '#7A5A40'); R(ex + 1, TOP - 11, T - 2, 11, '#1E1A16');
    R(ex + 6, TOP - 11, 1, 2, '#26313F'); R(ex + 5, TOP - 9, 3, 3, '#F8E08A');
    R(ex + 22, TOP - 10, 12, 6, '#6E7480'); R(ex + 23, TOP - 12, 3, 2, '#2E2A26'); R(ex + 27, TOP - 12, 3, 2, '#F2D45C'); R(ex + 24, TOP - 4, 3, 3, '#26313F'); R(ex + 30, TOP - 4, 3, 3, '#26313F');
    // depth markers
    for (let r = 0; r < M.rows; r++) for (let c = 0; c < M.cols; c++) drawTile(r, c, t);
    // danger outline: tiles next to you that would cave in if dug without a beam
    if (trip.status === 'digging' && !trip.brace && trip.r >= 0) {
      for (const [dr, dc] of [[1, 0], [0, 1], [0, -1]]) {
        const r = trip.r + dr, c = trip.c + dc;
        if (!inside(r, c) || dug(r, c) || at(r, c).kind === 'cracked' || !nearCracked(r, c)) continue;
        g.strokeStyle = `rgba(208,88,74,${REDUCED ? 0.9 : 0.55 + Math.sin(t * 6) * 0.35})`; g.lineWidth = 1.5;
        g.strokeRect(c * T + 1.5, TOP + r * T + 1.5, T - 3, T - 3);
        R(c * T + 7, TOP + r * T + 4, 2, 5, '#D0584A'); R(c * T + 7, TOP + r * T + 10, 2, 2, '#D0584A');
      }
    }
    // miner
    const mx = trip.r < 0 ? ex + 8 : trip.c * T + 8, my = trip.r < 0 ? TOP - 1 : TOP + trip.r * T + 15;
    if (trip.status !== 'caved') {
      R(mx - 4, my - 22, 8, 3, '#E0B42E'); R(mx - 1, my - 23, 2, 2, '#F8E08A'); // hard hat with lamp
      drawPerson(g, mx, my, face, swingT > 0 ? 1 : 0, app.color(), '#5A3A28');
      R(mx - 4, my - 21, 8, 2, '#E0B42E');
      if (swingT > 0) { const sw = face === 'left' ? -1 : 1; R(mx + sw * 6, my - 12, 2, 7, '#8C6A4A'); R(mx + sw * 4, my - 13, 6, 2, '#9AA0A8'); }
      if (trip.brace) { R(mx + 7, my - 18, 8, 2, '#8C6A4A'); R(mx + 9, my - 16, 2, 6, '#8C6A4A'); }
    } else { // rubble where the miner was
      for (let k = 0; k < 6; k++) R(trip.c * T + 2 + k * 2, TOP + trip.r * T + 8 + (k % 3) * 2, 3, 3, '#8D8A84');
    }
    // particles & pops
    for (const p of parts) { p.t += dt; p.x += p.vx; p.y += p.vy; p.vy += p.coin ? 0.08 : 0.03; g.globalAlpha = Math.max(0, 1 - p.t / (p.coin ? 1.4 : 0.7)); R(p.x, p.y, p.coin ? 2 : 1, p.coin ? 2 : 1, p.col); }
    g.globalAlpha = 1;
    while (parts.length && parts[0].t > 1.4) parts.shift();
    g.font = '7px "Jersey 10", monospace'; g.textAlign = 'center';
    for (const p of pops) { p.t += dt; g.globalAlpha = Math.max(0, 1 - p.t); g.fillStyle = '#FFFFFF'; g.fillText(p.text, p.x + 0.5, p.y - p.t * 12 + 0.5); g.fillStyle = p.col; g.fillText(p.text, p.x, p.y - p.t * 12); }
    g.globalAlpha = 1;
    while (pops.length && pops[0].t > 1) pops.shift();
    swingT = Math.max(0, swingT - dt); shake = Math.max(0, shake - dt);
    if (cv.isConnected) requestAnimationFrame(draw);
  }

  // ---------- side panel ----------
  function renderSide() {
    const climb = trip.r + 1;
    const spare = trip.energy - climb;
    const over = done();
    const pay = (s.mine || {})[s.year];
    const kids = [h('h2', {}, over ? 'Trip over' : `Depth ${Math.max(0, trip.r + 1)}`)];
    if (over) {
      kids.push(h('p', { class: `done-line ${trip.status === 'caved' ? 'bad' : ''}` },
        trip.status === 'caved' ? (trip.lost ? `Cave-in! You lost the ${money(trip.lost)} in your cart.` : 'Cave-in! The tunnel collapsed — luckily your cart was empty.')
          : trip.status === 'rescued' ? `Rescued! You kept half: ${money(pay)}.` : `Banked ${money(pay)} this year.`));
      kids.push(h('p', { class: 'hint' }, 'The mine is closed until next year.'));
    } else {
      kids.push(h('div', { class: 'energy' },
        h('div', { class: 'energy-top' }, h('small', {}, 'Energy'), h('b', {}, `${trip.energy}`)),
        h('div', { class: 'energy-bar' }, ...Array.from({ length: M.energy }, (_, k) =>
          h('i', { class: k < trip.energy ? (k < climb ? 'need' : 'have') : '' }))),
        h('small', { class: spare <= 2 && trip.r >= 0 ? 'warn-line' : 'hint' },
          trip.r < 0 ? 'Digging costs energy: dirt 1, hard stone 2.' : `Climbing home costs ${climb}. ${spare <= 2 ? 'Head home soon!' : `You have ${spare} to spare.`}`)));
      kids.push(h('div', { class: 'shift-count' }, h('span', {}, 'In your cart'), h('b', {}, money(trip.haul))));
      kids.push(h('div', { class: 'beams' }, h('small', {}, 'Support beams'),
        h('div', { class: 'beam-row' }, ...Array.from({ length: M.beams }, (_, k) => h('i', { class: k < trip.beams ? '' : 'used' })))));
      kids.push(h('div', { class: 'btn-row' },
        h('button', { class: `btn ${trip.brace ? 'primary' : ''}`, type: 'button', id: 'brace-btn', disabled: !trip.brace && trip.beams <= 0, onclick: () => move('brace') },
          trip.brace ? 'Beam ready ✓' : 'Brace'),
        h('button', { class: 'btn danger', type: 'button', id: 'home-btn', disabled: trip.r < 0, onclick: () => move('home') }, 'Head home')));
    }
    kids.push(h('div', { class: 'mine-rules' },
      h('p', {}, h('b', {}, 'How to dig: '), 'arrow keys / WASD, or tap the tile next to your miner. You can only climb up through your own tunnel.'),
      h('p', {}, h('b', { class: 'down' }, 'Cracked rock: '), 'can\'t be dug, and digging right next to it causes a cave-in (you lose your cart). Press Brace first to place a beam.'),
      h('div', { class: 'ore-legend' }, ...Object.entries(M.ore).map(([k, o]) => h('div', {}, h('i', { class: 'ore-dot', style: `background:${ORE[k].a}` }), ORE[k].name, h('b', {}, money(o.value)))))));
    side.replaceChildren(...kids);
  }

  // ---------- input ----------
  const onKey = (e) => {
    if (!cv.isConnected) { window.removeEventListener('keydown', onKey); return; }
    if (e.target.closest('input, select, textarea')) return;
    const m = KEYS[e.key];
    if (m) { e.preventDefault(); move(m); }
    else if (e.key === 'b' || e.key === 'B') move('brace');
    else if (e.key === 'h' || e.key === 'H') move('home');
  };
  window.addEventListener('keydown', onKey);
  cv.addEventListener('pointerdown', (e) => {
    const rect = cv.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * W, y = (e.clientY - rect.top) / rect.height * H;
    const c = Math.floor(x / T), r = Math.floor((y - TOP) / T);
    if (trip.r < 0) { if (r <= 0 && Math.abs(c - map.entry) <= 1) move('D'); return; }
    const dr = r - trip.r, dc = c - trip.c;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return;
    move(dr === 1 ? 'D' : dr === -1 ? 'U' : dc === 1 ? 'R' : 'L');
  });

  app.screenRefresh = () => {};
  app.open({
    title: 'Mine', theme: 'mine',
    body: h('div', { class: 'two-col mine' }, h('section', { class: 'box mine-cave' }, cv), side),
    onClose: () => { // leaving mid-trip counts as heading home
      if (!done() && trip.status === 'digging' && trip.r >= 0) { trip = E.mineStep(trip, map, 'home').trip; finish(); }
    },
  });
  if (!done()) app.lessonOnce('mineRules', 'Dig down for better ore, but watch your energy — you need enough left to climb home. And never dig next to cracked rock without bracing!');
  renderSide();
  requestAnimationFrame(draw);
}
