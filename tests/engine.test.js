import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { SCENARIOS, STOCKS, SETTINGS } from '../js/scenarios.js';
import { play, strategies } from './strategies.js';

const ids = SCENARIOS.map((s) => s.id);

test('every scenario has exactly 10 years', () => {
  for (const s of SCENARIOS) assert.equal(s.years.length, SETTINGS.years, s.name);
});

test('same scenario gives identical prices every time', () => {
  for (const id of ids) assert.deepEqual(E.createGame(id).stockPaths, E.createGame(id).stockPaths);
});

test('different scenarios give different prices', () => {
  assert.notDeepEqual(E.createGame(1).stockPaths, E.createGame(2).stockPaths);
});

test('prices never drop below $1', () => {
  for (const id of ids) {
    for (const path of Object.values(E.createGame(id).stockPaths)) {
      assert.equal(path.length, 11);
      for (const p of path) assert.ok(p >= 1);
    }
  }
});

test('Whole City Basket moves by the average of every other company', () => {
  const g = E.createGame(1);
  const others = STOCKS.filter((s) => !s.index);
  for (let y = 1; y <= 10; y++) {
    const avg = others.reduce((t, s) => t + g.stockPaths[s.id][y] / g.stockPaths[s.id][y - 1] - 1, 0) / others.length;
    const basket = g.stockPaths.basket[y] / g.stockPaths.basket[y - 1] - 1;
    assert.ok(Math.abs(avg - basket) < 0.001, `year ${y}`);
  }
});

test('buying and selling stocks moves cash correctly', () => {
  const g = E.createGame(1);
  const price = E.stockPrice(g, 'grocery');
  assert.ok(E.buy(g, 'grocery', 3).ok);
  assert.equal(g.shares.grocery, 3);
  assert.equal(g.cash, E.round2(1000 - price * 3));
  assert.ok(E.sell(g, 'grocery', 2).ok);
  assert.equal(g.shares.grocery, 1);
  assert.equal(g.cash, E.round2(1000 - price));
});

test('cannot overspend, oversell, or use silly amounts', () => {
  const g = E.createGame(1);
  assert.equal(E.buy(g, 'basket', 1000).ok, false);
  assert.equal(E.sell(g, 'basket', 1).ok, false);
  assert.equal(E.buy(g, 'basket', 0).ok, false);
  assert.equal(E.buy(g, 'basket', 1.5).ok, false);
  assert.equal(E.buy(g, 'nope', 1).ok, false);
  assert.equal(E.deposit(g, 5000).ok, false);
  assert.equal(E.deposit(g, -5).ok, false);
  assert.equal(E.withdraw(g, 1).ok, false);
  assert.equal(g.cash, 1000);
});

test('savings earn 3% and never go down, even in a crash', () => {
  const g = E.createGame(1);
  E.deposit(g, 1000);
  let last = g.savings;
  while (!g.finished) {
    E.advanceYear(g);
    assert.ok(g.savings > last);
    last = g.savings;
  }
  assert.equal(g.savings, E.round2([...Array(10)].reduce((s) => E.round2(s * 1.03), 1000)));
});

test('loans add 8% interest each year and count against net worth', () => {
  const g = E.createGame(1);
  assert.ok(E.borrow(g, 500).ok);
  assert.equal(g.cash, 1500);
  assert.equal(E.netWorth(g), 1000);
  E.advanceYear(g);
  assert.equal(g.debt, 540);
  assert.equal(E.netWorth(g), 1500 - 540);
  E.advanceYear(g);
  assert.equal(g.debt, E.round2(540 * 1.08));
});

test('borrow limit is enforced and repay works', () => {
  const g = E.createGame(1);
  assert.ok(E.borrow(g, 300).ok);
  assert.equal(E.borrow(g, 201).ok, false);
  assert.ok(E.borrow(g, 200).ok);
  assert.equal(E.borrowRoom(g), 0);
  assert.ok(E.repay(g, 9999).ok); // repays only what's owed
  assert.equal(g.debt, 0);
  assert.equal(g.cash, 1000);
  assert.equal(E.repay(g, 10).ok, false);
});

