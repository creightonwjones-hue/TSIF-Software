// Bank: savings (safe, slow) and loans (cost money every year).
import * as E from '../engine.js';
import { SETTINGS } from '../scenarios.js';
import { h, money, amountPicker } from '../ui.js';
import { bankScene } from '../scenes.js';

export function bankScreen(app) {
  const s = app.state;
  const pctS = Math.round(SETTINGS.savingsRate * 100), pctL = Math.round(SETTINGS.loanRate * 100);

  const savBal = h('div', { class: 'big-num' });
  const savNext = h('p', { class: 'hint' });
  const savPick = amountPicker({ value: 100, step: 50, label: 'savings amount',
    quick: [{ label: 'All cash', value: () => s.cash }, { label: 'All savings', value: () => s.savings }] });

  const debtBal = h('div', { class: 'big-num owe' });
  const loanRoom = h('p', { class: 'hint' });
  const loanPreview = h('p', { class: 'preview' });
  const loanPick = amountPicker({ value: 100, step: 50, label: 'loan amount', onChange: () => update(),
    quick: [{ label: 'Max loan', value: () => E.borrowRoom(s) }, { label: 'Pay all', value: () => Math.ceil(s.debt) }] });

  function update() {
    savBal.textContent = money(s.savings);
    savNext.textContent = s.savings > 0
      ? `Next year it grows to ${money(E.round2(s.savings * (1 + SETTINGS.savingsRate)))}.`
      : `Grows ${pctS}% every year. It can never go down.`;
    debtBal.textContent = money(s.debt);
    loanRoom.textContent = `You can borrow ${money(E.borrowRoom(s))} more.`;
    const amt = loanPick.get();
    loanPreview.textContent = amt > 0
      ? `Borrow ${money(amt)} → next year you'll owe ${money(E.round2((s.debt + amt) * (1 + SETTINGS.loanRate)))}${s.debt > 0 ? ' in total' : ''}.`
      : '';
  }
  app.screenRefresh = update;

  app.open({
    title: 'Bank', theme: 'bank',
    body: h('div', { class: 'stack' }, h('div', { class: 'box scene-box' }, bankScene()), h('div', { class: 'two-col' },
      h('section', { class: 'box bank-card' },
        h('h2', {}, 'Savings'),
        h('span', { class: 'badge safe' }, `+${pctS}% a year · no risk`),
        h('small', { class: 'label' }, 'In your savings'), savBal, savNext,
        savPick.el,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn primary', type: 'button', onclick: () => {
            if (app.act(E.deposit(s, savPick.get()))) app.lessonOnce('deposit', 'Savings are safe but slow. Investing can grow more — with more risk.');
          } }, 'Deposit'),
          h('button', { class: 'btn', type: 'button', onclick: () => app.act(E.withdraw(s, savPick.get())) }, 'Withdraw'))),
      h('section', { class: 'box bank-card' },
        h('h2', {}, 'Loan'),
        h('span', { class: 'badge warn' }, `costs ${pctL}% a year`),
        h('small', { class: 'label' }, 'You owe'), debtBal, loanRoom,
        loanPick.el, loanPreview,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn primary', type: 'button', onclick: () => {
            if (app.act(E.borrow(s, loanPick.get()))) app.lessonOnce('borrow', `Loans aren't free: the bank adds ${pctL}% to your debt every year, and debt comes off your final score.`);
          } }, 'Borrow'),
          h('button', { class: 'btn', type: 'button', onclick: () => app.act(E.repay(s, loanPick.get())) }, 'Pay back'))))),
  });
  update();
}
