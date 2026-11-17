// Sprout City town: a top-down pixel-art main street drawn on a <canvas>.
// The map is 32 × 18 tiles of 16 px, drawn small and scaled up crisply.
// Walk with arrow keys / WASD, or tap anywhere (or on a building) to walk there.

const T = 16, MW = 32, MH = 18, W = MW * T, H = MH * T;
const SPEED = 82; // map pixels per second

const OUTLINE = '#26313F';
// Buildings (tile units). `door` = the door's tile column on the bottom wall. `enter` = can walk in.
export const BUILDINGS = [
  { id: 'bank', label: 'BANK', x: 2, y: 2, w: 7, h: 5, door: 5, wall: 'brick', roof: 'blue', enter: true },
  { id: 'home', label: 'HOME', x: 11, y: 2, w: 4, h: 5, door: 12, wall: 'sky', roof: 'red', enter: true, chimney: true },
  { id: 'exchange', label: 'STOCK EXCHANGE', x: 19, y: 2, w: 10, h: 5, door: 23, wall: 'stone', roof: 'green', enter: true, columns: true },
  { id: 'news', label: 'NEWS', x: 3, y: 11, w: 6, h: 4, door: 6, wall: 'cream', roof: 'orange', enter: true, awning: '#4A6A9A' },
  { id: 'lemonade', label: 'LEMONADE', x: 19, y: 11, w: 4, h: 4, door: 20, wall: 'lemon', roof: 'red', enter: true, awning: '#E0B42E' },
  { id: 'factory', label: '', x: 24, y: 11, w: 5, h: 4, door: 26, wall: 'brick', roof: 'gray', chimney: true },
];
const PATHS = [[1, 8, 30, 2], [15, 10, 2, 7], [5, 7, 1, 1], [12, 7, 1, 1], [23, 7, 1, 1], [6, 15, 1, 1], [6, 16, 9, 1], [20, 15, 1, 1], [17, 16, 10, 1], [26, 15, 1, 1]];
const POND = [10, 11, 3, 3];
const HEDGE_GAPS = [5, 12, 15, 16, 23];
const TREES = [];
for (let x = 0; x < MW; x++) { TREES.push([x, 0]); TREES.push([x, MH - 1]); }
for (let y = 1; y < MH - 1; y++) { TREES.push([0, y]); TREES.push([MW - 1, y]); }
TREES.push([9, 2], [16, 2], [16, 4], [1, 11], [13, 15], [9, 12], [29, 13], [17, 12]);
const FLOWERS = [[3, 6.6], [7, 6.6], [20, 6.6], [27, 6.6], [10, 15], [11, 15], [2, 14], [23, 12], [23, 13]];
const LAMPS = [[4, 10], [11, 10], [20, 10], [28, 10]];

const ROOF = { blue: ['#4A6A9A', '#3A5680', '#5C7EB0'], red: ['#B4503E', '#8E3E30', '#C8664F'], green: ['#3F7F6A', '#2F6655', '#52957E'],
  orange: ['#D08A3A', '#A86E2A', '#E2A050'], gray: ['#6E7480', '#585D68', '#848A96'] };
const DOOR_COLOR = { bank: '#2F4E6E', exchange: '#2F6655', home: '#8E3E30', lemonade: '#B08A1E' };

// ---------- solid tiles & doors ----------
const solid = Array.from({ length: MH }, () => Array(MW).fill(false));
const doorAt = {};
for (const [x, y] of TREES) solid[y][x] = true;
for (const b of BUILDINGS) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) solid[y][x] = true;
for (const b of BUILDINGS) if (b.enter) doorAt[`${b.door},${b.y + b.h - 1}`] = b;
for (let y = POND[1]; y < POND[1] + POND[3]; y++) for (let x = POND[0]; x < POND[0] + POND[2]; x++) solid[y][x] = true;
for (let x = 1; x < MW - 1; x++) if (!HEDGE_GAPS.includes(x)) solid[7][x] = true;
const isSolid = (tx, ty) => tx < 0 || ty < 0 || tx >= MW || ty >= MH || solid[ty][tx];

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

