// Sprout City town: a top-down pixel-art main street drawn on a <canvas>.
// The map is 32 × 18 tiles of 16 px, drawn small and scaled up crisply.
// Walk with arrow keys / WASD, or tap anywhere (or on a building) to walk there.
// The town changes with the seasons and has townsfolk, ducks, smoke and weather.

const T = 16, MW = 32, MH = 18, W = MW * T, H = MH * T;
const SPEED = 82; // map pixels per second
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const OUTLINE = '#26313F';
// Buildings (tile units). `door` = the door's tile column on the bottom wall. `enter` = can walk in.
export const BUILDINGS = [
  { id: 'bank', label: 'BANK', x: 2, y: 2, w: 7, h: 5, door: 5, enter: true, civic: true, labelY: 71 },
  { id: 'home', label: 'HOME', x: 11, y: 2, w: 4, h: 5, door: 12, wall: 'sky', roof: 'red', enter: true, chimney: true },
  { id: 'exchange', label: 'STOCK EXCHANGE', x: 19, y: 2, w: 10, h: 5, door: 23, enter: true, civic: true, labelY: 71 },
  { id: 'news', label: 'NEWS', x: 3, y: 11, w: 6, h: 4, door: 6, enter: true, kiosk: true, labelY: 203 },
  { id: 'lemonade', label: 'LEMONADE', x: 19, y: 11, w: 4, h: 4, door: 20, enter: true, stand: true },
  { id: 'mine', label: 'MINE', x: 24, y: 11, w: 5, h: 4, door: 26, enter: true, mine: true },
  { id: 'dock', label: 'DOCK', x: 10, y: 11, w: 3, h: 4, door: 11, enter: true, dock: true, labelY: 170 },
];
const PATHS = [[0, 8, 32, 2], [15, 10, 2, 7], [5, 7, 1, 1], [12, 7, 1, 1], [18, 7, 11, 1], [6, 15, 1, 1], [6, 16, 9, 1], [20, 15, 1, 1], [17, 16, 10, 1], [26, 15, 1, 1]];
const POND = [10, 11, 3, 3];
const HEDGE_GAPS = [5, 12, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
// Natural edges: small clusters of trees with gaps (no solid wall), plus rocks, bushes, a fence, a meadow and a creek.
const TREES = [
  [0, 0], [1, 0], [0, 1], [4, 0], [9, 0], [10, 0], [9, 1], [17, 0], [18, 0], [21, 0], [26, 0], [27, 0], [30, 0], [31, 0], [31, 1],
  [0, 3], [1, 4], [0, 5], [0, 11], [0, 12], [0, 13], [0, 16], [31, 3], [31, 4], [30, 5], [31, 11], [30, 12], [31, 12], [31, 15], [31, 16], [28, 16],
  [9, 2], [16, 2], [16, 4], [1, 11], [13, 15], [9, 12], [29, 13], [17, 12],
];
const ROCKS = [[4, 16], [29, 16], [19, 1], [31, 6], [6, 0]];
const BUSHES = [[1, 10], [30, 10], [24, 1], [2, 0], [29, 11]];
const FENCE = { y: 1, x0: 10, x1: 15 };
const MEADOW = [[1, 15], [2, 15], [3, 15], [1, 16], [2, 16], [3, 16], [1, 14]];
const CREEK_Y = 17, BRIDGE = [15, 16];
const BULL = [20, 7]; // the bull statue's plinth covers this tile and the next one
const FLOWERS = [[3, 6.6], [7, 6.6], [20, 6.6], [27, 6.6], [9, 15], [12, 15], [2, 14], [23, 12], [23, 13]];
const LAMPS = [[4, 10], [11, 10], [20, 10], [28, 10]];
const CHIMNEYS = BUILDINGS.filter((b) => b.chimney).map((b) => [b.x * T + b.w * T - 14, b.y * T - 14]);

// Townsfolk walk these loops (tile waypoints; `wait` = seconds to pause there).
const ROUTES = [
  { shirt: '#A88E84', hair: '#2E2420', speed: 26, pts: [[0, 8, 2], [31, 8, 2.5]] },
  { shirt: '#8E9CAA', hair: '#C9A15B', speed: 22, pts: [[31, 9, 3], [0, 9, 2]] },
  { shirt: '#9C92AA', hair: '#5A3A28', speed: 24, pts: [[15, 9], [15, 16], [6, 16], [6, 15, 2.5], [6, 16], [26, 16], [26, 15, 2], [26, 16], [15, 16], [15, 10]] },
  { shirt: '#8EA394', hair: '#2E2420', speed: 25, pts: [[8, 9], [5, 9], [5, 7, 2.5], [5, 9], [23, 9], [23, 7, 2.5], [23, 9]] },
  { shirt: '#B39AA4', hair: '#7A4A22', speed: 20, pts: [[16, 10], [16, 16], [17, 16, 1.5], [16, 16], [16, 9], [12, 9], [12, 7, 2], [12, 9], [16, 9]] },
];
const QUEUE_SPOTS = [[21, 15], [22, 15], [23, 15], [24, 15]];
const QUEUE_LOOK = [['#B8A27E', '#2E2420'], ['#8AA3A3', '#C9A15B'], ['#AE8C84', '#5A3A28'], ['#9AA6B4', '#7A4A22']];

const SEASONS = {
  spring: { grass: ['#6AA046', '#5E9440', '#76AE50', '#83BA58'], tree: ['#2F5E2A', '#3F7A34', '#5A9A44', '#7CB85A'], blossom: '#F2A7C3' },
  summer: { grass: ['#64A23E', '#579336', '#71AE48', '#82BD52'], tree: ['#2A5A26', '#367A30', '#4E9640', '#6DB052'] },
  fall:   { grass: ['#8A9A48', '#7C8C40', '#97A652', '#A3AE5C'], tree: ['#7A3A1E', '#B85A2A', '#D9832E', '#E8B04A'] },
  winter: { grass: ['#E6EDF2', '#D6E0E8', '#F2F6F9', '#C9D6E0'], tree: ['#1F4A2E', '#2E5E3A', '#3E7046', '#FFFFFF'] },
};

const ROOF = { blue: ['#4A6A9A', '#3A5680', '#5C7EB0'], red: ['#B4503E', '#8E3E30', '#C8664F'], green: ['#3F7F6A', '#2F6655', '#52957E'],
  orange: ['#D08A3A', '#A86E2A', '#E2A050'], gray: ['#6E7480', '#585D68', '#848A96'] };
const DOOR_COLOR = { bank: '#2F4E6E', exchange: '#2F6655', home: '#8E3E30' };

// ---------- solid tiles & doors ----------
const solid = Array.from({ length: MH }, () => Array(MW).fill(false));
const doorAt = {};
for (const [x, y] of TREES) solid[y][x] = true;
for (const b of BUILDINGS) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) solid[y][x] = true;
for (const b of BUILDINGS) if (b.enter) doorAt[`${b.door},${b.y + b.h - 1}`] = b;
for (let y = POND[1]; y < POND[1] + POND[3]; y++) for (let x = POND[0]; x < POND[0] + POND[2]; x++) solid[y][x] = true;
for (let x = 1; x < MW - 1; x++) if (!HEDGE_GAPS.includes(x)) solid[7][x] = true;
for (const [x, y] of [...ROCKS, ...BUSHES]) solid[y][x] = true;
for (let x = FENCE.x0; x <= FENCE.x1; x++) solid[FENCE.y][x] = true;
for (let x = 0; x < MW; x++) if (!BRIDGE.includes(x)) solid[CREEK_Y][x] = true;
solid[BULL[1]][BULL[0]] = solid[BULL[1]][BULL[0] + 1] = true;
const isSolid = (tx, ty) => tx < 0 || ty < 0 || tx >= MW || ty >= MH || solid[ty][tx];

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

