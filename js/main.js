// Sprout City: wires the town, the top bar, and the building screens together.
import * as E from './engine.js';
import { SETTINGS, STOCKS } from './scenarios.js';
import { h, money, sound, toast, isMuted, setMuted, countBetween, isMusicOn, setMusic } from './ui.js';
import { createTown } from './town.js';
import { showStart } from './screens/start.js';
import { bankScreen } from './screens/bank.js';
import { exchangeScreen } from './screens/exchange.js';
import { newsScreen, yearNewsPopup } from './screens/news.js';
import { homeScreen } from './screens/home.js';
import { lemonadeScreen } from './screens/lemonade.js';
import { mineScreen } from './screens/mine.js';
import { fishScreen } from './screens/fish.js';
import { eventCard } from './screens/event.js';
import { endScreen } from './screens/end.js';

const SAVE_KEY = 'sprout-city-save';
const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');

// Tutorial: visit these in order on Year 1.
const TUTORIAL = [
  ['bank', 'Walk with the arrow keys or WASD (or tap the map). Start at the BANK.'],
  ['exchange', 'Next, visit the STOCK EXCHANGE to buy stocks and bonds.'],
  ['lemonade', 'Now run your LEMONADE stand to earn some money.'],
  ['mine', 'Next, work a shift at the MINE and dig for ore.'],
  ['dock', 'Then head to the DOCK by the pond and go fishing.'],
  ['home', 'Done for the year? Walk HOME to sleep and start the next year.'],
];

