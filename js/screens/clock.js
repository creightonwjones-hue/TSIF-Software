import * as E from '../engine.js';
import { STOCKS, BONDS, SETTINGS } from '../scenarios.js';
import { h, money, changeTag, sound, moneyPop } from '../ui.js';

export function clockScreen(app) {
  const s = app.state;
  const last = s.year === SETTINGS.years;
  app.open({
    title: 'Town Clock', emoji: '🕰️', theme: 'clock', modal: true,
    body: h('div', { class: 'clock' },
      h('div', { class: 'clock-face' }, '🕰️'),
      h('h2', {}, last ? 'END THE FINAL YEAR?' : `END YEAR ${s.year}?`),
      h('p', { class: 'hint' }, last
        ? 'This locks in your final score.'
        : 'Prices move, interest gets paid, loans grow. No going back.'),
      h('div', { class: 'mini-summary' },
        h('span', { class: 'pill' }, `CASH ${money(s.cash)}`),
        h('span', { class: 'pill' }, `SAVINGS ${money(s.savings)}`),
        h('span', { class: 'pill' }, `STOCKS ${money(E.stockValue(s))}`),
        h('span', { class: 'pill' }, `BONDS ${money(E.bondValue(s))}`),
        s.debt ? h('span', { class: 'pill owe' }, `DEBT ${money(s.debt)}`) : null),
      h('div', { class: 'btn-row center' },
        h('button', { class: 'btn', onclick: () => { sound('click'); app.close(); } }, 'NOT YET'),
        h('button', { class: 'btn primary big', id: 'end-year-btn', onclick: () => endYear(app) }, last ? 'FINISH GAME 🏁' : 'END YEAR ⏩'))),
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

  const names = Object.fromEntries([...STOCKS, ...BONDS].map((x) => [x.id, x]));
  const movers = [...r.movers].sort((a, b) => b.change - a.change);
  const mine = movers.filter((m) => m.owned > 0);
  const top = movers.slice(0, 3), bottom = movers.slice(-3).reverse();
  const moverRow = (m) => h('li', { class: m.owned ? 'mine' : '' },
    h('span', {}, `${names[m.id].emoji} ${names[m.id].name}`), changeTag(m.change),
    m.owned ? h('small', {}, `you own ${m.owned}`) : null);

  const lines = [];
  if (r.savingsInterest) lines.push(['🛡️', 'Savings interest', `+${money(r.savingsInterest)}`, 'up']);
  if (r.coupons) lines.push(['🏛️', 'Bond payments', `+${money(r.coupons)}`, 'up']);
  if (r.loanInterest) lines.push(['💳', 'Loan interest (you owe more)', `−${money(r.loanInterest)}`, 'down']);
  for (const id of r.justDefaulted) lines.push(['💥', `${names[id].name} stopped paying!`, '', 'down']);

  app.open({
    modal: true, closable: false, theme: 'results',
    body: h('div', { class: 'results' },
      h('div', { class: 'year-big' }, h('small', {}, 'YEAR'), String(r.year).padStart(2, '0'), h('span', { class: 'of' }, ' RECAP')),
      h('div', { class: 'paper' }, h('div', { class: 'paper-head' }, h('span', { class: 'live-dot' }), 'WHAT HAPPENED'), h('p', { class: 'headline' }, r.outcome)),
      h('div', { class: 'worth-change' },
        h('div', {}, h('small', {}, 'NET WORTH BEFORE'), h('b', {}, money(r.netBefore))),
        h('div', { class: 'arrow' }, '➜'),
        h('div', {}, h('small', {}, 'NET WORTH NOW'), h('b', { class: gain >= 0 ? 'up' : 'down' }, money(r.netAfter))),
        h('div', { class: `delta ${gain >= 0 ? 'up' : 'down'}` }, `${gain >= 0 ? '▲ +' : '▼ −'}${money(Math.abs(E.round2(gain)))}`)),
      lines.length ? h('ul', { class: 'money-lines' }, ...lines.map(([i, t, v, c]) => h('li', {}, h('span', {}, `${i} ${t}`), h('b', { class: c }, v)))) : null,
      h('div', { class: 'movers' },
        h('div', {}, h('h4', {}, '🔥 TOP MOVERS'), h('ul', {}, ...top.map(moverRow))),
        h('div', {}, h('h4', {}, '🧊 WORST MOVERS'), h('ul', {}, ...bottom.map(moverRow))),
        mine.length ? h('div', {}, h('h4', {}, '⭐ YOUR STOCKS'), h('ul', {}, ...mine.map(moverRow))) : null),
      r.lesson ? h('div', { class: 'lesson-card' }, h('b', { class: 'toast-tag' }, 'PRO TIP'), h('p', {}, r.lesson)) : null,
      h('button', { class: 'btn primary big', id: 'next-year-btn', onclick: () => { sound('click'); app.close(); app.nextYearStarted(); } },
        r.finished ? 'FINAL SCORE 🏆' : `YEAR ${r.year + 1} ▶`)),
  });
  setTimeout(() => moneyPop(gain, document.querySelector('.delta')), 250);
}