// ---------- static scenery (drawn once) ----------
function drawStatic() {
  seed = 7;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const G = ['#6AA046', '#5E9440', '#76AE50', '#83BA58'];
  R(c, 0, 0, W, H, G[0]);
  for (let i = 0; i < 2600; i++) R(c, Math.floor(rnd() * W), Math.floor(rnd() * H), 1, rnd() < .5 ? 2 : 1, G[1 + Math.floor(rnd() * 3)]);
  // cobblestone streets with a pale curb
  for (const [x, y, w, h] of PATHS) R(c, x * T - 1, y * T - 1, w * T + 2, h * T + 2, '#D9D2C3');
  for (const [x, y, w, h] of PATHS) {
    R(c, x * T + 1, y * T + 1, w * T - 2, h * T - 2, '#9E978C');
    for (let yy = y * T + 1, row = 0; yy < (y + h) * T - 1; yy += 4, row++) {
      for (let xx = x * T + 1 + (row % 2) * 3; xx < (x + w) * T - 1; xx += 6) {
        R(c, xx, yy, Math.min(5, (x + w) * T - 1 - xx), 3, ['#B3AC9F', '#A8A194', '#BDB6A9'][Math.floor(rnd() * 3)]);
      }
    }
  }
  // pond
  const [px, py, pw, ph] = POND.map((v) => v * T);
  R(c, px - 2, py + 1, pw + 4, ph - 2, '#C9C2B5'); R(c, px + 1, py - 2, pw - 2, ph + 4, '#C9C2B5');
  R(c, px, py + 2, pw, ph - 4, '#4F86B0'); R(c, px + 2, py, pw - 4, ph, '#4F86B0');
  R(c, px + 3, py + 3, pw - 6, ph - 6, '#5E97C0');
  for (let i = 0; i < 6; i++) R(c, px + 6 + i * 6, py + 8 + (i % 3) * 10, 4, 1, '#9CC6E0');
  // hedges along the street
  for (let x = 1; x < MW - 1; x++) {
    if (HEDGE_GAPS.includes(x)) continue;
    const X = x * T, Y = 7 * T + 8;
    R(c, X, Y, 16, 6, '#2F6A2C'); R(c, X + 1, Y - 1, 14, 6, '#3F7F38'); R(c, X + 3, Y, 3, 2, '#5A9A48'); R(c, X + 10, Y + 1, 2, 2, '#5A9A48');
  }
  for (const [fx, fy] of FLOWERS) {
    const x = fx * T, y = Math.round(fy * T);
    for (const [ox, oy, col] of [[3, 12, '#E8607A'], [8, 13, '#F2D45C'], [12, 12, '#A97FD8']]) { R(c, x + ox, y + oy, 2, 2, col); R(c, x + ox, y + oy + 2, 1, 2, '#3E7A2E'); }
  }
  for (const b of BUILDINGS) drawBuilding(c, b);
  for (const [lx, ly] of LAMPS) { const x = lx * T + 7, y = ly * T; R(c, x, y - 12, 2, 14, OUTLINE); R(c, x - 2, y - 16, 6, 5, OUTLINE); R(c, x - 1, y - 15, 4, 3, '#F8E08A'); }
  return cv;
}

function wallFill(c, kind, x, y, w, h) {
  const siding = (col, line) => { R(c, x, y, w, h, col); for (let yy = y + 2; yy < y + h; yy += 3) R(c, x, yy, w, 1, line); };
  if (kind === 'brick') {
    R(c, x, y, w, h, '#B5563F');
    for (let yy = y, r = 0; yy < y + h; yy += 3, r++) { R(c, x, yy, w, 1, '#93412F'); for (let xx = x + (r % 2) * 3; xx < x + w; xx += 6) R(c, xx, yy, 1, 3, '#93412F'); }
  } else if (kind === 'stone') { R(c, x, y, w, h, '#E7E1D4'); for (let yy = y; yy < y + h; yy += 6) R(c, x, yy, w, 1, '#D2CABA'); }
  else if (kind === 'sky') siding('#CFE0EC', '#B3C9D9');
  else if (kind === 'lemon') siding('#F6E7A8', '#E3D088');
  else siding('#F1E7D2', '#DCCFB4');
}

