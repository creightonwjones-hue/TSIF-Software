// Shared test strategies: a few ways a kid might play.
import * as E from '../js/engine.js';
import { STOCKS, SETTINGS } from '../js/scenarios.js';

export function play(scenarioId, strategy) {
  const g = E.createGame(scenarioId);
  while (!g.finished) { E.applyEvent(g); strategy(g); E.advanceYear(g); }
  return g;
}
const all = (g, id) => Math.floor(g.cash / E.stockPrice(g, id));
// A careful miner: never digs next to cracked rock, goes for the best ore it can still afford,
// and always keeps enough energy to climb home. Returns the list of moves.
export function carefulMiner(map) {
  const { cols, rows } = map;
  const at = (r, c) => map.tiles[r * cols + c];
  const inside = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const near = (r, c) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inside(r + a, c + b) && at(r + a, c + b).kind === 'cracked');
  let trip = E.mineStart();
  const step = (m) => { const res = E.mineStep(trip, map, m); if (!res.ok) throw new Error(res.error); trip = res.trip; };
  step('D');
  if (trip.status !== 'digging') return trip.moves;
  for (let guard = 0; guard < 200 && trip.status === 'digging'; guard++) {
    // Dijkstra from where we stand
    const n = rows * cols, dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1);
    const start = trip.r * cols + trip.c; dist[start] = 0;
    const q = [start];
    while (q.length) {
      q.sort((x, y) => dist[x] - dist[y]);
      const i = q.shift(), r = Math.floor(i / cols), c = i % cols;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc;
        if (!inside(nr, nc)) continue;
        const j = nr * cols + nc, t = at(nr, nc);
        let cost;
        if (trip.dug[j]) cost = 0;
        else if (dr === -1 || t.kind === 'cracked' || near(nr, nc)) continue;
        else cost = t.kind === 'stone' ? 2 : 1;
        if (dist[i] + cost < dist[j]) { dist[j] = dist[i] + cost; prev[j] = i; q.push(j); }
      }
    }
    let best = -1, bestVal = 0;
    for (let j = 0; j < n; j++) {
      const t = map.tiles[j];
      if (!t.ore || trip.dug[j] || dist[j] === Infinity) continue;
      const val = SETTINGS.mine.ore[t.ore].value;
      if (dist[j] + Math.floor(j / cols) + 1 > trip.energy) continue;
      if (val > bestVal || (val === bestVal && dist[j] < dist[best])) { best = j; bestVal = val; }
    }
    if (best < 0) break;
    const route = []; for (let j = best; j !== start; j = prev[j]) route.unshift(j);
    for (const j of route) {
      const r = Math.floor(j / cols), c = j % cols;
      step(r > trip.r ? 'D' : r < trip.r ? 'U' : c > trip.c ? 'R' : 'L');
    }
  }
  if (trip.status === 'digging') step('home');
  return trip.moves;
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
    E.runShift(g, 999); E.runMine(g, carefulMiner(E.mineMap(g)));
  },
  workAndInvest: (g) => {
    if (g.year === 1) { for (const id of ['recipe', 'stand', 'helper']) E.buyUpgrade(g, id); E.deposit(g, 150); E.buyBond(g, 'city', 1); }
    E.runShift(g, 999); E.runMine(g, carefulMiner(E.mineMap(g)));
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
