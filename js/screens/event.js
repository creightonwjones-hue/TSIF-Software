// "Life happens!" card: surprise money in, or a bill you have to pay.
import { STOCKS, BONDS } from '../scenarios.js';
import { h, money, sound } from '../ui.js';

export function eventCard(app, ev) {
  const names = Object.fromEntries([...STOCKS, ...BONDS].map((x) => [x.id, x]));
  const good = ev.amount >= 0;
  const forced = ev.sold.length > 0 || ev.loan > 0;
  sound(good ? 'tada' : 'bad');
  const lines = [];
  if (!good) {
    if (ev.fromCash) lines.push(['Paid from your cash', money(ev.fromCash)]);
    if (ev.fromSavings) lines.push(['Paid from your savings', money(ev.fromSavings)]);
    for (const s of ev.sold) lines.push([`Had to sell ${s.qty} ${s.kind === 'bond' ? 'bond' : 'share'}${s.qty === 1 ? '' : 's'} of ${names[s.id].name}`, money(s.amount)]);
    if (ev.loan) lines.push(['Emergency loan from the bank', money(ev.loan)]);
  }
  const tip = good ? 'Nice! Will you save it, invest it, or spend it?'
    : forced ? 'You didn\'t have enough cash or savings, so the game had to sell your investments or borrow. That\'s why people keep an emergency fund — money set aside for surprises.'
      : 'Good thing you had money set aside! That\'s an emergency fund doing its job.';
  app.open({
    modal: true, theme: 'event',
    body: h('div', { class: 'event-card' },
      h('small', { class: 'paper-head' }, 'Life happens!'),
      h('p', { class: 'event-text' }, ev.text),
      h('div', { class: `event-amount ${good ? 'up' : 'down'}` }, `${good ? '+' : '−'}${money(Math.abs(ev.amount))}`),
      lines.length ? h('ul', { class: 'money-lines' }, ...lines.map(([t, v]) => h('li', {}, h('span', {}, t), h('b', {}, v)))) : null,
      h('div', { class: `lesson-card ${forced ? 'warn' : ''}` }, h('b', {}, 'Tip'), h('p', {}, tip)),
      h('button', { class: 'btn primary', type: 'button', onclick: () => { sound('click'); app.close(); } }, 'OK')),
  });
}
