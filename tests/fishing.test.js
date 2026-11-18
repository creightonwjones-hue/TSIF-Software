import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import { SCENARIOS, SETTINGS } from '../js/scenarios.js';
import { QUESTIONS } from '../js/questions.js';
import { play, strategies, fisherCast } from './strategies.js';

const F = SETTINGS.fish, BANDS = F.bands.length;
// answers: right for the first `n` questions, then one wrong (unless n === BANDS)
function answersFor(g, n) {
  const answers = [];
  for (let d = 1; d <= BANDS; d++) {
    const asked = answers.length ? E.castProgress(g, answers).asked : [];
    const q = E.fishQuestion(g, d, asked);
    if (d <= n) answers.push(q.answer); else { answers.push((q.answer + 1) % q.choices.length); break; }
  }
  return answers;
}

test('question bank: unique ids, valid answers, a "why", and at least 12 per tier', () => {
  assert.equal(new Set(QUESTIONS.map((q) => q.id)).size, QUESTIONS.length);
  for (const q of QUESTIONS) {
    assert.ok(q.choices.length >= 3 && q.choices.length <= 4, q.id);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length, q.id);
    assert.ok(q.why && q.q, q.id);
    assert.equal(new Set(q.choices).size, q.choices.length, `${q.id}: duplicate choices`);
  }
  for (let t = 1; t <= BANDS; t++) assert.ok(E.questionsByTier(t).length >= 12, `tier ${t}`);
});

test('questions: same kid gets the same question after a reload; tiers match depth; choices are shuffled', () => {
  const a = E.createGame(1, 'Sam'), b = E.createGame(1, 'Sam');
  assert.deepEqual(E.fishQuestion(a, 1), E.fishQuestion(b, 1));
  for (let d = 1; d <= BANDS; d++) assert.equal(E.fishQuestion(a, d).tier, d);
  const q = E.fishQuestion(a, 2);
  assert.deepEqual([...q.order].sort(), q.choices.map((_, i) => i));
  const names = ['Ava', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal'];
  const firsts = new Set(names.map((n) => E.fishQuestion(E.createGame(1, n), 1).id));
  assert.ok(firsts.size > 2, 'kids sitting together usually get different questions');
});

test('no repeated question in a tier until the tier runs out', () => {
  const g = E.createGame(1, 'Repeat');
  const pool = E.questionsByTier(1).length;
  const seen = [];
  while (seen.length < pool) {
    if (E.castsLeft(g) === 0) E.advanceYear(g);
    const r = E.runCast(g, { answers: answersFor(g, 0), caught: [] });
    assert.ok(r.ok, r.error);
    seen.push(g.fish[g.year].at(-1).asked[0]);
  }
  assert.equal(new Set(seen).size, pool);
});

test('a wrong answer stops the lure; depth = right answers + 1', () => {
  const g = E.createGame(1);
  for (const n of [0, 2, 4]) {
    const p = E.castProgress(g, answersFor(g, n));
    assert.equal(p.stopped, true); assert.equal(p.depth, n + 1); assert.equal(p.correct, n);
  }
  const all = E.castProgress(g, answersFor(g, BANDS));
  assert.equal(all.depth, BANDS); assert.equal(all.perfect, true);
  assert.ok(E.castProgress(g, [...answersFor(g, 0), 0]).error, 'no answers after the lure stops');
});

test('runCast checks the catch: depth, rod capacity, duplicates, unknown ids', () => {
  const g = E.createGame(1);
  const answers = answersFor(g, 1); // reaches band 2 (index 1)
  const school = E.fishSchool(g);
  const deep = school.find((f) => f.band === 3);
  assert.equal(E.runCast(g, { answers, caught: [deep.id] }).ok, false);
  const near = school.filter((f) => f.band <= 1);
  assert.equal(E.runCast(g, { answers, caught: near.slice(0, F.capacity + 1).map((f) => f.id) }).ok, false);
  assert.equal(E.runCast(g, { answers, caught: [near[0].id, near[0].id] }).ok, false);
  assert.equal(E.runCast(g, { answers, caught: ['nope'] }).ok, false);
  assert.equal(E.runCast(g, { answers: answers.slice(0, 1).map((a, i) => (i === 0 ? E.fishQuestion(g, 1).answer : a)), caught: [] }).ok, false, 'lure still sinking');
  assert.equal(E.castsLeft(g), F.casts, 'failed casts don\'t use up a cast');
});

test('pay: fish values add up, junk pays nothing, a perfect cast earns a bonus', () => {
  const g = E.createGame(1);
  const answers = answersFor(g, 2);
  const school = E.fishSchool(g).filter((f) => f.band < 3);
  const junk = school.find((f) => f.junk), fish = school.filter((f) => !f.junk).slice(0, 2);
  const r = E.runCast(g, { answers, caught: [junk.id, ...fish.map((f) => f.id)] });
  assert.equal(r.earned, fish[0].value + fish[1].value);
  assert.equal(g.cash, 1000 + r.earned);
  const perfect = E.runCast(g, { answers: answersFor(g, BANDS), caught: [] });
  assert.equal(perfect.earned, F.perfectBonus);
});

test('three casts a year, and fishing pay shows up in the year report', () => {
  const g = E.createGame(1);
  let total = 0;
  for (let k = 0; k < F.casts; k++) { const r = E.runCast(g, fisherCast(g)); assert.ok(r.ok, r.error); total += r.earned; }
  assert.equal(E.castsLeft(g), 0);
  assert.equal(E.runCast(g, fisherCast(g)).ok, false);
  assert.equal(E.advanceYear(g).fishPay, total);
  assert.equal(E.castsLeft(g), F.casts, 'new year, new casts');
});

test('fish are the same for every kid on the same cast', () => {
  assert.deepEqual(E.fishSchool(E.createGame(2, 'A')), E.fishSchool(E.createGame(2, 'B')));
});

test('fishing pay: knowing more pays more, and even a perfect year stays modest', () => {
  for (const s of SCENARIOS) {
    const year = (n) => { const g = E.createGame(s.id); let t = 0; while (E.castsLeft(g)) t += E.runCast(g, fisherCast(g, n)).earned; return t; };
    const low = year(1), mid = year(3), top = year(BANDS);
    assert.ok(low < mid && mid < top, `${s.name}: ${low} < ${mid} < ${top}`);
    assert.ok(top <= 60, `${s.name}: perfect year pays ${top}`);
  }
});

test('Master Angler: reach The Abyss at least once', () => {
  const g = play(1, (x) => { if (x.year === 2) E.runCast(x, fisherCast(x, BANDS - 1)); });
  assert.equal(E.computeAwards(g).find((a) => a.id === 'angler').earned, true);
  assert.equal(E.computeAwards(play(1, strategies.mattress)).find((a) => a.id === 'angler').earned, false);
});
