// The Dock: 3 casts a year. Each right answer sends the lure one band deeper (with a harder
// question); the first wrong answer stops it. Then reel up and steer the hook into fish on the
// way back. Your rod holds a few, so dodge the junk and grab the deep ones.
import * as E from '../engine.js';
import { SETTINGS } from '../scenarios.js';
import { h, money, sound, toast } from '../ui.js';
import { drawPerson } from '../town.js';

const F = SETTINGS.fish, NB = F.bands.length;
// The lake is much taller than the view: a camera follows the lure, and dark water hides the levels below it.
const W = 192, WT = 36, BH = 44, VH = 150, WH = WT + NB * BH + 8, SC = 4;
const LX = 116, TIP = [74, 4];
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const WATER = ['#5E97C0', '#4F86B0', '#3F72A0', '#325F8C', '#264C74', '#1B3A5C'];
const LOOK = { // per band: body, belly/stripe, length
  Minnow: ['#B9C6CF', '#E4ECF0', 8], Perch: ['#C9B44A', '#6E7A34', 9], Bass: ['#5E8A4A', '#A8C47A', 11],
  Catfish: ['#7A6A5A', '#B4A48E', 12], Pike: ['#6E8E6A', '#D8E4B0', 14], 'Golden Koi': ['#F2B23C', '#FFF0A8', 12],
};
const bandMid = (b) => WT + b * BH + BH / 2;

