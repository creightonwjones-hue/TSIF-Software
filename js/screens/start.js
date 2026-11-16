import * as E from '../engine.js';
import { SCENARIOS, SETTINGS } from '../scenarios.js';
import { h, money, sound } from '../ui.js';

const AVATARS = ['🦊', '🐸', '🐼', '🐯', '🐵', '🐧', '🐰', '🦄'];

export function showStart(app) {
  const saved = app.loadSave();
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get('scenario');
  let avatar = AVATARS[0];
  let scenarioId = Number(fromUrl) || 1;

  const avatarRow = h('div', { class: 'avatars', role: 'radiogroup', 'aria-label': 'Pick your character' });
  AVATARS.forEach((a, i) => {
    const b = h('button', { class: `avatar-btn ${i === 0 ? 'picked' : ''}`, type: 'button', role: 'radio', 'aria-checked': i === 0 ? 'true' : 'false',
      onclick: () => {
        sound('click'); avatar = a;
        avatarRow.querySelectorAll('.avatar-btn').forEach((x) => { x.classList.remove('picked'); x.setAttribute('aria-checked', 'false'); });
        b.classList.add('picked'); b.setAttribute('aria-checked', 'true');
      } }, a);
    avatarRow.append(b);
  });

  const nameInput = h('input', { id: 'nickname', maxlength: 14, placeholder: 'Your nickname', autocomplete: 'off', 'aria-label': 'Nickname' });
  const warn = h('p', { class: 'form-warn', role: 'alert' });

  const scenarioSelect = h('select', { id: 'scenario', 'aria-label': 'Scenario', onchange: (e) => { scenarioId = Number(e.target.value); } },
    ...SCENARIOS.map((s) => h('option', { value: s.id, selected: s.id === scenarioId }, `Game ${s.id}: ${s.name}`)));

  const go = () => {
    const nick = nameInput.value.trim();
    if (!nick) { warn.textContent = '✏️ Type a nickname first (not your real full name!)'; nameInput.focus(); sound('bad'); return; }
    sound('tada');
    app.clearSave();
    app.close();
    app.startGame(E.createGame(scenarioId, nick, avatar));
  };
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

  const resume = saved?.state ? h('div', { class: 'resume' },
    h('p', {}, `Welcome back, ${saved.state.avatar} ${saved.state.nickname}! `,
      saved.state.finished ? 'Your game is finished.' : `You were on Year ${saved.state.year}.`),
    h('button', { class: 'btn primary', type: 'button', onclick: () => {
      sound('tada'); app.close(); app.startGame(saved.state, saved.tutorial ?? 3, saved.seen || []);
    } }, saved.state.finished ? '🏆 See my results' : '▶ Keep playing')) : null;

  app.open({
    modal: true, closable: false, theme: 'start',
    body: h('div', { class: 'start' },
      h('div', { class: 'logo' }, h('span', { class: 'logo-sprout' }, '🌱'), h('h1', {}, 'Sprout City')),
      h('p', { class: 'tagline' }, `You have ${money(SETTINGS.startingCash)} and ${SETTINGS.years} years. How much can you grow it?`),
      resume,
      h('label', { class: 'field-label' }, '1. Pick your character'), avatarRow,
      h('label', { class: 'field-label', for: 'nickname' }, '2. Type a nickname'), nameInput, warn,
      h('label', { class: 'field-label', for: 'scenario' }, '3. Which game? ', h('small', {}, '(your club leader will tell you)')), scenarioSelect,
      h('button', { class: 'btn primary big', type: 'button', id: 'start-btn', onclick: go }, '🚀 Let\'s go!')),
  });
  nameInput.focus();
}
