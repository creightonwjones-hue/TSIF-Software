import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { SCENARIOS, SETTINGS } from '../js/scenarios.js';
import { play, strategies, veinMiner, randomMiner } from './strategies.js';

const M = SETTINGS.mine;
const yearOf = (sc, pred) => SCENARIOS.find((s) => s.id === sc).years.findIndex(pred) + 1;
const billYear = yearOf(1, (y) => y.event?.amount < 0); // first bill in game 1
const giftYear = yearOf(1, (y) => y.event?.amount > 0);
const goTo = (g, year) => { while (g.year < year) E.advanceYear(g); };

// ---------- life events ----------
test('years without an event do nothing', () => {
  const g = E.createGame(1);
  assert.equal(E.applyEvent(g), null);
  assert.equal(g.cash, 1000);
});

test('good news adds cash, and only once per year', () => {
  const g = E.createGame(1); goTo(g, giftYear);
  const before = g.cash;
  const r = E.applyEvent(g);
  assert.ok(r.amount > 0);
  assert.equal(g.cash, before + r.amount);
  E.applyEvent(g); // reloading the page must not pay twice
  assert.equal(g.cash, before + r.amount);
});

test('bills come from cash first, then savings', () => {
  const g = E.createGame(1); goTo(g, billYear);
  const bill = -SCENARIOS[0].years[billYear - 1].event.amount;
  E.deposit(g, g.cash - 10); // leave only $10 in cash
  const sav = g.savings;
  const r = E.applyEvent(g);
  assert.equal(r.fromCash, 10);
  assert.equal(r.fromSavings, bill - 10);
  assert.equal(g.cash, 0);
  assert.equal(g.savings, E.round2(sav - (bill - 10)));
  assert.deepEqual(r.sold, []);
  assert.equal(r.loan, 0);
});

test('if cash and savings run out and you own stocks, stocks are sold', () => {
  const g = E.createGame(1); goTo(g, billYear);
  const q = Math.floor(g.cash / E.stockPrice(g, 'basket'));
  E.buy(g, 'basket', q); // nearly all money in stocks
  const r = E.applyEvent(g);
  assert.ok(r.sold.length > 0, 'something was sold');
  assert.equal(r.sold[0].id, 'basket');
  assert.equal(r.loan, 0);
  assert.ok(g.shares.basket < q);
  assert.ok(g.cash >= 0);
  assert.ok(g.log.some((e) => e.type === 'forcedSell'));
  assert.equal(g.log.some((e) => e.type === 'sell'), false, 'forced sales are not counted as panic sells');
});

test('if you own no stocks or bonds, the bank lends the rest — even past the normal limit', () => {
  const g = E.createGame(1); goTo(g, billYear);
  E.borrow(g, SETTINGS.loanLimit);
  g.cash = 5; // spent almost everything
  const bill = -SCENARIOS[0].years[billYear - 1].event.amount;
  const r = E.applyEvent(g);
  assert.equal(r.loan, bill - 5);
  assert.equal(g.debt, SETTINGS.loanLimit + bill - 5);
  assert.equal(g.cash, 0);
});

test('Rainy Day Ready: paid every bill without selling or borrowing', () => {
  const careful = play(1, (g) => { E.applyEvent(g); if (g.year === 1) E.deposit(g, 300); });
  assert.equal(E.computeAwards(careful).find((a) => a.id === 'rainy').earned, true);
  const allIn = play(1, (g) => { E.applyEvent(g); const q = Math.floor(g.cash / E.stockPrice(g, 'basket')); if (q) E.buy(g, 'basket', q); });
  assert.equal(E.computeAwards(allIn).find((a) => a.id === 'rainy').earned, false);
});

test('every game has some good news and some bills, including a big one right after the crash', () => {
  for (const s of SCENARIOS) {
    const evs = s.years.map((y) => y.event).filter(Boolean);
    assert.ok(evs.some((e) => e.amount > 0) && evs.some((e) => e.amount < 0), s.name);
    assert.ok(s.years[s.crash.holdYear - 1].event?.amount <= -100, `${s.name}: big bill in the year after the crash`);
  }
});

// ---------- the mine ----------
// A tiny hand-made wall for exact rule checks: all dirt (1 hit) unless set.
function testWall(cells = {}) {
  const blocks = Array.from({ length: M.cols * M.rows }, () => ({ kind: 'dirt', hp: 1, ore: null, vein: -1 }));
  for (const [i, v] of Object.entries(cells)) blocks[i] = { kind: 'dirt', hp: 1, ore: null, vein: -1, ...v };
  return { cols: M.cols, rows: M.rows, blocks };
}

