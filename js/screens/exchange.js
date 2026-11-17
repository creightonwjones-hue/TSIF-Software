// Stock Exchange: list on the left, the selected stock or bond on the right.
import * as E from '../engine.js';
import { STOCKS, BONDS } from '../scenarios.js';
import { h, money, pct, amountPicker, toast, sound, lineChart } from '../ui.js';

let lastTab = 'stocks';
let lastPick = { stocks: 'basket', bonds: 'city' };
const RISK_WORD = ['', 'Low risk', 'Medium risk', 'Higher risk', 'High risk'];

const tile = (it, big = false) => h('span', { class: `tile ${big ? 'big' : ''}`, style: `background:${it.color}` }, it.ticker.replace('-B', ''));
function change(c) {
  if (c == null) return h('span', { class: 'flat' }, 'new');
  const p = pct(c);
  return h('span', { class: p.cls }, p.text);
}

export function exchangeScreen(app) {
  const s = app.state;
  const i = s.year - 1;
  const listBox = h('section', { class: 'box ex-list' });
  const detailBox = h('section', { class: 'box ex-detail' });
  const stockChange = (id) => (i > 0 ? E.stockPrice(s, id) / E.stockPrice(s, id, i - 1) - 1 : null);
  let detailUpd = () => {};

  function renderList() {
    const tab = lastTab;
    const items = tab === 'stocks' ? STOCKS : BONDS;
    listBox.replaceChildren(
      h('div', { class: 'tabs', role: 'tablist' },
        ...[['stocks', 'Stocks'], ['bonds', 'Bonds']].map(([id, label]) => h('button', {
          class: `tab ${tab === id ? 'on' : ''}`, type: 'button', role: 'tab', 'aria-selected': tab === id ? 'true' : 'false',
          onclick: () => { if (tab !== id) { sound('click'); lastTab = id; renderList(); renderDetail(); } } }, label))),
      h('p', { class: 'hint' }, tab === 'stocks'
        ? 'A stock means you own part of a company. Prices change every year.'
        : 'A bond is a loan you make. It pays you interest every year — safer than stocks, but slower.'),
      ...items.map((it) => {
        const isStock = tab === 'stocks';
        const n = isStock ? s.shares[it.id] : s.bonds[it.id];
        const dead = !isStock && E.isDefaulted(s, it.id);
        return h('button', {
          class: `ex-row ${lastPick[tab] === it.id ? 'sel' : ''} ${dead ? 'dead' : ''}`, type: 'button',
          onclick: () => { sound('click'); lastPick[tab] = it.id; renderList(); renderDetail(); } },
          tile(it),
          h('span', { class: 'ex-name' }, it.name),
          h('span', { class: 'ex-price' }, money(isStock ? E.stockPrice(s, it.id) : E.bondPrice(s, it.id)), ' ',
            isStock ? change(stockChange(it.id)) : dead ? h('span', { class: 'down' }, 'defaulted') : h('span', { class: 'up' }, `${Math.round(it.rate * 100)}%/yr`)),
          h('span', { class: 'ex-own' }, n > 0 ? `own ${n}` : '—'));
      }));
  }

  function renderDetail() {
    const tab = lastTab, isStock = tab === 'stocks';
    const it = (isStock ? STOCKS : BONDS).find((x) => x.id === lastPick[tab]);
    const price = isStock ? E.stockPrice(s, it.id) : E.bondPrice(s, it.id);
    const dead = !isStock && E.isDefaulted(s, it.id);
    const owned = () => (isStock ? s.shares[it.id] : s.bonds[it.id]);
    const unit = isStock ? 'share' : 'bond';
    const ownBox = h('div', { class: 'owned3' });
    const cost = h('span', { class: 'cost' });
    const picker = amountPicker({ value: 1, label: `number of ${unit}s`, onChange: () => detailUpd(),
      quick: [{ label: 'Max', value: () => Math.max(1, Math.floor(s.cash / price)) }, { label: 'All I own', value: () => Math.max(1, owned()) }] });
    const buy = () => {
      const q = picker.get();
      if (app.act(isStock ? E.buy(s, it.id, q) : E.buyBond(s, it.id, q))) {
        toast(`Bought ${q} ${it.ticker}`);
        if (!isStock) app.lessonOnce('bond', 'A bond is a loan you make. You get paid interest every year, and you can sell it back later.');
        else app.lessonOnce(it.index ? 'basket' : 'buy', it.index
          ? 'An index fund owns a slice of every company. That\'s diversification — not all your eggs in one basket.'
          : `A stock means you own part of the company. If ${it.name} grows, your shares are worth more.`);
        renderList();
      }
    };
    const sell = () => {
      const q = picker.get();
      if (app.act(isStock ? E.sell(s, it.id, q) : E.sellBond(s, it.id, q))) { toast(`Sold ${q} ${it.ticker}`); renderList(); }
    };
    detailUpd = () => {
      const n = owned();
      ownBox.replaceChildren(
        h('div', {}, h('small', {}, 'You own'), `${n} ${unit}${n === 1 ? '' : 's'}`),
        h('div', {}, h('small', {}, 'Worth'), money(E.round2(n * price))),
        h('div', {}, h('small', {}, 'Your cash'), money(s.cash)));
      cost.textContent = `= ${money(E.round2(picker.get() * price))}`;
    };
    detailBox.replaceChildren(
      h('div', { class: 'detail-head' }, tile(it, true),
        h('div', {}, h('h2', {}, it.name), h('small', {}, isStock ? RISK_WORD[it.risk] : it.risk > 2 ? 'Risky bond' : 'Safe bond'))),
      h('div', { class: 'bigprice' }, h('b', {}, money(price)),
        isStock ? h('span', {}, change(stockChange(it.id)), i > 0 ? ' since last year' : '')
          : dead ? h('span', { class: 'down' }, 'Stopped paying') : h('span', { class: 'up' }, `Pays ${money(it.price * it.rate)} per bond each year`)),
      isStock ? lineChart(s.stockPaths[it.id].slice(0, i + 1), { labels: Array.from({ length: i + 1 }, (_, n) => (n ? `Y${n}` : 'Start')) }) : null,
      h('p', {}, it.desc),
      ownBox,
      h('div', { class: 'stepper' }, picker.el, cost),
      h('div', { class: 'btns' },
        h('button', { class: 'btn primary', type: 'button', disabled: dead, onclick: buy }, 'Buy'),
        h('button', { class: 'btn danger', type: 'button', onclick: sell }, 'Sell')));
    detailUpd();
  }

  app.screenRefresh = () => detailUpd();
  app.open({ title: 'Stock Exchange', theme: 'exchange', body: h('div', { class: 'two-col ex' }, listBox, detailBox) });
  renderList();
  renderDetail();
}
