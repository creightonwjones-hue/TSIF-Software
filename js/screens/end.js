import * as E from '../engine.js';
import { SETTINGS } from '../scenarios.js';
import { h, money, sound, worthChart, countUp } from '../ui.js';

function recap(s, awards) {
  const sc = E.getScenario(s.scenarioId);
  const got = Object.fromEntries(awards.map((a) => [a.id, a.earned]));
  const lines = [];
  lines.push(got.diversified
    ? 'You spread your money across lots of investments — that\'s diversification.'
    : 'Next time, spread your money across more investments. The Sprout City Index makes it easy.');
  const hold = sc.crash?.holdYear;
  const soldInCrash = s.log.some((e) => e.type === 'sell' && e.year === hold);
  if (got.steady) lines.push('When the market crashed, you held. That\'s how pros play it.');
  else if (soldInCrash) lines.push('You sold after the crash, then prices bounced back. Patience pays.');
  else lines.push('You sat out the crash. Stocks are risky, but over 10 years they usually grew.');
  if (sc.rumor) {
    lines.push(got.rumor
      ? 'You ignored the hype. The hot tip was a flop.'
      : 'That hot tip was hype. Check the facts before you buy.');
  }
  const borrowed = s.log.some((e) => e.type === 'borrow');
  if (borrowed) {
    const interest = E.round2(s.log.filter((e) => e.type === 'repay').reduce((t, e) => t + e.amount, 0) + s.debt
      - s.log.filter((e) => e.type === 'borrow').reduce((t, e) => t + e.amount, 0));
    lines.push(`Your loan cost you ${money(Math.max(0, interest))} in interest.`);
  }
  const bizTotal = Object.values(E.ensureBiz(s).shifts).reduce((a, b) => a + b, 0);
  const ups = Object.keys(s.biz.owned).length;
  if (bizTotal > 0) lines.push(`Your lemonade stand earned ${money(bizTotal)} from shifts${ups ? `, with ${ups} upgrade${ups === 1 ? '' : 's'}` : ''}.`);
  return lines.slice(0, 5);
}

export function endScreen(app) {
  const s = app.state;
  const sc = E.getScenario(s.scenarioId);
  const worth = E.netWorth(s);
  const growth = worth / SETTINGS.startingCash - 1;
  const awards = E.computeAwards(s);
  app.town?.pause();
  sound('tada');
  app.open({
    modal: true, closable: false, theme: 'end',
    body: h('div', { class: 'end' },
      h('div', { class: 'end-top' },
        h('div', { class: 'end-who' }, h('b', {}, s.nickname), h('small', {}, `Game ${sc.id} — ${sc.name}`)),
        h('div', { class: 'end-score' },
          h('small', {}, 'Final score (net worth)'),
          h('div', { class: 'final-num', id: 'final-score' }, money(worth)),
          h('div', { class: `growth ${growth >= 0 ? 'up' : 'down'}` },
            `${growth >= 0 ? '▲' : '▼'} ${growth >= 0 ? '+' : ''}${Math.round(growth * 100)}% from ${money(SETTINGS.startingCash)}`))),
      h('p', { class: 'show-leader' }, 'Show this screen to your club leader. The highest net worth wins Top Grower!'),
      h('div', { class: 'end-grid' },
        h('section', { class: 'box' }, h('h2', {}, 'Your 10 years'), worthChart(s.history, sc.crash?.year)),
        h('section', { class: 'box' }, h('h2', {}, 'Achievements ', h('small', {}, `${awards.filter((a) => a.earned).length} of ${awards.length}`)),
          h('div', { class: 'awards' }, ...awards.map((a) => h('div', { class: `award ${a.earned ? 'earned' : 'locked'}` },
            h('span', { class: 'award-mark' }, a.earned ? '★' : '☆'),
            h('div', {}, h('b', {}, a.name), h('small', {}, a.desc))))))),
      h('section', { class: 'box recap' }, h('h2', {}, 'What you learned'),
        h('ul', {}, ...recap(s, awards).map((l) => h('li', {}, l)))),
      h('button', { class: 'btn', type: 'button', onclick: () => {
        if (confirm('Start a brand new game? Your score will be erased.')) app.playAgain();
      } }, 'Play again')),
  });
  countUp(document.getElementById('final-score'), worth, 1200);
}