test('the mine wall is the same for everyone in a given year, and different each year', () => {
  const a = E.createGame(1), b = E.createGame(1);
  assert.deepEqual(E.mineWall(a), E.mineWall(b));
  const first = E.mineWall(a);
  E.advanceYear(a);
  assert.notDeepEqual(E.mineWall(a), first);
  assert.equal(first.blocks.length, M.cols * M.rows);
  for (const [ore, size] of M.veins) assert.equal(first.blocks.filter((x) => x.ore === ore).length, size, `${ore} vein size`);
});

test('dirt breaks in 1 hit, rock in 2, granite in 3', () => {
  const wall = testWall({ 0: { kind: 'rock', hp: 2, ore: 'coal', vein: 0 }, 1: { kind: 'granite', hp: 3, ore: 'gold', vein: 1 } });
  assert.equal(E.mineProgress(wall, [0]).broken[0], false);
  assert.equal(E.mineProgress(wall, [0, 0]).broken[0], true);
  assert.equal(E.mineProgress(wall, [1, 1]).broken[1], false);
  const p = E.mineProgress(wall, [1, 1, 1]);
  assert.equal(p.broken[1], true);
  assert.equal(p.earned, M.ore.gold);
});

test('ore pays only when its block breaks; empty blocks pay nothing', () => {
  const wall = testWall({ 5: { ore: 'silver', vein: 0 } });
  assert.equal(E.mineProgress(wall, [4, 6]).earned, 0);
  assert.equal(E.mineProgress(wall, [5]).earned, M.ore.silver);
});

test('vein bonus: the 3rd+ ore block in a row from the same vein earns extra', () => {
  const vein = { ore: 'iron', vein: 0 };
  const wall = testWall({ 0: vein, 1: vein, 2: vein, 3: vein });
  assert.equal(E.mineProgress(wall, [0, 1, 2, 3]).earned, 4 * M.ore.iron + 2 * M.veinBonus);
  assert.equal(E.mineProgress(wall, [0, 1, 20, 2, 3]).earned, 4 * M.ore.iron, 'breaking an empty block resets the streak');
});

test('ore next to broken ore sparkles (follow the vein)', () => {
  const vein = { ore: 'gold', vein: 0 };
  const wall = testWall({ 0: vein, 1: vein });
  assert.equal(E.mineProgress(wall, []).sparkle[1], false, 'hidden at the start');
  assert.equal(E.mineProgress(wall, [0]).sparkle[1], true);
  assert.equal(E.mineProgress(wall, [0]).sparkle[M.cols], false, 'empty neighbors never sparkle');
});

test('the swing limit, bad targets, and already-broken blocks are rejected', () => {
  const wall = testWall();
  assert.ok(E.mineProgress(wall, Array.from({ length: M.swings + 1 }, (_, i) => i)).error);
  assert.ok(E.mineProgress(wall, [999]).error);
  assert.ok(E.mineProgress(wall, [3, 3]).error, 'dirt is already broken after one hit');
});

test('runMine replays the shift and pays once per year', () => {
  const g = E.createGame(1);
  const hits = veinMiner(E.mineWall(g));
  const r = E.runMine(g, hits);
  assert.ok(r.ok && r.earned > 0);
  assert.equal(g.cash, 1000 + r.earned);
  assert.equal(E.runMine(g, hits).ok, false, 'only one shift a year');
  assert.equal(E.mineDone(g), true);
  assert.equal(E.advanceYear(g).minePay, r.earned);
  assert.equal(E.runMine(E.createGame(1), [999]).ok, false);
});

test('skill matters: following veins earns a fair amount and far more than random tapping', () => {
  for (const s of SCENARIOS) {
    const g = E.createGame(s.id);
    let skilled = 0, random = 0;
    for (let y = 1; y <= 10; y++) {
      const wall = E.mineWall(g);
      skilled += E.mineProgress(wall, veinMiner(wall)).earned;
      for (let k = 1; k <= 10; k++) random += E.mineProgress(wall, randomMiner(wall, k * 13 + y)).earned / 10;
      E.advanceYear(g);
    }
    assert.ok(skilled / 10 >= 20 && skilled / 10 <= 40, `${s.name}: skilled shifts average ${skilled / 10}`);
    assert.ok(skilled > random * 2, `${s.name}: skilled ${skilled} vs random ${random}`);
  }
});

// ---------- balance with jobs and life events ----------
test('balance: working helps, investing helps more, and doing both wins', () => {
  for (const s of SCENARIOS) {
    const work = E.netWorth(play(s.id, strategies.workerOnly));
    const inv = E.netWorth(play(s.id, strategies.diversifiedPatient));
    const both = E.netWorth(play(s.id, strategies.workAndInvest));
    const none = E.netWorth(play(s.id, strategies.mattress));
    assert.ok(work > none, `scenario ${s.id}: working ${work} beats doing nothing ${none}`);
    assert.ok(both > work * 1.15, `scenario ${s.id}: working + investing ${both} clearly beats working only ${work}`);
    assert.ok(both > inv, `scenario ${s.id}: working + investing ${both} beats investing only ${inv}`);
  }
});
