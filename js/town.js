// Sprout City town: an isometric (tilted 3D) map drawn on a <canvas>.
// The game logic lives in a flat 2D "world" (960 × 600). We only project it to look 3D.
// Arrow keys / WASD move in screen directions, or tap/click a spot (or a building) to walk there.

export const WORLD = { w: 960, h: 600 };
const SPEED = 230; // world units per second
const R = 18;      // player radius (world units)

const C = {
  bg: '#EFE8DA', slabL: '#C9BFA9', slabR: '#B5AA93',
  grass: '#A9C49B', grassLine: 'rgba(80,110,70,.10)', road: '#D9CDB3', roadEdge: '#CBBE9F', roadLine: '#F4EFE6',
  path: '#E6D9C0', water: '#7FA3B8', waterHi: '#A9C3D1',
  ink: '#24313A', shadow: 'rgba(36,49,58,.16)',
  treeA: '#5E8C61', treeB: '#4E7A55', treeC: '#7FA36F', trunk: '#8A6E55',
  window: '#5B7C99', windowLit: '#F3E3B5', door: '#3D4A52',
};

// Buildings. side: which wall the door is on ('bottom' = +y, 'right' = +x). H = height.
export const BUILDINGS = [
  { id: 'bank', label: 'Bank', x: 50, y: 70, w: 220, h: 170, H: 95, side: 'bottom', enter: true,
    wall: '#F1E9DA', wallR: '#DCD2C0', roof: '#5B7C99', roofEdge: '#4A6782', style: 'bank', dot: '#D2A03C' },
  { id: 'clock', label: 'Town Clock', x: 330, y: 125, w: 100, h: 115, H: 165, side: 'bottom', enter: true,
    wall: '#EADFCB', wallR: '#D4C7AE', roof: '#C4613F', roofEdge: '#A84F31', style: 'tower', dot: '#5B7C99' },
  { id: 'exchange', label: 'Stock Exchange', x: 610, y: 50, w: 290, h: 190, H: 110, side: 'bottom', enter: true,
    wall: '#F4EFE6', wallR: '#DED6C7', roof: '#2F6B4F', roofEdge: '#255A41', style: 'exchange', dot: '#2F8A57' },
  { id: 'news', label: 'News Stand', x: 90, y: 420, w: 190, h: 120, H: 60, side: 'right', enter: true,
    wall: '#F1E9DA', wallR: '#DCD2C0', roof: '#D2A03C', roofEdge: '#B88A2F', style: 'shop', dot: '#C4613F' },
  // decoration only
  { id: 'frosty', x: 600, y: 420, w: 90, h: 80, H: 50, wall: '#F3E6E6', wallR: '#DECFCF', roof: '#D9A7A7', roofEdge: '#C28F8F', style: 'shop' },
  { id: 'burgers', x: 720, y: 420, w: 110, h: 100, H: 60, wall: '#F1E9DA', wallR: '#DCD2C0', roof: '#C4613F', roofEdge: '#A84F31', style: 'shop' },
  { id: 'slime', x: 860, y: 410, w: 80, h: 110, H: 80, wall: '#E3ECDD', wallR: '#CCD8C4', roof: '#7FA36F', roofEdge: '#6A8D5B', style: 'factory' },
];
const TREES = [[300, 60, 'round'], [445, 70, 'pine'], [300, 262, 'round'], [585, 150, 'pine'], [585, 250, 'round'],
  [935, 110, 'pine'], [935, 255, 'round'], [28, 262, 'pine'], [40, 400, 'round'], [40, 585, 'pine'], [210, 585, 'round'],
  [565, 420, 'pine'], [565, 560, 'round'], [700, 572, 'pine'], [800, 575, 'round'], [930, 578, 'pine'], [25, 120, 'round']];
const POND = { x: 380, y: 555, rx: 55, ry: 32 };
const ROADS = [
  { x: 0, y: 285, w: WORLD.w, h: 80 },   // main street
  { x: 470, y: 0, w: 80, h: WORLD.h },   // cross street
];

function doorRect(b) {
  if (b.side === 'bottom') { const cx = b.x + b.w / 2; return { x: cx - 23, y: b.y + b.h - 2, w: 46, h: 14 }; }
  if (b.side === 'right') { const cy = b.y + b.h / 2; return { x: b.x + b.w - 2, y: cy - 23, w: 14, h: 46 }; }
  return null;
}
function doorSpot(b) { // where the player stands just outside the door
  if (b.side === 'right') return { x: b.x + b.w + R + 22, y: b.y + b.h / 2 };
  return { x: b.x + b.w / 2, y: b.y + b.h + R + 22 };
}