test('bonds pay yearly interest', () => {
  const g = E.createGame(1);
  E.buyBond(g, 'city', 2);
  E.buyBond(g, 'school', 1);
  assert.equal(g.cash, 700);
  const r = E.advanceYear(g);
  assert.equal(r.coupons, 2 * 4 + 5);
  assert.equal(g.cash, 713);
  assert.ok(E.sellBond(g, 'city', 2).ok);
  assert.equal(g.cash, 913);
});

test('Wild Ride Bond defaults in scenario 2: stops paying and drops in price', () => {
  const g = E.createGame(2);
  E.buyBond(g, 'ride', 2);
  const paid = [];
  let defaulted = [];
  while (!g.finished) {
    const r = E.advanceYear(g);
    paid.push(r.coupons);
    if (r.justDefaulted.length) defaulted = [r.year, ...r.justDefaulted];
  }
  assert.deepEqual(paid, [20, 20, 20, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(defaulted, [4, 'ride']);
  assert.equal(E.bondPrice(g, 'ride'), 40);
  const g2 = E.createGame(2);
  for (let i = 0; i < 4; i++) E.advanceYear(g2);
  assert.equal(E.buyBond(g2, 'ride', 1).ok, false);
});

test('nothing can be done after the game ends', () => {
  const g = E.createGame(1);
  for (let i = 0; i < 10; i++) E.advanceYear(g);
  assert.equal(g.finished, true);
  assert.equal(E.advanceYear(g), null);
  assert.equal(E.buy(g, 'basket', 1).ok, false);
  assert.equal(g.history.length, 11);
});

const earned = (g) => Object.fromEntries(E.computeAwards(g).map((a) => [a.id, a.earned]));

test('awards: diversified + patient player earns the good-habit awards', () => {
  for (const id of ids) {
    const a = earned(play(id, strategies.diversifiedPatient));
    for (const k of ['diversified', 'steady', 'saver', 'rumor', 'debtFree']) assert.equal(a[k], true, `scenario ${id}: ${k}`);
    assert.equal(a.founder, false, `scenario ${id}: never ran the lemonade stand`);
  }
});

test('awards: gamblers and panic sellers miss them', () => {
  const moon = earned(play(1, strategies.allInMoon));
  const chaser = earned(play(1, (g) => { if (g.year === 3) E.buy(g, 'moon', 10); }));
  assert.equal(chaser.rumor, false);
  assert.equal(moon.diversified, false);
  assert.equal(moon.saver, false);
  assert.equal(earned(play(1, strategies.loanSlime)).debtFree, false);
  assert.equal(earned(play(1, strategies.panicSeller)).steady, false);
  assert.equal(earned(play(1, strategies.mattress)).steady, false); // never held stocks: no award
});

test('repaying a loan earns Debt Free', () => {
  const g = play(1, (s) => {
    if (s.year === 1) E.borrow(s, 100);
    if (s.year === 10) E.repay(s, s.debt);
  });
  assert.equal(earned(g).debtFree, true);
});

test('smart play beats gambling in every scenario', () => {
  for (const id of ids) {
    const smart = E.netWorth(play(id, strategies.diversifiedPatient));
    for (const bad of ['allInMoon', 'loanSlime', 'panicSeller', 'mattress']) {
      const other = E.netWorth(play(id, strategies[bad]));
      assert.ok(smart > other, `scenario ${id}: diversifiedPatient ${smart} vs ${bad} ${other}`);
    }
  }
});

test('finalResult is a plain object ready for a future leaderboard', () => {
  const g = play(1, strategies.diversifiedPatient);
  g.nickname = 'Ace';
  const r = E.finalResult(g);
  assert.equal(r.nickname, 'Ace');
  assert.equal(r.scenario, 1);
  assert.equal(r.netWorth, E.netWorth(g));
  assert.ok(r.awards.includes('diversified'));
  assert.doesNotThrow(() => JSON.stringify(r));
});
