// Sprout City game engine: all the money math, with no screen code.
// Functions change the game state and return { ok: true } or { ok: false, error }.
import { SETTINGS, STOCKS, BONDS, SCENARIOS, DEFAULTED_BOND_PRICE } from './scenarios.js';
import { QUESTIONS } from './questions.js';

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
    fish: {},                         // fishing casts, by year: [{ asked, correct, depth, caught, earned }]
    wants: { owned: {}, hat: null, ride: null, treats: {} }, // shop purchases (fun, but they don't grow)
    home: { owned: {} },              // home upgrades (pay you back each year)
    classMode: null,                  // { key, codes, tutorial } when playing from a club leader's class link
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

// ---------- The Mine: a rock wall with hidden ore veins, one shift a year ----------
// The wall is the same for every kid in a given game and year. You can see how hard each block is,
// but not what's inside. Ore runs in veins: once you break into one, the ore blocks next to it sparkle.
const MINE = SETTINGS.mine;
const HP = { dirt: 1, rock: 2, granite: 3 };
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export function mineWall(state) {
  const rand = mulberry32(getScenario(state.scenarioId).seed * 31 + state.year * 7919);
  const { cols, rows } = MINE, n = cols * rows;
  const kinds = Object.entries(MINE.hardness);
  const blocks = Array.from({ length: n }, () => {
    let x = rand(), kind = kinds[kinds.length - 1][0];
    for (const [k, share] of kinds) { if (x < share) { kind = k; break; } x -= share; }
    return { kind, hp: HP[kind], ore: null, vein: -1 };
  });
  // grow each vein from a random start through neighboring blocks
  MINE.veins.forEach(([ore, size], v) => {
    for (let tries = 0; tries < 50; tries++) {
      const start = Math.floor(rand() * n);
      if (blocks[start].ore) continue;
      const cells = [start];
      for (let g = 0; cells.length < size && g < 100; g++) {
        const from = cells[Math.floor(rand() * cells.length)];
        const [dr, dc] = N4[Math.floor(rand() * 4)];
        const r = Math.floor(from / cols) + dr, c = (from % cols) + dc;
        const i = r * cols + c;
        if (r >= 0 && r < rows && c >= 0 && c < cols && !blocks[i].ore && !cells.includes(i)) cells.push(i);
      }
      if (cells.length < size) continue;
      for (const i of cells) { blocks[i].ore = ore; blocks[i].vein = v; }
      break;
    }
  });
  return { cols, rows, blocks };
}

// Replay a list of hits (block indexes) on a wall. Pure, shared by the screen and runMine.
export function mineProgress(wall, hits, swings = MINE.swings) {
  const dmg = new Array(wall.blocks.length).fill(0), broken = new Array(wall.blocks.length).fill(false);
  const found = [], bonuses = [];
  let earned = 0, streakVein = -1, streak = 0;
  for (let h = 0; h < hits.length; h++) {
    const i = hits[h];
    if (h >= swings) return { error: `You only get ${swings} swings.` };
    if (!Number.isInteger(i) || i < 0 || i >= wall.blocks.length) return { error: 'That\'s not part of the wall.' };
    if (broken[i]) return { error: 'That block is already broken.' };
    dmg[i] += 1;
    const b = wall.blocks[i];
    if (dmg[i] < b.hp) continue;
    broken[i] = true;
    if (!b.ore) { streak = 0; streakVein = -1; continue; }
    const value = MINE.ore[b.ore];
    earned += value;
    streak = b.vein === streakVein ? streak + 1 : 1;
    streakVein = b.vein;
    const bonus = streak >= 3 ? MINE.veinBonus : 0;
    earned += bonus;
    found.push({ i, ore: b.ore, value, bonus, hit: h });
    if (bonus) bonuses.push(h);
  }
  // ore blocks next to broken ore sparkle ("follow the vein")
  const sparkle = wall.blocks.map((b, i) => !broken[i] && !!b.ore && N4.some(([dr, dc]) => {
    const r = Math.floor(i / wall.cols) + dr, c = (i % wall.cols) + dc, j = r * wall.cols + c;
    return r >= 0 && r < wall.rows && c >= 0 && c < wall.cols && broken[j] && wall.blocks[j].ore;
  }));
  return { dmg, broken, found, earned: round2(earned), swingsLeft: swings - hits.length, sparkle, streak };
}

