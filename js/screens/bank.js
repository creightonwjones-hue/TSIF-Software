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
    quick: [{ label: 'All my cash', value: () => s.cash }, { label: 'All savings', value: () => s.savings }] });

  // ----- Loan -----
  const debtBal = h('div', { class: 'big-num owe' });
  const loanRoom = h('p', { class: 'hint' });
  const loanPreview = h('p', { class: 'preview' });
  const loanPick = amountPicker({ value: 100, step: 50, label: 'loan amount',
    onChange: () => update(),
    quick: [{ label: 'Max loan', value: () => E.borrowRoom(s) }, { label: 'Pay it all', value: () => Math.ceil(s.debt) }] });

  function update() {
    savBal.textContent = money(s.savings);
    savNext.textContent = s.savings > 0
      ? `Next year it will grow to ${money(E.round2(s.savings * (1 + SETTINGS.savingsRate)))}`
      : `Money in savings grows ${pctS}% every year and never goes down.`;
    debtBal.textContent = money(s.debt);
    loanRoom.textContent = `You can borrow up to ${money(E.borrowRoom(s))} more.`;
    const amt = loanPick.get();
    loanPreview.textContent = amt > 0
      ? `Borrow ${money(amt)} → you'll owe ${money(E.round2((s.debt + amt) * (1 + SETTINGS.loanRate)))} next year.`
      : '';
  }
  app.screenRefresh = update;

  app.open({
    title: 'Sprout City Bank', emoji: '🏦', theme: 'bank',
    body: h('div', { class: 'bank-grid' },
      h('section', { class: 'card bank-card' },
        h('div', { class: 'card-icon' }, '🐷'),
        h('h3', {}, 'Savings Account'),
        h('span', { class: 'badge safe' }, `+${pctS}% per year · 100% safe`),
        savBal, savNext,
        savPick.el,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn primary', onclick: () => {
            if (app.act(E.deposit(s, savPick.get()))) app.lessonOnce('deposit', 'Savings are super safe, but they grow slowly. Investing can grow more — with more risk.');
          } }, '⬇ Deposit'),
          h('button', { class: 'btn', onclick: () => app.act(E.withdraw(s, savPick.get())) }, '⬆ Withdraw'))),
      h('section', { class: 'card bank-card loan' },
        h('div', { class: 'card-icon' }, '💳'),
        h('h3', {}, 'Loan'),
        h('span', { class: 'badge warn' }, `costs ${pctL}% per year`),
        h('small', { class: 'label' }, 'You owe the bank:'),
        debtBal, loanRoom,
        loanPick.el, loanPreview,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn primary', onclick: () => {
            if (app.act(E.borrow(s, loanPick.get()))) app.lessonOnce('borrow', `Loans cost money! The bank adds ${pctL}% to what you owe every year. Your debt is subtracted from your final score.`);
          } }, '💰 Borrow'),
          h('button', { class: 'btn', onclick: () => app.act(E.repay(s, loanPick.get())) }, '✅ Pay back')))),
  });
  update();
}