function drawBuilding(c, b) {
  const x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T, wallH = 28, roofH = h - wallH;
  const [r1, r2, r3] = ROOF[b.roof];
  R(c, x + 4, y + 6, w, h, 'rgba(20,30,20,.22)'); // shadow
  wallFill(c, b.wall, x, y + roofH, w, wallH);
  R(c, x, y + roofH, w, 2, '#FFFFFF'); R(c, x, y + roofH + 2, w, 1, 'rgba(0,0,0,.15)'); // trim
  R(c, x, y + h - 4, w, 4, '#8D8A84'); R(c, x, y + h - 4, w, 1, '#A9A6A0'); // foundation
  const doorX = b.door * T + 3;
  if (b.columns) for (let i = 0; i < 7; i++) {
    const cx = x + 10 + i * 26;
    if (Math.abs(cx - (doorX + 5)) < 16 || cx > x + w - 8) continue;
    R(c, cx, y + roofH + 3, 5, wallH - 7, '#FFFFFF'); R(c, cx + 4, y + roofH + 3, 1, wallH - 7, '#CFC7B8');
  }
  if (b.awning) for (let i = 0; i < w / 6; i++) R(c, x + i * 6, y + roofH + 3, 6, 4, i % 2 ? '#FFFFFF' : b.awning);
  const wins = b.id === 'lemonade' ? [] : b.columns ? [x + 20, x + w - 34] : b.w <= 4 ? [x + 44] : [x + 8, x + w - 22];
  for (const wx of wins) {
    if (Math.abs(wx + 6 - (doorX + 5)) < 14) continue;
    R(c, wx - 1, y + roofH + 6, 14, 12, '#FFFFFF'); R(c, wx, y + roofH + 7, 12, 10, '#7FB0D6'); R(c, wx + 1, y + roofH + 8, 3, 3, '#D4ECFA');
    R(c, wx + 5, y + roofH + 7, 2, 10, '#FFFFFF'); R(c, wx, y + roofH + 11, 12, 1, '#FFFFFF');
    R(c, wx - 1, y + roofH + 18, 14, 3, '#5E6A78'); R(c, wx, y + roofH + 17, 2, 2, '#E8607A'); R(c, wx + 5, y + roofH + 17, 2, 2, '#F2D45C'); R(c, wx + 10, y + roofH + 17, 2, 2, '#E8607A');
  }
  if (b.id === 'lemonade') { // counter with a pitcher
    R(c, x + 34, y + roofH + 10, 24, 10, '#FFFFFF'); R(c, x + 35, y + roofH + 11, 22, 8, '#F2D45C'); R(c, x + 42, y + roofH + 5, 6, 6, '#F2D45C'); R(c, x + 42, y + roofH + 5, 6, 1, '#FFFFFF');
  }
  // door
  R(c, doorX - 1, y + h - 19, 12, 19, '#FFFFFF'); R(c, doorX, y + h - 18, 10, 18, DOOR_COLOR[b.id] || '#5E6A78');
  R(c, doorX + 1, y + h - 17, 8, 6, 'rgba(255,255,255,.25)'); R(c, doorX + 7, y + h - 9, 2, 2, '#E8C060');
  // shingle roof
  R(c, x - 3, y, w + 6, roofH + 2, r2);
  for (let ry = y + 1, row = 0; ry < y + roofH; ry += 4, row++) for (let rx = x - 3 + (row % 2) * 3; rx < x + w + 3; rx += 6) { R(c, rx, ry, 5, 3, r1); R(c, rx, ry, 5, 1, r3); }
  R(c, x - 3, y + roofH, w + 6, 2, OUTLINE);
  if (b.chimney) { R(c, x + w - 18, y - 14, 9, 16, '#7A3A2C'); R(c, x + w - 17, y - 14, 7, 2, '#93412F'); }
}

function drawTree(c, tx, ty) {
  const x = tx * T, y = ty * T;
  R(c, x + 2, y + 13, 14, 3, 'rgba(20,30,20,.22)');
  R(c, x + 6, y + 10, 4, 6, '#6B4A30');
  R(c, x + 1, y + 2, 14, 10, '#2F5E2A'); R(c, x + 3, y, 10, 14, '#2F5E2A');
  R(c, x + 2, y + 2, 12, 8, '#3F7A34'); R(c, x + 4, y + 1, 8, 10, '#3F7A34');
  R(c, x + 4, y + 2, 5, 4, '#5A9A44'); R(c, x + 9, y + 6, 3, 3, '#4E8A3C'); R(c, x + 5, y + 3, 2, 1, '#7CB85A');
}