export const mineDone = (state) => (state.mine || {})[state.year] != null;

// Pay a shift: replays the hits so the result can't be faked. One shift per year.
export function runMine(state, hits) {
  if (playing(state)) return playing(state);
  if (!state.mine) state.mine = {};
  if (mineDone(state)) return fail('You already worked in the mine this year.');
  if (!Array.isArray(hits)) return fail('No shift to pay.');
  const p = mineProgress(mineWall(state), hits, mineSwings(state));
  if (p.error) return fail(p.error);
  state.cash = round2(state.cash + p.earned);
  state.mine[state.year] = p.earned;
  record(state, 'mine', 'mine', hits.length, p.earned);
  return { ok: true, earned: p.earned, found: p.found };
}

// ---------- The Dock: fishing with questions, 3 casts a year ----------
// The lure lands in band 1 (Shallows). Each right answer sends it one band deeper with a harder
// question; the first wrong answer stops it. On the way up you hook fish (up to the rod's capacity).
// Fish are the same for every kid in a given game, year and cast. Questions are picked per kid
// (so neighbors can't copy) but always from the same difficulty tier, so it stays fair.
const FISH = SETTINGS.fish;
const BANDS = FISH.bands.length;
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
const fishYear = (state) => { if (!state.fish) state.fish = {}; return state.fish[state.year] || []; };
export const castsLeft = (state) => Math.max(0, FISH.casts - fishYear(state).length);
export const questionsByTier = (tier) => QUESTIONS.filter((q) => q.tier === tier);

// The question for a given depth (1 = Shallows) on the current cast. `askedThisCast` = ids asked so far.
export function fishQuestion(state, depth, askedThisCast = []) {
  const cast = fishYear(state).length;
  const pool = questionsByTier(depth);
  const before = [];
  for (const casts of Object.values(state.fish || {})) for (const c of casts) before.push(...c.asked);
  const askedTier = [...before, ...askedThisCast].filter((id) => pool.some((q) => q.id === id));
  const seen = new Set(askedTier.slice(Math.floor(askedTier.length / pool.length) * pool.length)); // repeat only once a tier runs out
  const options = pool.filter((q) => !seen.has(q.id));
  const rand = mulberry32(hashStr(`${state.scenarioId}|${state.nickname}|${state.year}|${cast}|${depth}`));
  const q = options[Math.floor(rand() * options.length)];
  const order = q.choices.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return { ...q, order };
}

// Replay a cast's answers (indexes into each question's original choices).
export function castProgress(state, answers) {
  const asked = [];
  let correct = 0, stopped = false;
  for (let k = 0; k < answers.length; k++) {
    if (stopped) return { error: 'The lure already stopped.' };
    if (k >= BANDS) return { error: 'The lure is already at the bottom.' };
    const q = fishQuestion(state, k + 1, asked);
    if (!Number.isInteger(answers[k]) || answers[k] < 0 || answers[k] >= q.choices.length) return { error: 'That\'s not one of the answers.' };
    asked.push(q.id);
    if (answers[k] === q.answer) correct++; else stopped = true;
  }
  const finished = stopped || correct === BANDS;
  return { asked, correct, stopped, finished, depth: Math.min(BANDS, correct + 1), perfect: correct === BANDS };
}

// The fish (and junk) swimming in each band on a cast. x/y are 0..1 inside the band, speed is band widths per second.
export function fishSchool(state, cast = fishYear(state).length) {
  const rand = mulberry32(getScenario(state.scenarioId).seed * 17 + state.year * 104729 + cast * 7);
  const items = [];
  FISH.bands.forEach((b, band) => {
    const kinds = [...Array(b.count).fill(null), ...Array(b.junk).fill('junk')];
    kinds.forEach((kind, k) => {
      const junk = kind === 'junk';
      items.push({
        id: `${band}-${k}`, band, junk,
        name: junk ? FISH.junk[Math.floor(rand() * FISH.junk.length)] : b.fish,
        value: junk ? 0 : b.value,
        x: rand(), y: 0.15 + 0.7 * ((k + rand() * 0.6) / kinds.length),
        dir: rand() < 0.5 ? -1 : 1,
        speed: (junk ? 0.6 : 1) * b.speed * (0.85 + 0.3 * rand()),
      });
    });
  });
  return items;
}

