import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { SCENARIOS, SETTINGS } from '../js/scenarios.js';
import { play, strategies, carefulMiner } from './strategies.js';

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
const idx = (map, r, c) => r * map.cols + c;
// Walk a scripted list of moves from a fresh trip; returns the final trip (or throws on a bad move).
function walk(map, moves) {
  let t = E.mineStart();
  for (const m of moves) { const r = E.mineStep(t, map, m); if (!r.ok) throw new Error(`${m}: ${r.error}`); t = r.trip; }
  return t;
}
// A hand-made tiny map for exact rule checks.
function testMap(cells) { // cells: { 'r,c': {kind, ore} }
  const tiles = Array.from({ length: M.rows * M.cols }, () => ({ kind: 'dirt', ore: null }));
  for (const [k, v] of Object.entries(cells)) { const [r, c] = k.split(',').map(Number); tiles[r * M.cols + c] = { kind: 'dirt', ore: null, ...v }; }
  return { cols: M.cols, rows: M.rows, entry: E.MINE_ENTRY, tiles };
}
const E0 = E.MINE_ENTRY;

test('the mine map is the same for everyone in a given year, and different each year', () => {
  const a = E.createGame(1), b = E.createGame(1);
  assert.deepEqual(E.mineMap(a), E.mineMap(b));
  const first = E.mineMap(a);
  E.advanceYear(a);
  assert.notDeepEqual(E.mineMap(a), first);
  assert.equal(first.tiles.length, M.cols * M.rows);
  assert.ok(first.tiles.some((t) => t.kind === 'cracked'));
  assert.ok(first.tiles.some((t) => t.ore === 'gold'));
});

test('digging costs energy (dirt 1, stone 2); walking back through your tunnel is free', () => {
  const map = testMap({ [`1,${E0}`]: { kind: 'stone' } });
  const t = walk(map, ['D', 'D']);
  assert.equal(t.energy, M.energy - 1 - 2);
  const back = walk(map, ['D', 'D', 'U', 'D']);
  assert.equal(back.energy, t.energy);
});

test('you can\'t dig upward, dig off the edge, or dig cracked rock', () => {
  const map = testMap({ [`1,${E0 + 1}`]: { kind: 'cracked' } });
  let t = walk(map, ['D', 'L']);
  assert.equal(E.mineStep(t, map, 'U').ok, false, 'no digging up into solid rock');
  const beside = walk(map, ['D', 'brace', 'D']); // braced, standing right next to the cracked rock
  const r = E.mineStep(beside, map, 'R');
  assert.equal(r.ok, false);
  assert.match(r.error, /cracked/, 'cracked rock can\'t be dug');
  const edge = walk(map, ['D', ...Array(E0).fill('L')]);
  assert.equal(E.mineStep(edge, map, 'L').ok, false, 'bedrock at the edge');
});

test('ore adds to your haul; heading home banks it and costs 1 energy per level', () => {
  const map = testMap({ [`0,${E0}`]: { ore: 'coal' }, [`1,${E0}`]: { ore: 'silver' } });
  let t = walk(map, ['D', 'D']);
  assert.equal(t.haul, M.ore.coal.value + M.ore.silver.value);
  const energy = t.energy;
  t = E.mineStep(t, map, 'home').trip;
  assert.equal(t.status, 'home');
  assert.equal(t.paid, M.ore.coal.value + M.ore.silver.value);
  assert.equal(t.energy, energy - 2);
});

test('digging next to cracked rock without a beam causes a cave-in and you lose the haul', () => {
  const map = testMap({ [`0,${E0}`]: { ore: 'gold' }, [`1,${E0 + 1}`]: { kind: 'cracked' } });
  const t = walk(map, ['D', 'D']); // (1, entry) is right next to the cracked rock
  assert.equal(t.status, 'caved');
  assert.equal(t.paid, 0);
  assert.equal(t.lost, M.ore.gold.value);
});

test('bracing first makes it safe (and uses a beam)', () => {
  const map = testMap({ [`0,${E0}`]: { ore: 'gold' }, [`1,${E0 + 1}`]: { kind: 'cracked' } });
  const t = walk(map, ['D', 'brace', 'D']);
  assert.equal(t.status, 'digging');
  assert.equal(t.beams, M.beams - 1);
  assert.equal(t.haul, M.ore.gold.value);
  assert.equal(E.mineStep(walk(map, ['D', 'brace', 'D', 'brace', 'brace']), map, 'brace').ok, true); // toggling is fine
});

test('not enough energy to climb home? You\'re rescued with half your haul', () => {
  const cells = {}; for (let r = 0; r < M.rows; r++) cells[`${r},${E0}`] = { ore: r === 0 ? 'gold' : null };
  const map = testMap(cells);
  let t = walk(map, ['D', ...Array(M.rows - 1).fill('D')]);
  t = { ...t, energy: 3 }; // pretend we spent it all
  t = E.mineStep(t, map, 'home').trip;
  assert.equal(t.status, 'rescued');
  assert.equal(t.paid, Math.floor(M.ore.gold.value / 2));
});

test('runMine replays the trip, pays once per year, and rejects impossible moves', () => {
  const g = E.createGame(1);
  const map = E.mineMap(g);
  const moves = carefulMiner(map);
  const r = E.runMine(g, moves);
  assert.ok(r.ok && r.earned > 0);
  assert.equal(g.cash, 1000 + r.earned);
  assert.equal(E.runMine(g, moves).ok, false, 'only one trip a year');
  assert.equal(E.mineDone(g), true);
  assert.equal(E.advanceYear(g).minePay, r.earned);
  const h = E.createGame(1);
  assert.equal(E.runMine(h, ['L']).ok, false, 'must go down first');
});

test('every mine has a safe route to gold, and careful play earns a fair amount', () => {
  for (const s of SCENARIOS) {
    const g = E.createGame(s.id);
    const pays = [];
    for (let y = 1; y <= 10; y++) {
      const r = E.runMine(g, carefulMiner(E.mineMap(g)));
      assert.equal(r.trip.status, 'home', `${s.name} year ${y}: careful miner gets home safely`);
      assert.ok(r.trip.found.includes('gold') || r.earned >= 14, `${s.name} year ${y}: worth the trip`);
      pays.push(r.earned);
      E.advanceYear(g);
    }
    const avg = pays.reduce((a, b) => a + b, 0) / pays.length;
    assert.ok(avg >= 15 && avg <= 35, `${s.name}: careful trips average ${avg}`);
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
