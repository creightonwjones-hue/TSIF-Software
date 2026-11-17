// The Mine: one shift a year. Tap rocks to break them (10 swings). Rocks with ore show a hint.
import * as E from '../engine.js';
import { SETTINGS } from '../scenarios.js';
import { h, money, sound, toast } from '../ui.js';

const M = SETTINGS.mine;
const ORE_LOOK = {
  coal:   { name: 'Coal',   color: '#2E2A26', glint: '#4A443E' },
  silver: { name: 'Silver', color: '#C9CED6', glint: '#FFFFFF' },
  gold:   { name: 'Gold',   color: '#F2D45C', glint: '#FFF4B0' },
};

// Draw one rock (or the broken rubble with its ore) on a tiny pixel canvas.
function rockCanvas(kind, idx, broken) {
  const cv = document.createElement('canvas');
  cv.width = 32; cv.height = 32;
  const c = cv.getContext('2d');
  const R = (x, y, w, hh, col) => { c.fillStyle = col; c.fillRect(x, y, w, hh); };
  let seed = idx * 97 + 13;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  if (broken) {
    R(0, 20, 32, 12, '#3A332C');
    for (let i = 0; i < 9; i++) R(Math.floor(rnd() * 28), 18 + Math.floor(rnd() * 10), 4, 3, ['#7A766E', '#8D8A84', '#5E5A54'][i % 3]);
    if (ORE_LOOK[kind]) {
      const o = ORE_LOOK[kind];
      R(10, 10, 12, 10, '#26313F'); R(11, 11, 10, 8, o.color); R(12, 12, 3, 2, o.glint); R(14, 9, 6, 2, '#26313F'); R(15, 10, 4, 1, o.color);
    } else { R(9, 16, 14, 4, '#6B5A48'); R(11, 14, 8, 3, '#7A6A56'); }
    return cv;
  }
  // a chunky boulder
  R(3, 6, 26, 24, '#26313F'); R(1, 9, 30, 18, '#26313F');
  R(4, 7, 24, 22, '#8D8A84'); R(2, 10, 28, 16, '#8D8A84');
  R(5, 8, 16, 6, '#A9A6A0'); R(6, 8, 6, 2, '#C9C6C0'); R(4, 24, 24, 5, '#7A766E');
  for (let i = 0; i < 5; i++) R(4 + Math.floor(rnd() * 22), 12 + Math.floor(rnd() * 12), 3, 1, '#6E6A64'); // cracks
  // hints: specks of what's inside (gold shows the most)
  const o = ORE_LOOK[kind];
  if (o) {
    const n = kind === 'gold' ? 5 : kind === 'silver' ? 4 : 3;
    for (let i = 0; i < n; i++) { const x = 6 + Math.floor(rnd() * 20), y = 11 + Math.floor(rnd() * 13); R(x, y, 2, 2, o.color); if (kind !== 'coal') R(x, y, 1, 1, o.glint); }
  }
  return cv;
}

export function mineScreen(app) {
  const s = app.state;
  const layout = E.mineLayout(s);
  const picks = [];
  const board = h('div', { class: 'mine-board', style: `--cols:${M.cols}` });
  const side = h('section', { class: 'box mine-side' });

  function renderBoard() {
    const done = E.mineDone(s);
    board.replaceChildren(...layout.map((kind, i) => {
      const broken = picks.includes(i);
      const ore = M.ore[kind];
      const btn = h('button', {
        class: `rock ${broken ? 'broken' : ''} ${!broken && (kind === 'gold' || kind === 'silver') ? `hint-${kind}` : ''}`,
        type: 'button', disabled: broken || done || picks.length >= M.swings, 'aria-label': broken ? `Broken rock: ${ore ? kind : 'dirt'}` : 'Rock',
        onclick: () => swing(i, btn) },
        rockCanvas(kind, i, broken),
        broken ? h('span', { class: `rock-tag ${ore ? 'good' : ''}` }, ore ? `+${money(ore.value)}` : 'dirt') : null);
      return btn;
    }));
  }

  function swing(i, btn) {
    if (picks.length >= M.swings || picks.includes(i) || E.mineDone(s)) return;
    picks.push(i); // lock it in right away so a double-click can't count twice
    btn.disabled = true;
    btn.classList.add('hit');
    sound(M.ore[layout[i]] ? 'coin' : 'click');
    setTimeout(() => {
      renderBoard(); renderSide();
      if (picks.length >= M.swings && !E.mineDone(s)) finish();
    }, 160);
  }

  function found() { return picks.reduce((t, i) => t + (M.ore[layout[i]]?.value || 0), 0); }

  function finish() {
    const r = E.runMine(s, picks);
    if (app.act(r, 'tada')) {
      toast(`Mine shift done: +${money(r.earned)}`);
      app.lessonOnce('mine', 'This is income: money you earn by working. Cash doesn\'t grow on its own — investing it is what makes it grow.');
    }
    renderBoard(); renderSide();
  }

  function renderSide() {
    const done = E.mineDone(s);
    const left = M.swings - picks.length;
    side.replaceChildren(...[
      h('h2', {}, 'Today\'s dig'),
      done
        ? h('p', { class: 'done-line' }, `Shift done! You earned ${money(s.mine[s.year])} this year.`)
        : h('p', { class: 'hint' }, 'Tap a rock to swing your pickaxe. Look closely — rocks with ore have specks, and gold glints the brightest.'),
      done ? h('p', { class: 'hint' }, 'The mine is closed until next year.') : null,
      !done ? h('div', { class: 'swings', 'aria-label': `${left} swings left` }, h('small', {}, 'Swings left'),
        h('div', { class: 'pick-row' }, ...Array.from({ length: M.swings }, (_, k) => h('i', { class: `pick ${k < left ? '' : 'used'}` })))) : null,
      !done ? h('div', { class: 'shift-count' }, h('span', {}, `Found so far`), h('b', {}, money(found()))) : null,
      h('div', { class: 'ore-legend' },
        ...Object.entries(M.ore).map(([k, o]) => h('div', {}, h('i', { class: 'ore-dot', style: `background:${ORE_LOOK[k].color}` }), `${ORE_LOOK[k].name}`, h('b', {}, money(o.value))))),
      !done && picks.length > 0 ? h('button', { class: 'btn primary', type: 'button', id: 'mine-finish', onclick: finish }, `Finish shift (+${money(found())})`) : null].filter(Boolean));
  }

  app.screenRefresh = () => {};
  app.open({ title: 'Mine', theme: 'mine', body: h('div', { class: 'two-col mine' }, h('section', { class: 'box mine-cave' }, board), side) });
  renderBoard();
  renderSide();
}
