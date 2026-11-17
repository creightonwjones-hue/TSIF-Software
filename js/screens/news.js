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
      h('h2', {}, `Year ${s.year} of ${SETTINGS.years}`),
      h('div', { class: 'paper' },
        h('small', { class: 'paper-head' }, 'The Sprout City Times'),
        h('p', { class: 'headline' }, ev.headline)),
      ev.tip ? h('p', { class: 'tip-teaser' }, 'Someone left a hot tip at the News Stand…') : null,
      h('p', { class: 'hint' }, 'Visit the Bank, the Stock Exchange and your Lemonade Stand. When you\'re done, walk Home to end the year.'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => { sound('click'); app.close(); } }, 'Start the year ▶')),
  });
}

export function newsScreen(app) {
  const s = app.state;
  const sc = getScenario(s.scenarioId);
  const ev = sc.years[s.year - 1];
  const past = sc.years.slice(0, s.year - 1).map((y, i) => ({ ...y, n: i + 1 })).reverse();
  app.open({
    title: 'News Stand', theme: 'news',
    body: h('div', { class: 'news' },
      h('div', { class: 'paper big-paper' },
        h('small', { class: 'paper-head' }, `The Sprout City Times · Year ${s.year}`),
        h('p', { class: 'headline' }, ev.headline),
        h('p', { class: 'hint' }, 'Think: which companies does this help? Which does it hurt?')),
      ev.tip ? h('div', { class: 'tip-note' },
        h('b', { class: 'tip-label' }, 'Hot tip from @totally_legit_investor'),
        h('p', {}, ev.tip),
        h('small', {}, 'Fact or hype? Your call.')) : null,
      past.length ? h('div', { class: 'past' },
        h('h2', {}, 'Past headlines'),
        ...past.map((y) => h('div', { class: 'past-item' },
          h('b', {}, `Year ${y.n}`),
          h('p', {}, y.headline),
          h('p', { class: 'what-happened' }, `→ ${y.outcome}`)))) : null),
  });
}
