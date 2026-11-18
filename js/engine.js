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
export function mineProgress(wall, hits) {
  const dmg = new Array(wall.blocks.length).fill(0), broken = new Array(wall.blocks.length).fill(false);
  const found = [], bonuses = [];
  let earned = 0, streakVein = -1, streak = 0;
  for (let h = 0; h < hits.length; h++) {
    const i = hits[h];
    if (h >= MINE.swings) return { error: `You only get ${MINE.swings} swings.` };
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
  return { dmg, broken, found, earned: round2(earned), swingsLeft: MINE.swings - hits.length, sparkle, streak };
}

export const mineDone = (state) => (state.mine || {})[state.year] != null;

// Pay a shift: replays the hits so the result can't be faked. One shift per year.
export function runMine(state, hits) {
  if (playing(state)) return playing(state);
  if (!state.mine) state.mine = {};
  if (mineDone(state)) return fail('You already worked in the mine this year.');
  if (!Array.isArray(hits)) return fail('No shift to pay.');
  const p = mineProgress(mineWall(state), hits);
  if (p.error) return fail(p.error);
  state.cash = round2(state.cash + p.earned);
  state.mine[state.year] = p.earned;
  record(state, 'mine', 'mine', hits.length, p.earned);
  return { ok: true, earned: p.earned, found: p.found };
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
