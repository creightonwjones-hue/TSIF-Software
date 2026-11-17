import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { SCENARIOS, SETTINGS } from '../js/scenarios.js';
import { play, strategies } from './strategies.js';

const B = SETTINGS.business;
const up = (id) => B.upgrades.find((u) => u.id === id);

test('a new game has a basic lemonade stand', () => {
  const g = E.createGame(1);
  assert.deepEqual(g.biz.owned, {});
  assert.equal(E.bizCustomers(g), B.customers);
  assert.equal(E.bizPrice(g), B.price);
});

test('a shift pays customers served × price, once per year', () => {
  const g = E.createGame(1);
  const r = E.runShift(g, B.customers);
  assert.ok(r.ok);
  assert.equal(r.earned, B.customers * B.price);
  assert.equal(g.cash, 1000 + B.customers * B.price);
  assert.equal(E.runShift(g, B.customers).ok, false); // already worked this year
  assert.equal(E.shiftDone(g), true);
  E.advanceYear(g);
  assert.equal(E.shiftDone(g), false);
});

test('serving more customers than exist is capped; partial shifts pay partially', () => {
  const g = E.createGame(1);
  assert.equal(E.runShift(g, 999).earned, B.customers * B.price);
  const h = E.createGame(1);
  assert.equal(E.runShift(h, 3).earned, 3 * B.price);
});

test('upgrades cost cash, apply once, and change the stand', () => {
  const g = E.createGame(1);
  assert.ok(E.buyUpgrade(g, 'recipe').ok);
  assert.equal(g.cash, 1000 - up('recipe').cost);
  assert.equal(E.buyUpgrade(g, 'recipe').ok, false); // can't buy twice
  assert.ok(E.buyUpgrade(g, 'stand').ok);
  assert.equal(E.bizPrice(g), B.price + up('recipe').price);
  assert.equal(E.bizCustomers(g), B.customers + up('stand').customers);
  assert.equal(E.buyUpgrade(g, 'nope').ok, false);
  const poor = E.createGame(1); poor.cash = 10;
  assert.equal(E.buyUpgrade(poor, 'helper').ok, false);
});

test('upgrades are spent money, not assets, so net worth drops when you buy one', () => {
  const g = E.createGame(1);
  E.buyUpgrade(g, 'helper');
  assert.equal(E.netWorth(g), 1000 - up('helper').cost);
});

test('a helper pays every year with no shift', () => {
  const g = E.createGame(1);
  E.buyUpgrade(g, 'helper');
  const r = E.advanceYear(g);
  assert.equal(r.helperPay, up('helper').yearly);
  assert.equal(g.cash, 1000 - up('helper').cost + up('helper').yearly);
});

test('the year report includes this year\'s shift earnings', () => {
  const g = E.createGame(1);
  E.runShift(g, B.customers);
  assert.equal(E.advanceYear(g).shiftPay, B.customers * B.price);
});

test('Business Owner achievement: ran a shift every year', () => {
  const all = play(1, (g) => E.runShift(g, 99));
  assert.equal(E.computeAwards(all).find((a) => a.id === 'founder').earned, true);
  const some = play(1, (g) => { if (g.year < 10) E.runShift(g, 99); });
  assert.equal(E.computeAwards(some).find((a) => a.id === 'founder').earned, false);
});

test('balance: the business is useful but does not make investing pointless', () => {
  for (const s of SCENARIOS) {
    const biz = E.netWorth(play(s.id, strategies.businessOnly));
    const inv = E.netWorth(play(s.id, strategies.diversifiedPatient));
    const both = E.netWorth(play(s.id, strategies.businessAndInvest));
    const none = E.netWorth(play(s.id, strategies.mattress));
    assert.ok(biz > none, `scenario ${s.id}: business ${biz} should beat doing nothing ${none}`);
    assert.ok(biz <= inv, `scenario ${s.id}: business-only ${biz} should not beat investing-only ${inv}`);
    assert.ok(both > inv && both > biz, `scenario ${s.id}: both ${both} should beat investing ${inv} and business ${biz}`);
  }
});

test('buying the helper late does not pay off (the payback lesson)', () => {
  const base = E.netWorth(play(1, () => {}));
  const early = play(1, (g) => { if (g.year === 1) E.buyUpgrade(g, 'helper'); });
  const late = play(1, (g) => { if (g.year === 9) E.buyUpgrade(g, 'helper'); });
  assert.ok(E.netWorth(early) > base, 'early helper pays back');
  assert.ok(E.netWorth(late) < base, 'late helper does not');
});
