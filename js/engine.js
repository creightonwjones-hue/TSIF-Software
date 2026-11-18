// Sprout City game engine: all the money math, with no screen code.
// Functions change the game state and return { ok: true } or { ok: false, error }.
import { SETTINGS, STOCKS, BONDS, SCENARIOS, DEFAULTED_BOND_PRICE } from './scenarios.js';

const YEARS = SETTINGS.years;
export const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Seeded random numbers: same seed = same "random" prices for every kid.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rand) {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === Number(id)) || SCENARIOS[0];
}

// Price paths: paths[id][i] = price during year i+1 (index 10 = final price).
export function buildStockPaths(scenario) {
  const rand = mulberry32(scenario.seed);
  const regular = STOCKS.filter((s) => !s.index);
  const paths = {};
  for (const s of STOCKS) paths[s.id] = [s.start];
  for (let y = 1; y <= YEARS; y++) {
    const ev = scenario.years[y - 1] || {};
    const returns = [];
    for (const s of regular) {
      const r = clamp(s.drift + (ev.market || 0) + (ev.effects?.[s.id] || 0) + gaussian(rand) * s.vol, -0.8, 1.5);
      const prev = paths[s.id][y - 1];
      const next = Math.max(1, round2(prev * (1 + r)));
      paths[s.id].push(next);
      returns.push(next / prev - 1);
    }
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    for (const s of STOCKS.filter((x) => x.index)) {
      paths[s.id].push(round2(paths[s.id][y - 1] * (1 + avg)));
    }
  }
  return paths;
}

export function buildBondPaths(scenario) {
  const paths = {};
  for (const b of BONDS) {
    paths[b.id] = [];
    for (let i = 0; i <= YEARS; i++) {
      const d = scenario.bondDefault;
      paths[b.id].push(d && d.bond === b.id && i >= d.year ? DEFAULTED_BOND_PRICE : b.price);
    }
  }
  return paths;
}

export function createGame(scenarioId = 1, nickname = 'Player', avatar = '🦊') {
  const scenario = getScenario(scenarioId);
  const shares = {}, bonds = {};
  STOCKS.forEach((s) => (shares[s.id] = 0));
  BONDS.forEach((b) => (bonds[b.id] = 0));
  return {
    scenarioId: scenario.id, nickname, avatar,
    year: 1, finished: false,
    cash: SETTINGS.startingCash, savings: 0, debt: 0,
    shares, bonds,
    stockPaths: buildStockPaths(scenario),
    bondPaths: buildBondPaths(scenario),
    biz: { owned: {}, shifts: {} },   // lemonade stand: upgrades bought, money earned per year
    events: {},                       // life events already applied, by year
    mine: {},                         // mine shift pay, by year
    history: [SETTINGS.startingCash], // net worth at start, then at the end of each year
    log: [],       // every action: { year, type, id, qty, amount }
    yearEnds: [],  // facts about each year, used for awards
  };
}

const idx = (state) => state.year - 1;
export const stockPrice = (state, id, i = idx(state)) => state.stockPaths[id][i];
export const bondPrice = (state, id, i = idx(state)) => state.bondPaths[id][i];
export function isDefaulted(state, id, i = idx(state)) {
  const d = getScenario(state.scenarioId).bondDefault;
  return !!(d && d.bond === id && i >= d.year);
}

export function stockValue(state, i = idx(state)) {
  return round2(STOCKS.reduce((t, s) => t + state.shares[s.id] * stockPrice(state, s.id, i), 0));
}
export function bondValue(state, i = idx(state)) {
  return round2(BONDS.reduce((t, b) => t + state.bonds[b.id] * bondPrice(state, b.id, i), 0));
}
export function netWorth(state, i = idx(state)) {
  return round2(state.cash + state.savings + stockValue(state, i) + bondValue(state, i) - state.debt);
}

const fail = (error) => ({ ok: false, error });
const okNum = (n) => Number.isFinite(n) && n > 0;
const okQty = (q) => Number.isInteger(q) && q > 0;
function record(state, type, id, qty, amount) {
  state.log.push({ year: state.year, type, id, qty, amount });
  return { ok: true };
}
function playing(state) {
  return state.finished ? fail('The game is over!') : null;
}

export function deposit(state, amount) {
  amount = round2(amount);
  if (playing(state)) return playing(state);
  if (!okNum(amount)) return fail('Pick an amount first.');
  if (amount > state.cash) return fail('You don\'t have that much cash.');
  state.cash = round2(state.cash - amount);
  state.savings = round2(state.savings + amount);
  return record(state, 'deposit', 'savings', 0, amount);
}