// Pay a finished cast: replays the answers and checks every hooked item could really be reached.
export function runCast(state, { answers, caught } = {}) {
  if (playing(state)) return playing(state);
  if (castsLeft(state) <= 0) return fail('No casts left this year.');
  if (!Array.isArray(answers) || !Array.isArray(caught)) return fail('No cast to pay.');
  const p = castProgress(state, answers);
  if (p.error) return fail(p.error);
  if (!p.finished) return fail('The lure is still sinking. Answer the question first!');
  if (caught.length > rodCapacity(state)) return fail(`Your rod only holds ${rodCapacity(state)}.`);
  if (new Set(caught).size !== caught.length) return fail('You can\'t hook the same fish twice.');
  const school = fishSchool(state);
  const items = caught.map((id) => school.find((f) => f.id === id));
  if (items.some((f) => !f || f.band >= p.depth)) return fail('Your lure never went that deep.');
  const bonus = p.perfect ? FISH.perfectBonus : 0;
  const earned = round2(items.reduce((t, f) => t + f.value, 0) + bonus);
  state.cash = round2(state.cash + earned);
  state.fish[state.year] = [...fishYear(state), { asked: p.asked, correct: p.correct, depth: p.depth, caught: [...caught], earned }];
  record(state, 'fish', 'dock', caught.length, earned);
  return { ok: true, earned, bonus, depth: p.depth, correct: p.correct, items };
}

export function fishStats(state) {
  let right = 0, asked = 0, casts = 0, deepest = 0;
  for (const year of Object.values(state.fish || {})) for (const c of year) { right += c.correct; asked += c.asked.length; casts++; deepest = Math.max(deepest, c.depth); }
  return { right, asked, casts, deepest };
}

// ---------- The Shop: "wants" (fun, but the money is spent and doesn't grow) ----------
const SHOP = SETTINGS.shop, HOME = SETTINGS.homeUpgrades;
export function ensureExtras(state) { // older saves don't have these yet
  if (!state.wants) state.wants = { owned: {}, hat: null, ride: null, treats: {} };
  if (!state.wants.treats) state.wants.treats = {};
  if (!state.home) state.home = { owned: {} };
  return state;
}
export const shopItem = (id) => SHOP.find((i) => i.id === id);
export const ownsWant = (state, id) => !!ensureExtras(state).wants.owned[id];
export const treatBoughtThisYear = (state, id) => (ensureExtras(state).wants.treats[state.year] || []).includes(id);
export function buyWant(state, id) {
  if (playing(state)) return playing(state);
  ensureExtras(state);
  const item = shopItem(id);
  if (!item) return fail('That item isn\'t for sale.');
  if (item.kind !== 'treat' && ownsWant(state, id)) return fail('You already have that.');
  if (item.kind === 'treat' && treatBoughtThisYear(state, id)) return fail('You already had that this year.');
  if (state.cash < item.price) return fail('Not enough cash. (The shop doesn\'t take loans — and you shouldn\'t borrow for wants!)');
  state.cash = round2(state.cash - item.price);
  const w = state.wants;
  if (item.kind === 'treat') w.treats[state.year] = [...(w.treats[state.year] || []), id];
  else w.owned[id] = state.year;
  if (item.kind === 'hat') w.hat = id;
  if (item.kind === 'ride' && (!w.ride || item.speed > shopItem(w.ride).speed)) w.ride = id;
  return record(state, 'want', id, 1, item.price);
}
export function wearHat(state, id) {
  ensureExtras(state);
  if (id && (!ownsWant(state, id) || shopItem(id)?.kind !== 'hat')) return fail('You don\'t own that hat.');
  state.wants.hat = id || null;
  return { ok: true };
}
export const rideSpeed = (state) => (ensureExtras(state).wants.ride ? shopItem(state.wants.ride).speed : 1);
export const wantsSpent = (state) => round2(state.log.filter((e) => e.type === 'want').reduce((t, e) => t + e.amount, 0));
// What the want money would be worth now if it had gone into the Sprout City Index the year it was spent.
export function opportunityCost(state) {
  const basket = state.stockPaths.basket, now = Math.min(idx(state), YEARS);
  return round2(state.log.filter((e) => e.type === 'want').reduce((t, e) => t + e.amount * basket[now] / basket[e.year - 1], 0));
}

