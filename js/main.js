// Sprout City: wires the town, the HUD, and the building screens together.
import * as E from './engine.js';
import { SETTINGS } from './scenarios.js';
import { h, money, sound, toast, isMuted, setMuted } from './ui.js';
import { createTown } from './town.js';
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

  // Show a full-screen building view (or a centered card with modal: true).
  open({ title, emoji, theme = 'default', body, modal = false, closable = true, onClose }) {
    this.town?.pause();
    overlay.innerHTML = '';
    overlay.className = `overlay show ${modal ? 'is-modal' : 'is-screen'} theme-${theme}`;
    const close = () => { this.close(); onClose?.(); };
    const head = modal ? null : h('header', { class: 'screen-head' },
      h('h2', {}, h('span', { class: 'head-emoji' }, emoji), title),
      h('div', { class: 'head-right' },
        h('span', { class: 'pill cash-pill', id: 'screen-cash' }, `💵 Cash: ${money(this.state.cash)}`),
        closable ? h('button', { class: 'btn leave', onclick: () => { sound('door'); close(); } }, '🚪 Leave') : null));
    const panel = h('div', { class: modal ? 'modal-card pop' : 'screen slide-up' }, head, h('div', { class: 'screen-body' }, body));
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
    const cash = document.getElementById('screen-cash');
    if (cash) cash.textContent = `💵 Cash: ${money(this.state.cash)}`;
    this.screenRefresh?.();
    this.save();
  },

  // Run an engine action; show the error kindly if it fails.
  act(result, goodSound = 'coin') {
    if (!result.ok) { sound('bad'); toast(`🙈 ${result.error}`, 'error'); return false; }
    sound(goodSound);
    this.refresh();
    return true;
  },

  lessonOnce(key, text) {
    if (this.seenLessons.has(key)) return;
    this.seenLessons.add(key);
    toast(`💡 ${text}`, 'lesson');
    this.save();
  },

  renderHud() {
    const s = this.state;
    if (!s) { hud.innerHTML = ''; return; }
    const year = Math.min(s.year, SETTINGS.years);
    hud.innerHTML = '';
    hud.append(
      h('div', { class: 'hud-left' },
        h('span', { class: 'hud-avatar' }, s.avatar),
        h('div', { class: 'hud-name' }, h('b', {}, s.nickname), h('small', {}, 'Sprout City')),
        h('div', { class: 'year-badge' }, `📅 Year ${year} of ${SETTINGS.years}`,
          h('span', { class: 'year-dots' }, ...Array.from({ length: SETTINGS.years }, (_, i) => h('i', { class: i < year - 1 ? 'done' : i === year - 1 ? 'now' : '' }))))),
      h('div', { class: 'hud-stats' },
        stat('💵', 'Cash', money(s.cash)),
        stat('📊', 'Net worth', money(E.netWorth(s)), 'big'),
        s.debt > 0 ? stat('💳', 'You owe', money(s.debt), 'owe') : null),
      h('div', { class: 'hud-actions' },
        h('button', { class: 'btn small ghost', title: 'Read the news', onclick: () => this.enter('news') }, '📰 News'),
        h('button', { class: 'btn small', title: 'Go to the Town Clock to end the year', onclick: () => this.enter('clock') }, '🕰️ End Year'),
        h('button', { class: 'btn small ghost icon', title: isMuted() ? 'Sound off' : 'Sound on', 'aria-label': 'Toggle sound',
          onclick: () => { setMuted(!isMuted()); this.renderHud(); } }, isMuted() ? '🔇' : '🔊')));
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
      '👣 Use the arrow keys (or tap the map) to walk. Visit the 🏦 Bank!',
      '👍 Nice! Now walk to the 📈 Stock Exchange to buy stocks and bonds.',
      '🕰️ When you\'re done for the year, walk into the Town Clock to end the year.',
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
      this.town = createTown(document.getElementById('town'), { avatar: state.avatar, onEnter: (id) => this.enter(id) });
    } else this.town.setAvatar(state.avatar);
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

function stat(icon, label, value, cls = '') {
  return h('div', { class: `stat ${cls}` }, h('small', {}, `${icon} ${label}`), h('b', {}, value));
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlay._close) { sound('door'); overlay._close(); }
});

window.sproutApp = app; // handy for testing in the browser console
showStart(app);