export function withdraw(state, amount) {
  amount = round2(amount);
  if (playing(state)) return playing(state);
  if (!okNum(amount)) return fail('Pick an amount first.');
  if (amount > state.savings) return fail('You don\'t have that much in savings.');
  state.savings = round2(state.savings - amount);
  state.cash = round2(state.cash + amount);
  return record(state, 'withdraw', 'savings', 0, amount);
}

export const borrowRoom = (state) => round2(Math.max(0, SETTINGS.loanLimit - state.debt));

export function borrow(state, amount) {
  amount = round2(amount);
  if (playing(state)) return playing(state);
  if (!okNum(amount)) return fail('Pick an amount first.');
  if (amount > borrowRoom(state)) return fail(`The bank will only lend you up to $${SETTINGS.loanLimit} total.`);
  state.debt = round2(state.debt + amount);
  state.cash = round2(state.cash + amount);
  return record(state, 'borrow', 'loan', 0, amount);
}

export function repay(state, amount) {
  amount = round2(amount);
  if (playing(state)) return playing(state);
  if (!okNum(amount)) return fail('Pick an amount first.');
  if (state.debt <= 0) return fail('You don\'t owe the bank anything!');
  if (amount > state.debt) amount = state.debt;
  if (amount > state.cash) return fail('You don\'t have that much cash.');
  state.debt = round2(state.debt - amount);
  state.cash = round2(state.cash - amount);
  return record(state, 'repay', 'loan', 0, amount);
}

export function buy(state, id, qty) {
  if (playing(state)) return playing(state);
  if (!(id in state.shares)) return fail('Unknown company.');
  if (!okQty(qty)) return fail('Pick how many shares.');
  const cost = round2(stockPrice(state, id) * qty);
  if (cost > state.cash) return fail('Not enough cash for that many shares.');
  state.cash = round2(state.cash - cost);
  state.shares[id] += qty;
  return record(state, 'buy', id, qty, cost);
}

export function sell(state, id, qty) {
  if (playing(state)) return playing(state);
  if (!(id in state.shares)) return fail('Unknown company.');
  if (!okQty(qty)) return fail('Pick how many shares.');
  if (qty > state.shares[id]) return fail('You don\'t own that many shares.');
  const got = round2(stockPrice(state, id) * qty);
  state.cash = round2(state.cash + got);
  state.shares[id] -= qty;
  return record(state, 'sell', id, qty, got);
}

export function buyBond(state, id, qty) {
  if (playing(state)) return playing(state);
  if (!(id in state.bonds)) return fail('Unknown bond.');
  if (!okQty(qty)) return fail('Pick how many bonds.');
  if (isDefaulted(state, id)) return fail('This bond stopped paying — nobody is selling new ones!');
  const cost = round2(bondPrice(state, id) * qty);
  if (cost > state.cash) return fail('Not enough cash for that many bonds.');
  state.cash = round2(state.cash - cost);
  state.bonds[id] += qty;
  return record(state, 'buyBond', id, qty, cost);
}

export function sellBond(state, id, qty) {
  if (playing(state)) return playing(state);
  if (!(id in state.bonds)) return fail('Unknown bond.');
  if (!okQty(qty)) return fail('Pick how many bonds.');
  if (qty > state.bonds[id]) return fail('You don\'t own that many bonds.');
  const got = round2(bondPrice(state, id) * qty);
  state.cash = round2(state.cash + got);
  state.bonds[id] -= qty;
  return record(state, 'sellBond', id, qty, got);
}

// ---------- Lemonade Stand business ----------
const BIZ = SETTINGS.business;
const upgradeInfo = (id) => BIZ.upgrades.find((u) => u.id === id);
export function ensureBiz(state) { // older saves don't have a business yet
  if (!state.biz) state.biz = { owned: {}, shifts: {} };
  return state.biz;
}
const owns = (state, id) => !!ensureBiz(state).owned[id];
export const bizCustomers = (state) => BIZ.customers + BIZ.upgrades.reduce((t, u) => t + (owns(state, u.id) ? u.customers || 0 : 0), 0);
export const bizPrice = (state) => BIZ.price + BIZ.upgrades.reduce((t, u) => t + (owns(state, u.id) ? u.price || 0 : 0), 0);
export const bizYearly = (state) => BIZ.upgrades.reduce((t, u) => t + (owns(state, u.id) ? u.yearly || 0 : 0), 0);
export const shiftDone = (state) => ensureBiz(state).shifts[state.year] != null;

