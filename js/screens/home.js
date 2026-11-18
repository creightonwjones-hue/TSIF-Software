// Home: go to sleep to end the year, then see the year's recap.
import * as E from '../engine.js';
import { STOCKS, BONDS, SETTINGS } from '../scenarios.js';
import { h, money, pct, sound, moneyPop, toast } from '../ui.js';
import { homeScene } from '../scenes.js';

export function homeScreen(app) {
  const s = app.state;
  E.ensureExtras(s);
  const yearsLeft = () => SETTINGS.years - s.year + 1;

  // ---------- fix up your home: assets that pay you back ----------
  const upBox = h('section', { class: 'box home-upgrades' });
  function perkLine(u) {
    if (u.yearly) {
      const payback = Math.ceil(u.price / u.yearly), left = yearsLeft();
      return h('small', { class: payback <= left ? 'good' : 'bad' }, `Saves ${money(u.yearly)} a year · pays for itself in ~${payback} years (${left} left)`);
    }
    return h('small', { class: 'good' }, u.swings ? `Mine: ${E.mineSwings(s)} → ${E.mineSwings(s) + u.swings} swings` : `Rod holds ${E.rodCapacity(s)} → ${E.rodCapacity(s) + u.capacity}`);
  }
  function renderUpgrades() {
    upBox.replaceChildren(
      h('h2', {}, 'Fix up your home'),
      h('p', { class: 'hint' }, 'Unlike wants, these are assets: they cost money now and pay you back every year after.'),
      ...SETTINGS.homeUpgrades.map((u) => {
        const owned = E.ownsUpgrade(s, u.id);
        return h('div', { class: `upgrade ${owned ? 'owned' : ''}` },
          h('div', { class: 'up-main' }, h('b', {}, u.name), h('p', {}, u.desc),
            owned ? h('small', { class: 'up-tag' }, `Built in Year ${s.home.owned[u.id]}`) : perkLine(u)),
          owned ? h('span', { class: 'chip owned-chip' }, 'Owned')
            : h('button', { class: 'btn', type: 'button', 'data-upgrade': u.id, disabled: s.cash < u.price || s.finished, onclick: () => {
              if (app.act(E.buyHomeUpgrade(s, u.id))) {
                toast(`Built: ${u.name}`);
                app.lessonOnce('homeAsset', 'That\'s an asset: something that keeps paying you back. Compare it with a want, which is fun once and then the money is gone.');
              }
            } }, `Build ${money(u.price)}`));
      }),
      E.homeYearly(s) ? h('p', { class: 'done-line' }, `Your home saves you ${money(E.homeYearly(s))} every year.`) : null);
  }

  // ---------- end the year ----------
  const sleepBox = h('section', { class: 'box home-sleep' });
  function renderSleep() {
    const last = s.year === SETTINGS.years;
    const skipped = !E.shiftDone(s), skippedMine = !E.mineDone(s), castsLeft = E.castsLeft(s);
    const needCode = !!s.classMode?.codes;
    const codeInput = needCode ? h('input', { id: 'year-code', class: 'code-input', maxlength: '3', autocomplete: 'off', spellcheck: 'false',
      'aria-label': `Year ${s.year} code`, placeholder: '???', onkeydown: (e) => { if (e.key === 'Enter') tryEnd(); } }) : null;
    const codeMsg = h('p', { class: 'code-msg', 'aria-live': 'polite' });
    function tryEnd() {
      if (needCode && !E.checkYearCode(s, codeInput.value)) {
        sound('bad');
        codeMsg.textContent = 'That\'s not this year\'s code. Wait for your club leader to share it!';
        codeInput.classList.remove('shake'); void codeInput.offsetWidth; codeInput.classList.add('shake');
        return;
      }
      endYear(app);
    }
    sleepBox.replaceChildren(
      homeScene(app.color(), false),
      h('h2', {}, last ? 'Sleep and finish the game?' : `Go to sleep and end Year ${s.year}?`),
      h('p', { class: 'hint' }, last ? 'This locks in your final score.' : 'Overnight, prices change, interest gets paid, and loans grow. You can\'t undo it.'),
      skipped || skippedMine || castsLeft ? h('p', { class: 'warn-line' }, `You haven't ${[skipped ? 'run your lemonade stand' : '', skippedMine ? 'worked at the mine' : '', castsLeft ? `used ${castsLeft === SETTINGS.fish.casts ? 'your' : `${castsLeft} of your`} fishing casts` : ''].filter(Boolean).join(' or ')} this year — that's money left on the table.`) : null,
      h('div', { class: 'mini-summary' },
        h('span', { class: 'chip' }, `Cash ${money(s.cash)}`),
        h('span', { class: 'chip' }, `Savings ${money(s.savings)}`),
        h('span', { class: 'chip' }, `Stocks ${money(E.stockValue(s))}`),
        h('span', { class: 'chip' }, `Bonds ${money(E.bondValue(s))}`),
        s.debt ? h('span', { class: 'chip owe' }, `Debt ${money(s.debt)}`) : null),
      needCode ? h('div', { class: 'code-box' },
        h('label', { for: 'year-code' }, `Year ${s.year} code from your club leader`), codeInput, codeMsg) : null,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => { sound('click'); app.close(); } }, 'Not yet'),
        h('button', { class: 'btn primary', type: 'button', id: 'end-year-btn', onclick: tryEnd }, last ? 'Finish the game' : 'Sleep — end the year')));
  }

  app.screenRefresh = () => { renderUpgrades(); renderSleep(); };
  app.open({ title: 'Home', theme: 'home', body: h('div', { class: 'two-col home-screen' }, sleepBox, upBox) });
  renderUpgrades(); renderSleep();
}

