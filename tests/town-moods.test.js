import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../js/scenarios.js';

const MOODS = ['rain', 'heat', 'drought', 'snowstorm', 'boom', 'gloomy', 'festival'];

test('every year\'s town mood is one the town knows how to draw', () => {
  for (const s of SCENARIOS) for (const [i, y] of s.years.entries()) {
    if (y.town != null) assert.ok(MOODS.includes(y.town), `${s.name} year ${i + 1}: "${y.town}"`);
  }
});

test('the crash year never looks gloomy ahead of time (the mood follows the headline, not the outcome)', () => {
  for (const s of SCENARIOS) assert.notEqual(s.years[s.crash.year - 1].town, 'gloomy', s.name);
});