export function buyUpgrade(state, id) {
  if (playing(state)) return playing(state);
  const u = upgradeInfo(id);
  if (!u) return fail('Unknown upgrade.');
  if (owns(state, id)) return fail('You already have that upgrade.');
  if (u.cost > state.cash) return fail('Not enough cash for that upgrade.');
  state.cash = round2(state.cash - u.cost);
  state.biz.owned[id] = state.year;
  return record(state, 'upgrade', id, 1, u.cost);
}

// Finish this year's shift. `served` = customers the player served (capped at the stand's size).
export function runShift(state, served) {
  if (playing(state)) return playing(state);
  if (shiftDone(state)) return fail('You already worked your shift this year.');
  const n = Math.max(0, Math.min(bizCustomers(state), Math.floor(served) || 0));
  const earned = round2(n * bizPrice(state));
  state.cash = round2(state.cash + earned);
  state.biz.shifts[state.year] = earned;
  record(state, 'shift', 'lemonade', n, earned);
  return { ok: true, earned, served: n };
}

// ---------- Life events: surprise money in, or bills you must pay ----------
// Bills are paid from cash, then savings, then by selling stocks, then bonds,
// and if there's still not enough, the bank lends the rest (an emergency loan).
export function applyEvent(state) {
  if (state.finished) return null;
  if (!state.events) state.events = {};
  if (state.events[state.year]) return state.events[state.year].none ? null : state.events[state.year];
  const ev = getScenario(state.scenarioId).years[state.year - 1]?.event;
  if (!ev) { state.events[state.year] = { none: true }; return null; }
  const r = { year: state.year, text: ev.text, amount: ev.amount, fromCash: 0, fromSavings: 0, sold: [], loan: 0 };
  if (ev.amount >= 0) {
    state.cash = round2(state.cash + ev.amount);
    record(state, 'gift', 'event', 0, ev.amount);
  } else {
    let owed = -ev.amount;
    const take = (from, field) => { const t = round2(Math.min(owed, from)); owed = round2(owed - t); return t; };
    r.fromCash = take(state.cash); state.cash = round2(state.cash - r.fromCash);
    r.fromSavings = take(state.savings); state.savings = round2(state.savings - r.fromSavings);
    // sell stocks, biggest holding first, whole shares
    const holdings = STOCKS.filter((st) => state.shares[st.id] > 0)
      .sort((a, b) => state.shares[b.id] * stockPrice(state, b.id) - state.shares[a.id] * stockPrice(state, a.id));
    for (const st of holdings) {
      if (owed <= 0) break;
      const price = stockPrice(state, st.id);
      const qty = Math.min(state.shares[st.id], Math.ceil(owed / price));
      const got = round2(qty * price);
      state.shares[st.id] -= qty;
      state.cash = round2(state.cash + got);
      r.sold.push({ id: st.id, kind: 'stock', qty, amount: got });
      record(state, 'forcedSell', st.id, qty, got);
      const pay = round2(Math.min(owed, state.cash)); owed = round2(owed - pay); state.cash = round2(state.cash - pay);
    }
    for (const b of BONDS) {
      if (owed <= 0) break;
      if (state.bonds[b.id] <= 0) continue;
      const price = bondPrice(state, b.id);
      const qty = Math.min(state.bonds[b.id], Math.ceil(owed / price));
      const got = round2(qty * price);
      state.bonds[b.id] -= qty;
      state.cash = round2(state.cash + got);
      r.sold.push({ id: b.id, kind: 'bond', qty, amount: got });
      record(state, 'forcedSell', b.id, qty, got);
      const pay = round2(Math.min(owed, state.cash)); owed = round2(owed - pay); state.cash = round2(state.cash - pay);
    }
    if (owed > 0) { // emergency loan, allowed past the normal limit
      r.loan = owed;
      state.debt = round2(state.debt + owed);
      record(state, 'emergencyLoan', 'loan', 0, owed);
    }
    record(state, 'bill', 'event', 0, -ev.amount);
  }
  state.events[state.year] = r;
  return r;
}

