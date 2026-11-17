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
      h('div', { class: 'year-big' }, h('small', {}, 'YEAR'), `${String(s.year).padStart(2, '0')}`, h('span', { class: 'of' }, `/${SETTINGS.years}`)),
      h('div', { class: 'paper' },
        h('div', { class: 'paper-head' }, h('span', { class: 'live-dot' }), 'SPROUT CITY NEWS'),
        h('p', { class: 'headline' }, ev.headline)),
      ev.tip ? h('p', { class: 'tip-teaser' }, '📣 A hot tip is going around — check the News Stand.') : null,
      h('p', { class: 'hint' }, 'Make your moves at the 🏦 Bank and 📈 Exchange, then hit the 🕰️ Town Clock.'),
      h('button', { class: 'btn primary big', onclick: () => { sound('click'); app.close(); } }, 'PLAY ▶')),
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
        h('div', { class: 'paper-head' }, h('span', { class: 'live-dot' }), `SPROUT CITY NEWS · YEAR ${s.year}`),
        h('p', { class: 'headline' }, ev.headline),
        h('p', { class: 'hint' }, 'Think: which companies does this help? Which does it hurt?')),
      ev.tip ? h('div', { class: 'tip-note' },
        h('div', { class: 'tip-label' }, '📣 HOT TIP · @totally_legit_investor'),
        h('p', {}, ev.tip),
        h('small', {}, 'Fact or hype? Your call.')) : null,
      past.length ? h('div', { class: 'past' },
        h('h3', {}, 'PAST HEADLINES'),
        ...past.map((y) => h('div', { class: 'past-item' },
          h('b', {}, `Year ${y.n}`),
          h('p', {}, y.headline),
          h('p', { class: 'what-happened' }, `→ ${y.outcome}`)))) : null),
  });
}