// Player sprite: 12 × 16, four directions, two-frame walk.
function drawPlayer(c, px, py, dir, frame, shirt) {
  const x = Math.round(px) - 6, y = Math.round(py) - 16, O = OUTLINE, SKIN = '#F2CDA6', HAIR = '#5A3A28', PANTS = '#34507E';
  R(c, x + 2, y + 15, 9, 2, 'rgba(0,0,0,.2)');
  R(c, x + 2, y, 8, 1, O); R(c, x + 1, y + 1, 10, 7, O);
  if (dir === 'up') { R(c, x + 2, y + 1, 8, 6, HAIR); }
  else {
    R(c, x + 2, y + 1, 8, 3, HAIR); R(c, x + 2, y + 4, 8, 3, SKIN);
    if (dir === 'down') { R(c, x + 4, y + 5, 1, 1, O); R(c, x + 7, y + 5, 1, 1, O); }
    else if (dir === 'left') { R(c, x + 2, y + 4, 2, 2, HAIR); R(c, x + 4, y + 5, 1, 1, O); }
    else { R(c, x + 8, y + 4, 2, 2, HAIR); R(c, x + 7, y + 5, 1, 1, O); }
  }
  R(c, x + 1, y + 8, 10, 5, O); R(c, x + 2, y + 8, 8, 4, shirt);
  if (dir === 'down' || dir === 'up') { R(c, x, y + 9, 2, 3, SKIN); R(c, x + 10, y + 9, 2, 3, SKIN); }
  else R(c, dir === 'left' ? x + 4 : x + 6, y + 9, 2, 3, SKIN);
  const step = frame ? 1 : 0;
  R(c, x + 2, y + 12, 8, 3, O);
  R(c, x + 3, y + 12, 2, 2 - step, PANTS); R(c, x + 7, y + 12, 2, 1 + step, PANTS);
}