// ---------- The Mine: dig your own tunnel, one trip a year ----------
// The map is the same for every kid in a given game and year. Rules (shared by the screen and the tests):
//  - Move left/right/down by digging (dirt costs 1 energy, hard stone 2). Walking through your own tunnel is free.
//  - You can only go up through tunnel you've already dug.
//  - Cracked rock can't be dug, and digging a tile right next to cracked rock makes it cave in
//    (you lose this trip's haul) — unless you brace first with a support beam.
//  - Head home any time: climbing costs 1 energy per level. Not enough energy? You're rescued with half your haul.
const MINE = SETTINGS.mine;
export const MINE_ENTRY = Math.floor(MINE.cols / 2);
const mIdx = (r, c) => r * MINE.cols + c;
const inMine = (r, c) => r >= 0 && r < MINE.rows && c >= 0 && c < MINE.cols;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function buildMineMap(rand) {
  const tiles = [];
  for (let r = 0; r < MINE.rows; r++) for (let c = 0; c < MINE.cols; c++) {
    const stone = r >= MINE.stoneFrom && rand() < 0.25 + r * 0.04;
    tiles.push({ kind: stone ? 'stone' : 'dirt', ore: null });
  }
  const free = (r, c) => inMine(r, c) && !tiles[mIdx(r, c)].ore && tiles[mIdx(r, c)].kind !== 'cracked' && !(r === 0 && c === MINE_ENTRY);
  for (const [ore, o] of Object.entries(MINE.ore)) {
    for (let k = 0, tries = 0; k < o.count && tries < 500; tries++) {
      const r = o.rows[0] + Math.floor(rand() * (o.rows[1] - o.rows[0] + 1)), c = Math.floor(rand() * MINE.cols);
      if (free(r, c)) { tiles[mIdx(r, c)].ore = ore; k++; }
    }
  }
  // cracked rocks: about half guard the good ore, the rest are scattered deeper down
  const valuable = tiles.map((t, i) => [t, i]).filter(([t]) => t.ore && t.ore !== 'coal').map(([, i]) => i);
  let placed = 0;
  for (let tries = 0; placed < MINE.cracked && tries < 800; tries++) {
    let r, c;
    if (placed < Math.ceil(MINE.cracked / 2) && valuable.length) {
      const v = valuable[Math.floor(rand() * valuable.length)];
      const [dr, dc] = N4[Math.floor(rand() * 4)];
      r = Math.floor(v / MINE.cols) + dr; c = (v % MINE.cols) + dc;
    } else { r = 2 + Math.floor(rand() * (MINE.rows - 2)); c = Math.floor(rand() * MINE.cols); }
    if (!free(r, c) || r < 1) continue;
    tiles[mIdx(r, c)].kind = 'cracked'; placed++;
  }
  return { cols: MINE.cols, rows: MINE.rows, entry: MINE_ENTRY, tiles };
}
const nearCracked = (map, r, c) => N4.some(([dr, dc]) => inMine(r + dr, c + dc) && map.tiles[mIdx(r + dr, c + dc)].kind === 'cracked');
const digCost = (t) => (t.kind === 'stone' ? 2 : 1);

