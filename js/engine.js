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
    savingsInterest, loanInterest, coupons, justDefaulted,
    movers, netBefore: before, netAfter: after, finished: state.finished,
  };
}

export const AWARD_INFO = {
  diversified: { emoji: '🧺', name: 'Spread the Risk', desc: 'Held 4+ different investments most years.' },
  steady:      { emoji: '💎', name: 'Steady Hands',    desc: 'Didn\'t panic-sell after the crash.' },
  saver:       { emoji: '🛡️', name: 'Safety Net',      desc: 'Kept money in savings or bonds every year.' },
  rumor:       { emoji: '🕵️', name: 'Hype Detector',   desc: 'Didn\'t fall for the hot tip.' },
  debtFree:    { emoji: '🔓', name: 'Debt Free',       desc: 'Finished owing the bank nothing.' },
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