export function createTown(canvas, { color = '#3E7AB8', onEnter = () => {} } = {}) {
  const g = canvas.getContext('2d');
  const low = document.createElement('canvas'); low.width = W; low.height = H;
  const lg = low.getContext('2d');
  let scenery = null;
  const me = { x: 16 * T + 8, y: 9 * T + 12, dir: 'down', moving: false, anim: 0 };
  let path = null, pathBuilding = null;
  const keys = new Set();
  let paused = false, guide = null, S = 1, last = performance.now();

  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    const fit = Math.min(box.width / W, box.height / H);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${Math.floor(W * fit)}px`; canvas.style.height = `${Math.floor(H * fit)}px`;
    canvas.width = Math.floor(W * fit * dpr); canvas.height = Math.floor(H * fit * dpr);
    S = canvas.width / W;
    scenery = drawStatic();
  }

  // feet hit-box corners
  const corners = (x, y) => [[x - 4, y - 3], [x + 4, y - 3], [x - 4, y], [x + 4, y]];
  const blocked = (x, y) => corners(x, y).some(([cx, cy]) => isSolid(Math.floor(cx / T), Math.floor(cy / T)));
  const doorHit = (x, y) => { for (const [cx, cy] of corners(x, y)) { const b = doorAt[`${Math.floor(cx / T)},${Math.floor(cy / T)}`]; if (b) return b; } return null; };

  function enter(b) {
    keys.clear(); path = null; pathBuilding = null; me.moving = false;
    me.x = b.door * T + 8; me.y = (b.y + b.h) * T + 12; me.dir = 'down';
    onEnter(b.id);
  }

  function moveBy(dx, dy) {
    const nx = me.x + dx, ny = me.y + dy;
    const b = doorHit(nx, ny);
    if (b && dy < 0) { enter(b); return true; }
    if (!blocked(nx, me.y)) me.x = nx;
    if (!blocked(me.x, ny)) me.y = ny;
    return false;
  }

  function step(dt) {
    let dx = 0, dy = 0;
    if (keys.has('left')) dx -= 1; if (keys.has('right')) dx += 1;
    if (keys.has('up')) dy -= 1; if (keys.has('down')) dy += 1;
    if (dx || dy) { path = null; pathBuilding = null; }
    else if (path) {
      const [tx, ty] = path[0];
      const gx = tx * T + 8, gy = ty * T + 12;
      const ex = gx - me.x, ey = gy - me.y, d = Math.hypot(ex, ey);
      if (d < 2) {
        me.x = gx; me.y = gy; path.shift();
        if (!path.length) {
          path = null;
          if (pathBuilding) { const b = pathBuilding; pathBuilding = null; enter(b); return; }
          me.moving = false; return;
        }
        return;
      }
      dx = ex / d; dy = ey / d;
    }
    const len = Math.hypot(dx, dy);
    me.moving = len > 0;
    if (!len) return;
    dx /= len; dy /= len;
    me.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    me.anim += dt * 8;
    moveBy(dx * SPEED * dt, dy * SPEED * dt);
  }

  // Breadth-first search over tiles for tap-to-walk.
  function findPath(fx, fy, tx, ty) {
    if (isSolid(tx, ty)) return null;
    const prev = new Map([[`${fx},${fy}`, null]]);
    const queue = [[fx, fy]];
    while (queue.length) {
      const [x, y] = queue.shift();
      if (x === tx && y === ty) {
        const out = []; let k = `${x},${y}`;
        while (k) { out.unshift(k.split(',').map(Number)); k = prev.get(k); }
        return out.slice(1);
      }
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const key = `${nx},${ny}`;
        if (prev.has(key) || isSolid(nx, ny)) continue;
        prev.set(key, `${x},${y}`); queue.push([nx, ny]);
      }
    }
    return null;
  }
  function walkToTile(tx, ty, building = null) {
    const p = findPath(Math.floor(me.x / T), Math.floor((me.y - 2) / T), tx, ty);
    if (!p) return;
    path = p.length ? p : null; pathBuilding = building;
    if (!path && building) enter(building);
  }

  function draw(t) {
    lg.drawImage(scenery, 0, 0);
    // depth-sort trees and the player by their bottom edge
    const items = TREES.map(([x, y]) => ({ y: y * T + 15, fn: () => drawTree(lg, x, y) }));
    items.push({ y: me.y, fn: () => drawPlayer(lg, me.x, me.y, me.dir, me.moving ? Math.floor(me.anim) % 2 : 0, color) });
    items.sort((a, b) => a.y - b.y).forEach((it) => it.fn());
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(low, 0, 0, canvas.width, canvas.height);
    drawSigns(t);
  }

  function drawSigns(t) {
    g.font = `${8.4 * S}px "Jersey 10", monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const b of BUILDINGS) {
      if (!b.label) continue;
      const fx = (b.door * T + 8) * S, fy = ((b.y + b.h) * T - 20) * S;
      const w = g.measureText(b.label).width + 6 * S, h = 10 * S;
      const x = fx - w / 2, y = fy - h - 2 * S;
      g.fillStyle = OUTLINE; g.fillRect(x - S, y - S, w + 2 * S, h + 2 * S);
      g.fillStyle = guide === b.id ? '#F2D45C' : '#FBF6EA'; g.fillRect(x, y, w, h);
      g.fillStyle = OUTLINE; g.fillText(b.label, fx, y + h / 2 + 0.4 * S);
      if (guide === b.id) { // bouncing arrow above the sign
        const bob = Math.round(Math.sin(t / 180) * 2) * S;
        const ay = y - 4 * S + bob, aw = 5 * S;
        g.beginPath(); g.moveTo(fx - aw, ay - 6 * S); g.lineTo(fx + aw, ay - 6 * S); g.lineTo(fx, ay); g.closePath();
        g.fillStyle = '#F2D45C'; g.fill(); g.lineWidth = S; g.strokeStyle = OUTLINE; g.stroke();
      }
    }
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (!paused) step(dt);
    draw(t);
    requestAnimationFrame(loop);
  }

  const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
  window.addEventListener('keydown', (e) => {
    if (paused || !KEYMAP[e.key] || e.target.closest('input, select, textarea')) return;
    keys.add(KEYMAP[e.key]); e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { if (KEYMAP[e.key]) keys.delete(KEYMAP[e.key]); });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    if (paused) return;
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width * W, my = (e.clientY - r.top) / r.height * H;
    const tx = Math.floor(mx / T), ty = Math.floor(my / T);
    const b = BUILDINGS.find((q) => q.enter && tx >= q.x && tx < q.x + q.w && ty >= q.y && ty < q.y + q.h);
    if (b) walkToTile(b.door, b.y + b.h, b);
    else walkToTile(tx, ty);
  });

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
  document.fonts?.ready.then(resize);

  return {
    pause() { paused = true; keys.clear(); path = null; me.moving = false; },
    resume() { paused = false; last = performance.now(); },
    setColor(c) { color = c; },
    setGuide(id) { guide = id; },
    resize,
    walkTo(id) { const b = BUILDINGS.find((q) => q.id === id); walkToTile(b.door, b.y + b.h, b); },
    pos() { return { x: me.x, y: me.y }; }, // used by automated tests
  };
}