// ---- isometric projection (iso units; the canvas is scaled by k) ----
const P = (x, y, z = 0) => [x - y, (x + y) / 2 - z];
const ISO_W = WORLD.w + WORLD.h;            // 1560
const ISO_H = (WORLD.w + WORLD.h) / 2;      // 780
const TOP_PAD = 190, BOTTOM_PAD = 40, SIDE_PAD = 30;

export function createTown(canvas, { color = '#C4613F', onEnter = () => {} } = {}) {
  const g = canvas.getContext('2d');
  const me = { x: 510, y: 325, bob: 0, moving: false };
  let target = null, targetBuilding = null;
  const keys = new Set();
  let lastDoor = null;
  let paused = false;
  let guide = null;
  let k = 1, ox = 0, oy = 0, cssW = 0, cssH = 0;
  let staticLayer = null;
  let last = performance.now();

  function solid(x, y) {
    if (x < R || y < R || x > WORLD.w - R || y > WORLD.h - R) return true;
    for (const b of BUILDINGS) {
      if (x > b.x - R + 4 && x < b.x + b.w + R - 4 && y > b.y - R + 4 && y < b.y + b.h + R - 4) return true;
    }
    for (const [tx, ty] of TREES) if (Math.hypot(x - tx, y - ty) < R + 10) return true;
    if (((x - POND.x) / (POND.rx + R)) ** 2 + ((y - POND.y) / (POND.ry + R)) ** 2 < 1) return true;
    return false;
  }

  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    cssW = box.width; cssH = box.height;
    k = Math.min((cssW - SIDE_PAD * 2) / ISO_W, (cssH - 10) / (ISO_H + TOP_PAD + BOTTOM_PAD));
    ox = cssW / 2 - ((WORLD.w - WORLD.h) / 2) * k; // centre the diamond
    oy = (cssH - (ISO_H + TOP_PAD + BOTTOM_PAD) * k) / 2 + TOP_PAD * k;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${cssW}px`; canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    staticLayer = renderStatic(dpr);
  }
  const toWorld = (sx, sy) => { // screen (css px) -> world
    const u = (sx - ox) / k, v = (sy - oy) / k; // u = x - y, v = (x + y) / 2
    return { x: (u + 2 * v) / 2, y: (2 * v - u) / 2 };
  };

  // ---------- drawing helpers ----------
  function poly(s, pts, fill, stroke) {
    s.beginPath(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
    if (fill) { s.fillStyle = fill; s.fill(); }
    if (stroke) { s.strokeStyle = stroke; s.lineWidth = 1; s.stroke(); }
  }
  const rectPts = (x, y, w, h, z = 0) => [P(x, y, z), P(x + w, y, z), P(x + w, y + h, z), P(x, y + h, z)];
  // Draw on a building wall using (u = along wall, z = up) coordinates.
  function onFace(s, b, face, fn) {
    s.save();
    if (face === 'L') { const [px, py] = P(b.x, b.y + b.h); s.transform(1, 0.5, 0, -1, px, py); }
    else { const [px, py] = P(b.x + b.w, b.y); s.transform(-1, 0.5, 0, -1, px, py); }
    fn(face === 'L' ? b.w : b.h);
    s.restore();
  }
  // Draw on the ground using world (x, y) offsets around a point.
  function onGround(s, x, y, fn) {
    s.save(); const [px, py] = P(x, y); s.transform(1, 0.5, -1, 0.5, px, py); fn(); s.restore();
  }

  function renderStatic(dpr) {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const s = c.getContext('2d');
    s.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy);
    // floating slab
    const T = 26;
    poly(s, [P(0, WORLD.h), P(WORLD.w, WORLD.h), [P(WORLD.w, WORLD.h)[0], P(WORLD.w, WORLD.h)[1] + T], [P(0, WORLD.h)[0], P(0, WORLD.h)[1] + T]], C.slabL);
    poly(s, [P(WORLD.w, 0), P(WORLD.w, WORLD.h), [P(WORLD.w, WORLD.h)[0], P(WORLD.w, WORLD.h)[1] + T], [P(WORLD.w, 0)[0], P(WORLD.w, 0)[1] + T]], C.slabR);
    poly(s, rectPts(0, 0, WORLD.w, WORLD.h), C.grass);
    // subtle tile grid
    s.strokeStyle = C.grassLine; s.lineWidth = 1;
    for (let x = 40; x < WORLD.w; x += 40) { s.beginPath(); s.moveTo(...P(x, 0)); s.lineTo(...P(x, WORLD.h)); s.stroke(); }
    for (let y = 40; y < WORLD.h; y += 40) { s.beginPath(); s.moveTo(...P(0, y)); s.lineTo(...P(WORLD.w, y)); s.stroke(); }
    // roads
    for (const r of ROADS) poly(s, rectPts(r.x - 3, r.y - 3, r.w + 6, r.h + 6), C.roadEdge);
    for (const r of ROADS) poly(s, rectPts(r.x, r.y, r.w, r.h), C.road);
    s.strokeStyle = C.roadLine; s.lineWidth = 3; s.setLineDash([18, 16]);
    s.beginPath(); s.moveTo(...P(0, 325)); s.lineTo(...P(470, 325)); s.moveTo(...P(550, 325)); s.lineTo(...P(WORLD.w, 325));
    s.moveTo(...P(510, 0)); s.lineTo(...P(510, 285)); s.moveTo(...P(510, 365)); s.lineTo(...P(510, WORLD.h)); s.stroke();
    s.setLineDash([]);
    // paths to doors
    for (const b of BUILDINGS) {
      if (!b.enter) continue;
      if (b.side === 'bottom') poly(s, rectPts(b.x + b.w / 2 - 24, b.y + b.h, 48, 285 - (b.y + b.h)), C.path);
      else poly(s, rectPts(b.x + b.w, b.y + b.h / 2 - 24, 470 - (b.x + b.w), 48), C.path);
    }
    // pond
    onGround(s, POND.x, POND.y, () => {
      s.fillStyle = C.roadEdge; s.beginPath(); s.ellipse(0, 0, POND.rx + 6, POND.ry + 6, 0, 0, Math.PI * 2); s.fill();
      s.fillStyle = C.water; s.beginPath(); s.ellipse(0, 0, POND.rx, POND.ry, 0, 0, Math.PI * 2); s.fill();
      s.fillStyle = C.waterHi; s.beginPath(); s.ellipse(-12, -8, POND.rx * 0.45, POND.ry * 0.25, 0, 0, Math.PI * 2); s.fill();
    });
    // building shadows (cast to the lower-left)
    for (const b of BUILDINGS) poly(s, [P(b.x, b.y + b.h), P(b.x + b.w, b.y + b.h), P(b.x + b.w + 10, b.y + b.h + b.H * 0.25), P(b.x + 10, b.y + b.h + b.H * 0.25)], C.shadow);
    return c;
  }

  function drawBuilding(s, b) {
    const H = b.H;
    const A = P(b.x, b.y, H), B = P(b.x + b.w, b.y, H), Cc = P(b.x + b.w, b.y + b.h, H), D = P(b.x, b.y + b.h, H);
    // walls
    poly(s, [P(b.x, b.y + b.h), P(b.x + b.w, b.y + b.h), Cc, D], b.wall, 'rgba(36,49,58,.25)');
    poly(s, [P(b.x + b.w, b.y), P(b.x + b.w, b.y + b.h), Cc, B], b.wallR, 'rgba(36,49,58,.25)');
    // windows
    const win = (len, z0, z1, n, skip) => {
      for (let i = 0; i < n; i++) {
        const u = (len / (n + 1)) * (i + 1);
        if (skip && Math.abs(u - len / 2) < 34) continue;
        s.fillStyle = C.window; s.fillRect(u - 7, z0, 14, z1 - z0);
        s.fillStyle = 'rgba(255,255,255,.35)'; s.fillRect(u - 7, z1 - 4, 14, 4);
      }
    };
    if (b.style === 'bank') {
      onFace(s, b, 'L', (len) => { win(len, 20, 52, 4, true); s.fillStyle = b.roofEdge; s.fillRect(0, H - 14, len, 14); });
      onFace(s, b, 'R', (len) => { win(len, 20, 52, 3); s.fillStyle = b.roofEdge; s.fillRect(0, H - 14, len, 14); });
    } else if (b.style === 'exchange') {
      onFace(s, b, 'L', (len) => {
        s.fillStyle = '#E4DCCB'; s.fillRect(0, 0, len, 10);
        for (let i = 0; i < 7; i++) { const u = 22 + i * ((len - 44) / 6); if (Math.abs(u - len / 2) < 30) continue; s.fillStyle = '#FFFFFF'; s.fillRect(u - 6, 10, 12, H - 34); s.fillStyle = 'rgba(36,49,58,.08)'; s.fillRect(u + 2, 10, 4, H - 34); }
        s.fillStyle = b.roofEdge; s.fillRect(0, H - 24, len, 24);
      });
      onFace(s, b, 'R', (len) => { win(len, 24, 64, 4); s.fillStyle = b.roofEdge; s.fillRect(0, H - 24, len, 24); });
    } else if (b.style === 'tower') {
      onFace(s, b, 'L', (len) => {
        s.fillStyle = '#FFFDF8'; s.beginPath(); s.arc(len / 2, H - 42, 24, 0, Math.PI * 2); s.fill();
        s.strokeStyle = C.ink; s.lineWidth = 2.5; s.stroke();
        s.beginPath(); s.moveTo(len / 2, H - 42); s.lineTo(len / 2, H - 26); s.moveTo(len / 2, H - 42); s.lineTo(len / 2 + 11, H - 46); s.stroke();
        win(len, 60, 90, 2);
      });
      onFace(s, b, 'R', (len) => { win(len, 60, 90, 2); win(len, 105, 125, 2); });
    } else if (b.style === 'shop') {
      onFace(s, b, 'L', (len) => { s.fillStyle = C.window; s.fillRect(14, 12, Math.max(20, len - 90), 24); s.fillStyle = b.roof; s.fillRect(0, 40, len, 8); });
      onFace(s, b, 'R', (len) => {
        if (b.side === 'right') { s.fillStyle = C.window; s.fillRect(12, 12, 30, 24); s.fillRect(len - 42, 12, 30, 24); }
        s.fillStyle = b.roof; s.fillRect(0, 40, len, 8);
      });
    } else if (b.style === 'factory') {
      onFace(s, b, 'L', (len) => win(len, 18, 40, 2));
      onFace(s, b, 'R', (len) => win(len, 18, 40, 3));
    }
    // door
    if (b.enter) {
      const face = b.side === 'right' ? 'R' : 'L';
      onFace(s, b, face, (len) => {
        s.fillStyle = C.door; s.beginPath(); s.roundRect(len / 2 - 14, 0, 28, 40, [0, 0, 12, 12]); s.fill();
        s.fillStyle = '#D2A03C'; s.beginPath(); s.arc(len / 2 + 8, 20, 2, 0, Math.PI * 2); s.fill();
      });
    }
    // roof
    if (b.style === 'tower') {
      poly(s, [A, B, Cc, D], b.roofEdge);
      const apex = P(b.x + b.w / 2, b.y + b.h / 2, H + 55);
      poly(s, [D, Cc, apex], b.roof, 'rgba(36,49,58,.25)');
      poly(s, [Cc, B, apex], b.roofEdge, 'rgba(36,49,58,.25)');
    } else if (b.style === 'factory') {
      poly(s, [A, B, Cc, D], b.roofEdge);
      const [cx, cy] = P(b.x + b.w * 0.6, b.y + b.h * 0.3, H);
      s.fillStyle = '#B9AE9A'; s.fillRect(cx - 7, cy - 40, 14, 40);
      s.fillStyle = 'rgba(255,255,255,.7)'; s.beginPath(); s.arc(cx + 4, cy - 50, 8, 0, Math.PI * 2); s.arc(cx + 14, cy - 58, 6, 0, Math.PI * 2); s.fill();
    } else {
      poly(s, [A, B, Cc, D], b.roof, 'rgba(36,49,58,.25)');
      const ins = 8; // parapet inset
      poly(s, rectPts(b.x + ins, b.y + ins, b.w - ins * 2, b.h - ins * 2, H), b.roofEdge);
      if (b.style === 'bank' || b.style === 'exchange') { // a little rooftop unit
        const ux = b.x + b.w * 0.25, uy = b.y + b.h * 0.3;
        box(s, ux, uy, 30, 24, H, 14, '#E4DCCB', '#CFC5B2', '#F1E9DA');
      }
    }
  }
  function box(s, x, y, w, h, z0, H, wall, wallR, top) {
    poly(s, [P(x, y + h, z0), P(x + w, y + h, z0), P(x + w, y + h, z0 + H), P(x, y + h, z0 + H)], wall);
    poly(s, [P(x + w, y, z0), P(x + w, y + h, z0), P(x + w, y + h, z0 + H), P(x + w, y, z0 + H)], wallR);
    poly(s, rectPts(x, y, w, h, z0 + H), top);
  }

  function drawTree(s, x, y, kind) {
    onGround(s, x + 6, y + 6, () => { s.fillStyle = C.shadow; s.beginPath(); s.ellipse(0, 0, 14, 14, 0, 0, Math.PI * 2); s.fill(); });
    const [px, py] = P(x, y);
    s.fillStyle = C.trunk; s.fillRect(px - 2.5, py - 14, 5, 14);
    if (kind === 'pine') {
      for (const [w, top, col] of [[18, 46, C.treeB], [14, 60, C.treeA]]) {
        s.fillStyle = col; s.beginPath(); s.moveTo(px - w, py - 10 - (top - 46) * 0.4); s.lineTo(px + w, py - 10 - (top - 46) * 0.4); s.lineTo(px, py - top); s.closePath(); s.fill();
      }
    } else {
      s.fillStyle = C.treeA; s.beginPath(); s.arc(px, py - 26, 15, 0, Math.PI * 2); s.fill();
      s.fillStyle = C.treeC; s.beginPath(); s.arc(px - 5, py - 31, 7, 0, Math.PI * 2); s.fill();
    }
  }

  function drawPlayer(s) {
    const bob = me.moving ? Math.abs(Math.sin(me.bob)) * 3 : 0;
    onGround(s, me.x, me.y, () => { s.fillStyle = 'rgba(36,49,58,.22)'; s.beginPath(); s.ellipse(0, 0, 11, 11, 0, 0, Math.PI * 2); s.fill(); });
    const [px, py] = P(me.x, me.y);
    s.fillStyle = color; s.strokeStyle = C.ink; s.lineWidth = 1.5;
    s.beginPath(); s.roundRect(px - 8, py - 26 - bob, 16, 24, [7, 7, 4, 4]); s.fill(); s.stroke();
    s.fillStyle = '#F1E0CC'; s.beginPath(); s.arc(px, py - 33 - bob, 7, 0, Math.PI * 2); s.fill(); s.stroke();
  }

  function drawLabel(s, b, t) {
    const [px, py] = P(b.x + b.w / 2, b.y + b.h / 2, b.H + (b.style === 'tower' ? 70 : 26));
    const active = guide === b.id;
    const fs = 13 / k;
    s.font = `600 ${fs}px "Space Grotesk", system-ui, sans-serif`;
    const tw = s.measureText(b.label).width;
    const padX = fs * 0.8, h = fs * 2, w = tw + padX * 2 + fs * 0.9;
    const lift = active ? Math.sin(t / 250) * 3 : 0;
    s.fillStyle = 'rgba(36,49,58,.12)'; s.beginPath(); s.roundRect(px - w / 2, py - h + 3 - lift, w, h, h / 2); s.fill();
    s.fillStyle = active ? C.ink : '#FFFDF8'; s.beginPath(); s.roundRect(px - w / 2, py - h - lift, w, h, h / 2); s.fill();
    s.fillStyle = b.dot; s.beginPath(); s.arc(px - w / 2 + padX + fs * 0.2, py - h / 2 - lift, fs * 0.28, 0, Math.PI * 2); s.fill();
    s.fillStyle = active ? '#FFFDF8' : C.ink; s.textAlign = 'left'; s.textBaseline = 'middle';
    s.fillText(b.label, px - w / 2 + padX + fs * 0.75, py - h / 2 - lift + 1);
  }

  function draw(t) {
    const dpr = window.devicePixelRatio || 1;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = C.bg; g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(staticLayer, 0, 0);
    g.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy);

    // guide ring at the target door
    if (guide) {
      const b = BUILDINGS.find((x) => x.id === guide);
      const sp = doorSpot(b);
      const p = (t % 1600) / 1600;
      onGround(g, sp.x, sp.y, () => {
        g.strokeStyle = `rgba(47,107,79,${0.7 * (1 - p)})`; g.lineWidth = 3;
        g.beginPath(); g.arc(0, 0, 14 + p * 22, 0, Math.PI * 2); g.stroke();
        g.fillStyle = 'rgba(47,107,79,.18)'; g.beginPath(); g.arc(0, 0, 16, 0, Math.PI * 2); g.fill();
      });
    }
    if (target) {
      onGround(g, target.x, target.y, () => { g.strokeStyle = 'rgba(36,49,58,.45)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 12, 0, Math.PI * 2); g.stroke(); });
    }
    // depth-sorted scene: things further "back" draw first.
    // A building covers the player only when the player stands behind it (not past either front wall).
    const pd = me.x + me.y;
    const items = [];
    for (const b of BUILDINGS) items.push({ d: b.x + b.w + b.y + b.h, fn: () => drawBuilding(g, b), front: !(me.x >= b.x + b.w || me.y >= b.y + b.h) });
    for (const [x, y, kind] of TREES) items.push({ d: x + y, fn: () => drawTree(g, x, y, kind), front: x + y > pd });
    items.sort((a, b) => a.d - b.d);
    items.filter((it) => !it.front).forEach((it) => it.fn());
    drawPlayer(g);
    items.filter((it) => it.front).forEach((it) => it.fn());
    for (const b of BUILDINGS) if (b.enter) drawLabel(g, b, t);
  }

  // ---------- movement (unchanged world logic) ----------
  function step(dt) {
    let dx = 0, dy = 0;
    // screen directions -> world directions on the tilted map
    if (keys.has('up')) { dx -= 1; dy -= 1; }
    if (keys.has('down')) { dx += 1; dy += 1; }
    if (keys.has('left')) { dx -= 1; dy += 1; }
    if (keys.has('right')) { dx += 1; dy -= 1; }
    if (dx || dy) { target = null; targetBuilding = null; }
    else if (target) {
      const tx = target.x - me.x, ty = target.y - me.y, d = Math.hypot(tx, ty);
      if (d < 4) {
        target = null; me.moving = false;
        if (targetBuilding) { const b = targetBuilding; targetBuilding = null; lastDoor = null; enter(b); return; }
      } else { dx = tx / d; dy = ty / d; }
    }
    const len = Math.hypot(dx, dy);
    me.moving = !!len;
    if (!len) return;
    dx /= len; dy /= len;
    const dist = SPEED * dt;
    const nx = me.x + dx * dist, ny = me.y + dy * dist;
    if (!solid(nx, ny)) { me.x = nx; me.y = ny; }
    else if (!solid(nx, me.y)) me.x = nx;
    else if (!solid(me.x, ny)) me.y = ny;
    else if (target) { target = null; targetBuilding = null; }
    me.bob += dt * 12;
    checkDoors();
  }

  function checkDoors() {
    for (const b of BUILDINGS) {
      const d = doorRect(b);
      if (!d) continue;
      const pad = R + 8;
      const px = b.side === 'right' ? pad : 4, py = b.side === 'right' ? 4 : pad;
      const inside = me.x > d.x - px && me.x < d.x + d.w + px && me.y > d.y - py && me.y < d.y + d.h + py;
      if (inside && lastDoor !== b.id) return enter(b);
      if (!inside && lastDoor === b.id) lastDoor = null;
    }
  }

  function enter(b) {
    lastDoor = b.id;
    const sp = doorSpot(b);
    me.x = sp.x; me.y = sp.y; me.moving = false;
    keys.clear(); target = null;
    onEnter(b.id);
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
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    // tapped a building (its walls or roof)? walk to its door
    const hit = BUILDINGS.filter((b) => b.enter).find((b) => {
      for (let z = 0; z <= b.H + 30; z += 10) {
        const w = toWorld(sx, sy + z * k);
        if (w.x > b.x && w.x < b.x + b.w && w.y > b.y && w.y < b.y + b.h) return true;
      }
      return false;
    });
    if (hit) { target = doorSpot(hit); targetBuilding = hit; return; }
    const w = toWorld(sx, sy);
    target = { x: Math.max(R, Math.min(WORLD.w - R, w.x)), y: Math.max(R, Math.min(WORLD.h - R, w.y)) };
    targetBuilding = null;
  });

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
  document.fonts?.ready.then(resize);

  return {
    pause() { paused = true; keys.clear(); target = null; me.moving = false; },
    resume() { paused = false; last = performance.now(); },
    setColor(c) { color = c; },
    setGuide(id) { guide = id; },
    resize,
    walkTo(id) { const b = BUILDINGS.find((q) => q.id === id); target = doorSpot(b); targetBuilding = b; },
  };
}
