import * as E from '../engine.js';
import { STOCKS, BONDS } from '../scenarios.js';
import { h, money, changeTag, sparkline, riskMeter, amountPicker } from '../ui.js';

let lastTab = 'stocks';

export function exchangeScreen(app) {
  const s = app.state;
  const i = s.year - 1;
  const list = h('div', { class: 'market-list' });
  const summary = h('div', { class: 'market-summary' });
  const tabs = h('div', { class: 'tabs', role: 'tablist' });

  function priceHistory(id) { return s.stockPaths[id].slice(0, i + 1); }

  function stockRow(st) {
    const price = E.stockPrice(s, st.id);
    const prev = i > 0 ? E.stockPrice(s, st.id, i - 1) : price;
    const owned = h('div', { class: 'owned' });
    const cost = h('small', { class: 'cost' });
    const pick = amountPicker({ value: 1, label: `shares of ${st.name}`, onChange: () => upd(),
      quick: [{ label: 'Max', value: () => Math.max(1, Math.floor(s.cash / price)) }] });
    const desc = h('div', { class: 'row-desc' }, h('p', {}, st.desc), riskMeter(st.risk));
    const row = h('div', { class: `market-row ${s.shares[st.id] ? 'mine' : ''}` },
      h('button', { class: 'row-name', type: 'button', 'aria-expanded': 'false', onclick: (e) => {
        row.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', row.classList.contains('open'));
      } },
        h('span', { class: 'row-emoji' }, st.emoji),
        h('span', {}, h('b', {}, st.name), h('small', { class: `risk-chip r${st.risk}` }, ['', 'Steady', 'Medium', 'Bumpy', 'Wild'][st.risk]), h('small', { class: 'more' }, 'ⓘ info'))),
      h('div', { class: 'row-price' }, h('b', {}, money(price)), i > 0 ? changeTag(price / prev - 1) : h('span', { class: 'chg flat' }, 'new')),
      h('div', { class: 'row-spark' }, sparkline(priceHistory(st.id))),
      owned,
      h('div', { class: 'row-trade' }, pick.el,
        h('div', { class: 'btn-row tight' },
          h('button', { class: 'btn primary small', onclick: () => {
            if (app.act(E.buy(s, st.id, pick.get()))) {
              app.lessonOnce(st.index ? 'basket' : 'buy', st.index
                ? 'The Whole City Basket owns a little of EVERY company. That\'s called diversification — not all your eggs in one basket!'
                : `You now own a tiny piece of ${st.name}! If the company does well, your piece is worth more.`);
            }
          } }, 'Buy'),
          h('button', { class: 'btn small', onclick: () => app.act(E.sell(s, st.id, pick.get())) }, 'Sell')),
        cost),
      desc);
    function upd() {
      const n = s.shares[st.id];
      owned.replaceChildren(...[h('small', {}, 'You own'), h('b', {}, `${n} share${n === 1 ? '' : 's'}`), n ? h('small', {}, `worth ${money(E.round2(n * price))}`) : null].filter(Boolean));
      row.classList.toggle('mine', n > 0);
      cost.textContent = `${pick.get()} × ${money(price)} = ${money(E.round2(pick.get() * price))}`;
    }
    upd();
    return { row, upd };
  }

  function bondRow(b) {
    const price = E.bondPrice(s, b.id);
    const dead = E.isDefaulted(s, b.id);
    const owned = h('div', { class: 'owned' });
    const pick = amountPicker({ value: 1, label: `${b.name} bonds`, onChange: () => upd(),
      quick: [{ label: 'Max', value: () => Math.max(1, Math.floor(s.cash / price)) }] });
    const cost = h('small', { class: 'cost' });
    const row = h('div', { class: `market-row bond ${dead ? 'dead' : ''}` },
      h('div', { class: 'row-name static' },
        h('span', { class: 'row-emoji' }, b.emoji),
        h('span', {}, h('b', {}, b.name), h('small', { class: `risk-chip r${b.risk}` }, b.risk > 2 ? 'Risky' : 'Safe'))),
      h('div', { class: 'row-price' }, h('b', {}, money(price)), h('small', {}, 'per bond')),
      h('div', { class: 'row-rate' }, dead ? h('b', { class: 'down' }, '💥 Stopped paying') : h('b', { class: 'up' }, `pays ${Math.round(b.rate * 100)}% / yr`),
        h('small', {}, dead ? '' : `= ${money(b.price * b.rate)} per bond each year`)),
      owned,
      h('div', { class: 'row-trade' }, pick.el,
        h('div', { class: 'btn-row tight' },
          h('button', { class: 'btn primary small', disabled: dead, onclick: () => {
            if (app.act(E.buyBond(s, b.id, pick.get()))) app.lessonOnce('bond', 'A bond is a loan that YOU give. They pay you interest every year, and you can sell the bond back later.');
          } }, 'Buy'),
          h('button', { class: 'btn small', onclick: () => app.act(E.sellBond(s, b.id, pick.get())) }, 'Sell')),
        cost),
      h('p', { class: 'row-desc-inline' }, b.desc));
    function upd() {
      const n = s.bonds[b.id];
      owned.replaceChildren(...[h('small', {}, 'You own'), h('b', {}, `${n} bond${n === 1 ? '' : 's'}`), n ? h('small', {}, `worth ${money(n * price)}`) : null].filter(Boolean));
      row.classList.toggle('mine', n > 0);
      cost.textContent = `${pick.get()} × ${money(price)} = ${money(pick.get() * price)}`;
    }
    upd();
    return { row, upd };
  }

  let rows = [];
  function render(tab) {
    lastTab = tab;
    tabs.innerHTML = '';
    for (const [id, label] of [['stocks', `📈 Stocks (${STOCKS.length})`], ['bonds', `🏛️ Bonds (${BONDS.length})`]]) {
      tabs.append(h('button', { class: `tab ${tab === id ? 'on' : ''}`, role: 'tab', 'aria-selected': tab === id ? 'true' : 'false', onclick: () => render(id) }, label));
    }
    rows = (tab === 'stocks' ? STOCKS.map(stockRow) : BONDS.map(bondRow));
    list.innerHTML = '';
    list.className = `market-list ${tab}`;
    list.append(
      tab === 'stocks'
        ? h('p', { class: 'explain' }, '📈 A ', h('b', {}, 'stock'), ' is a tiny piece of a company. Prices change every year. Tap a name for info.')
        : h('p', { class: 'explain' }, '🏛️ A ', h('b', {}, 'bond'), ' is a loan you give. It pays you money every year. Safer than stocks, but grows slower.'),
      ...rows.map((r) => r.row));
    updSummary();
  }
  function updSummary() {
    summary.innerHTML = '';
    summary.append(
      h('span', { class: 'pill' }, `📈 Your stocks: ${money(E.stockValue(s))}`),
      h('span', { class: 'pill' }, `🏛️ Your bonds: ${money(E.bondValue(s))}`),
      h('span', { class: 'pill' }, `🧺 Different investments: ${E.diversityCount(s)}`));
  }
  app.screenRefresh = () => { rows.forEach((r) => r.upd()); updSummary(); };

  app.open({
    title: 'Stock Exchange', emoji: '📈', theme: 'exchange',
    body: h('div', { class: 'exchange' }, h('div', { class: 'exchange-top' }, tabs, summary), list),
  });
  render(lastTab);
}
