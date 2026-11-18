// The Shop: "wants". Hats, rides and treats are fun — but the money is spent, not invested.
// Each card shows what that money could grow into instead (opportunity cost).
import * as E from '../engine.js';
import { SETTINGS } from '../scenarios.js';
import { h, money, sound, toast, confetti } from '../ui.js';
import { drawPerson } from '../town.js';

const TABS = [['hat', 'Style'], ['ride', 'Rides'], ['treat', 'Treats']];
const ICON = { cap: '🧢', beanie: '🧶', shades: '🕶️', tophat: '🎩', crown: '👑', scooter: '🛴', bike: '🚲', icecream: '🍦', videogame: '🎮', concert: '🎤' };

export function shopScreen(app) {
  const s = app.state;
  E.ensureExtras(s);
  let tab = 'hat';
  const yearsLeft = () => Math.max(0, SETTINGS.years - s.year + 1);
  const couldBe = (price) => price * (1 + SETTINGS.wantsGrowth) ** yearsLeft();

  // a little preview of you in your current look
  const SC = 6, PW = 32, PH = 34;
  const preview = h('canvas', { class: 'shop-preview', width: PW * SC, height: PH * SC, 'aria-label': 'Your character' });
  let treatShown = null;
  function drawPreview() {
    const g = preview.getContext('2d');
    g.setTransform(SC, 0, 0, SC, 0, 0); g.imageSmoothingEnabled = false;
    g.fillStyle = '#E8F1E0'; g.fillRect(0, 0, PW, PH);
    g.fillStyle = '#9E978C'; g.fillRect(0, PH - 8, PW, 8);
    drawPerson(g, PW / 2, PH - 6, 'down', 0, app.color(), undefined, false, { hat: s.wants.hat, ride: s.wants.ride });
    if (treatShown) { g.setTransform(1, 0, 0, 1, 0, 0); g.font = `${8 * SC}px serif`; g.textAlign = 'center'; g.fillText(ICON[treatShown], (PW - 6) * SC, 10 * SC); }
  }

  const list = h('section', { class: 'box shop-list' });
  const side = h('section', { class: 'box shop-side' });

  function buy(item) {
    const r = E.buyWant(s, item.id);
    if (!app.act(r, 'coin')) return;
    toast(`${ICON[item.id]} ${item.name}: −${money(item.price)}`);
    if (item.kind === 'treat') {
      treatShown = item.id;
      if (item.id === 'concert') confetti(80);
      setTimeout(() => { treatShown = null; drawPreview(); }, 2500);
    }
    app.lessonOnce('wants', 'That was a WANT — fun, but the money is gone. A little fun money is part of a healthy budget. Just remember: money spent can\'t grow.');
  }

  function card(item) {
    const owned = item.kind !== 'treat' && E.ownsWant(s, item.id);
    const hadToday = item.kind === 'treat' && E.treatBoughtThisYear(s, item.id);
    const wearing = item.kind === 'hat' && s.wants.hat === item.id;
    let action;
    if (item.kind === 'hat' && owned) {
      action = h('button', { class: `btn ${wearing ? '' : 'primary'}`, type: 'button', onclick: () => { app.act(E.wearHat(s, wearing ? null : item.id), 'click'); } }, wearing ? 'Take off' : 'Wear');
    } else if (owned) action = h('span', { class: 'chip owned-chip' }, s.wants.ride === item.id ? 'Riding' : 'Owned');
    else if (hadToday) action = h('span', { class: 'chip owned-chip' }, 'Had one this year');
    else action = h('button', { class: 'btn', type: 'button', 'data-buy': item.id, disabled: s.cash < item.price || s.finished, onclick: () => buy(item) }, `Buy ${money(item.price)}`);
    return h('div', { class: `shop-item ${owned ? 'owned' : ''}` },
      h('span', { class: 'shop-icon', 'aria-hidden': 'true' }, ICON[item.id]),
      h('div', { class: 'shop-main' },
        h('b', {}, item.name, ' ', h('span', { class: 'want-tag' }, 'Want')),
        h('p', {}, item.desc),
        owned || hadToday ? null : h('small', { class: 'opp' }, `Invested instead, ${money(item.price)} could grow to about ${money(Math.round(couldBe(item.price)))} by the end of the game.`)),
      action);
  }

  function render() {
    list.replaceChildren(
      h('div', { class: 'tabs', role: 'tablist' }, ...TABS.map(([id, label]) =>
        h('button', { class: `tab ${tab === id ? 'on' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(tab === id), onclick: () => { tab = id; sound('click'); render(); } }, label))),
      h('p', { class: 'hint' }, tab === 'hat' ? 'Buy a hat once, then switch any time for free.'
        : tab === 'ride' ? 'Rides get you around town faster. Your fastest ride is the one you use.'
          : 'Treats are one-time fun. Each one can be bought once a year.'),
      ...SETTINGS.shop.filter((i) => i.kind === tab).map(card));
    const spent = E.wantsSpent(s), opp = E.opportunityCost(s);
    side.replaceChildren(
      h('h2', {}, 'Your look'),
      preview,
      h('div', { class: 'shift-count' }, h('span', {}, 'Cash'), h('b', {}, money(s.cash))),
      h('div', { class: 'shift-count' }, h('span', {}, 'Spent on wants'), h('b', {}, money(spent))),
      spent > 0 ? h('p', { class: 'hint' }, opp > spent
        ? `If that ${money(spent)} had gone into the Sprout City Index instead, it would be worth ${money(opp)} today.`
        : `Money invested has years to grow. Money spent on wants doesn't.`) : null,
      h('div', { class: 'mine-rules' },
        h('p', {}, h('b', {}, 'Needs vs. wants. '), 'Needs are things you must have (food, a home). Wants are extras. Wants are fine in a budget — but money you spend can\'t grow.'),
        h('p', {}, h('b', {}, 'Tip: '), 'spend a little on fun, invest the rest. Spending 10% or less of your work money on wants earns an achievement!')));
    drawPreview();
  }

  app.screenRefresh = render;
  app.open({ title: 'Shop', theme: 'shop', body: h('div', { class: 'two-col shop' }, list, side) });
  app.lessonOnce('shopIntro', 'Welcome to the Shop! Everything here is a WANT: fun to have, but it won\'t grow your money like investing does.');
  render();
}
