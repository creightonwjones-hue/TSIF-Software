// The walkable cartoon town, drawn on a <canvas>.
// Arrow keys / WASD to walk, or tap/click a spot (or a building) to walk there.

export const WORLD = { w: 960, h: 600 };
const SPEED = 230; // pixels per second
const R = 18;      // avatar radius

const C = {
  ground: '#14262A', groundDot: '#1C3438', road: '#22284A', curb: '#323A6A', lane: '#3CE0FF',
  body: '#1C2248', band: '#121733', text: '#F2F4FF', lime: '#B8FF3C', cyan: '#3CE0FF',
  gold: '#FFD23F', orange: '#FF7A3C', pink: '#FF3CAC', window: '#FFE58A', door: '#0D1026',
};
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

// Buildings. side: which wall the door is on. neon: glow color.
export const BUILDINGS = [
  { id: 'bank', name: 'BANK', emoji: '🏦', x: 70, y: 70, w: 240, h: 170, neon: C.gold, side: 'bottom', enter: true },
  { id: 'exchange', name: 'STOCK EXCHANGE', emoji: '📈', x: 610, y: 50, w: 290, h: 190, neon: C.lime, side: 'bottom', enter: true, columns: true },
  { id: 'news', name: 'NEWS STAND', emoji: '📰', x: 90, y: 420, w: 180, h: 120, neon: C.orange, side: 'top', enter: true },
  { id: 'clock', name: 'TOWN CLOCK', emoji: '🕰️', x: 660, y: 405, w: 130, h: 160, neon: C.cyan, side: 'top', enter: true, tower: true },
  // decoration only
  { id: 'burgers', name: 'BURGERS', emoji: '🍔', x: 345, y: 110, w: 105, h: 120, neon: C.pink, side: 'none' },
  { id: 'slime', name: 'SLIMECO', emoji: '🧪', x: 320, y: 430, w: 120, h: 110, neon: '#7CFF6B', side: 'none' },
  { id: 'frosty', name: 'FROSTY', emoji: '🍦', x: 830, y: 430, w: 95, h: 95, neon: '#B69CFF', side: 'none' },
];
const TREES = [[40, 380], [40, 470], [560, 120], [600, 470], [585, 560], [935, 570], [300, 572]];
const LAMPS = [[30, 268], [200, 268], [420, 268], [580, 268], [940, 268], [60, 382], [440, 382], [600, 382], [880, 382], [560, 200]];
const ROADS = [
  { x: 0, y: 285, w: WORLD.w, h: 80 },   // main street
  { x: 470, y: 0, w: 80, h: WORLD.h },   // cross street
];

function doorRect(b) {
  const dw = 46, dh = 14, cx = b.x + b.w / 2;
  if (b.side === 'bottom') return { x: cx - dw / 2, y: b.y + b.h - 2, w: dw, h: dh };
  if (b.side === 'top') return { x: cx - dw / 2, y: b.y - dh + 2, w: dw, h: dh };
  return null;
}
function doorSpot(b) { // where the avatar stands just outside the door
  const cx = b.x + b.w / 2;
  return b.side === 'bottom' ? { x: cx, y: b.y + b.h + R + 22 } : { x: cx, y: b.y - R - 22 };
}

