import * as E from '../engine.js';
import { SETTINGS } from '../scenarios.js';
import { h, money, amountPicker } from '../ui.js';

export function bankScreen(app) {
  const s = app.state;
  const pctS = Math.round(SETTINGS.savingsRate * 100), pctL = Math.round(SETTINGS.loanRate * 100);

  // ----- Savings -----
  const savBal = h('div', { class: 'big-num' });
  const savNext = h('p', { class: 'hint' });
  const savPick = amountPicker({ value: 100, step: 50, label: 'savings amount',
    quick: [{ label: 'ALL CASH', value: () => s.cash }, { label: 'ALL SAVINGS', value: () => s.savings }] });

  // ----- Loan -----
  const debtBal = h('div', { class: 'big-num owe' });
  const loanRoom = h('p', { class: 'hint' });
  const loanPreview = h('p', { class: 'preview' });
  const loanPick = amountPicker({ value: 100, step: 50, label: 'loan amount',
    onChange: () => update(),
    quick: [{ label: 'MAX LOAN', value: () => E.borrowRoom(s) }, { label: 'PAY ALL', value: () => Math.ceil(s.debt) }] });

  function update() {
    savBal.textContent = money(s.savings);
    savNext.textContent = s.savings > 0
      ? `Next year: ${money(E.round2(s.savings * (1 + SETTINGS.savingsRate)))}`
      : `Grows ${pctS}% every year. Can never go down.`;
    debtBal.textContent = money(s.debt);
    loanRoom.textContent = `Borrow limit left: ${money(E.borrowRoom(s))}`;
    const amt = loanPick.get();
    loanPreview.textContent = amt > 0
      ? `Borrow ${money(amt)} → next year you'll owe ${money(E.round2((s.debt + amt) * (1 + SETTINGS.loanRate)))}${s.debt > 0 ? ' in total' : ''}.`
      : '';
  }
  app.screenRefresh = update;

  app.open({
    title: 'Bank', emoji: '🏦', theme: 'bank',
    body: h('div', { class: 'bank-grid' },
      h('section', { class: 'card bank-card' },
        h('div', { class: 'card-icon' }, '🛡️'),
        h('h3', {}, 'SAVINGS'),
        h('span', { class: 'badge safe' }, `+${pctS}% / YEAR · ZERO RISK`),
        savBal, savNext,
        savPick.el,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn primary', onclick: () => {
            if (app.act(E.deposit(s, savPick.get()))) app.lessonOnce('deposit', 'Savings are safe but slow. Investing can grow more — with more risk.');
          } }, 'DEPOSIT'),
          h('button', { class: 'btn', onclick: () => app.act(E.withdraw(s, savPick.get())) }, 'WITHDRAW'))),
      h('section', { class: 'card bank-card loan' },
        h('div', { class: 'card-icon' }, '💳'),
        h('h3', {}, 'LOAN'),
        h('span', { class: 'badge warn' }, `COSTS ${pctL}% / YEAR`),
        h('small', { class: 'label' }, 'YOU OWE'),
        debtBal, loanRoom,
        loanPick.el, loanPreview,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn primary', onclick: () => {
            if (app.act(E.borrow(s, loanPick.get()))) app.lessonOnce('borrow', `Loans aren't free: the bank adds ${pctL}% to your debt every year, and debt comes off your final score.`);
          } }, 'BORROW'),
          h('button', { class: 'btn', onclick: () => app.act(E.repay(s, loanPick.get())) }, 'PAY BACK')))),
  });
  update();
}