export const playerColor = (s) => (/^#[0-9a-f]{6}$/i.test(s.avatar) ? s.avatar : '#3E7AB8');

export const app = {
  state: null,
  town: null,
  color() { return playerColor(this.state); },
  tutorial: 0,
  seenLessons: new Set(),
  screenRefresh: null,

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ state: this.state, tutorial: this.tutorial, seen: [...this.seenLessons] })); }
    catch { /* storage blocked: the game still works, it just can't resume after a refresh */ }
  },
  loadSave() {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } },

  // A building fills the screen (or a centered box with modal: true).
  open({ title, theme = 'default', body, modal = false, closable = true, onClose }) {
    this.town?.pause();
    overlay.innerHTML = '';
    overlay.className = `overlay show ${modal ? 'is-modal' : 'is-screen'} theme-${theme}`;
    const close = () => { this.close(); onClose?.(); };
    const head = modal ? null : h('header', { class: 'box screen-head' },
      h('h1', {}, title),
      h('div', { class: 'head-right' },
        h('span', { class: 'chip cash-chip', id: 'screen-cash' }, `Cash ${money(this.state.cash)}`),
        closable ? h('button', { class: 'btn leave', type: 'button', onclick: () => { sound('door'); close(); } }, 'Leave ✕') : null));
    const panel = modal
      ? h('div', { class: 'box modal-card pop' }, body)
      : h('div', { class: 'screen' }, head, h('div', { class: 'screen-body' }, body));
    overlay.append(panel);
    overlay._close = closable ? close : null;
    panel.querySelector('button.primary, input')?.focus({ preventScroll: true });
  },
  close() {
    overlay.className = 'overlay';
    overlay.innerHTML = '';
    overlay._close = null;
    this.screenRefresh = null;
    if (this.state && !this.state.finished) this.town?.resume();
  },

  refresh() {
    this.renderHud();
    this.updateTown();
    const cash = document.getElementById('screen-cash');
    if (cash && cash.textContent !== `Cash ${money(this.state.cash)}`) {
      cash.textContent = `Cash ${money(this.state.cash)}`;
      cash.classList.remove('bump'); void cash.offsetWidth; cash.classList.add('bump');
    }
    this.screenRefresh?.();
    this.save();
  },

  // Tell the town what's happening this year: season, hot tip, lemonade stand, ticker prices.
  updateTown() {
    const s = this.state;
    if (!this.town || !s) return;
    const year = Math.min(s.year, SETTINGS.years), i = year - 1;
    const ev = E.getScenario(s.scenarioId).years[i] || {};
    const season = ev.season || ['spring', 'summer', 'fall', 'winter'][i % 4];
    const ticker = STOCKS.map((st) => {
      const p = E.stockPrice(s, st.id, i), prev = i > 0 ? E.stockPrice(s, st.id, i - 1) : p;
      const c = Math.round((p / prev - 1) * 100);
      return { t: st.ticker, p: money(p), c: i === 0 ? 'NEW' : c === 0 ? '0%' : `${c > 0 ? '▲' : '▼'}${Math.abs(c)}%`, up: i > 0 && c > 0, down: c < 0 };
    });
    const biz = E.ensureBiz(s);
    this.town.setWorld({ name: s.nickname, season, tip: !!ev.tip, shiftDone: E.shiftDone(s) || s.finished, helper: !!biz.owned.helper,
      recipe: !!biz.owned.recipe, bigStand: !!biz.owned.stand, savings: s.savings > 0, ticker, casts: s.finished ? 0 : E.castsLeft(s) });
  },

  // Run an engine action; show the problem kindly if it fails.
  act(result, goodSound = 'coin') {
    if (!result.ok) { sound('bad'); toast(result.error, 'error'); return false; }
    sound(goodSound);
    this.refresh();
    return true;
  },

  lessonOnce(key, text) {
    if (this.seenLessons.has(key)) return;
    this.seenLessons.add(key);
    toast(text, 'lesson');
    this.save();
  },

  renderHud() {
    const s = this.state;
    if (!s) { hud.innerHTML = ''; return; }
    const year = Math.min(s.year, SETTINGS.years);
    const worth = E.netWorth(s);
    const growth = Math.round((worth / SETTINGS.startingCash - 1) * 100);
    hud.replaceChildren(...[
      h('b', { class: 'hud-title' }, 'Sprout City'),
      h('span', { class: 'chip' }, `Year ${year} of ${SETTINGS.years}`),
      h('span', { class: 'grow' }),
      stat('Cash', h('span', { id: 'hud-cash' }, money(this._shown?.cash ?? s.cash))),
      stat('Net worth', h('span', { id: 'hud-worth' }, money(Math.round(this._shown?.worth ?? worth))), h('span', { class: growth >= 0 ? 'up' : 'down' }, ` ${growth >= 0 ? '+' : ''}${growth}%`)),
      s.debt > 0 ? stat('Debt', money(s.debt), null, 'owe') : null,
      h('button', { class: 'btn small', type: 'button', onclick: () => this.enter('news') }, 'News'),
      h('button', { class: 'btn small primary', type: 'button', title: 'Go home and end the year', onclick: () => this.enter('home') }, 'End year ▶'),
      h('button', { class: 'btn small', type: 'button', 'aria-label': 'Toggle sound effects', title: 'Sound effects', onclick: () => { setMuted(!isMuted()); this.renderHud(); } },
        isMuted() ? 'Sound: off' : 'Sound: on'),
      h('button', { class: 'btn small', type: 'button', 'aria-label': 'Toggle music', title: 'Background music', onclick: () => { setMusic(!isMusicOn()); this.renderHud(); } },
        isMusicOn() ? 'Music: on' : 'Music: off')].filter(Boolean));
    // numbers roll to their new value instead of jumping
    const prev = this._shown || { cash: s.cash, worth };
    countBetween(document.getElementById('hud-cash'), prev.cash, s.cash);
    countBetween(document.getElementById('hud-worth'), Math.round(prev.worth), Math.round(worth), 600, (v) => money(Math.round(v)));
    this._shown = { cash: s.cash, worth };
    document.documentElement.style.setProperty('--hud-h', `${hud.offsetHeight}px`);
  },

  enter(id) {
    if (!this.state || this.state.finished) return;
    sound('door');
    if (id === 'bank') bankScreen(this);
    else if (id === 'exchange') exchangeScreen(this);
    else if (id === 'news') newsScreen(this);
    else if (id === 'lemonade') lemonadeScreen(this);
    else if (id === 'mine') mineScreen(this);
    else if (id === 'dock') fishScreen(this);
    else if (id === 'home') homeScreen(this);
    if (TUTORIAL[this.tutorial]?.[0] === id && id !== 'home') this.setTutorial(this.tutorial + 1);
  },

  setTutorial(n) {
    this.tutorial = n;
    const bar = document.getElementById('tutorial');
    bar.textContent = TUTORIAL[n]?.[1] || '';
    bar.classList.toggle('show', n < TUTORIAL.length);
    this.town?.setGuide(TUTORIAL[n]?.[0] || null);
    this.save();
  },

  startGame(state, tutorial = 0, seen = []) {
    E.ensureBiz(state);
    E.applyEvent(state); // this year's life event (only happens once per year)
    this.state = state;
    this.seenLessons = new Set(seen);
    document.body.classList.add('playing');
    this._shown = null;
    if (isMusicOn()) setMusic(true); // the Start click counts as the user gesture audio needs
    if (!this.town) this.town = createTown(document.getElementById('town'), { color: playerColor(state), onEnter: (id) => this.enter(id) });
    else this.town.setColor(playerColor(state));
    this.town.resize();
    this.updateTown();
    this.setTutorial(Math.min(tutorial, TUTORIAL.length));
    this.refresh();
    if (state.finished) return endScreen(this);
    yearNewsPopup(this);
  },

  // After the year's news, show this year's life event card (once).
  showEvent() {
    const ev = this.state && !this.state.finished ? E.applyEvent(this.state) : null;
    if (!ev || ev.shown) return;
    ev.shown = true;
    this.save();
    eventCard(this, ev);
  },

  nextYearStarted() {
    E.applyEvent(this.state);
    this.refresh();
    if (this.state.finished) return endScreen(this); // the save is kept so a refresh still shows the results
    yearNewsPopup(this);
  },

  playAgain() {
    this.clearSave();
    this.state = null;
    document.body.classList.remove('playing');
    this.renderHud();
    showStart(this);
  },
};

function stat(label, value, extra = null, cls = '') {
  return h('span', { class: `stat ${cls}` }, h('small', {}, label), h('b', {}, value, extra));
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlay._close) { sound('door'); overlay._close(); }
});

window.sproutApp = app; // handy for testing in the browser console
showStart(app);
