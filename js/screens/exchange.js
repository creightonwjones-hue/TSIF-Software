// Stock Exchange side panel: a clean list; tapping a row opens a detail view (with a back arrow) to trade.
import * as E from '../engine.js';
import { STOCKS, BONDS } from '../scenarios.js';
import { h, money, pct, amountPicker, toast, sound, lineChart } from '../ui.js';
import { icon } from '../icons.js';

let lastTab = 'stocks';
const RISK_WORD = ['', 'Low risk', 'Medium risk', 'Higher risk', 'High risk'];

export function mono(item) {
  return h('span', { class: 'mono', style: `--c:${item.color}` }, item.ticker.replace('-B', ''));
}
function change(c) {
  if (c == null) return h('span', { class: 'chg flat' }, 'New');
  const p = pct(c);
  return h('span', { class: `chg ${p.cls}` }, p.text);
}
function riskBar(risk) {
  return h('span', { class: 'riskbar', title: RISK_WORD[risk] },
    h('span', { class: 'riskbar-track' }, ...[1, 2, 3, 4].map((n) => h('i', { class: n <= risk ? `on r${risk}` : '' }))),
    h('small', {}, RISK_WORD[risk]));
}

export function exchangeScreen(app) {
  const s = app.state;
  const i = s.year - 1;
  const overlay = document.getElementById('overlay');
  const view = h('div', { class: 'ex-view' });
  let refreshView = () => {};

  const stockChange = (id) => (i > 0 ? E.stockPrice(s, id) / E.stockPrice(s, id, i - 1) - 1 : null);
  const yearLabels = () => Array.from({ length: i + 1 }, (_, n) => (n === 0 ? 'Start' : `Y${n}`));

  // ---------- list ----------
  function showList(tab) {
    lastTab = tab;
    overlay._back = null;
    const seg = h('div', { class: 'seg', role: 'tablist' },
      ...[['stocks', `Stocks`], ['bonds', `Bonds`]].map(([id, label]) =>
        h('button', { class: tab === id ? 'on' : '', role: 'tab', 'aria-selected': tab === id ? 'true' : 'false',
          onclick: () => { if (tab !== id) { sound('click'); showList(id); } } }, label)));
    const summary = h('div', { class: 'ex-summary' });
    const rowsBox = h('div', { class: 'ex-rows' });
    const items = tab === 'stocks' ? STOCKS : BONDS;
    const rows = items.map((it) => {
      const row = h('button', { class: 'ex-row', type: 'button', onclick: () => { sound('click'); showDetail(tab, it); } });
      const upd = () => {
        const isStock = tab === 'stocks';
        const n = isStock ? s.shares[it.id] : s.bonds[it.id];
        const dead = !isStock && E.isDefaulted(s, it.id);
        row.classList.toggle('mine', n > 0);
        row.classList.toggle('dead', dead);
        row.replaceChildren(
          mono(it),
          h('span', { class: 'ex-name' }, h('b', {}, it.name),
            h('small', {}, n > 0 ? `You own ${n}` : isStock ? RISK_WORD[it.risk] : (it.risk > 2 ? 'Risky' : 'Safe'))),
          h('span', { class: 'ex-price' },
            h('b', {}, money(isStock ? E.stockPrice(s, it.id) : E.bondPrice(s, it.id))),
            isStock ? change(stockChange(it.id))
              : dead ? h('span', { class: 'chg down' }, 'Defaulted') : h('span', { class: 'chg up' }, `Pays ${Math.round(it.rate * 100)}%/yr`)),
          icon('next', 16, 'ex-go'));
      };
      upd();
      return { row, upd };
    });
    rowsBox.append(...rows.map((r) => r.row));
    const updSummary = () => summary.replaceChildren(
      h('div', {}, h('small', {}, 'Stocks'), h('b', {}, money(E.stockValue(s)))),
      h('div', {}, h('small', {}, 'Bonds'), h('b', {}, money(E.bondValue(s)))),
      h('div', {}, h('small', {}, 'Holdings'), h('b', {}, String(E.diversityCount(s)))));
    updSummary();
    refreshView = () => { rows.forEach((r) => r.upd()); updSummary(); };
    view.replaceChildren(
      seg, summary,
      h('p', { class: 'ex-explain' }, tab === 'stocks'
        ? 'A stock means you own part of a company. Prices move every year.'
        : 'A bond is a loan you make. It pays you interest every year — safer than stocks, but slower.'),
      rowsBox);
    view.classList.remove('slide-in'); void view.offsetWidth; view.classList.add('fade-in');
  }

  // ---------- detail ----------
  function showDetail(tab, it) {
    const isStock = tab === 'stocks';
    const price = isStock ? E.stockPrice(s, it.id) : E.bondPrice(s, it.id);
    const dead = !isStock && E.isDefaulted(s, it.id);
    const owned = () => (isStock ? s.shares[it.id] : s.bonds[it.id]);
    const unit = isStock ? 'share' : 'bond';
    const ownBox = h('div', { class: 'own-box' });
    const cost = h('p', { class: 'cost-line' });
    const picker = amountPicker({ value: 1, label: `number of ${unit}s`, onChange: () => upd(),
      quick: [{ label: 'Max', value: () => Math.max(1, Math.floor(s.cash / price)) }, { label: 'All I own', value: () => Math.max(1, owned()) }] });
    const buy = () => {
      const q = picker.get();
      const r = isStock ? E.buy(s, it.id, q) : E.buyBond(s, it.id, q);
      if (app.act(r)) {
        toast(`Bought ${q} ${it.ticker}`);
        if (!isStock) app.lessonOnce('bond', 'A bond is a loan you make. You get paid interest every year, and you can sell it back later.');
        else app.lessonOnce(it.index ? 'basket' : 'buy', it.index
          ? 'An index fund owns a slice of every company. That\'s diversification — not all your eggs in one basket.'
          : `A stock means you own part of the company. If ${it.name} grows, your shares are worth more.`);
      }
    };
    const sell = () => {
      const q = picker.get();
      if (app.act(isStock ? E.sell(s, it.id, q) : E.sellBond(s, it.id, q))) toast(`Sold ${q} ${it.ticker}`);
    };
    function upd() {
      const n = owned();
      ownBox.replaceChildren(
        h('div', {}, h('small', {}, 'You own'), h('b', {}, `${n} ${unit}${n === 1 ? '' : 's'}`)),
        h('div', {}, h('small', {}, 'Worth'), h('b', {}, money(E.round2(n * price)))),
        h('div', {}, h('small', {}, 'Your cash'), h('b', {}, money(s.cash))));
      cost.replaceChildren(`${picker.get()} × ${money(price)} = `, h('b', {}, money(E.round2(picker.get() * price))));
    }
    overlay._back = () => { sound('click'); showList(tab); };
    refreshView = upd;
    view.replaceChildren(
      h('button', { class: 'back-link', type: 'button', onclick: () => overlay._back() }, icon('back', 16), isStock ? 'All stocks' : 'All bonds'),
      h('div', { class: 'detail-head' }, mono(it),
        h('div', {}, h('h3', {}, it.name), h('small', {}, isStock ? riskBar(it.risk) : (it.risk > 2 ? 'Risky bond' : 'Safe bond')))),
      h('div', { class: 'detail-price' },
        h('b', {}, money(price)),
        isStock ? change(stockChange(it.id)) : dead ? h('span', { class: 'chg down' }, 'Stopped paying') : h('span', { class: 'chg up' }, `Pays ${money(it.price * it.rate)} per bond each year`),
        isStock && i > 0 ? h('small', {}, 'since last year') : null),
      isStock ? lineChart(s.stockPaths[it.id].slice(0, i + 1), { labels: yearLabels() }) : null,
      h('p', { class: 'detail-desc' }, it.desc),
      ownBox,
      h('div', { class: 'trade-box' },
        h('label', { class: 'trade-label' }, `How many ${unit}s?`),
        picker.el, cost,
        h('div', { class: 'trade-buttons' },
          h('button', { class: 'btn primary', type: 'button', disabled: dead, onclick: buy }, 'Buy'),
          h('button', { class: 'btn danger', type: 'button', onclick: sell }, 'Sell'))));
    upd();
    view.classList.remove('fade-in'); void view.offsetWidth; view.classList.add('slide-in');
  }

  app.screenRefresh = () => refreshView();
  app.open({ title: 'Stock Exchange', icon: 'exchange', theme: 'exchange', body: view });
  showList(lastTab);
}
