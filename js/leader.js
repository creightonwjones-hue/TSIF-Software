// Club leader page: build a class link and show the year codes, one year at a time.
// Works offline — the codes come from the class key, so nothing needs a server.
import * as E from './engine.js';
import { SCENARIOS, SETTINGS } from './scenarios.js';
import { h } from './ui.js';

const KEY_ABC = 'ACDEFGHJKMNPQRTUVWXY';
const store = {
  get(k, d) { try { const v = localStorage.getItem(`sprout-leader-${k}`); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`sprout-leader-${k}`, JSON.stringify(v)); } catch { /* fine without */ } },
};
const newKey = () => Array.from({ length: 3 }, () => KEY_ABC[Math.floor(Math.random() * KEY_ABC.length)]).join('');

let opts = store.get('opts', { game: 1, skipTutorial: true, codes: true });
let key = store.get('key', null) || newKey();
let year = store.get('year', 1);
let showAll = false;
store.set('key', key);

const root = document.getElementById('leader');
const gameUrl = () => {
  const u = new URL('./', location.href);
  u.search = '';
  u.searchParams.set('game', opts.game);
  u.searchParams.set('class', key);
  if (opts.skipTutorial) u.searchParams.set('tutorial', 'off');
  if (!opts.codes) u.searchParams.set('codes', 'off');
  return u.toString();
};
const save = () => { store.set('opts', opts); store.set('key', key); store.set('year', year); render(); };

function render() {
  const link = gameUrl();
  const linkBox = h('input', { class: 'leader-url', readonly: true, value: link, id: 'class-link', onclick: (e) => e.target.select() });
  const copied = h('span', { class: 'hint', 'aria-live': 'polite' });
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { linkBox.select(); document.execCommand?.('copy'); }
    copied.textContent = ' Copied!';
  };
  const check = (label, prop, note) => h('label', { class: 'leader-check' },
    h('input', { type: 'checkbox', checked: opts[prop], onchange: (e) => { opts[prop] = e.target.checked; save(); } }), ' ', label, note ? h('small', {}, ` — ${note}`) : null);

  root.replaceChildren(
    h('header', { class: 'leader-head' }, h('small', {}, 'TSIF Club'), h('h1', {}, 'Sprout City — Club leader'),
      h('p', { class: 'hint' }, 'Make one link for your class, post it (for example in Google Classroom), then read out each year\'s code when everyone is ready.')),
    h('section', { class: 'box leader-box' },
      h('h2', {}, '1. Your class link'),
      h('div', { class: 'field' }, h('label', { for: 'leader-game' }, 'Game'),
        h('select', { id: 'leader-game', onchange: (e) => { opts.game = Number(e.target.value); save(); } },
          ...SCENARIOS.map((s) => h('option', { value: s.id, selected: s.id === opts.game }, `Game ${s.id} — ${s.name}`)))),
      check('Skip the walking tutorial', 'skipTutorial', 'good if you explain the town yourself'),
      check('Year codes: the class moves together', 'codes', 'kids need your code to end each year'),
      h('div', { class: 'leader-link-row' }, linkBox, h('button', { class: 'btn primary', type: 'button', onclick: copy }, 'Copy link'), copied),
      h('p', { class: 'hint' }, 'Class key: ', h('b', {}, key), '. Codes depend on this key, so a new key means new codes. ',
        h('button', { class: 'btn small', type: 'button', onclick: () => { if (confirm('Make a new class key? Links and codes you already shared will stop matching.')) { key = newKey(); year = 1; save(); } } }, 'New key'))),
    opts.codes ? h('section', { class: 'box leader-box' },
      h('h2', {}, '2. Year codes'),
      h('p', { class: 'hint' }, 'When the whole class is ready to end a year, show or read out that year\'s code. They type it at Home to go to sleep.'),
      h('div', { class: 'year-code-show' },
        h('button', { class: 'btn', type: 'button', disabled: year <= 1, onclick: () => { year -= 1; save(); } }, '◀'),
        h('div', { class: 'year-code-big' }, h('small', {}, year === SETTINGS.years ? `Year ${year} (final)` : `Year ${year}`), h('b', { id: 'code-now' }, E.yearCode(key, year))),
        h('button', { class: 'btn primary', type: 'button', disabled: year >= SETTINGS.years, onclick: () => { year += 1; save(); } }, 'Next year ▶')),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn small', type: 'button', onclick: () => { showAll = !showAll; render(); } }, showAll ? 'Hide full list' : 'Show all 10 codes'),
        h('button', { class: 'btn small', type: 'button', onclick: () => { showAll = true; render(); setTimeout(() => window.print(), 50); } }, 'Print codes')),
      showAll ? h('ol', { class: 'code-list' }, ...Array.from({ length: SETTINGS.years }, (_, i) => h('li', {}, h('span', {}, `Year ${i + 1}`), h('b', {}, E.yearCode(key, i + 1))))) : null)
      : null,
    h('p', { class: 'hint leader-foot' }, h('a', { href: link }, 'Open the game with this link'), ' · Kids who already started without the link keep playing normally.'));
}
render();
