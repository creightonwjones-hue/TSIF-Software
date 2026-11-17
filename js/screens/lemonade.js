// Lemonade Stand: run one shift a year and buy upgrades that grow the business.
import * as E from '../engine.js';
import { SETTINGS } from '../scenarios.js';
import { h, money, sound, toast, moneyPop } from '../ui.js';

const B = SETTINGS.business;
const SHIRTS = ['#C8664F', '#4A6A9A', '#3F7F6A', '#8C6BB1', '#D08A3A', '#2E8C8C', '#C97B9A'];

export function lemonadeScreen(app) {
  const s = app.state;
  const yearsLeft = () => SETTINGS.years - s.year + 1;
  let served = 0;

  // ---------- shift ----------
  const shiftBox = h('section', { class: 'box lemon-shift' });
  function renderShift() {
    const total = E.bizCustomers(s), price = E.bizPrice(s);
    if (E.shiftDone(s)) {
      shiftBox.replaceChildren(
        h('h2', {}, 'Today\'s shift'),
        h('p', { class: 'done-line' }, `Shift done! You earned ${money(s.biz.shifts[s.year])} this year.`),
        h('p', { class: 'hint' }, 'Come back next year for another shift. Your stand is closed until then.'),
        stats());
      return;
    }
    const queue = h('div', { class: 'queue', 'aria-label': `${total - served} customers waiting` },
      ...Array.from({ length: total - served }, (_, i) => h('i', { class: 'customer', style: `--shirt:${SHIRTS[(served + i) % SHIRTS.length]}` })));
    const serve = h('button', { class: 'btn primary big serve', type: 'button', id: 'serve-btn', onclick: () => {
      served += 1;
      sound('coin');
      moneyPop(price, shiftBox.querySelector('.queue'));
      if (served >= total) finish(); else renderShift();
    } }, 'Serve a customer');
    shiftBox.replaceChildren(
      h('h2', {}, 'Today\'s shift'),
      h('p', { class: 'hint' }, `Click to serve each customer in line. Each one pays ${money(price)}.`),
      queue,
      h('div', { class: 'shift-count' }, h('span', {}, `Served ${served} of ${total}`), h('b', {}, `Earned ${money(served * price)}`)),
      h('div', { class: 'btn-row' }, serve,
        served > 0 ? h('button', { class: 'btn', type: 'button', onclick: finish }, 'Close up early') : null),
      stats());
    serve.focus({ preventScroll: true });
  }
  function finish() {
    const r = E.runShift(s, served);
    if (app.act(r, 'tada')) {
      toast(`Shift done: +${money(r.earned)}`);
      app.lessonOnce('shift', 'This is income: money you earn by working. Cash doesn\'t grow on its own — investing it is what makes it grow.');
    }
    renderShift();
  }
  function stats() {
    return h('div', { class: 'biz-stats' },
      h('div', {}, h('small', {}, 'Each shift'), h('b', {}, `${E.bizCustomers(s)} × ${money(E.bizPrice(s))} = ${money(E.bizCustomers(s) * E.bizPrice(s))}`)),
      h('div', {}, h('small', {}, 'Helper, every year'), h('b', {}, E.bizYearly(s) ? `+${money(E.bizYearly(s))}` : '—')),
      h('div', {}, h('small', {}, 'Earned so far'), h('b', {}, money(Object.values(s.biz.shifts).reduce((a, b) => a + b, 0)))));
  }

  // ---------- upgrades ----------
  const upBox = h('section', { class: 'box lemon-upgrades' });
  function gainPerYear(u) {
    if (u.price) return u.price * E.bizCustomers(s);
    if (u.customers) return u.customers * E.bizPrice(s);
    return u.yearly || 0;
  }
  function renderUpgrades() {
    upBox.replaceChildren(
      h('h2', {}, 'Grow your business'),
      h('p', { class: 'hint' }, 'Upgrades cost money now and earn more every year after. Worth it if they pay for themselves before the game ends.'),
      ...B.upgrades.map((u) => {
        const owned = !!s.biz.owned[u.id];
        const gain = gainPerYear(u);
        const payback = gain ? Math.ceil(u.cost / gain) : Infinity;
        const left = yearsLeft();
        return h('div', { class: `upgrade ${owned ? 'owned' : ''}` },
          h('div', { class: 'up-main' },
            h('b', {}, u.name),
            h('p', {}, u.desc),
            owned
              ? h('small', { class: 'up-tag' }, `Bought in Year ${s.biz.owned[u.id]}`)
              : h('small', { class: payback <= left ? 'good' : 'bad' },
                `Earns about ${money(gain)} a year · pays for itself in ~${payback} year${payback === 1 ? '' : 's'} (${left} left)`)),
          owned ? h('span', { class: 'chip owned-chip' }, 'Owned')
            : h('button', { class: 'btn', type: 'button', onclick: () => {
              if (app.act(E.buyUpgrade(s, u.id))) {
                toast(`Bought: ${u.name}`);
                app.lessonOnce('upgrade', 'Spending money to grow a business is investing too. It\'s worth it when the extra earnings add up to more than it cost.');
              }
            } }, `Buy ${money(u.cost)}`));
      }));
  }

  app.screenRefresh = () => { renderUpgrades(); if (E.shiftDone(s)) renderShift(); };
  app.open({ title: 'Lemonade Stand', theme: 'lemonade', body: h('div', { class: 'two-col' }, shiftBox, upBox) });
  renderShift();
  renderUpgrades();
}