// ---------- static scenery (redrawn when the season changes) ----------
function drawStatic(season) {
  seed = 7;
  const SZ = SEASONS[season];
  const winter = season === 'winter';
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const G = SZ.grass;
  R(c, 0, 0, W, H, G[0]);
  for (let i = 0; i < 2600; i++) R(c, Math.floor(rnd() * W), Math.floor(rnd() * H), 1, rnd() < .5 ? 2 : 1, G[1 + Math.floor(rnd() * 3)]);
  if (winter) for (let i = 0; i < 260; i++) R(c, Math.floor(rnd() * W), Math.floor(rnd() * H), 2, 1, '#9DB58A'); // grass poking through
  // cobblestone streets with a pale curb
  for (const [x, y, w, h] of PATHS) R(c, x * T - 1, y * T - 1, w * T + 2, h * T + 2, winter ? '#F4F7FA' : '#D9D2C3');
  for (const [x, y, w, h] of PATHS) {
    R(c, x * T + 1, y * T + 1, w * T - 2, h * T - 2, '#9E978C');
    for (let yy = y * T + 1, row = 0; yy < (y + h) * T - 1; yy += 4, row++) {
      for (let xx = x * T + 1 + (row % 2) * 3; xx < (x + w) * T - 1; xx += 6) {
        R(c, xx, yy, Math.min(5, (x + w) * T - 1 - xx), 3, ['#B3AC9F', '#A8A194', '#BDB6A9'][Math.floor(rnd() * 3)]);
      }
    }
    if (winter) for (let i = 0; i < w * h * 4; i++) R(c, x * T + Math.floor(rnd() * w * T), y * T + Math.floor(rnd() * h * T), 3, 2, '#EEF3F7');
  }
  // pond (frozen in winter)
  const [px, py, pw, ph] = POND.map((v) => v * T);
  R(c, px - 2, py + 1, pw + 4, ph - 2, '#C9C2B5'); R(c, px + 1, py - 2, pw - 2, ph + 4, '#C9C2B5');
  const water = winter ? ['#BFD8E8', '#D4E6F1'] : ['#4F86B0', '#5E97C0'];
  R(c, px, py + 2, pw, ph - 4, water[0]); R(c, px + 2, py, pw - 4, ph, water[0]);
  R(c, px + 3, py + 3, pw - 6, ph - 6, water[1]);
  if (winter) for (let i = 0; i < 5; i++) R(c, px + 8 + i * 7, py + 10 + (i % 2) * 14, 6, 1, '#FFFFFF');
  // lily pads in spring / summer
  if (season === 'spring' || season === 'summer') for (const [lx, ly] of [[px + 9, py + 30], [px + 34, py + 12]]) { R(c, lx, ly, 6, 4, '#3E7A2E'); R(c, lx + 1, ly + 1, 2, 1, '#5A9A48'); if (season === 'spring') R(c, lx + 4, ly - 1, 2, 2, '#F2A7C3'); }
  // hedges along the street
  for (let x = 1; x < MW - 1; x++) {
    if (HEDGE_GAPS.includes(x)) continue;
    const X = x * T, Y = 7 * T + 8;
    R(c, X, Y, 16, 6, '#2F6A2C'); R(c, X + 1, Y - 1, 14, 6, '#3F7F38'); R(c, X + 3, Y, 3, 2, '#5A9A48'); R(c, X + 10, Y + 1, 2, 2, '#5A9A48');
    if (winter) R(c, X + 1, Y - 1, 14, 2, '#FFFFFF');
  }
  if (!winter) for (const [fx, fy] of FLOWERS) {
    const x = fx * T, y = Math.round(fy * T);
    const cols = season === 'fall' ? ['#D9832E', '#B85A2A', '#E8B04A'] : ['#E8607A', '#F2D45C', '#A97FD8'];
    for (const [ox, oy, col] of [[3, 12, cols[0]], [8, 13, cols[1]], [12, 12, cols[2]]]) { R(c, x + ox, y + oy, 2, 2, col); R(c, x + ox, y + oy + 2, 1, 2, '#3E7A2E'); }
  }
  drawEdges(c, season);
  for (const b of BUILDINGS) {
    if (b.stand) continue;
    if (b.civic) drawCivic(c, b, winter);
    else if (b.kiosk) drawKiosk(c, b, winter);
    else if (b.mine) drawMine(c, b, winter);
    else if (b.dock) drawDock(c, b, winter);
    else drawBuilding(c, b, winter);
  }
  drawBull(c, winter);
  drawStandBase(c, BUILDINGS.find((b) => b.stand), winter);
  for (const [lx, ly] of LAMPS) { const x = lx * T + 7, y = ly * T; R(c, x, y - 12, 2, 14, OUTLINE); R(c, x - 2, y - 16, 6, 5, OUTLINE); R(c, x - 1, y - 15, 4, 3, '#F8E08A'); if (winter) R(c, x - 2, y - 17, 6, 1, '#FFFFFF'); }
  return cv;
}

function wallFill(c, kind, x, y, w, h) {
  const siding = (col, line) => { R(c, x, y, w, h, col); for (let yy = y + 2; yy < y + h; yy += 3) R(c, x, yy, w, 1, line); };
  if (kind === 'brick') {
    R(c, x, y, w, h, '#B5563F');
    for (let yy = y, r = 0; yy < y + h; yy += 3, r++) { R(c, x, yy, w, 1, '#93412F'); for (let xx = x + (r % 2) * 3; xx < x + w; xx += 6) R(c, xx, yy, 1, 3, '#93412F'); }
  } else if (kind === 'stone') { R(c, x, y, w, h, '#E7E1D4'); for (let yy = y; yy < y + h; yy += 6) R(c, x, yy, w, 1, '#D2CABA'); }
  else if (kind === 'sky') siding('#CFE0EC', '#B3C9D9');
  else siding('#F1E7D2', '#DCCFB4');
}

function drawBuilding(c, b, winter) {
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
  const wins = b.columns ? [x + 20, x + w - 34] : b.w <= 4 ? [x + 44] : [x + 8, x + w - 22];
  for (const wx of wins) {
    if (Math.abs(wx + 6 - (doorX + 5)) < 14) continue;
    R(c, wx - 1, y + roofH + 6, 14, 12, '#FFFFFF'); R(c, wx, y + roofH + 7, 12, 10, '#7FB0D6'); R(c, wx + 1, y + roofH + 8, 3, 3, '#D4ECFA');
    R(c, wx + 5, y + roofH + 7, 2, 10, '#FFFFFF'); R(c, wx, y + roofH + 11, 12, 1, '#FFFFFF');
    R(c, wx - 1, y + roofH + 18, 14, 3, '#5E6A78');
    if (!winter) { R(c, wx, y + roofH + 17, 2, 2, '#E8607A'); R(c, wx + 5, y + roofH + 17, 2, 2, '#F2D45C'); R(c, wx + 10, y + roofH + 17, 2, 2, '#E8607A'); }
    else R(c, wx - 1, y + roofH + 17, 14, 1, '#FFFFFF');
  }
  // door
  R(c, doorX - 1, y + h - 19, 12, 19, '#FFFFFF'); R(c, doorX, y + h - 18, 10, 18, DOOR_COLOR[b.id] || '#5E6A78');
  R(c, doorX + 1, y + h - 17, 8, 6, 'rgba(255,255,255,.25)'); R(c, doorX + 7, y + h - 9, 2, 2, '#E8C060');
  if (winter && b.id === 'home') { R(c, doorX + 2, y + h - 15, 6, 6, '#3F7F38'); R(c, doorX + 4, y + h - 13, 2, 2, '#C8503E'); } // wreath
  // shingle roof
  R(c, x - 3, y, w + 6, roofH + 2, r2);
  for (let ry = y + 1, row = 0; ry < y + roofH; ry += 4, row++) for (let rx = x - 3 + (row % 2) * 3; rx < x + w + 3; rx += 6) { R(c, rx, ry, 5, 3, r1); R(c, rx, ry, 5, 1, r3); }
  if (winter) { // snow on the roof
    R(c, x - 3, y, w + 6, 10, '#F4F7FA'); R(c, x - 3, y + 10, w + 6, 2, '#DCE6EE');
    for (let rx = x - 3; rx < x + w + 3; rx += 7) R(c, rx, y + 12, 4, 2 + ((rx / 7) % 3), '#F4F7FA');
  }
  R(c, x - 3, y + roofH, w + 6, 2, OUTLINE);
  if (b.chimney) { R(c, x + w - 18, y - 14, 9, 16, '#7A3A2C'); R(c, x + w - 17, y - 14, 7, 2, winter ? '#FFFFFF' : '#93412F'); }
}

