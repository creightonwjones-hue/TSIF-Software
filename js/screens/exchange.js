// Stock Exchange: a clean read-only list. Tap a row to open one trade card with Buy / Sell.
import * as E from '../engine.js';
import { STOCKS, BONDS } from '../scenarios.js';
import { h, money, changeTag, sparkline, riskMeter, amountPicker, toast, sound } from '../ui.js';

let lastTab = 'stocks';
const RISK_WORD = ['', 'Safe', 'Medium', 'Bumpy', 'Wild'];

export function exchangeScreen(app) {
  const s = app.state;
  const i = s.year - 1;
  const list = h('div', { class: 'market-list' });
  const summary = h('div', { class: 'market-summary' });
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  let rows = [];

  const stockChange = (id) => (i > 0 ? E.stockPrice(s, id) / E.stockPrice(s, id, i - 1) - 1 : null);

  // ---------- list rows ----------
  function ownedCell(n, unit) {
    return n > 0
      ? h('span', { class: 'owned-cell' }, h('b', {}, String(n)), h('small', {}, unit + (n === 1 ? '' : 's')))
      : h('span', { class: 'owned-cell none' }, '—');
  }

  function stockRow(st) {
    const row = h('button', { class: 'market-row', type: 'button', 'aria-label': `${st.name}, open trade card` });
    const upd = () => {
      const price = E.stockPrice(s, st.id), ch = stockChange(st.id), n = s.shares[st.id];
      row.classList.toggle('mine', n > 0);
      row.replaceChildren(
        h('span', { class: 'cell-name' }, h('span', { class: 'row-emoji' }, st.emoji),
          h('span', { class: 'name-stack' }, h('b', {}, st.name), h('small', { class: 'ticker' }, st.ticker))),
        h('span', { class: `risk-chip r${st.risk}` }, RISK_WORD[st.risk]),
        h('span', { class: 'cell-price' }, money(price)),
        h('span', { class: 'cell-change' }, ch == null ? h('span', { class: 'chg flat' }, 'NEW') : changeTag(ch)),
        ownedCell(n, 'share'),
        h('span', { class: 'cell-go', 'aria-hidden': 'true' }, '›'));
    };
    row.addEventListener('click', () => { sound('click'); openTrade(stockCard(st)); });
    upd();
    return { row, upd };
  }

  function bondRow(b) {
    const row = h('button', { class: 'market-row', type: 'button', 'aria-label': `${b.name}, open trade card` });
    const upd = () => {
      const dead = E.isDefaulted(s, b.id), n = s.bonds[b.id];
      row.classList.toggle('mine', n > 0);
      row.classList.toggle('dead', dead);
      row.replaceChildren(
        h('span', { class: 'cell-name' }, h('span', { class: 'row-emoji' }, b.emoji),
          h('span', { class: 'name-stack' }, h('b', {}, b.name), h('small', { class: 'ticker' }, b.ticker))),
        h('span', { class: `risk-chip r${b.risk}` }, b.risk > 2 ? 'Risky' : 'Safe'),
        h('span', { class: 'cell-price' }, money(E.bondPrice(s, b.id))),
        h('span', { class: 'cell-change' }, dead ? h('b', { class: 'down' }, 'DEFAULTED') : h('b', { class: 'up' }, `${Math.round(b.rate * 100)}% / yr`)),
        ownedCell(n, 'bond'),
        h('span', { class: 'cell-go', 'aria-hidden': 'true' }, '›'));
    };
    row.addEventListener('click', () => { sound('click'); openTrade(bondCard(b)); });
    upd();
    return { row, upd };
  }

  // ---------- trade card ----------
  let card = null; // { el, upd }
  function openTrade(c) {
    closeTrade();
    const layer = h('div', { class: 'trade-layer', onclick: (e) => { if (e.target === layer) closeTrade(); } }, c.el);
    layer._close = closeTrade;
    document.getElementById('overlay').append(layer);
    card = { ...c, layer };
    c.upd();
    c.el.querySelector('.picker input')?.focus({ preventScroll: true });
  }
  function closeTrade() {
    if (!card) return;
    card.layer.remove();
    card = null;
  }

  function cardShell({ emoji, name, ticker, risk, riskText, desc, statBlocks, chart, picker, buy, sell, buyDisabled }) {
    const ownLine = h('p', { class: 'own-line' });
    const cost = h('p', { class: 'cost-line' });
    const el = h('div', { class: 'trade-card pop', role: 'dialog', 'aria-label': `Trade ${name}` },
      h('button', { class: 'card-x', type: 'button', 'aria-label': 'Close', onclick: () => { sound('click'); closeTrade(); } }, '✕'),
      h('div', { class: 'trade-head' },
        h('span', { class: 'trade-emoji' }, emoji),
        h('div', {}, h('h3', {}, name), h('small', { class: 'ticker' }, ticker)),
        h('div', { class: 'trade-risk' }, riskText ? h('small', {}, riskText) : riskMeter(risk))),
      h('p', { class: 'trade-desc' }, desc),
      h('div', { class: 'trade-stats' }, ...statBlocks, chart ? h('div', { class: 'trade-chart' }, chart) : null),
      ownLine,
      h('div', { class: 'trade-controls' }, picker.el, cost),
      h('div', { class: 'trade-buttons' },
        h('button', { class: 'btn primary big', type: 'button', disabled: buyDisabled, onclick: buy }, 'BUY'),
        h('button', { class: 'btn sell big', type: 'button', onclick: sell }, 'SELL')));
    return { el, ownLine, cost };
  }

  function stockCard(st) {
    const price = E.stockPrice(s, st.id), ch = stockChange(st.id);
    const picker = amountPicker({ value: 1, label: `shares of ${st.name}`, onChange: () => upd(),
      quick: [{ label: 'MAX', value: () => Math.max(1, Math.floor(s.cash / price)) }, { label: 'ALL MINE', value: () => Math.max(1, s.shares[st.id]) }] });
    const shell = cardShell({
      emoji: st.emoji, name: st.name, ticker: st.ticker, risk: st.risk, desc: st.desc, picker,
      statBlocks: [
        h('div', { class: 'stat-block' }, h('small', {}, 'PRICE'), h('b', {}, money(price))),
        h('div', { class: 'stat-block' }, h('small', {}, 'LAST YEAR'), ch == null ? h('b', { class: 'chg flat' }, 'NEW') : changeTag(ch)),
      ],
      chart: i > 0 ? sparkline(s.stockPaths[st.id].slice(0, i + 1), 200, 56) : h('small', {}, 'Price chart starts after Year 1'),
      buy: () => {
        const q = picker.get();
        if (app.act(E.buy(s, st.id, q))) {
          toast(`✅ Bought ${q} ${st.ticker}`);
          app.lessonOnce(st.index ? 'basket' : 'buy', st.index
            ? 'An index fund owns a slice of every company. That\'s diversification — not all your eggs in one basket.'
            : `A stock = you own part of the company. If ${st.name} grows, your shares are worth more.`);
        }
      },
      sell: () => { const q = picker.get(); if (app.act(E.sell(s, st.id, q))) toast(`💰 Sold ${q} ${st.ticker}`); },
    });
    function upd() {
      const n = s.shares[st.id];
      shell.ownLine.replaceChildren('You own ', h('b', {}, `${n} share${n === 1 ? '' : 's'}`), n ? ` · worth ${money(E.round2(n * price))}` : '', ` · Cash ${money(s.cash)}`);
      shell.cost.textContent = `${picker.get()} × ${money(price)} = ${money(E.round2(picker.get() * price))}`;
    }
    return { el: shell.el, upd };
  }

  function bondCard(b) {
    const price = E.bondPrice(s, b.id), dead = E.isDefaulted(s, b.id);
    const picker = amountPicker({ value: 1, label: `${b.name} bonds`, onChange: () => upd(),
      quick: [{ label: 'MAX', value: () => Math.max(1, Math.floor(s.cash / price)) }, { label: 'ALL MINE', value: () => Math.max(1, s.bonds[b.id]) }] });
    const shell = cardShell({
      emoji: b.emoji, name: b.name, ticker: b.ticker, riskText: b.risk > 2 ? '⚠️ RISKY' : '🛡️ SAFE', desc: b.desc, picker,
      buyDisabled: dead,
      statBlocks: [
        h('div', { class: 'stat-block' }, h('small', {}, 'PRICE'), h('b', {}, money(price))),
        h('div', { class: 'stat-block' }, h('small', {}, 'PAYS YOU'),
          dead ? h('b', { class: 'down' }, 'NOTHING — DEFAULTED') : h('b', { class: 'up' }, `${money(b.price * b.rate)} / yr per bond`)),
      ],
      buy: () => {
        const q = picker.get();
        if (app.act(E.buyBond(s, b.id, q))) {
          toast(`✅ Bought ${q} ${b.name}${q === 1 ? '' : 's'}`);
          app.lessonOnce('bond', 'A bond is a loan YOU make. You get paid interest every year, and you can sell it back later.');
        }
      },
      sell: () => { const q = picker.get(); if (app.act(E.sellBond(s, b.id, q))) toast(`💰 Sold ${q} ${b.name}${q === 1 ? '' : 's'}`); },
    });
    function upd() {
      const n = s.bonds[b.id];
      shell.ownLine.replaceChildren('You own ', h('b', {}, `${n} bond${n === 1 ? '' : 's'}`), n ? ` · worth ${money(n * price)}` : '', ` · Cash ${money(s.cash)}`);
      shell.cost.textContent = `${picker.get()} × ${money(price)} = ${money(picker.get() * price)}`;
    }
    return { el: shell.el, upd };
  }

  // ---------- tabs + list ----------
  function render(tab) {
    lastTab = tab;
    closeTrade();
    tabs.replaceChildren(...[['stocks', `STOCKS · ${STOCKS.length}`], ['bonds', `BONDS · ${BONDS.length}`]].map(([id, label]) =>
      h('button', { class: `tab ${tab === id ? 'on' : ''}`, role: 'tab', 'aria-selected': tab === id ? 'true' : 'false', onclick: () => { sound('click'); render(id); } }, label)));
    rows = tab === 'stocks' ? STOCKS.map(stockRow) : BONDS.map(bondRow);
    list.replaceChildren(
      tab === 'stocks'
        ? h('p', { class: 'explain' }, h('b', {}, 'STOCK'), ' = you own part of a company. Prices move every year. Tap one to trade.')
        : h('p', { class: 'explain' }, h('b', {}, 'BOND'), ' = you lend money and get paid interest every year. Safer than stocks, slower growth. Tap one to trade.'),
      h('div', { class: 'list-head', 'aria-hidden': 'true' },
        h('span', {}, tab === 'stocks' ? 'COMPANY' : 'BOND'), h('span', {}, 'RISK'), h('span', {}, 'PRICE'),
        h('span', {}, tab === 'stocks' ? 'LAST YEAR' : 'PAYS'), h('span', {}, 'YOU OWN'), h('span', {})),
      ...rows.map((r) => r.row));
    updSummary();
  }
  function updSummary() {
    summary.replaceChildren(
      h('span', { class: 'pill' }, h('small', {}, 'STOCKS'), money(E.stockValue(s))),
      h('span', { class: 'pill' }, h('small', {}, 'BONDS'), money(E.bondValue(s))),
      h('span', { class: 'pill' }, h('small', {}, 'DIFFERENT INVESTMENTS'), String(E.diversityCount(s))));
  }
  app.screenRefresh = () => { rows.forEach((r) => r.upd()); updSummary(); card?.upd(); };

  app.open({
    title: 'Stock Exchange', emoji: '📈', theme: 'exchange',
    body: h('div', { class: 'exchange' }, h('div', { class: 'exchange-top' }, tabs, summary), list),
  });
  render(lastTab);
}