// ---------- Home upgrades: assets that pay you back ----------
export const homeUpgrade = (id) => HOME.find((u) => u.id === id);
export const ownsUpgrade = (state, id) => !!ensureExtras(state).home.owned[id];
export function buyHomeUpgrade(state, id) {
  if (playing(state)) return playing(state);
  const u = homeUpgrade(id);
  if (!u) return fail('That upgrade doesn\'t exist.');
  if (ownsUpgrade(state, id)) return fail('You already have that.');
  if (state.cash < u.price) return fail('Not enough cash for that upgrade.');
  state.cash = round2(state.cash - u.price);
  state.home.owned[id] = state.year;
  return record(state, 'homeUpgrade', id, 1, u.price);
}
const upgradeSum = (state, key) => HOME.reduce((t, u) => t + (ownsUpgrade(state, u.id) ? u[key] || 0 : 0), 0);
export const homeYearly = (state) => upgradeSum(state, 'yearly');
export const mineSwings = (state) => MINE.swings + upgradeSum(state, 'swings');
export const rodCapacity = (state) => FISH.capacity + upgradeSum(state, 'capacity');
export const homeEarned = (state) => round2(state.log.filter((e) => e.type === 'homePay').reduce((t, e) => t + e.amount, 0));

// ---------- Leader controls: year codes so the class ends each year together ----------
const CODE_ABC = 'ACDEFGHJKMNPQRTUVWXY'; // no look-alikes (0/O, 1/I/L, B/8, S/5)
export function yearCode(key, year) {
  const used = new Set();
  for (let y = 1; y <= year; y++) {
    let code = '', salt = 0;
    do {
      let n = hashStr(`${String(key).toUpperCase()}|${y}|${salt++}`);
      code = '';
      for (let i = 0; i < 3; i++) { code += CODE_ABC[n % CODE_ABC.length]; n = Math.floor(n / CODE_ABC.length); }
    } while (used.has(code));
    used.add(code);
    if (y === year) return code;
  }
  return '';
}
export const checkYearCode = (state, typed) => !state.classMode?.codes
  || String(typed || '').trim().toUpperCase() === yearCode(state.classMode.key, state.year);

// Money earned by working: lemonade shifts, the mine, and fishing.
export function workEarned(state) {
  const sum = (o) => Object.values(o || {}).reduce((t, v) => t + v, 0);
  return round2(sum(ensureBiz(state).shifts) + sum(state.mine) + Object.values(state.fish || {}).flat().reduce((t, c) => t + c.earned, 0));
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
  const homePay = homeYearly(state);
  if (homePay) { state.cash = round2(state.cash + homePay); record(state, 'homePay', 'home', 1, homePay); }
  const shiftPay = state.biz.shifts[y] || 0;
  const minePay = (state.mine || {})[y] || 0;
  const fishPay = round2(((state.fish || {})[y] || []).reduce((t, c) => t + c.earned, 0));
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
    savingsInterest, loanInterest, coupons, justDefaulted, helperPay, shiftPay, minePay, fishPay, homePay, event,
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
  angler:      { emoji: '🎣', name: 'Master Angler',   desc: 'Answered your way down to The Abyss.' },
  balanced:    { emoji: '🍦', name: 'Treat Yourself (Wisely)', desc: 'Bought something fun, but spent no more than 10% of your work money on wants.' },
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
  earned.angler = fishStats(state).deepest >= BANDS;
  const spent = wantsSpent(state);
  earned.balanced = spent > 0 && spent <= 0.1 * workEarned(state);
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
