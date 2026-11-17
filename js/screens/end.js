import * as E from '../engine.js';
import { SETTINGS } from '../scenarios.js';
import { h, money, sound, confetti, worthChart } from '../ui.js';

function recap(s, awards) {
  const sc = E.getScenario(s.scenarioId);
  const got = Object.fromEntries(awards.map((a) => [a.id, a.earned]));
  const lines = [];
  lines.push(got.diversified
    ? '🧺 You spread your money across lots of investments. That\'s diversification!'
    : '🧺 Next time, try spreading your money across more investments (the Whole City Basket makes it easy).');
  const hold = sc.crash?.holdYear;
  const soldInCrash = s.log.some((e) => e.type === 'sell' && e.year === hold);
  if (got.steady) lines.push('💎 When prices crashed, you stayed calm and waited. Smart!');
  else if (soldInCrash) lines.push('😬 You sold after the crash — prices bounced back later. Patience pays!');
  else lines.push('📈 You didn\'t own stocks during the crash. Stocks are risky, but over 10 years they usually grew.');
  if (sc.rumor) {
    lines.push(got.rumor
      ? '🕵️ You didn\'t fall for the hot tip. It was just hype!'
      : '📣 That hot tip was just hype. Always check the facts before you buy!');
  }
  const borrowed = s.log.some((e) => e.type === 'borrow');
  if (borrowed) {
    const interest = E.round2(s.log.filter((e) => e.type === 'repay').reduce((t, e) => t + e.amount, 0) + s.debt
      - s.log.filter((e) => e.type === 'borrow').reduce((t, e) => t + e.amount, 0));
    lines.push(`💳 Your loan cost you ${money(Math.max(0, interest))} in interest.`);
  }
  return lines.slice(0, 4);
}

export function endScreen(app) {
  const s = app.state;
  const sc = E.getScenario(s.scenarioId);
  const worth = E.netWorth(s);
  const growth = worth / SETTINGS.startingCash - 1;
  const awards = E.computeAwards(s);
  app.town?.pause();
  sound('tada');
  confetti(160);
  app.open({
    modal: true, closable: false, theme: 'end',
    body: h('div', { class: 'end' },
      h('div', { class: 'end-top' },
        h('div', { class: 'end-who' }, h('span', { class: 'end-avatar' }, s.avatar), h('b', {}, s.nickname), h('small', {}, `Game ${sc.id}: ${sc.name}`)),
        h('div', { class: 'end-score' },
          h('small', {}, `After ${SETTINGS.years} years, your net worth is`),
          h('div', { class: 'final-num', id: 'final-score' }, money(worth)),
          h('div', { class: `growth ${growth >= 0 ? 'up' : 'down'}` },
            `${growth >= 0 ? '▲' : '▼'} ${growth >= 0 ? '+' : ''}${Math.round(growth * 100)}% from ${money(SETTINGS.startingCash)}`))),
      h('p', { class: 'show-leader' }, '🙋 Show this screen to your club leader! The biggest net worth wins 🏆 Top Grower.'),
      h('div', { class: 'end-grid' },
        h('section', { class: 'card' }, h('h3', {}, '📊 Your 10 years'), worthChart(s.history, sc.crash?.year)),
        h('section', { class: 'card' }, h('h3', {}, '🏅 Your awards'),
          h('div', { class: 'awards' }, ...awards.map((a) => h('div', { class: `award ${a.earned ? 'earned' : 'locked'}` },
            h('span', { class: 'award-emoji' }, a.earned ? a.emoji : '🔒'),
            h('div', {}, h('b', {}, a.name), h('small', {}, a.desc))))))),
      h('section', { class: 'card recap' }, h('h3', {}, '🧠 What you learned'),
        h('ul', {}, ...recap(s, awards).map((l) => h('li', {}, l)))),
      h('button', { class: 'btn big', onclick: () => {
        if (confirm('Start a brand new game? Your score will be erased.')) app.playAgain();
      } }, '🔄 Play again')),
  });
}