export function fishScreen(app) {
  const s = app.state;
  const yearCasts = () => (s.fish || {})[s.year] || [];
  const left = () => (s.finished ? 0 : E.castsLeft(s));
  let school = E.fishSchool(s);
  let phase = 'ready', answers = [], caught = [], lastResult = null, feedback = null;
  const lure = { x: TIP[0], y: TIP[1], ty: TIP[1] };
  let hookX = LX, target = null, castT = 0, camY = 0, fogTop = WT + BH;
  const keys = {};
  const pops = [], bubbles = [];
  const pos = new Map(); // live fish positions (x in px)

  // ---------- saving: a refresh can't reroll anything ----------
  const save = () => { s.fishTrip = { year: s.year, cast: yearCasts().length, answers: [...answers], caught: [...caught], phase }; app.save(); };
  const saved = s.fishTrip && s.fishTrip.year === s.year && s.fishTrip.cast === yearCasts().length && left() > 0 ? s.fishTrip : null;
  if (saved) {
    answers = [...saved.answers]; caught = [...saved.caught];
    if (saved.phase === 'reel') { phase = 'bank'; }
    else if (answers.length || saved.phase === 'question') {
      const p = E.castProgress(s, answers);
      if (p.finished) { phase = 'stopped'; feedback = feedbackFor(p); } else phase = 'question';
      lure.x = LX; lure.y = lure.ty = bandMid(Math.min(p.depth, NB) - 1);
    }
  }
  function resetPositions() { pos.clear(); for (const f of school) pos.set(f.id, { x: f.x * W, dir: f.dir }); }
  resetPositions();

  let progCache = null, progKey = '';
  const progress = () => { const k = answers.join(','); if (k !== progKey || !progCache) { progCache = E.castProgress(s, answers); progKey = k; } return progCache; };
  const currentQuestion = () => { const p = progress(); return E.fishQuestion(s, answers.length + 1, p.asked); };
  function feedbackFor(p) {
    if (p.perfect) return { perfect: true };
    const k = answers.length;
    const q = E.fishQuestion(s, k, E.castProgress(s, answers.slice(0, -1)).asked);
    return { q, picked: answers[k - 1] };
  }

  // ---------- actions ----------
  function cast() {
    if (phase !== 'ready' || left() <= 0) return;
    school = E.fishSchool(s); resetPositions();
    answers = []; caught = []; feedback = null; lastResult = null;
    phase = 'casting'; castT = 0; sound('pop');
    save(); renderSide();
  }
  function answer(orig) {
    if (phase !== 'question') return;
    const q = currentQuestion();
    answers.push(orig);
    const p = progress();
    if (orig === q.answer) {
      sound('coin');
      pops.push({ x: LX + 10, y: lure.y, t: 0, text: 'Right!', col: '#B8E07A' });
      if (p.finished) { phase = 'stopped'; feedback = { perfect: true }; sound('tada'); }
      else { lure.ty = bandMid(answers.length); phase = 'sinking'; }
    } else {
      sound('bad');
      pops.push({ x: LX + 10, y: lure.y, t: 0, text: 'Stop!', col: '#F2A08A' });
      phase = 'stopped'; feedback = { q, picked: orig };
    }
    save(); renderSide();
  }
  function reel() {
    if (phase !== 'stopped') return;
    phase = 'reel'; hookX = LX; target = null; sound('click');
    save(); renderSide();
    canvas.focus();
  }
  function bank() {
    const r = E.runCast(s, { answers, caught });
    if (!r.ok) { toast(r.error, 'error'); phase = 'ready'; renderSide(); return; }
    lastResult = r;
    s.fishTrip = null;
    app.refresh();
    sound(r.earned > 0 ? 'tada' : 'click');
    if (r.earned > 0) toast(`Nice catch! +${money(r.earned)}`);
    phase = 'summary';
    lure.x = TIP[0]; lure.y = lure.ty = TIP[1];
    if (yearCasts().length === 1) app.lessonOnce('fishIncome', 'Every right answer took your lure deeper, where the fish are worth more. Knowing more pays — in fishing and with real money.');
    renderSide();
  }
  function next() { if (phase === 'summary') { phase = 'ready'; renderSide(); } }

  // ---------- drawing ----------
  const canvas = h('canvas', { class: 'fish-canvas', width: W * SC, height: VH * SC, tabindex: '0',
    'aria-label': 'The river. Cast your line, answer questions to go deeper, then steer the hook into fish on the way up.' });
  const g = canvas.getContext('2d');
  const R = (x, y, w, hh, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, hh); };
  const yi = Math.min(s.year, SETTINGS.years) - 1;
  const season = E.getScenario(s.scenarioId).years[yi]?.season || ['spring', 'summer', 'fall', 'winter'][yi % 4];
  const winter = () => season === 'winter';

  function drawItem(f, x, y, hooked = false) {
    const dir = hooked ? 1 : pos.get(f.id)?.dir || 1;
    if (f.junk) {
      if (f.name === 'Old Boot') { R(x - 4, y - 3, 5, 5, '#6B4A30'); R(x - 4, y + 1, 9, 3, '#5A3A28'); R(x - 3, y - 2, 2, 1, '#8A6440'); }
      else if (f.name === 'Tin Can') { R(x - 3, y - 4, 6, 8, '#9AA0A8'); R(x - 3, y - 1, 6, 3, '#C9503E'); R(x - 3, y - 4, 6, 1, '#D6DAE0'); }
      else { for (let k = 0; k < 3; k++) R(x - 3 + k * 3, y - 5 + (k % 2) * 2, 2, 9 - (k % 2) * 2, '#3E7A3A'); }
      return;
    }
    const [body, belly, len] = LOOK[f.name] || LOOK.Minnow;
    const hl = Math.floor(len / 2), dx = dir;
    R(x - hl, y - 2, len, 5, body); R(x - hl + 1, y - 3, len - 2, 7, body);
    R(x - hl + 2, y + 1, len - 4, 2, belly);
    if (f.name === 'Perch') for (let k = 0; k < 3; k++) R(x - hl + 3 + k * 2, y - 2, 1, 4, belly);
    const tailX = dx > 0 ? x - hl - 3 : x + hl;
    R(tailX, y - 3, 3, 2, body); R(tailX, y + 2, 3, 2, body); R(tailX + (dx > 0 ? 1 : 0), y - 1, 2, 3, body);
    const eyeX = dx > 0 ? x + hl - 3 : x - hl + 2;
    R(eyeX, y - 1, 1, 1, '#14110E');
    if (f.name === 'Catfish') { R(dx > 0 ? x + hl : x - hl - 3, y + 1, 3, 1, '#4A3E32'); }
    if (f.name === 'Golden Koi' && !REDUCED && Math.floor(performance.now() / 300) % 3 === 0) R(x - 1, y - 5, 1, 1, '#FFFFFF');
  }

  // which levels you can see: the one your lure is in (or the deepest it reached), and everything above
  const visibleDepth = () => {
    if (phase === 'stopped' || phase === 'reel' || phase === 'bank') return progress().depth;
    if (phase === 'question' || phase === 'sinking') return Math.min(NB, answers.length + 1);
    return 1;
  };
  const lureLevel = () => Math.max(1, Math.min(NB, Math.floor((lure.y - WT) / BH) + 1));

  function draw(time) {
    const t = time / 1000, dt = 1 / 60;
    // lure motion
    if (phase === 'casting') {
      castT += dt;
      const k = Math.min(1, castT / 0.7);
      lure.x = TIP[0] + (LX - TIP[0]) * k; lure.y = TIP[1] + (WT - TIP[1]) * k - Math.sin(k * Math.PI) * 14;
      if (k >= 1) { if (lure.ty < WT) { lure.ty = bandMid(0); sound('pop'); for (let i = 0; i < 6; i++) bubbles.push({ x: LX + (Math.random() - 0.5) * 8, y: WT + 2, t: 0 }); } lure.y = WT; phase = 'sinking'; }
    } else if (phase === 'sinking') {
      lure.x = LX; lure.y = Math.min(lure.ty, lure.y + 60 * dt);
      if (!REDUCED && Math.random() < 0.3) bubbles.push({ x: LX + (Math.random() - 0.5) * 4, y: lure.y, t: 0 });
      if (lure.y >= lure.ty) { phase = 'question'; save(); renderSide(); }
    } else if (phase === 'reel') {
      const sp = 70 * dt;
      if (keys.left) hookX -= sp; if (keys.right) hookX += sp;
      if (target != null && !keys.left && !keys.right) hookX += Math.max(-sp * 1.6, Math.min(sp * 1.6, target - hookX));
      hookX = Math.max(6, Math.min(W - 6, hookX));
      lure.x = hookX; lure.y -= (BH / 1.5) * dt;
      // hook anything you touch (until the rod is full)
      if (caught.length < E.rodCapacity(s)) for (const f of school) {
        if (caught.includes(f.id) || f.band >= progress().depth) continue;
        const p = pos.get(f.id), fy = WT + f.band * BH + f.y * BH;
        if (Math.abs(p.x - lure.x) < 7 && Math.abs(fy - lure.y) < 5) {
          caught.push(f.id); save(); renderSide();
          sound(f.junk ? 'bad' : 'coin');
          pops.push({ x: Math.min(W - 16, Math.max(16, lure.x)), y: lure.y - 4, t: 0, text: f.junk ? f.name : `+${money(f.value)}`, col: f.junk ? '#D6DAE0' : '#F2D45C' });
          if (caught.length >= E.rodCapacity(s)) break;
        }
      }
      if (lure.y <= WT) { lure.y = WT; bank(); }
    } else if (phase === 'bank') { bank(); }
    // camera follows the lure (back at the surface between casts)
    const atSurface = phase === 'ready' || phase === 'summary' || phase === 'casting';
    const camTarget = atSurface ? 0 : Math.max(0, Math.min(WH - VH, lure.y - VH * 0.45));
    camY = REDUCED ? camTarget : camY + (camTarget - camY) * Math.min(1, dt * 4);
    const fogTarget = WT + visibleDepth() * BH;
    fogTop = REDUCED || fogTarget < fogTop ? fogTarget : fogTop + (fogTarget - fogTop) * Math.min(1, dt * 2.5);
    g.setTransform(SC, 0, 0, SC, 0, -Math.round(camY * SC));
    // sky and far shore
    R(0, 0, W, WT, '#BFE0F2'); R(0, WT - 8, W, 8, winter() ? '#E6EDF2' : '#7FB06A'); R(0, WT - 9, W, 1, winter() ? '#FFFFFF' : '#5E9440');
    for (const [cx, cy] of [[120, 8], [160, 14]]) { R(cx, cy, 16, 4, '#FFFFFF'); R(cx + 4, cy - 2, 8, 3, '#FFFFFF'); }
    // water bands
    for (let b = 0; b < NB; b++) {
      R(0, WT + b * BH, W, BH, WATER[b]);
      if (b > 0) R(0, WT + b * BH, W, 1, 'rgba(255,255,255,.06)');
    }
    R(0, WT + NB * BH, W, WH - WT - NB * BH, '#7A6A4A');
    for (let x = 3; x < W; x += 11) R(x, WH - 4, 4, 1, '#9A8A64');
    if (winter()) { R(0, WT, W, 3, '#D4E6F1'); R(LX - 8, WT, 16, 3, WATER[0]); }
    else for (let x = (t * 6) % 14; x < W; x += 14) R(x, WT + 1, 5, 1, 'rgba(255,255,255,.35)');
    // fish swim
    for (const f of school) {
      if (caught.includes(f.id)) continue;
      const p = pos.get(f.id);
      if (!REDUCED || phase === 'reel') p.x += p.dir * f.speed * W * dt * (REDUCED ? 0.6 : 1);
      if (p.x < -12) p.x = W + 12; if (p.x > W + 12) p.x = -12;
      drawItem(f, p.x, WT + f.band * BH + f.y * BH);
    }
    // dark water below the levels you've reached: you can't see what's waiting down there
    const ft = Math.round(fogTop);
    const fog = g.createLinearGradient(0, ft - 14, 0, ft + 1);
    fog.addColorStop(0, 'rgba(6,14,26,0)'); fog.addColorStop(1, 'rgba(6,14,26,1)');
    g.fillStyle = fog; g.fillRect(0, ft - 14, W, 15);
    R(0, ft, W, WH - ft, '#060E1A'); // fully dark: no peeking at the fish below
    // level labels, only for levels you can see
    g.font = '7px "Jersey 10", monospace'; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let b = 0; b < visibleDepth(); b++) {
      const text = `${F.bands[b].name} · ${money(F.bands[b].value)}`, tw = Math.ceil(g.measureText(text).width) + 4;
      R(W - tw - 1, WT + b * BH + 1, tw, 8, 'rgba(242,212,92,.9)');
      g.fillStyle = '#26313F'; g.fillText(text, W - 3, WT + b * BH + 5.5);
    }
    // dock, angler and rod
    R(0, WT - 6, 46, 4, '#8A6440'); for (let x = 1; x < 46; x += 5) R(x, WT - 6, 4, 3, '#B08A55');
    for (const px of [4, 40]) R(px, WT - 2, 3, 12, '#5A3A28');
    R(6, WT - 12, 9, 6, '#6E7480'); R(7, WT - 11, 7, 1, '#9AA0A8'); // bucket
    const inBucket = lastResult ? lastResult.items.length : 0;
    for (let k = 0; k < Math.min(inBucket, 4); k++) R(8 + k * 2, WT - 13 - (k % 2), 2, 2, '#C9B44A');
    drawPerson(g, 30, WT - 6, 'right', 0, app.color());
    g.strokeStyle = '#6B4A30'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(34, WT - 13); g.lineTo(TIP[0], TIP[1]); g.stroke();
    // line + lure
    const atRod = phase === 'ready' || phase === 'summary';
    if (!atRod) {
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(TIP[0], TIP[1]); g.lineTo(lure.x, lure.y); g.stroke();
      R(lure.x - 1, lure.y - 1, 3, 3, '#D0584A'); R(lure.x, lure.y + 2, 1, 2, '#D6DAE0');
      // hooked items dangle under the lure
      caught.forEach((id, k) => { const f = school.find((q) => q.id === id); if (f) drawItem(f, lure.x + (k % 2 ? 4 : -4), lure.y + 7 + k * 6, true); });
    } else {
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(TIP[0], TIP[1]); g.lineTo(TIP[0], TIP[1] + 10); g.stroke();
      R(TIP[0] - 1, TIP[1] + 10, 3, 3, '#D0584A');
    }
    // bubbles and pops
    for (const b of bubbles) { b.t += dt; b.y -= 14 * dt; if (b.y > WT) { g.globalAlpha = Math.max(0, 1 - b.t); R(b.x, b.y, 1, 1, '#DDEFFA'); } }
    g.globalAlpha = 1;
    while (bubbles.length && bubbles[0].t > 1) bubbles.shift();
    g.font = '8px "Jersey 10", monospace'; g.textAlign = 'center';
    for (const p of pops) {
      p.t += dt * 1.2;
      g.globalAlpha = Math.max(0, 1 - p.t);
      g.fillStyle = '#000'; g.fillText(p.text, p.x + 0.5, p.y - p.t * 10 + 0.5);
      g.fillStyle = p.col; g.fillText(p.text, p.x, p.y - p.t * 10);
    }
    g.globalAlpha = 1;
    while (pops.length && pops[0].t > 1) pops.shift();
    // depth badge (fixed in the corner of the view)
    g.setTransform(SC, 0, 0, SC, 0, 0);
    if (!atSurface && lure.y > WT) {
      const n = lureLevel(), text = `Level ${n} · ${F.bands[n - 1].name}`;
      g.font = '8px "Jersey 10", monospace'; g.textAlign = 'left'; g.textBaseline = 'middle';
      const tw = Math.ceil(g.measureText(text).width) + 6;
      R(3, 3, tw + 2, 12, '#26313F'); R(4, 4, tw, 10, '#FBF6EA');
      g.fillStyle = '#26313F'; g.fillText(text, 7, 9.5);
    }
    if (canvas.isConnected) requestAnimationFrame(draw);
  }

  // ---------- side panel ----------
  const side = h('section', { class: 'box fish-side' });
  const hooks = () => h('div', { class: 'cast-row', 'aria-label': `${left()} casts left` },
    ...Array.from({ length: F.casts }, (_, k) => h('i', { class: k < F.casts - left() ? 'used' : '' })));
  const yearTotal = () => yearCasts().reduce((t, c) => t + c.earned, 0);
  const discovered = () => Math.max(1, E.fishStats(s).deepest); // levels you've reached in any cast this game
  const btn = (label, onclick, cls = 'primary', id) => h('button', { class: `btn ${cls}`, type: 'button', id, onclick }, label);

  function renderSide() {
    const kids = [];
    if (phase === 'question') {
      const q = currentQuestion(), depth = answers.length + 1;
      kids.push(h('div', { class: 'q-level' }, h('span', {}, `Level ${depth} · ${F.bands[depth - 1].name}`)));
      kids.push(h('p', { class: 'q-text' }, q.q));
      kids.push(h('div', { class: 'q-choices' }, ...q.order.map((orig, k) =>
        h('button', { class: 'btn q-choice', type: 'button', 'data-choice': String(orig), onclick: () => answer(orig) }, h('kbd', {}, String(k + 1)), q.choices[orig]))));
      kids.push(h('p', { class: 'hint' }, 'Right answer = your lure goes deeper. Wrong = it stops there.'));
    } else if (phase === 'stopped' && feedback) {
      if (feedback.perfect) {
        kids.push(h('h2', {}, `You reached ${F.bands[NB - 1].name}!`));
        kids.push(h('p', { class: 'done-line' }, `Every answer right — that's a ${money(F.perfectBonus)} bonus.`));
      } else {
        const { q, picked } = feedback;
        kids.push(h('h2', {}, 'Not quite!'));
        kids.push(h('p', { class: 'q-text small' }, q.q));
        kids.push(h('p', { class: 'q-wrong' }, 'You picked: ', h('b', {}, q.choices[picked])));
        kids.push(h('p', { class: 'q-right' }, 'Answer: ', h('b', {}, q.choices[q.answer])));
        kids.push(h('p', { class: 'q-why' }, q.why));
      }
      kids.push(h('p', { class: 'hint' }, `Your lure stopped in ${F.bands[progress().depth - 1].name}. Reel in and steer into fish on the way up (← → or drag). Your rod holds ${E.rodCapacity(s)}.`));
      kids.push(h('div', { class: 'btn-row' }, btn('Reel in! ⤒', reel, 'primary', 'fish-reel')));
    } else if (phase === 'reel' || phase === 'bank') {
      kids.push(h('h2', {}, 'Reel in!'));
      kids.push(h('p', {}, 'Steer with ', h('b', {}, '← →'), ' (or drag on the water) to hook fish. Dodge the junk!'));
      kids.push(h('div', { class: 'rod-count' }, h('span', {}, 'On your rod'), h('b', {}, `${caught.length} / ${E.rodCapacity(s)}`)));
      kids.push(catchList(caught));
    } else if (phase === 'summary' && lastResult) {
      kids.push(h('h2', {}, `Cast ${yearCasts().length} of ${F.casts} done!`));
      kids.push(h('div', { class: 'shift-count' }, h('span', {}, 'This cast'), h('b', {}, `+${money(lastResult.earned)}`)));
      kids.push(catchList(lastResult.items.map((f) => f.id)));
      if (lastResult.bonus) kids.push(h('p', { class: 'done-line' }, `Includes a ${money(lastResult.bonus)} bonus for answering everything right!`));
      kids.push(h('div', { class: 'btn-row' }, left() > 0 ? btn('Next cast', next, 'primary', 'fish-next') : btn('Back to town', () => app.close(), 'primary', 'fish-next')));
    } else {
      kids.push(h('h2', {}, left() > 0 ? `Cast ${F.casts - left() + 1} of ${F.casts}` : 'Done fishing for this year'));
      kids.push(hooks());
      if (left() > 0) kids.push(h('div', { class: 'btn-row' }, btn('Cast your line 🎣', cast, 'primary big', 'fish-cast')));
      else kids.push(h('p', { class: 'hint' }, 'The fish will be back next year.'));
    }
    if (phase === 'ready' || phase === 'summary') {
      kids.push(h('div', { class: 'shift-count' }, h('span', {}, 'Caught this year'), h('b', {}, money(yearTotal()))));
      kids.push(h('div', { class: 'mine-rules' },
        h('p', {}, h('b', {}, 'Answer questions to go deeper. '), 'Each right answer drops your lure one level, where fish are worth more. The first wrong answer stops it.'),
        h('p', {}, h('b', {}, 'Then reel up '), `and steer into fish. Your rod holds ${E.rodCapacity(s)} — junk takes a spot and pays nothing.`),
        h('div', { class: 'ore-legend' }, ...F.bands.map((b, i) => (i < discovered()
          ? h('div', {}, h('i', { class: 'ore-dot', style: `background:${(LOOK[b.fish] || LOOK.Minnow)[0]}` }), b.fish, h('b', {}, money(b.value)))
          : h('div', { class: 'unknown' }, h('i', { class: 'ore-dot' }), '???', h('b', {}, '?'))))),
        discovered() < NB ? h('p', { class: 'hint' }, 'Answer your way deeper to find out what lives down there.') : null));
    }
    side.replaceChildren(...kids.filter(Boolean));
  }
  function catchList(ids) {
    const items = ids.map((id) => school.find((f) => f.id === id)).filter(Boolean);
    if (!items.length) return h('p', { class: 'hint' }, 'Nothing hooked yet.');
    return h('div', { class: 'found-row' }, ...items.map((f) => h('span', { class: `chip${f.junk ? ' junk' : ''}` }, `${f.name} ${f.junk ? '$0' : money(f.value)}`)));
  }

  // ---------- input ----------
  const toX = (e) => { const r = canvas.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
  canvas.addEventListener('pointerdown', (e) => { if (phase === 'reel') target = toX(e); else if (phase === 'ready') cast(); });
  canvas.addEventListener('pointermove', (e) => { if (phase === 'reel' && (e.buttons || e.pointerType === 'mouse')) target = toX(e); });
  const onKey = (e) => {
    if (!canvas.isConnected) { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); return; }
    if (e.target.closest('input, select, textarea')) return;
    const k = e.key;
    if (phase === 'reel' && (k === 'ArrowLeft' || k === 'a' || k === 'ArrowRight' || k === 'd')) { e.preventDefault(); keys[k === 'ArrowLeft' || k === 'a' ? 'left' : 'right'] = true; target = null; return; }
    if (phase === 'question' && /^[1-4]$/.test(k)) {
      const q = currentQuestion(), orig = q.order[Number(k) - 1];
      if (orig != null) { e.preventDefault(); answer(orig); }
      return;
    }
    if ((k === ' ' || k === 'Enter') && !e.target.closest('button')) {
      e.preventDefault();
      if (phase === 'ready') cast(); else if (phase === 'stopped') reel(); else if (phase === 'summary') next();
    }
  };
  const onKeyUp = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);

  // ---------- open, with a "Gone fishing" wipe ----------
  app.screenRefresh = () => {};
  app.open({
    title: 'Dock', theme: 'dock',
    body: h('div', { class: 'two-col fish' }, h('section', { class: 'box fish-water' }, canvas), side),
    onClose: () => { if (phase === 'reel') bank(); }, // leaving mid-reel banks what's on your rod
  });
  if (!REDUCED) {
    const wipe = h('div', { class: 'fish-wipe', 'aria-hidden': 'true' }, h('div', { class: 'fish-wipe-card' }, 'Gone fishing…'));
    document.body.append(wipe);
    setTimeout(() => wipe.classList.add('out'), 900);
    setTimeout(() => wipe.remove(), 1500);
  }
  if (left() > 0 && phase === 'ready') app.lessonOnce('fishRules', 'Cast your line, then answer questions to send the lure deeper — deeper fish are worth more. One wrong answer and it stops. You get 3 casts a year!');
  renderSide();
  requestAnimationFrame(draw);
}