export function createTown(canvas, { avatar = '🦊', onEnter = () => {} } = {}) {
  const g = canvas.getContext('2d');
  const me = { x: 510, y: 325, face: 1, bob: 0 };
  let target = null;
  let targetBuilding = null;
  const keys = new Set();
  let lastDoor = null; // don't instantly re-enter the door we just left
  let paused = false;
  let guide = null;    // building id to point an arrow at
  let scale = 1;
  let staticLayer = null;
  let last = performance.now();

  function solid(x, y) {
    if (x < R || y < R || x > WORLD.w - R || y > WORLD.h - R) return true;
    for (const b of BUILDINGS) {
      if (x > b.x - R + 4 && x < b.x + b.w + R - 4 && y > b.y - R + 4 && y < b.y + b.h + R - 4) return true;
    }
    for (const [tx, ty] of TREES) if (Math.hypot(x - tx, y - (ty + 10)) < R + 12) return true;
    return false;
  }

  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    scale = Math.min(box.width / WORLD.w, box.height / WORLD.h);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${WORLD.w * scale}px`;
    canvas.style.height = `${WORLD.h * scale}px`;
    canvas.width = Math.round(WORLD.w * scale * dpr);
    canvas.height = Math.round(WORLD.h * scale * dpr);
    staticLayer = renderStatic(scale * dpr);
  }

  function renderStatic(k) {
    const c = document.createElement('canvas');
    c.width = Math.round(WORLD.w * k); c.height = Math.round(WORLD.h * k);
    const s = c.getContext('2d');
    s.scale(k, k);
    s.fillStyle = C.ground; s.fillRect(0, 0, WORLD.w, WORLD.h);
    s.fillStyle = C.groundDot;
    for (let y = 12; y < WORLD.h; y += 24) for (let x = 12; x < WORLD.w; x += 24) s.fillRect(x, y, 2, 2);
    // roads with curbs
    for (const r of ROADS) {
      s.fillStyle = C.curb; s.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    }
    for (const r of ROADS) { s.fillStyle = C.road; s.fillRect(r.x, r.y, r.w, r.h); }
    // sidewalks to each door
    for (const b of BUILDINGS) {
      if (!b.enter) continue;
      const cx = b.x + b.w / 2;
      s.fillStyle = C.curb;
      if (b.side === 'bottom') s.fillRect(cx - 24, b.y + b.h, 48, 281 - (b.y + b.h));
      else s.fillRect(cx - 24, 369, 48, b.y - 369);
    }
    // glowing lane lines
    glow(s, C.lane, 10, () => {
      s.strokeStyle = C.lane; s.lineWidth = 3; s.setLineDash([22, 18]);
      s.beginPath(); s.moveTo(0, 325); s.lineTo(470, 325); s.moveTo(550, 325); s.lineTo(WORLD.w, 325);
      s.moveTo(510, 0); s.lineTo(510, 285); s.moveTo(510, 365); s.lineTo(510, WORLD.h); s.stroke();
      s.setLineDash([]);
    });
    for (const [lx, ly] of LAMPS) { // light pools under lamps
      const g = s.createRadialGradient(lx, ly, 0, lx, ly, 70);
      g.addColorStop(0, 'rgba(255,229,138,.22)'); g.addColorStop(1, 'rgba(255,229,138,0)');
      s.fillStyle = g; s.fillRect(lx - 70, ly - 70, 140, 140);
    }
    for (const [tx, ty] of TREES) drawTree(s, tx, ty);
    for (const b of BUILDINGS) drawBuilding(s, b);
    for (const [lx, ly] of LAMPS) drawLamp(s, lx, ly);
    return c;
  }

  function glow(s, color, blur, fn) { s.save(); s.shadowColor = color; s.shadowBlur = blur; fn(); s.restore(); }
  function rrect(s, x, y, w, h, r) { s.beginPath(); s.roundRect(x, y, w, h, r); }

  function drawTree(s, x, y) {
    s.fillStyle = '#3A2E2A'; s.fillRect(x - 4, y + 6, 8, 16);
    s.fillStyle = '#1D5A46'; s.beginPath(); s.arc(x, y - 4, 20, 0, Math.PI * 2); s.fill();
    s.strokeStyle = '#2E8A68'; s.lineWidth = 2; s.stroke();
    s.fillStyle = 'rgba(184,255,60,.12)'; s.beginPath(); s.arc(x - 6, y - 10, 8, 0, Math.PI * 2); s.fill();
  }

  function drawLamp(s, x, y) {
    s.fillStyle = '#4A527F'; s.fillRect(x - 2, y - 22, 4, 24);
    glow(s, C.window, 14, () => { s.fillStyle = C.window; s.beginPath(); s.arc(x, y - 24, 5, 0, Math.PI * 2); s.fill(); });
  }

  function drawBuilding(s, b) {
    const top = b.side !== 'top';      // sign band on top unless the door faces up
    const bandH = b.tower ? 40 : 34;
    const bandY = top ? b.y : b.y + b.h - bandH;
    const cx = b.x + b.w / 2;
    // body + neon outline
    s.fillStyle = 'rgba(0,0,0,.35)'; rrect(s, b.x + 5, b.y + 8, b.w, b.h, 12); s.fill();
    s.fillStyle = C.body; rrect(s, b.x, b.y, b.w, b.h, 12); s.fill();
    glow(s, b.neon, 16, () => { s.strokeStyle = b.neon; s.lineWidth = 3; rrect(s, b.x, b.y, b.w, b.h, 12); s.stroke(); });
    // sign band
    s.save(); rrect(s, b.x, b.y, b.w, b.h, 12); s.clip();
    s.fillStyle = C.band; s.fillRect(b.x, bandY, b.w, bandH);
    s.restore();
    s.strokeStyle = b.neon; s.lineWidth = 2;
    s.beginPath(); const ly = top ? bandY + bandH : bandY; s.moveTo(b.x + 3, ly); s.lineTo(b.x + b.w - 3, ly); s.stroke();
    s.font = `400 ${b.w >= 170 ? 16 : 12}px "Russo One", Impact, sans-serif`;
    s.textAlign = 'center'; s.textBaseline = 'middle';
    glow(s, b.neon, 12, () => { s.fillStyle = b.neon; s.fillText(b.name, cx, bandY + bandH / 2 + 1); });

    const doorH = 40;
    const areaTop = top ? b.y + bandH : b.y + (b.enter ? doorH : 0);
    const areaBot = top ? b.y + b.h - (b.enter ? doorH : 0) : bandY;
    const midY = (areaTop + areaBot) / 2;
    // lit windows
    if (b.id === 'bank' || b.columns) {
      const n = b.columns ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const wx = b.x + 22 + i * ((b.w - 44 - 34) / (n - 1));
        if (Math.abs(wx + 17 - cx) < 45) continue;
        glow(s, C.window, 10, () => { s.fillStyle = 'rgba(255,229,138,.85)'; rrect(s, wx, b.y + b.h - 72, 34, 28, 4); s.fill(); });
      }
    }
    if (b.tower) { // glowing clock face
      const r = Math.min(30, (areaBot - areaTop) / 2 - 6);
      glow(s, C.cyan, 14, () => { s.strokeStyle = C.cyan; s.lineWidth = 3; s.beginPath(); s.arc(cx, midY, r, 0, Math.PI * 2); s.stroke(); });
      s.strokeStyle = C.text; s.lineWidth = 3; s.lineCap = 'round';
      s.beginPath(); s.moveTo(cx, midY); s.lineTo(cx, midY - r * 0.7); s.moveTo(cx, midY); s.lineTo(cx + r * 0.5, midY + r * 0.2); s.stroke();
    } else {
      const size = Math.min(b.enter ? 44 : 34, areaBot - areaTop - 8);
      s.font = `${size}px ${EMOJI_FONT}`;
      s.fillText(b.emoji, cx, midY + 2);
    }
    // door with neon frame
    if (b.enter) {
      const dx = cx - 21, dy = top ? b.y + b.h - doorH : b.y;
      s.fillStyle = C.door; rrect(s, dx, dy, 42, doorH, top ? [8, 8, 0, 0] : [0, 0, 8, 8]); s.fill();
      glow(s, b.neon, 10, () => { s.strokeStyle = b.neon; s.lineWidth = 2.5; rrect(s, dx, dy, 42, doorH, top ? [8, 8, 0, 0] : [0, 0, 8, 8]); s.stroke(); });
    }
  }

  function draw(t) {
    const dpr = window.devicePixelRatio || 1;
    const k = scale * dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(staticLayer, 0, 0);
    g.setTransform(k, 0, 0, k, 0, 0);

    // guide chevron
    if (guide) {
      const b = BUILDINGS.find((x) => x.id === guide);
      const sp = doorSpot(b);
      const dir = b.side === 'bottom' ? -1 : 1; // -1 = points up
      const bounce = Math.sin(t / 160) * 5;
      const y0 = sp.y + (dir < 0 ? 10 : -10) - dir * bounce;
      const pulse = 0.6 + 0.4 * Math.sin(t / 220);
      glow(g, C.lime, 18 * pulse, () => {
        g.strokeStyle = C.lime; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
        for (const off of [0, 12]) {
          g.globalAlpha = off ? 0.5 : 1;
          g.beginPath(); g.moveTo(sp.x - 14, y0 + off * -dir + 8 * -dir); g.lineTo(sp.x, y0 + off * -dir); g.lineTo(sp.x + 14, y0 + off * -dir + 8 * -dir); g.stroke();
        }
        g.globalAlpha = 1;
      });
    }
    // tap target marker
    if (target) {
      g.strokeStyle = 'rgba(60,224,255,.7)'; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(target.x, target.y + 12, 14, 6, 0, 0, Math.PI * 2); g.stroke();
    }
    // avatar: dark disc + neon ring
    const bob = Math.sin(me.bob) * 2.5;
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(me.x, me.y + R, R * 0.9, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#10142E'; g.beginPath(); g.arc(me.x, me.y - 6 + bob, R + 4, 0, Math.PI * 2); g.fill();
    glow(g, C.lime, 14, () => { g.strokeStyle = C.lime; g.lineWidth = 3; g.beginPath(); g.arc(me.x, me.y - 6 + bob, R + 4, 0, Math.PI * 2); g.stroke(); });
    g.font = `${R * 1.8}px ${EMOJI_FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(me.x, me.y - 4 + bob); g.scale(me.face, 1); g.fillText(avatar, 0, 0); g.restore();
  }

  function step(dt) {
    let dx = 0, dy = 0;
    if (keys.has('left')) dx -= 1;
    if (keys.has('right')) dx += 1;
    if (keys.has('up')) dy -= 1;
    if (keys.has('down')) dy += 1;
    if (dx || dy) { target = null; targetBuilding = null; }
    else if (target) {
      const tx = target.x - me.x, ty = target.y - me.y, d = Math.hypot(tx, ty);
      if (d < 4) {
        target = null;
        if (targetBuilding) { const b = targetBuilding; targetBuilding = null; lastDoor = null; enter(b); return; }
      } else { dx = tx / d; dy = ty / d; }
    }
    const len = Math.hypot(dx, dy);
    if (!len) return;
    dx /= len; dy /= len;
    if (dx) me.face = dx < 0 ? -1 : 1;
    const dist = SPEED * dt;
    const nx = me.x + dx * dist, ny = me.y + dy * dist;
    if (!solid(nx, ny)) { me.x = nx; me.y = ny; }
    else if (!solid(nx, me.y)) me.x = nx;
    else if (!solid(me.x, ny)) me.y = ny;
    else if (target) { target = null; targetBuilding = null; }
    me.bob += dt * 14;
    checkDoors();
  }

  function checkDoors() {
    for (const b of BUILDINGS) {
      const d = doorRect(b);
      if (!d) continue;
      const pad = R + 8;
      const inside = me.x > d.x - 4 && me.x < d.x + d.w + 4 && me.y > d.y - pad && me.y < d.y + d.h + pad;
      if (inside && lastDoor !== b.id) return enter(b);
      if (!inside && lastDoor === b.id) lastDoor = null;
    }
  }

  function enter(b) {
    lastDoor = b.id;
    const sp = doorSpot(b);
    me.x = sp.x; me.y = sp.y;
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
    if (paused || !KEYMAP[e.key] || e.target.closest('input')) return;
    keys.add(KEYMAP[e.key]); e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { if (KEYMAP[e.key]) keys.delete(KEYMAP[e.key]); });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    if (paused) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale;
    const b = BUILDINGS.find((q) => q.enter && x > q.x && x < q.x + q.w && y > q.y && y < q.y + q.h + 30);
    if (b) { target = doorSpot(b); targetBuilding = b; }
    else { target = { x, y }; targetBuilding = null; }
  });

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
  // fonts may load after first paint: redraw the signs once they're ready
  document.fonts?.ready.then(resize);

  return {
    pause() { paused = true; keys.clear(); target = null; },
    resume() { paused = false; last = performance.now(); },
    setAvatar(a) { avatar = a; },
    setGuide(id) { guide = id; },
    resize,
    // for automated tests: walk straight to a building's door
    walkTo(id) { const b = BUILDINGS.find((q) => q.id === id); target = doorSpot(b); targetBuilding = b; },
  };
}