// Cheapest dig cost from the entrance to every tile, never digging next to cracked rock.
function safeCosts(map) {
  const dist = new Array(map.tiles.length).fill(Infinity);
  const start = mIdx(0, map.entry);
  if (nearCracked(map, 0, map.entry)) return dist;
  dist[start] = digCost(map.tiles[start]);
  const q = [start];
  while (q.length) {
    q.sort((a, b) => dist[a] - dist[b]);
    const i = q.shift(), r = Math.floor(i / map.cols), c = i % map.cols;
    for (const [dr, dc] of [[1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (!inMine(nr, nc)) continue;
      const t = map.tiles[mIdx(nr, nc)];
      if (t.kind === 'cracked' || nearCracked(map, nr, nc)) continue;
      const d = dist[i] + digCost(t);
      if (d < dist[mIdx(nr, nc)]) { dist[mIdx(nr, nc)] = d; q.push(mIdx(nr, nc)); }
    }
  }
  return dist;
}

export function mineMap(state) {
  const base = getScenario(state.scenarioId).seed * 31 + state.year * 7919;
  for (let k = 0; k < 60; k++) { // reroll until there's a safe way to reach gold and get home
    const map = buildMineMap(mulberry32(base + k * 104729));
    const dist = safeCosts(map);
    const ok = map.tiles.some((t, i) => t.ore === 'gold' && dist[i] + Math.floor(i / map.cols) + 1 <= MINE.energy);
    if (ok) return map;
  }
  return buildMineMap(mulberry32(base));
}

export function mineStart() {
  return { r: -1, c: MINE_ENTRY, energy: MINE.energy, beams: MINE.beams, brace: false, dug: {}, braced: {},
    haul: 0, found: [], status: 'digging', paid: 0, moves: [] };
}
const cloneTrip = (t) => ({ ...t, dug: { ...t.dug }, braced: { ...t.braced }, found: [...t.found], moves: [...t.moves] });

// Apply one move: 'L', 'R', 'D', 'U', 'brace' or 'home'. Returns { ok, trip, event } or { ok: false, error }.
export function mineStep(trip, map, move) {
  if (trip.status !== 'digging') return fail('This trip is over.');
  const t = cloneTrip(trip);
  t.moves.push(move);
  if (move === 'brace') {
    if (!t.brace && t.beams <= 0) return fail('You\'re out of support beams.');
    t.brace = !t.brace;
    return { ok: true, trip: t, event: t.brace ? 'braced' : 'unbraced' };
  }
  if (move === 'home' || (move === 'U' && t.r === 0 && t.c === map.entry)) {
    const climb = t.r + 1;
    if (t.energy >= climb) { t.energy -= climb; t.status = 'home'; t.paid = t.haul; }
    else { t.status = 'rescued'; t.paid = Math.floor(t.haul / 2); t.energy = 0; }
    t.r = -1; t.c = map.entry;
    return { ok: true, trip: t, event: t.status };
  }
  const d = { L: [0, -1], R: [0, 1], D: [1, 0], U: [-1, 0] }[move];
  if (!d) return fail('Unknown move.');
  if (t.r === -1 && move !== 'D') return fail('Head down into the mine first.');
  const nr = t.r + d[0], nc = t.c + d[1];
  if (!inMine(nr, nc)) return fail('That\'s solid bedrock.');
  const i = mIdx(nr, nc), tile = map.tiles[i];
  if (t.dug[i]) { t.r = nr; t.c = nc; return { ok: true, trip: t, event: 'walk' }; }
  if (move === 'U') return fail('You can\'t dig upward — go around.');
  if (tile.kind === 'cracked') return fail('That rock is cracked — too dangerous to dig.');
  const cost = digCost(tile);
  if (t.energy < cost) return fail('Not enough energy to dig that. Time to head home!');
  t.energy -= cost;
  t.dug[i] = true; t.r = nr; t.c = nc;
  // cracked rock right next to the new hole?
  const danger = N4.some(([dr, dc]) => { const rr = nr + dr, cc = nc + dc; return inMine(rr, cc) && map.tiles[mIdx(rr, cc)].kind === 'cracked'; });
  if (danger) {
    if (t.brace) { t.brace = false; t.beams -= 1; t.braced[i] = true; }
    else { t.status = 'caved'; t.paid = 0; t.lost = t.haul; t.haul = 0; return { ok: true, trip: t, event: 'caved' }; }
  }
  if (tile.ore) { t.haul += MINE.ore[tile.ore].value; t.found.push(tile.ore); return { ok: true, trip: t, event: 'ore', ore: tile.ore }; }
  return { ok: true, trip: t, event: 'dig' };
}

export const mineDone = (state) => (state.mine || {})[state.year] != null;

// Replay a whole trip (so the result can't be faked) and pay it. One trip per year.
export function runMine(state, moves) {
  if (playing(state)) return playing(state);
  if (!state.mine) state.mine = {};
  if (mineDone(state)) return fail('You already worked in the mine this year.');
  if (!Array.isArray(moves)) return fail('No trip to pay.');
  const map = mineMap(state);
  let trip = mineStart();
  for (const m of moves) {
    if (trip.status !== 'digging') break;
    const r = mineStep(trip, map, m);
    if (!r.ok) return fail(`Bad move: ${r.error}`);
    trip = r.trip;
  }
  if (trip.status === 'digging') trip = mineStep(trip, map, 'home').trip;
  const earned = round2(trip.paid);
  state.cash = round2(state.cash + earned);
  state.mine[state.year] = earned;
  record(state, 'mine', trip.status, moves.length, earned);
  return { ok: true, earned, trip };
}

// How many different things you own. The Basket counts as 4 because it holds every company.
export function diversityCount(state) {
  let n = 0;
  for (const s of STOCKS) if (state.shares[s.id] > 0) n += s.index ? 4 : 1;
  for (const b of BONDS) if (state.bonds[b.id] > 0) n += 1;
  return n;
}

// Finish the current year: pay interest, move prices, return a report for the results screen.
export function advanceYear(state) {
  if (state.finished) return null;
  const scenario = getScenario(state.scenarioId);
  const y = state.year;
  const ev = scenario.years[y - 1] || {};
  const before = netWorth(state);
  const safeValue = round2(state.savings + bondValue(state));
  const diversity = diversityCount(state);

  const savingsInterest = round2(state.savings * SETTINGS.savingsRate);
  state.savings = round2(state.savings + savingsInterest);
  const loanInterest = round2(state.debt * SETTINGS.loanRate);
  state.debt = round2(state.debt + loanInterest);

  let coupons = 0;
  const justDefaulted = [];
  for (const b of BONDS) {
    if (state.bonds[b.id] <= 0) continue;
    if (isDefaulted(state, b.id, y)) { // defaults at the end of this year: no payment
      if (!isDefaulted(state, b.id, y - 1)) justDefaulted.push(b.id);
      continue;
    }
    coupons += state.bonds[b.id] * b.price * b.rate;
  }
  coupons = round2(coupons);
  state.cash = round2(state.cash + coupons);
  ensureBiz(state);
  const helperPay = bizYearly(state);
  state.cash = round2(state.cash + helperPay);
  const shiftPay = state.biz.shifts[y] || 0;
  const minePay = (state.mine || {})[y] || 0;
  const event = (state.events || {})[y]?.none ? null : (state.events || {})[y] || null;

  const movers = STOCKS.map((s) => {
    const from = stockPrice(state, s.id, y - 1), to = stockPrice(state, s.id, y);
    return { id: s.id, from, to, change: to / from - 1, owned: state.shares[s.id] };
  });

  state.year = y + 1;
  if (y >= YEARS) state.finished = true;
  const after = netWorth(state);
  state.history.push(after);
  state.yearEnds.push({ year: y, safeValue, diversity, stockValueAfter: stockValue(state) });

  return {
    year: y, outcome: ev.outcome || '', lesson: ev.lesson || null,
    savingsInterest, loanInterest, coupons, justDefaulted, helperPay, shiftPay, minePay, event,
    movers, netBefore: before, netAfter: after, finished: state.finished,
  };
}

export const AWARD_INFO = {
  diversified: { emoji: '🧺', name: 'Spread the Risk', desc: 'Held 4+ different investments most years.' },
  steady:      { emoji: '💎', name: 'Steady Hands',    desc: 'Didn\'t panic-sell after the crash.' },
  saver:       { emoji: '🛡️', name: 'Safety Net',      desc: 'Kept money in savings or bonds every year.' },
  rumor:       { emoji: '🕵️', name: 'Hype Detector',   desc: 'Didn\'t fall for the hot tip.' },
  debtFree:    { emoji: '🔓', name: 'Debt Free',       desc: 'Finished owing the bank nothing.' },
  founder:     { emoji: '🍋', name: 'Business Owner',  desc: 'Ran your lemonade stand every year.' },
  rainy:       { emoji: '☂️', name: 'Rainy Day Ready', desc: 'Paid every surprise bill without selling or borrowing.' },
};

export function computeAwards(state) {
  const sc = getScenario(state.scenarioId);
  const ends = state.yearEnds;
  const earned = {};
  earned.diversified = ends.filter((e) => e.diversity >= 4).length >= 6;
  const hold = sc.crash?.holdYear;
  const heldBefore = hold ? (ends[hold - 2]?.stockValueAfter || 0) > 0 : false;
  earned.steady = heldBefore && !state.log.some((e) => e.type === 'sell' && e.year === hold);
  earned.saver = ends.length === YEARS && ends.every((e) => e.safeValue > 0);
  earned.rumor = sc.rumor
    ? !state.log.some((e) => e.type === 'buy' && e.id === sc.rumor.stock && e.year === sc.rumor.year)
    : false;
  earned.debtFree = state.finished && state.debt === 0;
  const shifts = ensureBiz(state).shifts;
  earned.rainy = state.finished && !state.log.some((e) => e.type === 'forcedSell' || e.type === 'emergencyLoan');
  earned.founder = Array.from({ length: YEARS }, (_, i) => shifts[i + 1] != null).every(Boolean);
  return Object.entries(AWARD_INFO).map(([id, info]) => ({ id, ...info, earned: !!earned[id] }));
}

// The one object a future class leaderboard would send.
export function finalResult(state) {
  return {
    nickname: state.nickname,
    scenario: state.scenarioId,
    netWorth: netWorth(state),
    awards: computeAwards(state).filter((a) => a.earned).map((a) => a.id),
  };
}
