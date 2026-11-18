// Shared test strategies: a few ways a kid might play.
import * as E from '../js/engine.js';
import { STOCKS, SETTINGS } from '../js/scenarios.js';

export function play(scenarioId, strategy) {
  const g = E.createGame(scenarioId);
  while (!g.finished) { E.applyEvent(g); strategy(g); E.advanceYear(g); }
  return g;
}
const all = (g, id) => Math.floor(g.cash / E.stockPrice(g, id));
// A vein-following miner: only uses what a kid can see (block hardness and sparkles).
// Chases sparkles first; otherwise explores the softest blocks in a spread-out pattern.
export function veinMiner(wall) {
  const hits = [];
  const M = SETTINGS.mine;
  while (hits.length < M.swings) {
    const p = E.mineProgress(wall, hits);
    const left = (i) => wall.blocks[i].hp - p.dmg[i];
    const open = wall.blocks.map((_, i) => i).filter((i) => !p.broken[i]);
    if (!open.length) break;
    const sparkly = open.filter((i) => p.sparkle[i]);
    // finish the block we're already working on, then sparkles, then explore
    const started = open.filter((i) => p.dmg[i] > 0);
    const pool = started.length ? started : sparkly.length ? sparkly
      : open.filter((i) => (Math.floor(i / wall.cols) + (i % wall.cols)) % 2 === 0).concat(open);
    pool.sort((a, b) => left(a) - left(b));
    hits.push(pool[0]);
  }
  return hits;
}
// Tapping blocks in a random order (to show that skill matters).
export function randomMiner(wall, seed = 1) {
  const rand = E.mulberry32(seed);
  const order = wall.blocks.map((_, i) => i).sort(() => rand() - 0.5);
  const hits = [];
  for (const i of order) for (let k = 0; k < wall.blocks[i].hp && hits.length < SETTINGS.mine.swings; k++) hits.push(i);
  return hits;
}
// A fisher who knows the answers down to `rightUntil` bands, then misses, and hooks the best fish in reach.
export function fisherCast(g, rightUntil = 3) {
  const answers = [];
  for (let d = 1; d <= SETTINGS.fish.bands.length; d++) {
    const q = E.fishQuestion(g, d, answersAsked(g, answers));
    const right = d <= rightUntil;
    answers.push(right ? q.answer : (q.answer + 1) % q.choices.length);
    if (!right) break;
  }
  const p = E.castProgress(g, answers);
  const caught = E.fishSchool(g).filter((f) => !f.junk && f.band < p.depth)
    .sort((a, b) => b.value - a.value).slice(0, SETTINGS.fish.capacity).map((f) => f.id);
  return { answers, caught };
}
function answersAsked(g, answers) { return answers.length ? E.castProgress(g, answers).asked : []; }
export function fisher(g, rightUntil = 3) {
  while (E.castsLeft(g) > 0) E.runCast(g, fisherCast(g, rightUntil));
}
export const strategies = {
  diversifiedPatient: (g) => {
    if (g.year === 1) { E.deposit(g, 200); E.buyBond(g, 'city', 2); }
    const q = all(g, 'basket'); if (q > 0) E.buy(g, 'basket', q);
  },
  allInMoon: (g) => { const q = all(g, 'moon'); if (q > 0) E.buy(g, 'moon', q); },
  loanSlime: (g) => { if (g.year === 1) E.borrow(g, 500); const q = all(g, 'slime'); if (q > 0) E.buy(g, 'slime', q); },
  mattress: () => {},
  businessOnly: (g) => {
    if (g.year === 1) for (const id of ['recipe', 'stand', 'helper']) E.buyUpgrade(g, id);
    E.runShift(g, 999);
  },
  workerOnly: (g) => {
    if (g.year === 1) for (const id of ['recipe', 'stand', 'helper']) E.buyUpgrade(g, id);
    E.runShift(g, 999); E.runMine(g, veinMiner(E.mineWall(g))); fisher(g);
  },
  workAndInvest: (g) => {
    if (g.year === 1) { for (const id of ['recipe', 'stand', 'helper']) E.buyUpgrade(g, id); E.deposit(g, 150); E.buyBond(g, 'city', 1); }
    E.runShift(g, 999); E.runMine(g, veinMiner(E.mineWall(g))); fisher(g);
    const q = all(g, 'basket'); if (q > 0) E.buy(g, 'basket', q);
  },
  businessAndInvest: (g) => {
    if (g.year === 1) { for (const id of ['recipe', 'stand', 'helper']) E.buyUpgrade(g, id); E.deposit(g, 100); E.buyBond(g, 'city', 1); }
    E.runShift(g, 999);
    const q = all(g, 'basket'); if (q > 0) E.buy(g, 'basket', q);
  },
  panicSeller: (g) => {
    const sc = E.getScenario(g.scenarioId);
    if (g.year === sc.crash.holdYear) { for (const s of STOCKS) if (g.shares[s.id]) E.sell(g, s.id, g.shares[s.id]); }
    else if (g.year < sc.crash.holdYear) { const q = all(g, 'basket'); if (q > 0) E.buy(g, 'basket', q); }
  },
};