// The lemonade stand: a deck, a striped canopy on poles, and a counter with a pitcher, cups and lemons.
function drawStandBase(c, b, winter) {
  const x = b.x * T, y = b.y * T;
  R(c, x + 3, y + 28, 60, 36, 'rgba(20,30,20,.18)');
  // wooden deck
  R(c, x + 1, y + 26, 62, 36, '#C9A26B');
  for (let yy = y + 29; yy < y + 62; yy += 5) R(c, x + 1, yy, 62, 1, '#B08A55');
  for (let xx = x + 9; xx < x + 63; xx += 16) R(c, xx, y + 26, 1, 36, '#B9965F');
  // poles
  R(c, x + 8, y + 16, 3, 30, '#8A6E55'); R(c, x + 53, y + 16, 3, 30, '#8A6E55');
  // counter
  R(c, x + 5, y + 38, 54, 22, OUTLINE);
  R(c, x + 6, y + 41, 52, 18, '#F6E7A8');
  for (let yy = y + 44; yy < y + 59; yy += 3) R(c, x + 6, yy, 52, 1, '#E8D48C');
  R(c, x + 5, y + 37, 54, 5, '#D9B77A'); R(c, x + 5, y + 37, 54, 1, '#E8CC94');
  // lemons painted on the counter front
  for (const lx of [x + 10, x + 48]) { R(c, lx, y + 49, 6, 5, '#F2D45C'); R(c, lx + 1, y + 48, 4, 7, '#F2D45C'); R(c, lx + 1, y + 49, 2, 2, '#FFF4B0'); R(c, lx + 2, y + 47, 2, 1, '#5A9A48'); }
  // on the counter: pitcher, stacked cups, bowl of lemons
  R(c, x + 14, y + 27, 9, 11, '#26313F'); R(c, x + 15, y + 28, 7, 9, '#E8F4FA'); R(c, x + 15, y + 31, 7, 6, '#F2D45C'); R(c, x + 22, y + 30, 2, 4, '#26313F');
  for (let i = 0; i < 3; i++) { R(c, x + 28, y + 34 - i * 2, 5, 2, i % 2 ? '#FFFFFF' : '#E8EEF2'); }
  R(c, x + 38, y + 33, 12, 5, '#8A6E55'); R(c, x + 39, y + 31, 3, 3, '#F2D45C'); R(c, x + 43, y + 30, 3, 3, '#F2D45C'); R(c, x + 46, y + 31, 3, 3, '#E8C440');
  // striped canopy with a scalloped edge
  R(c, x + 2, y + 6, 60, 13, OUTLINE);
  for (let i = 0; i < 60; i += 6) R(c, x + 2 + i, y + 7, 6, 11, (i / 6) % 2 ? '#FFFFFF' : '#F2C230');
  for (let i = 0; i < 60; i += 6) { R(c, x + 3 + i, y + 18, 4, 2, (i / 6) % 2 ? '#FFFFFF' : '#F2C230'); R(c, x + 3 + i, y + 20, 4, 1, OUTLINE); }
  R(c, x + 2, y + 7, 60, 2, 'rgba(255,255,255,.45)');
  if (winter) R(c, x + 2, y + 5, 60, 3, '#F4F7FA');
  // chalkboard price sign
  R(c, x + 58, y + 46, 9, 12, '#8A6E55'); R(c, x + 59, y + 47, 7, 9, OUTLINE); R(c, x + 61, y + 49, 1, 5, '#FFFFFF'); R(c, x + 60, y + 50, 3, 1, '#FFFFFF'); R(c, x + 60, y + 52, 3, 1, '#FFFFFF');
}


// ---------- edges of town: creek & bridge, picket fence, rocks, bushes, meadow ----------
function drawEdges(c, season) {
  const winter = season === 'winter';
  // creek along the bottom, with a wooden footbridge where the street crosses
  const cy = CREEK_Y * T;
  R(c, 0, cy, W, 2, winter ? '#E6EDF2' : '#C9B48A');
  R(c, 0, cy + 2, W, T - 2, winter ? '#BFD8E8' : '#4F86B0');
  for (let x = 4; x < W; x += 13) R(c, x, cy + 6 + (x % 3), 6, 1, winter ? '#FFFFFF' : '#7FB0D6');
  const bx = BRIDGE[0] * T;
  R(c, bx - 2, cy - 1, 36, T + 1, '#6B4A30');
  for (let x = bx; x < bx + 32; x += 4) R(c, x, cy, 3, T, '#B08A55');
  R(c, bx - 2, cy, 2, T, '#5A3A28'); R(c, bx + 32, cy, 2, T, '#5A3A28');
  if (winter) R(c, bx - 2, cy - 1, 36, 2, '#FFFFFF');
  // white picket fence behind Home
  for (let x = FENCE.x0 * T; x < (FENCE.x1 + 1) * T; x += 4) { R(c, x, FENCE.y * T + 4, 3, 10, '#FFFFFF'); R(c, x, FENCE.y * T + 3, 3, 1, '#E2DBCC'); }
  R(c, FENCE.x0 * T, FENCE.y * T + 7, (FENCE.x1 - FENCE.x0 + 1) * T, 2, '#F4F1EA'); R(c, FENCE.x0 * T, FENCE.y * T + 11, (FENCE.x1 - FENCE.x0 + 1) * T, 2, '#F4F1EA');
  // meadow of wildflowers and tall grass
  if (!winter) for (const [mx, my] of MEADOW) for (let i = 0; i < 7; i++) {
    const x = mx * T + ((i * 7 + mx * 3) % 14) + 1, y = my * T + ((i * 5 + my * 7) % 12) + 2;
    R(c, x, y + 2, 1, 3, '#3E7A2E');
    R(c, x - (i % 2), y, 2, 2, season === 'fall' ? ['#D9832E', '#E8B04A'][i % 2] : ['#F2F2F2', '#F2D45C', '#E8607A', '#A97FD8'][i % 4]);
  }
  for (let i = 0; i < 40; i++) { // tufts of tall grass scattered around the edges
    const x = (i * 97) % W, y = i % 2 ? 4 + (i * 13) % 20 : H - 40 + (i * 7) % 18;
    if (winter) R(c, x, y, 3, 1, '#C9D6E0'); else { R(c, x, y, 1, 3, '#4E8A3C'); R(c, x + 2, y + 1, 1, 2, '#4E8A3C'); }
  }
  // rocks
  for (const [rx, ry] of ROCKS) {
    const x = rx * T + 2, y = ry * T + 5;
    R(c, x + 1, y + 8, 13, 3, 'rgba(20,30,20,.2)'); R(c, x, y + 2, 12, 8, '#8D8A84'); R(c, x + 2, y, 8, 3, '#A9A6A0'); R(c, x + 3, y + 1, 3, 1, '#C9C6C0');
    if (winter) R(c, x + 2, y, 8, 2, '#FFFFFF');
  }
  // bushes
  for (const [bx2, by] of BUSHES) {
    const x = bx2 * T + 1, y = by * T + 3;
    R(c, x + 1, y + 10, 14, 3, 'rgba(20,30,20,.2)'); R(c, x, y + 3, 14, 9, '#2F6A2C'); R(c, x + 2, y + 1, 10, 9, '#3F7F38'); R(c, x + 4, y + 3, 3, 2, '#5A9A48');
    if (season === 'spring') { R(c, x + 3, y + 6, 2, 2, '#F2A7C3'); R(c, x + 9, y + 4, 2, 2, '#F2A7C3'); }
    if (winter) R(c, x + 2, y + 1, 10, 3, '#FFFFFF');
  }
}

