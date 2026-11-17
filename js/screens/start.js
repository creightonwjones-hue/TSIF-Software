import * as E from '../engine.js';
import { SCENARIOS, SETTINGS } from '../scenarios.js';
import { h, money, sound } from '../ui.js';

const AVATARS = ['🦊', '🐺', '🐯', '🦅', '🐉', '🦈', '🤖', '👾'];

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

  const nameInput = h('input', { id: 'nickname', maxlength: 14, placeholder: 'Nickname (not your full name)', autocomplete: 'off', 'aria-label': 'Nickname' });
  const warn = h('p', { class: 'form-warn', role: 'alert' });

  const scenarioSelect = h('select', { id: 'scenario', 'aria-label': 'Scenario', onchange: (e) => { scenarioId = Number(e.target.value); } },
    ...SCENARIOS.map((s) => h('option', { value: s.id, selected: s.id === scenarioId }, `GAME ${s.id} · ${s.name}`)));

  const go = () => {
    const nick = nameInput.value.trim();
    if (!nick) { warn.textContent = 'Enter a nickname to start.'; nameInput.focus(); sound('bad'); return; }
    sound('tada');
    app.clearSave();
    app.close();
    app.startGame(E.createGame(scenarioId, nick, avatar));
  };
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

  const resume = saved?.state ? h('div', { class: 'resume' },
    h('p', {}, `${saved.state.avatar} ${saved.state.nickname} · `,
      saved.state.finished ? 'game complete' : `saved on Year ${saved.state.year}`),
    h('button', { class: 'btn primary', type: 'button', onclick: () => {
      sound('tada'); app.close(); app.startGame(saved.state, saved.tutorial ?? 3, saved.seen || []);
    } }, saved.state.finished ? 'VIEW SCORE' : 'CONTINUE ▶')) : null;

  app.open({
    modal: true, closable: false, theme: 'start',
    body: h('div', { class: 'start' },
      h('div', { class: 'logo' }, h('small', { class: 'logo-kicker' }, 'TSIF CLUB PRESENTS'), h('h1', {}, 'SPROUT', h('span', {}, 'CITY'))),
      h('p', { class: 'tagline' }, `${money(SETTINGS.startingCash)}. ${SETTINGS.years} years. Build your fortune.`),
      resume,
      h('label', { class: 'field-label' }, 'CHOOSE YOUR PLAYER'), avatarRow,
      h('label', { class: 'field-label', for: 'nickname' }, 'PLAYER NAME'), nameInput, warn,
      h('label', { class: 'field-label', for: 'scenario' }, 'GAME ', h('small', {}, '· your club leader will tell you which')), scenarioSelect,
      h('button', { class: 'btn primary big', type: 'button', id: 'start-btn', onclick: go }, 'START ▶')),
  });
  nameInput.focus();
}
