import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { SETTINGS } from '../js/scenarios.js';
import { play, strategies, fisherCast } from './strategies.js';

const price = (id) => E.shopItem(id).price;

test('wants: cost cash, can\'t overspend, and lower net worth', () => {
  const g = E.createGame(1);
  const r = E.buyWant(g, 'tophat');
  assert.ok(r.ok);
  assert.equal(g.cash, 1000 - price('tophat'));
  assert.equal(E.netWorth(g), 1000 - price('tophat'), 'wants are not counted as savings or investments');
  g.cash = 10;
  assert.equal(E.buyWant(g, 'crown').ok, false, 'no loans for wants');
  assert.equal(E.buyWant(g, 'nope').ok, false);
});

test('hats: bought once, switching is free; the fastest ride is used', () => {
  const g = E.createGame(1);
  E.buyWant(g, 'cap'); E.buyWant(g, 'shades');
  assert.equal(g.wants.hat, 'shades');
  assert.equal(E.buyWant(g, 'cap').ok, false, 'already owned');
  const cash = g.cash;
  assert.ok(E.wearHat(g, 'cap').ok); assert.equal(g.wants.hat, 'cap'); assert.equal(g.cash, cash);
  assert.equal(E.wearHat(g, 'crown').ok, false, 'can\'t wear a hat you don\'t own');
  assert.ok(E.wearHat(g, null).ok); assert.equal(g.wants.hat, null);
  assert.equal(E.rideSpeed(g), 1);
  E.buyWant(g, 'bike'); E.buyWant(g, 'scooter');
  assert.equal(E.rideSpeed(g), E.shopItem('bike').speed);
});

test('treats: once per year each', () => {
  const g = E.createGame(1);
  assert.ok(E.buyWant(g, 'icecream').ok);
  assert.equal(E.buyWant(g, 'icecream').ok, false);
  E.advanceYear(g);
  assert.ok(E.buyWant(g, 'icecream').ok);
  assert.equal(E.wantsSpent(g), 2 * price('icecream'));
});

test('opportunity cost follows the Sprout City Index price path', () => {
  const g = E.createGame(1);
  E.buyWant(g, 'bike');
  while (!g.finished) E.advanceYear(g);
  const b = g.stockPaths.basket;
  assert.equal(E.opportunityCost(g), E.round2(price('bike') * b[10] / b[0]));
  assert.ok(E.opportunityCost(g) > price('bike'));
});

test('home upgrades: bought once, garden and solar pay every year', () => {
  const g = E.createGame(1);
  assert.ok(E.buyHomeUpgrade(g, 'garden').ok);
  assert.equal(E.buyHomeUpgrade(g, 'garden').ok, false);
  g.cash = 50; assert.equal(E.buyHomeUpgrade(g, 'solar').ok, false, 'not enough cash');
  const before = g.cash;
  const r = E.advanceYear(g);
  assert.equal(r.homePay, E.homeUpgrade('garden').yearly);
  assert.ok(g.cash >= before + r.homePay);
  assert.equal(E.homeEarned(g), E.homeUpgrade('garden').yearly);
});

test('workshop gives extra mine swings; tackle shed lets the rod hold one more', () => {
  const g = E.createGame(1);
  const wall = E.mineWall(g);
  const many = [];
  for (let i = 0; many.length < SETTINGS.mine.swings + 3; i++) for (let k = 0; k < wall.blocks[i].hp && many.length < SETTINGS.mine.swings + 3; k++) many.push(i);
  assert.ok(E.mineProgress(wall, many, E.mineSwings(g)).error);
  E.buyHomeUpgrade(g, 'workshop');
  assert.equal(E.mineSwings(g), SETTINGS.mine.swings + 3);
  assert.equal(E.mineProgress(wall, many, E.mineSwings(g)).error, undefined);
  assert.ok(E.runMine(g, many).ok);

  const f = E.createGame(1);
  const { answers } = fisherCast(f, 6);
  const five = E.fishSchool(f).filter((x) => !x.junk).slice(0, 5).map((x) => x.id);
  assert.equal(E.runCast(f, { answers, caught: five }).ok, false);
  E.buyHomeUpgrade(f, 'tackle');
  assert.equal(E.rodCapacity(f), 5);
  assert.ok(E.runCast(f, { answers, caught: five }).ok);
});

test('year codes: 3 safe letters, same every time, different per year and per class', () => {
  for (const key of ['K7Q', 'ABC', 'zzz', 'M2P', 'TSIF']) {
    const codes = Array.from({ length: 10 }, (_, i) => E.yearCode(key, i + 1));
    for (const c of codes) assert.match(c, /^[ACDEFGHJKMNPQRTUVWXY]{3}$/);
    assert.equal(new Set(codes).size, 10, `${key}: all different`);
    assert.deepEqual(codes, Array.from({ length: 10 }, (_, i) => E.yearCode(key, i + 1)));
  }
  assert.notEqual(E.yearCode('AAA', 1), E.yearCode('AAB', 1));
  const g = E.createGame(1);
  assert.equal(E.checkYearCode(g, ''), true, 'no class mode: no code needed');
  g.classMode = { key: 'K7Q', codes: true };
  assert.equal(E.checkYearCode(g, 'xxx'), false);
  assert.equal(E.checkYearCode(g, E.yearCode('K7Q', 1).toLowerCase()), true, 'not case-sensitive');
});

test('Treat Yourself (Wisely): a little fun is fine, a lot is not', () => {
  const wise = play(1, (g) => { strategies.workerOnly(g); if (g.year === 3) E.buyWant(g, 'icecream'); if (g.year === 6) E.buyWant(g, 'cap'); });
  assert.equal(E.computeAwards(wise).find((a) => a.id === 'balanced').earned, true);
  const big = play(1, (g) => { strategies.workerOnly(g); if (g.year === 2) { E.buyWant(g, 'crown'); E.buyWant(g, 'bike'); } });
  assert.equal(E.computeAwards(big).find((a) => a.id === 'balanced').earned, false);
  assert.equal(E.computeAwards(play(1, strategies.mattress)).find((a) => a.id === 'balanced').earned, false, 'nothing bought');
});

test('garden + solar in Year 1 end a little ahead of not buying them', () => {
  for (const id of [1, 2, 3]) {
    const without = E.netWorth(play(id, strategies.workAndInvest));
    const withUp = E.netWorth(play(id, (g) => { if (g.year === 1) { E.buyHomeUpgrade(g, 'garden'); E.buyHomeUpgrade(g, 'solar'); } strategies.workAndInvest(g); }));
    assert.ok(withUp > without, `game ${id}: ${withUp} vs ${without}`);
    assert.ok(withUp < without * 1.1, 'a nice bonus, not a game-breaker');
  }
});