// ---------- classical stone buildings: the Bank and the Stock Exchange ----------
function drawCivic(c, b, winter) {
  const x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T, roofH = 34;
  const ex = b.id === 'exchange';
  const stone = ex ? '#F4F1EA' : '#D9D4CA', stoneD = ex ? '#DCD6CA' : '#BDB8AE', recess = ex ? '#B9B2A4' : '#9E9A90';
  R(c, x + 5, y + 7, w, h, 'rgba(20,30,20,.22)'); // shadow
  // flat roof seen from above, with a parapet
  R(c, x - 2, y, w + 4, roofH, '#8D8A84');
  R(c, x, y + 2, w, roofH - 4, ex ? '#C9C4BA' : '#A9A6A0');
  for (let yy = y + 6; yy < y + roofH - 4; yy += 5) R(c, x + 2, yy, w - 4, 1, 'rgba(0,0,0,.06)');
  if (!ex) { R(c, x + 10, y + 8, 14, 8, '#7FB0D6'); R(c, x + 10, y + 8, 14, 1, '#FFFFFF'); R(c, x + w - 26, y + 8, 12, 9, '#8D8A84'); R(c, x + w - 25, y + 9, 10, 3, '#B9B4AA'); }
  if (winter) { R(c, x - 2, y, w + 4, 6, '#F4F7FA'); R(c, x, y + 6, w, 2, '#DCE6EE'); }
  // flags on the Stock Exchange roof
  if (ex) for (const [fx, col1, col2] of [[x + 14, '#3F7F6A', '#F2D45C'], [x + w - 16, '#3A5680', '#FFFFFF']]) {
    R(c, fx, y - 16, 1, 22, '#5E6A78'); R(c, fx - 1, y - 17, 3, 1, '#E0B42E');
    R(c, fx + 1, y - 15, 11, 7, col1); R(c, fx + 1, y - 12, 11, 2, col2); R(c, fx + 11, y - 14, 1, 6, col1);
  }
  // triangular pediment
  const pw = w - 12, ph = ex ? 15 : 12, px = x + 6, py = y + roofH - ph;
  for (let r = 0; r < ph; r++) {
    const rw = Math.round(pw * (r + 1) / ph);
    R(c, px + (pw - rw) / 2 - 1, py + r, rw + 2, 1, OUTLINE);
    if (r > 0) R(c, px + (pw - rw) / 2 + 1, py + r, rw - 2, 1, stone);
  }
  if (winter) for (let r = 0; r < ph; r += 2) { const rw = Math.round(pw * (r + 1) / ph); R(c, px + (pw - rw) / 2, py + r, 3, 1, '#FFFFFF'); R(c, px + (pw + rw) / 2 - 3, py + r, 3, 1, '#FFFFFF'); }
  const pcx = x + w / 2;
  if (ex) { // sculpted frieze: little figures across the pediment
    for (let i = -4; i <= 4; i++) { const fh = 6 - Math.abs(i); if (fh < 2) continue; R(c, pcx + i * 9 - 2, py + ph - 1 - fh, 4, fh, stoneD); R(c, pcx + i * 9 - 1, py + ph - 2 - fh, 2, 2, stoneD); }
  } else { // gold coin emblem
    R(c, pcx - 4, py + 4, 8, 7, '#B88A1E'); R(c, pcx - 3, py + 5, 6, 5, '#F2D45C'); R(c, pcx - 1, py + 5, 2, 5, '#B88A1E'); R(c, pcx - 2, py + 6, 4, 1, '#B88A1E'); R(c, pcx - 2, py + 8, 4, 1, '#B88A1E');
  }
  // entablature band (the name goes here)
  const top = y + roofH;
  R(c, x, top, w, 9, stone); R(c, x, top, w, 1, '#FFFFFF'); R(c, x, top + 8, w, 1, stoneD);
  // shaded porch behind the columns
  const colTop = top + 9, colBot = y + h - 9;
  R(c, x + 3, colTop, w - 6, colBot - colTop, recess);
  // tall windows in the porch
  const doorC = b.door * T + 8;
  // bronze double doors
  R(c, doorC - 8, colBot - 20, 16, 20, OUTLINE); R(c, doorC - 7, colBot - 19, 6, 19, '#8C6A3A'); R(c, doorC + 1, colBot - 19, 6, 19, '#8C6A3A');
  R(c, doorC - 7, colBot - 19, 14, 2, '#B08A55'); R(c, doorC - 2, colBot - 10, 1, 2, '#F2D45C'); R(c, doorC + 1, colBot - 10, 1, 2, '#F2D45C');
  // columns (skip the doorway)
  const n = ex ? 8 : 5, span = w - 16;
  for (let i = 0; i < n; i++) {
    const cx = Math.round(x + 8 + (span * i) / (n - 1)) - 3;
    if (Math.abs(cx + 3 - doorC) < 12) continue;
    R(c, cx - 1, colTop, 8, 3, stone); R(c, cx - 1, colTop + 2, 8, 1, stoneD); // capital
    R(c, cx, colTop + 3, 6, colBot - colTop - 5, '#FFFFFF'); R(c, cx + 4, colTop + 3, 2, colBot - colTop - 5, stoneD); R(c, cx + 2, colTop + 3, 1, colBot - colTop - 5, '#F4F1EA');
    R(c, cx - 1, colBot - 2, 8, 2, stone); // base
  }
  // wide front steps
  R(c, x + 2, colBot, w - 4, 3, '#D8D3C9'); R(c, x, colBot + 3, w, 3, '#C9C4BA'); R(c, x - 2, colBot + 6, w + 4, 3, '#BAB5AB');
  if (winter) { R(c, x, colBot + 3, 12, 1, '#FFFFFF'); R(c, x + w - 14, colBot + 6, 14, 1, '#FFFFFF'); }
  // brass lamps by the bank doors
  if (!ex) for (const lx of [doorC - 16, doorC + 14]) { R(c, lx, colBot - 14, 2, 14, OUTLINE); R(c, lx - 1, colBot - 17, 4, 4, '#F2D45C'); }
}

