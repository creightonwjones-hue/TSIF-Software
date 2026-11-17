// The walkable cartoon town, drawn on a <canvas>.
// Arrow keys / WASD to walk, or tap/click a spot (or a building) to walk there.

export const WORLD = { w: 960, h: 600 };
const SPEED = 230; // pixels per second
const R = 18;      // avatar radius

const C = {
  grass: '#7BD389', grassDark: '#6CC47B', road: '#F4E1B5', roadLine: '#FFF6DE',
  navy: '#2B2D42', coral: '#FF8A5B', yellow: '#FFD23F', sky: '#8ED1FC', white: '#FFFFFF',
};

// Buildings. door: where you walk in. side: which wall the door is on.
export const BUILDINGS = [
  { id: 'bank', name: 'BANK', emoji: '🏦', x: 70, y: 70, w: 240, h: 170, color: '#FFD23F', roof: '#E0A800', side: 'bottom', enter: true },
  { id: 'exchange', name: 'STOCK EXCHANGE', emoji: '📈', x: 610, y: 50, w: 290, h: 190, color: '#8ED1FC', roof: '#4BA3D9', side: 'bottom', enter: true, columns: true },
  { id: 'news', name: 'NEWS STAND', emoji: '📰', x: 90, y: 420, w: 180, h: 120, color: '#FF8A5B', roof: '#E0633A', side: 'top', enter: true, awning: true },
  { id: 'clock', name: 'TOWN CLOCK', emoji: '🕰️', x: 660, y: 405, w: 130, h: 160, color: '#F7F3FF', roof: '#B39DDB', side: 'top', enter: true, tower: true },
  // decoration only
  { id: 'burgers', name: 'BURGERS', emoji: '🍔', x: 345, y: 110, w: 105, h: 120, color: '#FFB4A2', roof: '#E5989B', side: 'none' },
  { id: 'slime', name: 'SLIMECO', emoji: '🧠', x: 320, y: 430, w: 120, h: 110, color: '#B9FBC0', roof: '#7BD389', side: 'none' },
  { id: 'frosty', name: 'FROSTY', emoji: '🍦', x: 830, y: 430, w: 95, h: 95, color: '#FFC8DD', roof: '#FF8FB1', side: 'none' },
];
const TREES = [[40, 380], [40, 470], [560, 120], [560, 200], [600, 470], [585, 560], [945, 262], [935, 570], [30, 262], [300, 572]];
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
    s.fillStyle = C.grass; s.fillRect(0, 0, WORLD.w, WORLD.h);
    s.fillStyle = C.grassDark;
    for (let y = 10; y < WORLD.h; y += 40) for (let x = (y / 40) % 2 ? 10 : 30; x < WORLD.w; x += 40) {
      s.beginPath(); s.arc(x, y, 2, 0, Math.PI * 2); s.fill();
    }
    for (const r of ROADS) { s.fillStyle = C.road; s.fillRect(r.x, r.y, r.w, r.h); }
    s.strokeStyle = C.roadLine; s.lineWidth = 5; s.setLineDash([22, 18]);
    s.beginPath(); s.moveTo(0, 325); s.lineTo(470, 325); s.moveTo(550, 325); s.lineTo(WORLD.w, 325);
    s.moveTo(510, 0); s.lineTo(510, 285); s.moveTo(510, 365); s.lineTo(510, WORLD.h); s.stroke();
    s.setLineDash([]);
    // sidewalks to each door
    for (const b of BUILDINGS) {
      if (!b.enter) continue;
      const cx = b.x + b.w / 2;
      s.fillStyle = C.road;
      if (b.side === 'bottom') s.fillRect(cx - 26, b.y + b.h, 52, 285 - (b.y + b.h));
      else s.fillRect(cx - 26, 365, 52, b.y - 365);
    }
    for (const [tx, ty] of TREES) drawTree(s, tx, ty);
    for (const b of BUILDINGS) drawBuilding(s, b);
    return c;
  }

  function outline(s, w = 4) { s.lineWidth = w; s.strokeStyle = C.navy; s.lineJoin = 'round'; s.stroke(); }
  function rrect(s, x, y, w, h, r) { s.beginPath(); s.roundRect(x, y, w, h, r); }

  function drawTree(s, x, y) {
    s.fillStyle = '#8D6E63'; rrect(s, x - 5, y + 4, 10, 18, 3); s.fill(); outline(s, 3);
    s.fillStyle = '#4CAF6A'; s.beginPath(); s.arc(x, y - 4, 20, 0, Math.PI * 2); s.fill(); outline(s, 3);
    s.fillStyle = 'rgba(255,255,255,.25)'; s.beginPath(); s.arc(x - 7, y - 11, 6, 0, Math.PI * 2); s.fill();
  }

  function drawBuilding(s, b) {
    // shadow
    s.fillStyle = 'rgba(43,45,66,.18)'; rrect(s, b.x + 6, b.y + 10, b.w, b.h, 14); s.fill();
    // body
    s.fillStyle = b.color; rrect(s, b.x, b.y, b.w, b.h, 14); s.fill(); outline(s);
    // Sign band: on top for buildings whose door is at the bottom,
    // and at the bottom for buildings whose door faces up toward the road.
    const top = b.side !== 'top';
    const roofH = b.tower ? 44 : 38;
    const bandY = top ? b.y : b.y + b.h - roofH;
    s.save(); rrect(s, b.x, b.y, b.w, b.h, 14); s.clip();
    s.fillStyle = b.roof; s.fillRect(b.x, bandY, b.w, roofH);
    if (b.awning) {
      for (let i = 0; i < b.w; i += 24) { s.fillStyle = (i / 24) % 2 ? C.white : b.roof; s.fillRect(b.x + i, bandY, 24, roofH); }
    }
    s.restore();
    const lineY = top ? b.y + roofH : bandY;
    s.beginPath(); s.moveTo(b.x, lineY); s.lineTo(b.x + b.w, lineY); outline(s, 3);
    s.font = `700 ${b.w >= 170 ? 17 : 13}px Fredoka, "Trebuchet MS", sans-serif`;
    s.textAlign = 'center'; s.textBaseline = 'middle';
    if (b.awning) { // readable label on the stripes
      const tw = s.measureText(b.name).width + 18;
      s.fillStyle = C.white; rrect(s, b.x + b.w / 2 - tw / 2, bandY + 7, tw, roofH - 14, 8); s.fill(); outline(s, 2.5);
    }
    s.fillStyle = C.navy; s.fillText(b.name, b.x + b.w / 2, bandY + roofH / 2 + 1);

    // free area for the picture (between the door and the sign band)
    const doorH = 40;
    const areaTop = top ? b.y + roofH : b.y + (b.enter ? doorH : 0);
    const areaBot = top ? b.y + b.h - (b.enter ? doorH : 0) : bandY;
    const midY = (areaTop + areaBot) / 2;
    const cx = b.x + b.w / 2;
    if (b.tower) { // clock face
      const r = Math.min(30, (areaBot - areaTop) / 2 - 6);
      s.fillStyle = C.white; s.beginPath(); s.arc(cx, midY, r, 0, Math.PI * 2); s.fill(); outline(s, 3);
      s.beginPath(); s.moveTo(cx, midY); s.lineTo(cx, midY - r * 0.7);
      s.moveTo(cx, midY); s.lineTo(cx + r * 0.5, midY + r * 0.2); outline(s, 4);
    } else {
      const size = Math.min(b.enter ? 48 : 38, areaBot - areaTop - 8);
      s.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      s.fillText(b.emoji, cx, midY + 2);
    }
    if (b.columns) {
      for (let i = 0; i < 6; i++) {
        const px = b.x + 28 + i * ((b.w - 56) / 5);
        if (Math.abs(px - cx) < 30) continue; // leave room for the door
        s.fillStyle = C.white; rrect(s, px - 7, b.y + b.h - 70, 14, 52, 4); s.fill(); outline(s, 2.5);
      }
    }
    if (b.id === 'bank') {
      for (const wx of [b.x + 30, b.x + b.w - 70]) { s.fillStyle = C.sky; rrect(s, wx, b.y + b.h - 70, 40, 34, 6); s.fill(); outline(s, 3); }
    }
    // door
    if (b.enter) {
      const dx = cx - 22;
      if (top) {
        const dy = b.y + b.h - doorH;
        s.fillStyle = '#795548'; rrect(s, dx, dy, 44, doorH, [12, 12, 0, 0]); s.fill(); outline(s, 3);
        s.fillStyle = C.yellow; s.beginPath(); s.arc(dx + 34, dy + 22, 3.5, 0, Math.PI * 2); s.fill();
      } else {
        s.fillStyle = '#795548'; rrect(s, dx, b.y, 44, doorH - 4, [0, 0, 12, 12]); s.fill(); outline(s, 3);
        s.fillStyle = C.yellow; s.beginPath(); s.arc(dx + 34, b.y + 16, 3.5, 0, Math.PI * 2); s.fill();
        s.fillStyle = '#A1887F'; rrect(s, dx - 4, b.y - 12, 52, 12, 5); s.fill(); outline(s, 3);
      }
    }
  }

  function draw(t) {
    const dpr = window.devicePixelRatio || 1;
    const k = scale * dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(staticLayer, 0, 0);
    g.setTransform(k, 0, 0, k, 0, 0);

    // guide arrow
    if (guide) {
      const b = BUILDINGS.find((x) => x.id === guide);
      const sp = doorSpot(b);
      const bounce = Math.sin(t / 180) * 6;
      const ay = b.side === 'bottom' ? sp.y + 8 + bounce : sp.y - 8 - bounce;
      g.font = '34px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.side === 'bottom' ? '⬆️' : '⬇️', sp.x, ay);
    }
    // tap target marker
    if (target) {
      g.strokeStyle = 'rgba(43,45,66,.5)'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(target.x, target.y + 12, 14, 6, 0, 0, Math.PI * 2); g.stroke();
    }
    // avatar
    const bob = Math.sin(me.bob) * 3;
    g.fillStyle = 'rgba(43,45,66,.25)'; g.beginPath(); g.ellipse(me.x, me.y + R, R * 0.9, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.white; g.beginPath(); g.arc(me.x, me.y - 6 + bob, R + 4, 0, Math.PI * 2); g.fill();
    g.lineWidth = 4; g.strokeStyle = C.navy; g.stroke();
    g.font = `${R * 2}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
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
