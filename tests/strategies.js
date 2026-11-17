// Shared test strategies: a few ways a kid might play.
import * as E from '../js/engine.js';
import { STOCKS } from '../js/scenarios.js';

export function play(scenarioId, strategy) {
  const g = E.createGame(scenarioId);
  while (!g.finished) { strategy(g); E.advanceYear(g); }
  return g;
}
const all = (g, id) => Math.floor(g.cash / E.stockPrice(g, id));
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