// ---------- the newspaper kiosk ----------
function drawKiosk(c, b, winter) {
  const x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T;
  const cx = b.door * T + 8, kx = cx - 22, kw = 44;
  // little cobbled plaza
  R(c, x + 2, y + 30, w - 4, h - 30, '#BDB6A9');
  for (let yy = y + 32; yy < y + h; yy += 4) for (let xx = x + 3 + ((yy / 4) % 2) * 3; xx < x + w - 3; xx += 6) R(c, xx, yy, 5, 3, '#C9C2B5');
  R(c, kx + 2, y + 24, kw, h - 26, 'rgba(20,30,20,.2)');
  // kiosk body (dark green with gold trim)
  R(c, kx, y + 22, kw, h - 26, '#2F6655'); R(c, kx, y + 22, kw, 6, '#3F7F6A'); R(c, kx, y + 28, kw, 1, '#E0B42E');
  // magazine racks either side of the window
  const covers = ['#C8503E', '#F2D45C', '#5B8DB8', '#E8A0C0', '#8C6BB1', '#4F9A5A', '#FFFFFF', '#E0A62E'];
  for (const rx of [kx + 2, cx + 7]) for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) {
    R(c, rx + k * 5, y + 31 + r * 7, 4, 6, covers[(r * 3 + k + rx) % covers.length]); R(c, rx + k * 5, y + 33 + r * 7, 4, 1, 'rgba(0,0,0,.25)');
  }
  // service window with the counter
  R(c, cx - 6, y + 30, 12, 18, '#1E3A30'); R(c, cx - 7, y + 47, 14, 3, '#E0B42E');
  R(c, cx - 5, y + 44, 10, 3, '#FFFFFF'); R(c, cx - 4, y + 45, 8, 1, '#8D8A84'); // folded papers on the counter
  // octagonal copper roof with a clock on top
  R(c, kx - 6, y + 17, kw + 12, 6, OUTLINE);
  for (let r = 0; r < 12; r++) { const rw = kw + 10 - Math.round((11 - r) * 2.2); R(c, cx - rw / 2, y + 6 + r, rw, 1, r % 3 === 2 ? '#2F6655' : '#3F7F6A'); }
  R(c, kx - 5, y + 18, kw + 10, 4, '#3F7F6A'); for (let i = kx - 4; i < kx + kw + 5; i += 5) R(c, i, y + 18, 1, 4, '#2F6655');
  if (winter) { R(c, cx - 18, y + 6, 36, 3, '#F4F7FA'); R(c, kx - 5, y + 17, kw + 10, 2, '#FFFFFF'); }
  R(c, cx - 1, y, 2, 6, '#E0B42E'); R(c, cx - 2, y - 1, 4, 2, '#E0B42E');
  R(c, cx - 5, y + 7, 10, 9, OUTLINE); R(c, cx - 4, y + 8, 8, 7, '#FBF6EA'); R(c, cx - 1, y + 9, 1, 4, OUTLINE); R(c, cx - 1, y + 12, 3, 1, OUTLINE);
  // bundles of newspapers tied with string
  for (const [bx2, by, n] of [[x + 6, y + 50, 3], [x + 20, y + 52, 2], [x + 8, y + 40, 2]]) for (let k = 0; k < n; k++) {
    R(c, bx2, by - k * 4, 12, 4, k % 2 ? '#F4F1EA' : '#E2DBCC'); R(c, bx2 + 5, by - k * 4, 1, 4, '#B08A55'); R(c, bx2 + 2, by - k * 4 + 1, 7, 1, '#9E9A90');
  }
  // sandwich board
  const sx = x + w - 14;
  R(c, sx, y + 40, 11, 18, '#8A6E55'); R(c, sx + 1, y + 41, 9, 13, '#FFFFFF');
  R(c, sx + 2, y + 43, 7, 2, '#C2483A'); R(c, sx + 2, y + 47, 7, 1, '#8D8A84'); R(c, sx + 2, y + 50, 5, 1, '#8D8A84');
}

// ---------- the dock: a little wooden pier into the pond, with a rowboat tied up ----------
function drawDock(c, b, winter) {
  const px = b.door * T + 4, top = POND[1] * T + 26, bottom = (b.y + b.h) * T - 2;
  // landing on the shore
  R(c, b.x * T + 10, (b.y + b.h - 1) * T + 1, 28, 14, '#5A3A28');
  for (let x = b.x * T + 11; x < b.x * T + 37; x += 4) R(c, x, (b.y + b.h - 1) * T + 2, 3, 12, '#B08A55');
  // pier planks out over the water, on posts
  R(c, px - 1, top - 1, 10, bottom - top + 1, '#5A3A28');
  for (let y = top; y < bottom; y += 3) R(c, px, y, 8, 2, y % 2 ? '#B08A55' : '#C49A62');
  for (const yy of [top + 1, top + 12]) { R(c, px - 2, yy, 2, 4, '#4A3020'); R(c, px + 8, yy, 2, 4, '#4A3020'); }
  if (winter) {
    R(c, px - 1, top - 1, 10, 2, '#FFFFFF'); R(c, b.x * T + 10, (b.y + b.h - 1) * T + 1, 28, 2, '#FFFFFF');
    // a fishing hole in the ice at the end of the pier
    R(c, px - 1, top - 9, 10, 6, '#3E6E92'); R(c, px, top - 10, 8, 8, '#3E6E92'); R(c, px + 1, top - 8, 3, 1, '#7FB0D6');
    return;
  }
  // rowboat tied to the left of the pier
  const bx = POND[0] * T + 4, by = POND[1] * T + 30;
  R(c, bx + 1, by + 7, 13, 2, 'rgba(20,40,60,.25)');
  R(c, bx, by, 14, 6, '#7A4A2A'); R(c, bx + 1, by + 6, 12, 1, '#5A3A28'); R(c, bx + 2, by + 1, 10, 3, '#A86A3A'); R(c, bx + 6, by + 1, 2, 4, '#7A4A2A');
  R(c, bx + 14, by + 2, px - bx - 14, 1, '#E2DBCC'); // rope
}

// ---------- the mine: a rocky hill with a timber-framed entrance, rails and an ore cart ----------
function drawMine(c, b, winter) {
  const x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T, cx = b.door * T + 8;
  R(c, x + 4, y + h - 6, w, 8, 'rgba(20,30,20,.22)');
  // the hill: stacked boulders
  const rocks = [[0, 22, 80, 42, '#8D8A84'], [6, 12, 66, 30, '#9E9A90'], [16, 4, 46, 22, '#A9A6A0'], [2, 30, 22, 20, '#7A766E'], [56, 26, 24, 22, '#7A766E'], [24, 0, 26, 12, '#B9B4AA']];
  for (const [rx, ry, rw, rh, col] of rocks) { R(c, x + rx + 2, y + ry, rw - 4, rh, col); R(c, x + rx, y + ry + 2, rw, rh - 4, col); }
  for (let i = 0; i < 26; i++) { const px = x + 4 + ((i * 29) % (w - 8)), py = y + 4 + ((i * 17) % (h - 14)); R(c, px, py, 3, 1, 'rgba(255,255,255,.18)'); R(c, px + 1, py + 2, 2, 1, 'rgba(0,0,0,.12)'); }
  if (winter) { R(c, x + 18, y + 2, 42, 5, '#F4F7FA'); R(c, x + 8, y + 12, 18, 3, '#FFFFFF'); R(c, x + 54, y + 14, 16, 3, '#FFFFFF'); }
  else { for (const [gx, gy] of [[20, 3], [40, 1], [10, 14], [62, 16]]) { R(c, x + gx, y + gy, 1, 3, '#4E8A3C'); R(c, x + gx + 2, y + gy + 1, 1, 2, '#4E8A3C'); } }
  // entrance with timber frame
  R(c, cx - 11, y + 26, 22, h - 26, '#1E1A16'); R(c, cx - 9, y + 28, 18, h - 28, '#2B2520');
  R(c, cx - 13, y + 24, 4, h - 24, '#7A5A40'); R(c, cx + 9, y + 24, 4, h - 24, '#7A5A40');
  R(c, cx - 15, y + 22, 30, 5, '#8C6A4A'); R(c, cx - 15, y + 22, 30, 1, '#A88660');
  // hanging lantern
  R(c, cx - 1, y + 27, 1, 3, OUTLINE); R(c, cx - 3, y + 30, 5, 5, OUTLINE); R(c, cx - 2, y + 31, 3, 3, '#F8E08A');
  // rail tracks coming out of the mine
  for (let ty = y + 34; ty < y + h + 14; ty += 4) R(c, cx - 7, ty, 14, 2, '#6B4A30');
  R(c, cx - 5, y + 34, 1, h - 20, '#B9BEC6'); R(c, cx + 4, y + 34, 1, h - 20, '#B9BEC6');
  // ore cart
  const kx = x + 6, ky = y + h - 20;
  R(c, kx, ky, 20, 10, OUTLINE); R(c, kx + 1, ky + 1, 18, 8, '#6E7480'); R(c, kx + 1, ky + 1, 18, 2, '#848A96');
  for (const [ox, col] of [[3, '#2E2A26'], [7, '#F2D45C'], [11, '#C9CED6'], [15, '#2E2A26']]) R(c, kx + ox, ky - 2, 3, 3, col);
  R(c, kx + 3, ky + 9, 4, 4, OUTLINE); R(c, kx + 13, ky + 9, 4, 4, OUTLINE);
  // pickaxe leaning on the rocks
  R(c, x + w - 16, y + h - 26, 2, 16, '#8C6A4A'); R(c, x + w - 21, y + h - 27, 12, 2, '#9AA0A8'); R(c, x + w - 21, y + h - 26, 2, 2, '#9AA0A8');
}

