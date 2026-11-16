import { getScenario } from '../engine.js';
import { SETTINGS } from '../scenarios.js';
import { h, sound } from '../ui.js';

// The headline popup at the start of each year.
export function yearNewsPopup(app) {
  const s = app.state;
  const ev = getScenario(s.scenarioId).years[s.year - 1];
  sound('bell');
  app.open({
    modal: true, theme: 'news', closable: true,
    body: h('div', { class: 'year-start' },
      h('div', { class: 'year-big' }, `Year ${s.year}`, h('small', {}, ` of ${SETTINGS.years}`)),
      h('div', { class: 'paper' },
        h('div', { class: 'paper-head' }, '📰 THE SPROUT CITY TIMES'),
        h('p', { class: 'headline' }, ev.headline)),
      ev.tip ? h('p', { class: 'tip-teaser' }, '📣 Someone left a hot tip at the News Stand…') : null,
      h('p', { class: 'hint' }, 'Visit the 🏦 Bank and 📈 Stock Exchange, then ring the 🕰️ Town Clock to end the year.'),
      h('button', { class: 'btn primary big', onclick: () => { sound('click'); app.close(); } }, 'Let\'s go! ▶')),
  });
}

export function newsScreen(app) {
  const s = app.state;
  const sc = getScenario(s.scenarioId);
  const ev = sc.years[s.year - 1];
  const past = sc.years.slice(0, s.year - 1).map((y, i) => ({ ...y, n: i + 1 })).reverse();
  app.open({
    title: 'News Stand', emoji: '📰', theme: 'news',
    body: h('div', { class: 'news' },
      h('div', { class: 'paper big-paper' },
        h('div', { class: 'paper-head' }, `📰 THE SPROUT CITY TIMES · YEAR ${s.year}`),
        h('p', { class: 'headline' }, ev.headline),
        h('p', { class: 'hint' }, '🤔 Which companies might this news help? Which might it hurt?')),
      ev.tip ? h('div', { class: 'tip-note' },
        h('div', { class: 'tip-label' }, '📣 HOT TIP!'),
        h('p', {}, ev.tip),
        h('small', {}, 'Is this a fact… or just hype? You decide.')) : null,
      past.length ? h('div', { class: 'past' },
        h('h3', {}, '🗞️ Old newspapers'),
        ...past.map((y) => h('div', { class: 'past-item' },
          h('b', {}, `Year ${y.n}`),
          h('p', {}, y.headline),
          h('p', { class: 'what-happened' }, `→ ${y.outcome}`)))) : null),
  });
}