function endYear(app) {
  const s = app.state;
  const r = E.advanceYear(s);
  app.setTutorial(99);
  app.save();
  app.renderHud();
  const gain = r.netAfter - r.netBefore;
  sound(gain >= 0 ? 'tada' : 'bad');

  const names = Object.fromEntries([...STOCKS, ...BONDS].map((x) => [x.id, x]));
  const movers = [...r.movers].filter((m) => !names[m.id].index).sort((a, b) => b.change - a.change);
  const mine = r.movers.filter((m) => m.owned > 0);
  const moverRow = (m) => {
    const c = pct(m.change);
    return h('li', { class: m.owned ? 'mine' : '' }, h('span', {}, names[m.id].name), h('b', { class: c.cls }, c.text));
  };

  const lines = [];
  if (r.event) lines.push([r.event.text, `${r.event.amount >= 0 ? '+' : '−'}${money(Math.abs(r.event.amount))}`, r.event.amount >= 0 ? 'up' : 'down']);
  if (r.shiftPay) lines.push(['Lemonade stand', `+${money(r.shiftPay)}`, 'up']);
  if (r.minePay) lines.push(['Mine shift', `+${money(r.minePay)}`, 'up']);
  if (r.fishPay) lines.push(['Fishing', `+${money(r.fishPay)}`, 'up']);
  if (r.helperPay) lines.push(['Your helper\'s sales', `+${money(r.helperPay)}`, 'up']);
  if (r.homePay) lines.push(['Home upgrades (garden, solar)', `+${money(r.homePay)}`, 'up']);
  if (r.savingsInterest) lines.push(['Savings interest', `+${money(r.savingsInterest)}`, 'up']);
  if (r.coupons) lines.push(['Bond payments', `+${money(r.coupons)}`, 'up']);
  if (r.loanInterest) lines.push(['Loan interest (added to your debt)', `−${money(r.loanInterest)}`, 'down']);
  for (const id of r.justDefaulted) lines.push([`${names[id].name} stopped paying`, '', 'down']);

  app.open({
    modal: true, closable: false, theme: 'results',
    body: h('div', { class: 'results' },
      homeScene(app.color(), true),
      h('h2', {}, `Good morning! Year ${r.year} recap`),
      h('div', { class: 'paper' }, h('small', { class: 'paper-head' }, 'What happened'), h('p', { class: 'headline' }, r.outcome)),
      h('div', { class: 'worth-change' },
        h('div', {}, h('small', {}, 'Net worth before'), h('b', {}, money(r.netBefore))),
        h('span', { class: 'arrow' }, '→'),
        h('div', {}, h('small', {}, 'Net worth now'), h('b', {}, money(r.netAfter))),
        h('b', { class: `delta ${gain >= 0 ? 'up' : 'down'}` }, `${gain >= 0 ? '+' : '−'}${money(Math.abs(E.round2(gain)))}`)),
      lines.length ? h('ul', { class: 'money-lines' }, ...lines.map(([t, v, c]) => h('li', {}, h('span', {}, t), h('b', { class: c }, v)))) : null,
      h('div', { class: 'movers' },
        h('div', {}, h('h4', {}, 'Best this year'), h('ul', {}, ...movers.slice(0, 3).map(moverRow))),
        h('div', {}, h('h4', {}, 'Worst this year'), h('ul', {}, ...movers.slice(-3).reverse().map(moverRow))),
        mine.length ? h('div', {}, h('h4', {}, 'Your stocks'), h('ul', {}, ...mine.map(moverRow))) : null),
      r.lesson ? h('div', { class: 'lesson-card' }, h('b', {}, 'Tip'), h('p', {}, r.lesson)) : null,
      h('button', { class: 'btn primary', type: 'button', id: 'next-year-btn', onclick: () => { sound('click'); app.close(); app.nextYearStarted(); } },
        r.finished ? 'See my final score' : `Start Year ${r.year + 1} ▶`)),
  });
  setTimeout(() => moneyPop(gain, document.querySelector('.delta')), 250);
}