// ---------- the bronze bull statue in front of the Stock Exchange ----------
function drawBull(c, winter) {
  const x = BULL[0] * T + 2, y = BULL[1] * T;
  R(c, x + 2, y + 12, 30, 4, 'rgba(20,30,20,.25)');
  R(c, x, y + 8, 28, 7, '#9E9A90'); R(c, x, y + 8, 28, 2, '#B9B4AA'); R(c, x, y + 14, 28, 1, '#7A766E'); // plinth
  const B = '#8C6A3A', D = '#5E4424', L = '#B08A55';
  R(c, x + 7, y - 4, 16, 8, B); R(c, x + 8, y - 5, 12, 2, B); R(c, x + 9, y - 4, 10, 2, L); // body
  R(c, x + 3, y - 3, 6, 6, B); R(c, x + 2, y, 3, 3, D); // head, nose
  R(c, x + 3, y - 6, 1, 3, '#E2DBCC'); R(c, x + 8, y - 6, 1, 3, '#E2DBCC'); R(c, x + 4, y - 4, 1, 1, '#E2DBCC'); // horns
  R(c, x + 8, y + 4, 2, 4, D); R(c, x + 12, y + 4, 2, 4, D); R(c, x + 17, y + 4, 2, 4, D); R(c, x + 21, y + 4, 2, 4, D); // legs
  R(c, x + 23, y - 3, 3, 1, D); R(c, x + 25, y - 2, 1, 3, D); // tail
  if (winter) { R(c, x + 8, y - 6, 12, 2, '#FFFFFF'); R(c, x, y + 7, 28, 2, '#FFFFFF'); }
}

function drawTree(c, tx, ty, season) {
  const x = tx * T, y = ty * T;
  const [d, m, l, hi] = SEASONS[season].tree;
  R(c, x + 2, y + 13, 14, 3, 'rgba(20,30,20,.22)');
  R(c, x + 6, y + 10, 4, 6, '#6B4A30');
  R(c, x + 1, y + 2, 14, 10, d); R(c, x + 3, y, 10, 14, d);
  R(c, x + 2, y + 2, 12, 8, m); R(c, x + 4, y + 1, 8, 10, m);
  R(c, x + 4, y + 2, 5, 4, l); R(c, x + 9, y + 6, 3, 3, l); R(c, x + 5, y + 3, 2, 1, hi);
  if (season === 'winter') { R(c, x + 3, y, 10, 3, '#FFFFFF'); R(c, x + 1, y + 3, 4, 2, '#F4F7FA'); }
  if (season === 'spring' && (tx + ty) % 2 === 0) { const p = SEASONS.spring.blossom; R(c, x + 4, y + 4, 2, 2, p); R(c, x + 10, y + 3, 2, 2, p); R(c, x + 7, y + 8, 2, 2, p); }
}

