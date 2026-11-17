// Sprout City: wires the town, the HUD, and the building screens together.
import * as E from './engine.js';
import { SETTINGS } from './scenarios.js';
import { h, money, sound, toast, isMuted, setMuted } from './ui.js';
import { createTown } from './town.js';
import { icon } from './icons.js';
import { showStart } from './screens/start.js';
import { bankScreen } from './screens/bank.js';
import { exchangeScreen } from './screens/exchange.js';
import { newsScreen, yearNewsPopup } from './screens/news.js';
import { clockScreen } from './screens/clock.js';
import { endScreen } from './screens/end.js';

const SAVE_KEY = 'sprout-city-save';
const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');

export const app = {
  state: null,
  town: null,
  tutorial: 0, // 0 = go to bank, 1 = go to exchange, 2 = go to clock, 3 = done
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

  // Show a building's side panel (or a centered card with modal: true).
  open({ title, icon: iconName, theme = 'default', body, modal = false, closable = true, onClose }) {
    this.town?.pause();
    overlay.innerHTML = '';
    overlay._back = null;
    overlay.className = `overlay show ${modal ? 'is-modal' : 'is-panel'} theme-${theme}`;
    const close = () => { this.close(); onClose?.(); };
    const head = modal ? null : h('header', { class: 'panel-head' },
      h('h2', {}, iconName ? icon(iconName, 22, 'head-icon') : null, title),
      h('div', { class: 'head-right' },
        h('span', { class: 'cash-chip', id: 'screen-cash' }, `Cash ${money(this.state.cash)}`),
        closable ? h('button', { class: 'icon-btn leave', 'aria-label': 'Close', title: 'Close (Esc)', onclick: () => { sound('door'); close(); } }, icon('close', 18)) : null));
    const panel = h(modal ? 'div' : 'aside', { class: modal ? 'modal-card pop' : 'panel slide-panel' }, head, h('div', { class: 'panel-body' }, body));
    overlay.append(panel);
    overlay._close = closable ? close : null;
    if (!modal && closable) overlay.onclick = (e) => { if (e.target === overlay) { sound('door'); close(); } };
    else overlay.onclick = null;
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
    const cash = document.getElementById('screen-cash');
    if (cash) cash.textContent = `Cash ${money(this.state.cash)}`;
    this.screenRefresh?.();
    this.save();
  },

  // Run an engine action; show the error kindly if it fails.
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
    const growth = worth / SETTINGS.startingCash - 1;
    const g = pctText(growth);
    hud.replaceChildren(
      h('div', { class: 'hud-brand' },
        h('b', {}, 'Sprout City'),
        h('span', { class: 'hud-player' }, h('i', { class: 'player-dot', style: `background:${playerColor(s)}` }), s.nickname)),
      h('div', { class: 'hud-year' },
        h('span', {}, 'Year ', h('b', {}, String(year)), ` of ${SETTINGS.years}`),
        h('span', { class: 'year-track' }, ...Array.from({ length: SETTINGS.years }, (_, i) =>
          h('i', { class: i < year - 1 ? 'done' : i === year - 1 ? 'now' : '' })))),
      h('div', { class: 'hud-stats' },
        stat('Cash', money(s.cash)),
        stat('Net worth', money(worth), 'worth', h('span', { class: `chg ${g.cls}` }, g.text)),
        s.debt > 0 ? stat('Debt', money(s.debt), 'owe') : null),
      h('div', { class: 'hud-actions' },
        h('button', { class: 'btn ghost small', title: 'Read the news', onclick: () => this.enter('news') }, icon('news', 16), 'News'),
        h('button', { class: 'btn primary small', title: 'End the year', onclick: () => this.enter('clock') }, 'End year', icon('forward', 14)),
        h('button', { class: 'icon-btn', title: isMuted() ? 'Sound off' : 'Sound on', 'aria-label': 'Toggle sound',
          onclick: () => { setMuted(!isMuted()); this.renderHud(); } }, icon(isMuted() ? 'mute' : 'sound', 18))));
  },

  enter(id) {
    if (!this.state || this.state.finished) return;
    sound('door');
    if (id === 'bank') bankScreen(this);
    else if (id === 'exchange') exchangeScreen(this);
    else if (id === 'news') newsScreen(this);
    else if (id === 'clock') clockScreen(this);
    if (this.tutorial === 0 && id === 'bank') this.setTutorial(1);
    else if (this.tutorial === 1 && id === 'exchange') this.setTutorial(2);
  },

  setTutorial(n) {
    this.tutorial = n;
    const tips = [
      'Walk with the arrow keys or WASD, or tap the map. Start at the Bank.',
      'Next, head to the Stock Exchange to buy stocks and bonds.',
      'When you\'re done for the year, walk into the Town Clock.',
    ];
    const bar = document.getElementById('tutorial');
    bar.textContent = tips[n] || '';
    bar.classList.toggle('show', n < 3);
    this.town?.setGuide(['bank', 'exchange', 'clock'][n] || null);
    this.save();
  },

  startGame(state, tutorial = 0, seen = []) {
    this.state = state;
    this.seenLessons = new Set(seen);
    document.body.classList.add('playing');
    if (!this.town) {
      this.town = createTown(document.getElementById('town'), { color: playerColor(state), onEnter: (id) => this.enter(id) });
    } else this.town.setColor(playerColor(state));
    this.town.resize();
    this.setTutorial(tutorial);
    this.refresh();
    if (state.finished) return endScreen(this);
    yearNewsPopup(this);
  },

  nextYearStarted() {
    this.refresh();
    if (this.state.finished) return endScreen(this); // save is kept so a refresh still shows the results
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

export const playerColor = (s) => (/^#[0-9a-f]{6}$/i.test(s.avatar) ? s.avatar : '#C4613F');
function pctText(c) {
  const p = Math.round(c * 1000) / 10;
  return { text: `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`, cls: p > 0 ? 'up' : p < 0 ? 'down' : 'flat' };
}
function stat(label, value, cls = '', extra = null) {
  return h('div', { class: `stat ${cls}` }, h('small', {}, label), h('b', {}, value), extra);
}

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (overlay._back) { overlay._back(); return; }
  if (overlay._close) { sound('door'); overlay._close(); }
});

window.sproutApp = app; // handy for testing in the browser console
showStart(app);
