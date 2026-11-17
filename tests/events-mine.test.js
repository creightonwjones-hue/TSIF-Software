import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { SCENARIOS, SETTINGS } from '../js/scenarios.js';
import { play, strategies } from './strategies.js';

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
test('the mine layout is the same for everyone in a given year, and different each year', () => {
  const a = E.createGame(1), b = E.createGame(1);
  assert.deepEqual(E.mineLayout(a), E.mineLayout(b));
  const first = E.mineLayout(a);
  E.advanceYear(a);
  assert.notDeepEqual(E.mineLayout(a), first);
  assert.equal(first.length, M.cols * M.rows);
  for (const [kind, o] of Object.entries(M.ore)) assert.equal(first.filter((k) => k === kind).length, o.count);
});

test('a mine shift pays for the ore you dig, once per year', () => {
  const g = E.createGame(1);
  const lay = E.mineLayout(g);
  const gold = lay.indexOf('gold'), dirt = lay.indexOf('dirt');
  const r = E.runMine(g, [gold, dirt]);
  assert.ok(r.ok);
  assert.equal(r.earned, M.ore.gold.value);
  assert.equal(g.cash, 1000 + M.ore.gold.value);
  assert.equal(E.runMine(g, [gold]).ok, false);
  assert.equal(E.mineDone(g), true);
  const rep = E.advanceYear(g);
  assert.equal(rep.minePay, M.ore.gold.value);
});

test('the mine rejects too many swings, repeats, and bad spots', () => {
  const g = E.createGame(1);
  assert.equal(E.runMine(g, Array.from({ length: M.swings + 1 }, (_, i) => i)).ok, false);
  assert.equal(E.runMine(g, [0, 0]).ok, false);
  assert.equal(E.runMine(g, [999]).ok, false);
  assert.ok(E.runMine(g, []).ok); // working 0 swings pays $0 but counts as your shift
});

test('a perfect mine shift earns a modest amount', () => {
  const g = E.createGame(1);
  const best = E.mineBest(g);
  assert.ok(best >= 15 && best <= 40, `best shift pays ${best}`);
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