// A person sprite: 12 × 16, four directions, two-frame walk.
function drawPerson(c, px, py, dir, frame, shirt, hair = '#5A3A28', upperOnly = false) {
  const x = Math.round(px) - 6, y = Math.round(py) - 16, O = OUTLINE, SKIN = '#F2CDA6', PANTS = '#34507E';
  if (!upperOnly) R(c, x + 2, y + 15, 9, 2, 'rgba(0,0,0,.2)');
  R(c, x + 2, y, 8, 1, O); R(c, x + 1, y + 1, 10, 7, O);
  if (dir === 'up') { R(c, x + 2, y + 1, 8, 6, hair); }
  else {
    R(c, x + 2, y + 1, 8, 3, hair); R(c, x + 2, y + 4, 8, 3, SKIN);
    if (dir === 'down') { R(c, x + 4, y + 5, 1, 1, O); R(c, x + 7, y + 5, 1, 1, O); }
    else if (dir === 'left') { R(c, x + 2, y + 4, 2, 2, hair); R(c, x + 4, y + 5, 1, 1, O); }
    else { R(c, x + 8, y + 4, 2, 2, hair); R(c, x + 7, y + 5, 1, 1, O); }
  }
  R(c, x + 1, y + 8, 10, 5, O); R(c, x + 2, y + 8, 8, 4, shirt);
  if (dir === 'down' || dir === 'up') { R(c, x, y + 9, 2, 3, SKIN); R(c, x + 10, y + 9, 2, 3, SKIN); }
  else R(c, dir === 'left' ? x + 4 : x + 6, y + 9, 2, 3, SKIN);
  if (upperOnly) return;
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
  // what's going on in the game this year (set by main.js)
  let world = { name: '', season: 'spring', tip: false, shiftDone: false, helper: false, recipe: false, bigStand: false, savings: false, ticker: [] };

  // townsfolk
  const folk = ROUTES.map((r, i) => ({ ...r, x: r.pts[0][0] * T + 8, y: r.pts[0][1] * T + 12, i: 1, dir: 1, wait: i * 0.8, anim: 0, face: 'down' }));
  // ambient bits
  const smoke = [], weather = [];
  const ducks = [{ x: POND[0] * T + 14, y: POND[1] * T + 16, vx: 4, t: 0 }, { x: POND[0] * T + 32, y: POND[1] * T + 4, vx: -3, t: 2 }];
  const butterflies = [0, 1, 2].map((i) => ({ hx: FLOWERS[i * 3][0] * T + 8, hy: FLOWERS[i * 3][1] * T + 10, t: i * 2, col: ['#F2D45C', '#FFFFFF', '#E8A0C0'][i] }));
  let birds = null, birdTimer = 6, smokeTimer = 0;

  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    const fit = Math.min(box.width / W, box.height / H);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${Math.floor(W * fit)}px`; canvas.style.height = `${Math.floor(H * fit)}px`;
    canvas.width = Math.floor(W * fit * dpr); canvas.height = Math.floor(H * fit * dpr);
    S = canvas.width / W;
    scenery = drawStatic(world.season);
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

  // ---------- ambient life ----------
  function stepLife(dt) {
    if (REDUCED) return;
    for (const f of folk) { // walk waypoint loops, ping-ponging at the ends
      if (f.wait > 0) { f.wait -= dt; f.moving = false; continue; }
      const [tx, ty, wait] = f.pts[f.i];
      const gx = tx * T + 8, gy = ty * T + 12, ex = gx - f.x, ey = gy - f.y, d = Math.hypot(ex, ey);
      if (d < 1) {
        f.x = gx; f.y = gy; if (wait) { f.wait = wait; f.face = 'up'; }
        if (f.i + f.dir >= f.pts.length || f.i + f.dir < 0) { if (f.pts.length === 2) f.dir *= -1; else f.i = -1; }
        f.i = f.pts.length === 2 ? f.i + f.dir : (f.i + 1) % f.pts.length;
        continue;
      }
      const s = Math.min(d, f.speed * dt);
      f.x += (ex / d) * s; f.y += (ey / d) * s; f.moving = true; f.anim += dt * 6;
      f.face = Math.abs(ex) > Math.abs(ey) ? (ex < 0 ? 'left' : 'right') : (ey < 0 ? 'up' : 'down');
    }
    smokeTimer -= dt;
    if (smokeTimer <= 0) { smokeTimer = 0.45; for (const [cx, cy] of CHIMNEYS) smoke.push({ x: cx + 1, y: cy, t: 0 }); }
    for (const p of smoke) { p.t += dt; p.y -= 9 * dt; p.x += 3 * dt; }
    while (smoke.length && smoke[0].t > 2.6) smoke.shift();
    for (const dk of ducks) {
      dk.t += dt; dk.x += dk.vx * dt; dk.y += Math.sin(dk.t * 0.7) * 2 * dt;
      const minX = POND[0] * T + 6, maxX = (POND[0] + POND[2]) * T - 12;
      if (dk.x < minX || dk.x > maxX) dk.vx *= -1;
    }
    for (const b of butterflies) b.t += dt;
    birdTimer -= dt;
    if (!birds && birdTimer <= 0) birds = { x: -20, y: 20 + Math.random() * 120, t: 0 };
    if (birds) { birds.t += dt; birds.x += 70 * dt; birds.y += 12 * dt; if (birds.x > W + 30) { birds = null; birdTimer = 10 + Math.random() * 10; } }
    // seasonal weather particles
    const want = { spring: 14, summer: 0, fall: 22, winter: 60 }[world.season];
    while (weather.length < want) weather.push({ x: Math.random() * W, y: Math.random() * H, t: Math.random() * 6 });
    weather.length = Math.min(weather.length, want);
    for (const p of weather) {
      p.t += dt;
      if (world.season === 'winter') { p.y += 16 * dt; p.x += Math.sin(p.t) * 6 * dt; }
      else { p.y += 11 * dt; p.x += (10 + Math.sin(p.t * 2) * 12) * dt; }
      if (p.y > H) { p.y = -4; p.x = Math.random() * W; }
      if (p.x > W) p.x = 0;
    }
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
    const sec = t / 1000;
    lg.drawImage(scenery, 0, 0);
    // pond life
    if (world.season !== 'winter') {
      for (let i = 0; i < 3; i++) { const rx = POND[0] * T + 8 + ((sec * 4 + i * 13) % 30), ry = POND[1] * T + 14 + i * 9; R(lg, rx, ry, 5, 1, '#9CC6E0'); }
      for (const dk of ducks) {
        const x = Math.round(dk.x), y = Math.round(dk.y), left = dk.vx < 0;
        R(lg, x, y + 3, 8, 3, '#FFFFFF'); R(lg, left ? x : x + 5, y, 3, 4, '#FFFFFF'); R(lg, left ? x - 2 : x + 8, y + 1, 2, 1, '#E8A23A'); R(lg, left ? x + 1 : x + 6, y + 1, 1, 1, OUTLINE);
        R(lg, x + 1, y + 6, 7, 1, '#7FB0D6');
      }
    }
    // lamp glow
    const glow = 0.18 + Math.sin(sec * 2) * 0.05;
    for (const [lx, ly] of LAMPS) { lg.fillStyle = `rgba(248,224,138,${glow})`; lg.fillRect(lx * T + 2, ly * T - 21, 12, 12); }
    // the stand's helper and upgrades
    const stand = BUILDINGS.find((b) => b.stand);
    if (world.helper) drawPerson(lg, stand.x * T + 46, stand.y * T + 40, 'down', 0, '#5B8DB8', '#C9A15B', true);
    if (world.recipe) { const sx = stand.x * T + 30, sy = stand.y * T + 1; R(lg, sx, sy, 9, 7, OUTLINE); R(lg, sx + 1, sy + 1, 7, 5, '#F2D45C'); R(lg, sx + 3, sy + 2, 3, 3, '#FFFFFF'); }
    if (world.bigStand) { const sx = stand.x * T + 60, sy = stand.y * T + 28; R(lg, sx, sy, 10, 8, '#8A6E55'); R(lg, sx + 1, sy - 3, 3, 3, '#FFFFFF'); R(lg, sx + 5, sy - 3, 3, 3, '#FFFFFF'); }
    // a pulsing ring under your feet so you can always spot yourself
    {
      const pulse = REDUCED ? 0.8 : 0.55 + Math.sin(sec * 4) * 0.3, px = Math.round(me.x), py = Math.round(me.y);
      lg.fillStyle = `rgba(242,212,92,${pulse})`;
      lg.fillRect(px - 6, py - 3, 12, 1); lg.fillRect(px - 6, py + 3, 12, 1); lg.fillRect(px - 8, py - 2, 2, 5); lg.fillRect(px + 6, py - 2, 2, 5);
      lg.fillStyle = 'rgba(242,212,92,.25)'; lg.fillRect(px - 6, py - 2, 12, 5);
    }
    // depth-sort trees, people and the player by their bottom edge
    const items = TREES.map(([x, y]) => ({ y: y * T + 15, fn: () => drawTree(lg, x, y, world.season) }));
    items.push({ y: me.y, fn: () => drawPerson(lg, me.x, me.y, me.dir, me.moving ? Math.floor(me.anim) % 2 : 0, color) });
    for (const f of folk) items.push({ y: f.y, fn: () => drawPerson(lg, f.x, f.y, f.face, f.moving ? Math.floor(f.anim) % 2 : 0, f.shirt, f.hair) });
    if (!world.shiftDone) QUEUE_SPOTS.forEach(([qx, qy], i) => {
      const bob = !REDUCED && Math.floor(sec * 2 + i) % 4 === 0 ? 1 : 0;
      items.push({ y: qy * T + 12, fn: () => drawPerson(lg, qx * T + 8, qy * T + 12 - bob, 'left', 0, QUEUE_LOOK[i][0], QUEUE_LOOK[i][1]) });
    });
    items.sort((a, b) => a.y - b.y).forEach((it) => it.fn());
    // smoke, butterflies, birds, weather
    for (const p of smoke) { const a = 1 - p.t / 2.6, s = 2 + Math.floor(p.t * 1.5); lg.fillStyle = `rgba(230,232,236,${a * 0.8})`; lg.fillRect(Math.round(p.x), Math.round(p.y), s, s); }
    if (world.season === 'spring' || world.season === 'summer') for (const b of butterflies) {
      const x = Math.round(b.hx + Math.sin(b.t * 0.9) * 14), y = Math.round(b.hy + Math.sin(b.t * 1.7) * 6 - 6), open = Math.floor(b.t * 8) % 2;
      R(lg, x - (open ? 2 : 1), y, open ? 2 : 1, 2, b.col); R(lg, x + 1, y, open ? 2 : 1, 2, b.col); R(lg, x, y, 1, 2, OUTLINE);
    }
    if (birds) for (let i = 0; i < 3; i++) {
      const bx = Math.round(birds.x - i * 9), by = Math.round(birds.y + (i % 2) * 6), up = Math.floor(birds.t * 6 + i) % 2;
      R(lg, bx, by + (up ? 0 : 1), 2, 1, OUTLINE); R(lg, bx + 2, by + 1, 1, 1, OUTLINE); R(lg, bx + 3, by + (up ? 0 : 1), 2, 1, OUTLINE);
    }
    for (const p of weather) {
      const x = Math.round(p.x), y = Math.round(p.y);
      if (world.season === 'winter') R(lg, x, y, (p.t % 3) < 1.5 ? 2 : 1, (p.t % 3) < 1.5 ? 2 : 1, '#FFFFFF');
      else if (world.season === 'fall') R(lg, x, y, 2, 1 + (Math.floor(p.t * 3) % 2), ['#D9832E', '#B85A2A', '#E8B04A'][Math.floor(p.x) % 3]);
      else R(lg, x, y, 1, 1, SEASONS.spring.blossom);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(low, 0, 0, canvas.width, canvas.height);
    drawHighRes(t);
    drawNameTag();
  }

  // Crisp text and markers drawn at full resolution on top of the pixels.
  function drawHighRes(t) {
    const sec = t / 1000;
    g.font = `${8.4 * S}px "Jersey 10", monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // scrolling price ticker on the Stock Exchange roof
    const ex = BUILDINGS.find((b) => b.id === 'exchange');
    if (world.ticker.length) {
      const sx = (ex.x * T + 22) * S, sy = (ex.y * T + 6) * S, sw = (ex.w * T - 44) * S, sh = 11 * S;
      g.fillStyle = OUTLINE; g.fillRect(sx - S, sy - S, sw + 2 * S, sh + 2 * S);
      g.fillStyle = '#1B2430'; g.fillRect(sx, sy, sw, sh);
      g.save(); g.beginPath(); g.rect(sx, sy, sw, sh); g.clip();
      g.font = `${8 * S}px "Jersey 10", monospace`; g.textAlign = 'left';
      const parts = world.ticker;
      let total = 0; const widths = parts.map((p) => { const w = g.measureText(`${p.t} ${p.p} ${p.c}   `).width; total += w; return w; });
      let x = sx - ((REDUCED ? 0 : sec * 22 * S) % total);
      for (let rep = 0; rep < 3 && x < sx + sw; rep++) for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        g.fillStyle = '#F4EFE0'; g.fillText(`${p.t} ${p.p}`, x, sy + sh / 2 + 0.4 * S);
        const tw = g.measureText(`${p.t} ${p.p} `).width;
        g.fillStyle = p.up ? '#7FD88A' : p.down ? '#FF8A7A' : '#B9C2CC'; g.fillText(p.c, x + tw, sy + sh / 2 + 0.4 * S);
        x += widths[i];
      }
      g.restore();
      g.font = `${8.4 * S}px "Jersey 10", monospace`; g.textAlign = 'center';
    }
    for (const b of BUILDINGS) {
      if (!b.label) continue;
      const fx = (b.door * T + 8) * S;
      const w = g.measureText(b.label).width + 6 * S, h = 10 * S;
      const x = fx - w / 2;
      const y = b.labelY ? b.labelY * S - h / 2 : ((b.y + b.h) * T - (b.stand ? 4 : 20)) * S - h - 2 * S;
      g.fillStyle = OUTLINE; g.fillRect(x - S, y - S, w + 2 * S, h + 2 * S);
      g.fillStyle = guide === b.id ? '#F2D45C' : b.stand ? '#FFF7D6' : '#FBF6EA'; g.fillRect(x, y, w, h);
      g.fillStyle = OUTLINE; g.fillText(b.label, fx, y + h / 2 + 0.4 * S);
      const bob = REDUCED ? 0 : Math.round(Math.sin(t / 180) * 2) * S;
      if (guide === b.id) { // bouncing arrow above the sign
        const ay = y - 4 * S + bob, aw = 5 * S;
        g.beginPath(); g.moveTo(fx - aw, ay - 6 * S); g.lineTo(fx + aw, ay - 6 * S); g.lineTo(fx, ay); g.closePath();
        g.fillStyle = '#F2D45C'; g.fill(); g.lineWidth = S; g.strokeStyle = OUTLINE; g.stroke();
      }
      if (b.id === 'news' && world.tip) { // hot tip!
        const bx = x + w + 3 * S, by = y - 6 * S + bob;
        g.fillStyle = OUTLINE; g.fillRect(bx - S, by - S, 9 * S, 12 * S);
        g.fillStyle = '#D0584A'; g.fillRect(bx, by, 7 * S, 10 * S);
        g.fillStyle = '#FFFFFF'; g.fillText('!', bx + 3.5 * S, by + 5.4 * S);
      }
      if (b.id === 'dock' && world.casts > 0) { // a red-and-white bobber: casts left this year
        const bx = x + w + 6 * S, by = y + 2 * S + bob;
        g.fillStyle = OUTLINE; g.fillRect(bx - S, by - S, 8 * S, 9 * S);
        g.fillStyle = '#D0584A'; g.fillRect(bx, by, 6 * S, 3.5 * S);
        g.fillStyle = '#FFFFFF'; g.fillRect(bx, by + 3.5 * S, 6 * S, 3.5 * S);
        g.fillStyle = OUTLINE; g.fillRect(bx + 2.5 * S, by - 3 * S, S, 2 * S);
      }
      if (b.id === 'bank' && world.savings && !REDUCED) { // twinkling sparkles: your savings are growing
        for (let i = 0; i < 3; i++) {
          const ph = (sec * 1.3 + i * 0.33) % 1;
          if (ph > 0.6) continue;
          const sx = x + ((i * 37 + 11) % Math.max(1, w)), sy = y - 4 * S - ((i * 13) % 9) * S, k = (ph < 0.3 ? ph : 0.6 - ph) * 10 * S;
          g.fillStyle = '#F2D45C'; g.fillRect(sx - k / 2, sy - S / 2, k, S); g.fillRect(sx - S / 2, sy - k / 2, S, k);
        }
      }
    }
  }

  function drawNameTag() {
    const name = (world.name || 'You').slice(0, 14);
    g.font = `${8 * S}px "Jersey 10", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(name).width + 6 * S, h = 9 * S, cx = me.x * S, y = (me.y - 30) * S;
    g.fillStyle = OUTLINE; g.fillRect(cx - w / 2 - S, y - S, w + 2 * S, h + 2 * S);
    g.fillStyle = '#F2D45C'; g.fillRect(cx - w / 2, y, w, h);
    g.beginPath(); g.moveTo(cx - 3 * S, y + h + S); g.lineTo(cx + 3 * S, y + h + S); g.lineTo(cx, y + h + 4 * S); g.closePath(); g.fillStyle = OUTLINE; g.fill();
    g.fillStyle = OUTLINE; g.fillText(name, cx, y + h / 2 + 0.4 * S);
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (!paused) step(dt);
    stepLife(dt);
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
    // Tell the town what's happening this year (season, hot tip, stand status, ticker prices).
    setWorld(info) {
      const seasonChanged = info.season && info.season !== world.season;
      world = { ...world, ...info };
      if (seasonChanged) scenery = drawStatic(world.season);
    },
    resize,
    walkTo(id) { const b = BUILDINGS.find((q) => q.id === id); walkToTile(b.door, b.y + b.h, b); },
    pos() { return { x: me.x, y: me.y }; }, // used by automated tests
  };
}

// Shared with the building scenes.
export { drawPerson, OUTLINE };
