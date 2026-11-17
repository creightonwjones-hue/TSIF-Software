// Home: go to sleep to end the year, then see the year's recap.
import * as E from '../engine.js';
import { STOCKS, BONDS, SETTINGS } from '../scenarios.js';
import { h, money, pct, sound, moneyPop } from '../ui.js';
import { homeScene } from '../scenes.js';

export function homeScreen(app) {
  const s = app.state;
  const last = s.year === SETTINGS.years;
  const skipped = !E.shiftDone(s);
  app.open({
    modal: true, theme: 'home',
    body: h('div', { class: 'home' },
      homeScene(app.color(), false),
      h('h2', {}, last ? 'Sleep and finish the game?' : `Go to sleep and end Year ${s.year}?`),
      h('p', { class: 'hint' }, last
        ? 'This locks in your final score.'
        : 'Overnight, prices change, interest gets paid, and loans grow. You can\'t undo it.'),
      skipped ? h('p', { class: 'warn-line' }, 'You haven\'t run your lemonade stand this year — that\'s money left on the table.') : null,
      h('div', { class: 'mini-summary' },
        h('span', { class: 'chip' }, `Cash ${money(s.cash)}`),
        h('span', { class: 'chip' }, `Savings ${money(s.savings)}`),
        h('span', { class: 'chip' }, `Stocks ${money(E.stockValue(s))}`),
        h('span', { class: 'chip' }, `Bonds ${money(E.bondValue(s))}`),
        s.debt ? h('span', { class: 'chip owe' }, `Debt ${money(s.debt)}`) : null),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => { sound('click'); app.close(); } }, 'Not yet'),
        h('button', { class: 'btn primary', type: 'button', id: 'end-year-btn', onclick: () => endYear(app) }, last ? 'Finish the game' : 'Sleep — end the year'))),
  });
}

function endYear(app) {
  const s = app.state;
  const r = E.advanceYear(s);
  app.setTutorial(99);
  app.save();
  app.renderHud();
  const gain = r.netAfter - r.netBefore;
  sound(gain >= 0 ? 'tada' : 'bad');

  const names = Object.fromEntries([...STOCKS, ...BONDS].map((x) => [x.id, x]));
  const movers = [...r.movers].filter((m) => !names[m.id].index).sort((a, b) => b.change - a.change);
  const mine = r.movers.filter((m) => m.owned > 0);
  const moverRow = (m) => {
    const c = pct(m.change);
    return h('li', { class: m.owned ? 'mine' : '' }, h('span', {}, names[m.id].name), h('b', { class: c.cls }, c.text));
  };

  const lines = [];
  if (r.shiftPay) lines.push(['Lemonade stand', `+${money(r.shiftPay)}`, 'up']);
  if (r.helperPay) lines.push(['Your helper\'s sales', `+${money(r.helperPay)}`, 'up']);
  if (r.savingsInterest) lines.push(['Savings interest', `+${money(r.savingsInterest)}`, 'up']);
  if (r.coupons) lines.push(['Bond payments', `+${money(r.coupons)}`, 'up']);
  if (r.loanInterest) lines.push(['Loan interest (added to your debt)', `−${money(r.loanInterest)}`, 'down']);
  for (const id of r.justDefaulted) lines.push([`${names[id].name} stopped paying`, '', 'down']);

  app.open({
    modal: true, closable: false, theme: 'results',
    body: h('div', { class: 'results' },
      homeScene(app.color(), true),
      h('h2', {}, `Good morning! Year ${r.year} recap`),
      h('div', { class: 'paper' }, h('small', { class: 'paper-head' }, 'What happened'), h('p', { class: 'headline' }, r.outcome)),
      h('div', { class: 'worth-change' },
        h('div', {}, h('small', {}, 'Net worth before'), h('b', {}, money(r.netBefore))),
        h('span', { class: 'arrow' }, '→'),
        h('div', {}, h('small', {}, 'Net worth now'), h('b', {}, money(r.netAfter))),
        h('b', { class: `delta ${gain >= 0 ? 'up' : 'down'}` }, `${gain >= 0 ? '+' : '−'}${money(Math.abs(E.round2(gain)))}`)),
      lines.length ? h('ul', { class: 'money-lines' }, ...lines.map(([t, v, c]) => h('li', {}, h('span', {}, t), h('b', { class: c }, v)))) : null,
      h('div', { class: 'movers' },
        h('div', {}, h('h4', {}, 'Best this year'), h('ul', {}, ...movers.slice(0, 3).map(moverRow))),
        h('div', {}, h('h4', {}, 'Worst this year'), h('ul', {}, ...movers.slice(-3).reverse().map(moverRow))),
        mine.length ? h('div', {}, h('h4', {}, 'Your stocks'), h('ul', {}, ...mine.map(moverRow))) : null),
      r.lesson ? h('div', { class: 'lesson-card' }, h('b', {}, 'Tip'), h('p', {}, r.lesson)) : null,
      h('button', { class: 'btn primary', type: 'button', id: 'next-year-btn', onclick: () => { sound('click'); app.close(); app.nextYearStarted(); } },
        r.finished ? 'See my final score' : `Start Year ${r.year + 1} ▶`)),
  });
  setTimeout(() => moneyPop(gain, document.querySelector('.delta')), 250);
}
