import * as E from '../engine.js';
import { SCENARIOS, SETTINGS } from '../scenarios.js';
import { h, money, sound } from '../ui.js';

// Player colors (the little figure that walks around town)
const COLORS = [
  ['#3E7AB8', 'Blue'], ['#C8503E', 'Red'], ['#3F8A4F', 'Green'], ['#E0A62E', 'Gold'],
  ['#8C6BB1', 'Purple'], ['#2E8C8C', 'Teal'], ['#3D4A5A', 'Slate'], ['#D47AA0', 'Pink'],
];

export function showStart(app) {
  const saved = app.loadSave();
  const params = new URLSearchParams(location.search);
  let color = COLORS[0][0];
  let scenarioId = Number(params.get('scenario')) || 1;

  const colorRow = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Pick your color' });
  COLORS.forEach(([c, name], i) => {
    const b = h('button', { class: `swatch ${i === 0 ? 'picked' : ''}`, type: 'button', role: 'radio', title: name, 'aria-label': name,
      'aria-checked': i === 0 ? 'true' : 'false', style: `--c:${c}`,
      onclick: () => {
        sound('click'); color = c;
        colorRow.querySelectorAll('.swatch').forEach((x) => { x.classList.remove('picked'); x.setAttribute('aria-checked', 'false'); });
        b.classList.add('picked'); b.setAttribute('aria-checked', 'true');
      } }, h('i'));
    colorRow.append(b);
  });

  const nameInput = h('input', { id: 'nickname', maxlength: 14, placeholder: 'A nickname, not your full name', autocomplete: 'off', 'aria-label': 'Nickname' });
  const warn = h('p', { class: 'form-warn', role: 'alert' });
  const scenarioSelect = h('select', { id: 'scenario', 'aria-label': 'Game', onchange: (e) => { scenarioId = Number(e.target.value); } },
    ...SCENARIOS.map((s) => h('option', { value: s.id, selected: s.id === scenarioId }, `Game ${s.id} — ${s.name}`)));

  const go = () => {
    const nick = nameInput.value.trim();
    if (!nick) { warn.textContent = 'Enter a nickname to start.'; nameInput.focus(); sound('bad'); return; }
    sound('tada');
    app.clearSave();
    app.close();
    app.startGame(E.createGame(scenarioId, nick, color));
  };
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

  const resume = saved?.state ? h('div', { class: 'resume' },
    h('p', {}, h('b', {}, saved.state.nickname), saved.state.finished ? ' — game complete' : ` — saved in Year ${saved.state.year}`),
    h('button', { class: 'btn primary small', type: 'button', onclick: () => {
      sound('tada'); app.close(); app.startGame(saved.state, saved.tutorial ?? 3, saved.seen || []);
    } }, saved.state.finished ? 'View score' : 'Continue')) : null;

  app.open({
    modal: true, closable: false, theme: 'start',
    body: h('div', { class: 'start' },
      h('div', { class: 'start-brand' },
        h('small', {}, 'TSIF Club'),
        h('h1', {}, 'Sprout City'),
        h('p', { class: 'tagline' }, `Start with ${money(SETTINGS.startingCash)}. You have ${SETTINGS.years} years to grow it.`)),
      resume,
      h('div', { class: 'field' }, h('label', { for: 'nickname' }, 'Nickname'), nameInput, warn),
      h('div', { class: 'field' }, h('label', {}, 'Shirt color'), colorRow),
      h('div', { class: 'field' }, h('label', { for: 'scenario' }, 'Game ', h('small', {}, '— your club leader will tell you which')), scenarioSelect),
      h('button', { class: 'btn primary big', type: 'button', id: 'start-btn', onclick: go }, 'Start game ▶')),
  });
  nameInput.focus();
}
