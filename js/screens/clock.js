import * as E from '../engine.js';
import { STOCKS, BONDS, SETTINGS } from '../scenarios.js';
import { h, money, changeTag, sound, confetti } from '../ui.js';

export function clockScreen(app) {
  const s = app.state;
  const last = s.year === SETTINGS.years;
  app.open({
    title: 'Town Clock', emoji: '🕰️', theme: 'clock', modal: true,
    body: h('div', { class: 'clock' },
      h('div', { class: 'clock-face' }, '🕰️'),
      h('h2', {}, last ? 'End the LAST year?' : `End Year ${s.year}?`),
      h('p', { class: 'hint' }, last
        ? 'After this, the game is over and you\'ll see your final score!'
        : 'Prices will change, savings and bonds pay interest, and loans grow. You can\'t go back!'),
      h('div', { class: 'mini-summary' },
        h('span', { class: 'pill' }, `💵 Cash ${money(s.cash)}`),
        h('span', { class: 'pill' }, `🐷 Savings ${money(s.savings)}`),
        h('span', { class: 'pill' }, `📈 Stocks ${money(E.stockValue(s))}`),
        h('span', { class: 'pill' }, `🏛️ Bonds ${money(E.bondValue(s))}`),
        s.debt ? h('span', { class: 'pill owe' }, `💳 Owe ${money(s.debt)}`) : null),
      h('div', { class: 'btn-row center' },
        h('button', { class: 'btn', onclick: () => { sound('click'); app.close(); } }, '⏪ Not yet'),
        h('button', { class: 'btn primary big', id: 'end-year-btn', onclick: () => endYear(app) }, last ? '🏁 Finish the game!' : '⏩ End the year'))),
  });
}

function endYear(app) {
  const s = app.state;
  const r = E.advanceYear(s);
  if (app.tutorial < 3) app.setTutorial(3);
  app.save();
  app.renderHud();
  const gain = r.netAfter - r.netBefore;
  sound(gain >= 0 ? 'tada' : 'bad');
  if (gain < 0) document.querySelectorAll('.confetti').forEach((c) => c.remove());
  if (gain > 0 && gain / Math.max(1, r.netBefore) > 0.08) confetti(80);

  const names = Object.fromEntries([...STOCKS, ...BONDS].map((x) => [x.id, x]));
  const movers = [...r.movers].sort((a, b) => b.change - a.change);
  const mine = movers.filter((m) => m.owned > 0);
  const top = movers.slice(0, 3), bottom = movers.slice(-3).reverse();
  const moverRow = (m) => h('li', { class: m.owned ? 'mine' : '' },
    h('span', {}, `${names[m.id].emoji} ${names[m.id].name}`), changeTag(m.change),
    m.owned ? h('small', {}, `you own ${m.owned}`) : null);

  const lines = [];
  if (r.savingsInterest) lines.push(['🐷', 'Savings interest', `+${money(r.savingsInterest)}`, 'up']);
  if (r.coupons) lines.push(['🏛️', 'Bond payments', `+${money(r.coupons)}`, 'up']);
  if (r.loanInterest) lines.push(['💳', 'Loan interest (you owe more)', `−${money(r.loanInterest)}`, 'down']);
  for (const id of r.justDefaulted) lines.push(['💥', `${names[id].name} stopped paying!`, '', 'down']);

  app.open({
    modal: true, closable: false, theme: 'results',
    body: h('div', { class: 'results' },
      h('div', { class: 'year-big' }, `Year ${r.year} results`),
      h('div', { class: 'paper' }, h('div', { class: 'paper-head' }, '📰 WHAT HAPPENED'), h('p', { class: 'headline' }, r.outcome)),
      h('div', { class: 'worth-change' },
        h('div', {}, h('small', {}, 'Net worth before'), h('b', {}, money(r.netBefore))),
        h('div', { class: 'arrow' }, '➜'),
        h('div', {}, h('small', {}, 'Net worth now'), h('b', { class: gain >= 0 ? 'up' : 'down' }, money(r.netAfter))),
        h('div', { class: `delta ${gain >= 0 ? 'up' : 'down'}` }, `${gain >= 0 ? '▲ +' : '▼ −'}${money(Math.abs(E.round2(gain)))}`)),
      lines.length ? h('ul', { class: 'money-lines' }, ...lines.map(([i, t, v, c]) => h('li', {}, h('span', {}, `${i} ${t}`), h('b', { class: c }, v)))) : null,
      h('div', { class: 'movers' },
        h('div', {}, h('h4', {}, '🏅 Did the best'), h('ul', {}, ...top.map(moverRow))),
        h('div', {}, h('h4', {}, '🥶 Did the worst'), h('ul', {}, ...bottom.map(moverRow))),
        mine.length ? h('div', {}, h('h4', {}, '⭐ Your stocks'), h('ul', {}, ...mine.map(moverRow))) : null),
      r.lesson ? h('div', { class: 'lesson-card' }, h('b', {}, '💡 Did you know?'), h('p', {}, r.lesson)) : null,
      h('button', { class: 'btn primary big', id: 'next-year-btn', onclick: () => { sound('click'); app.close(); app.nextYearStarted(); } },
        r.finished ? '🏆 See my final score!' : `Start Year ${r.year + 1} ▶`)),
  });
}
