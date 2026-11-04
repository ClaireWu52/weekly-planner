/*
 * Tests for js/insight-calc.js: patterns in the day-by-day logs.
 */
(() => {
  'use strict';
  const { findings, totals } = window.LO.insightCalc;
  // n days starting on a Monday; fn(i) gives the parts that differ
  const days = (n, fn) => Array.from({ length: n }, (_, i) => Object.assign({ date: `d${i}`, wd: i % 7, sleep: null, mood: null, workout: false, focus: 0, todos: 0 }, fn(i)));

  test('findings: better mood after 7+ hours of sleep', () => {
    const list = findings(days(8, (i) => (i % 2 ? { sleep: 8, mood: 4 } : { sleep: 6, mood: 3 })));
    const f = list.find((x) => x.id === 'sleepMood');
    ok(f, 'found');
    near(f.diff, 1);
    eq([f.ny, f.nn], [4, 4]);
  });

  test('findings: needs 3 days on each side and a real difference', () => {
    eq(findings(days(4, (i) => (i === 0 ? { sleep: 8, mood: 5 } : { sleep: 6, mood: 3 }))).filter((x) => x.id === 'sleepMood').length, 0, 'only one good-sleep day');
    eq(findings(days(8, (i) => ({ sleep: i % 2 ? 8 : 6, mood: i < 4 ? 3 : 4 }))).filter((x) => x.id === 'sleepMood').length, 0, 'mood the same either way');
  });

  test('findings: more focus on workout days', () => {
    const f = findings(days(10, (i) => (i % 2 ? { workout: true, focus: 90 } : { focus: 40 }))).find((x) => x.id === 'workoutFocus');
    ok(f);
    near(f.diff, 50);
  });

  test('findings: small focus differences are left out', () => {
    eq(findings(days(10, (i) => (i % 2 ? { workout: true, focus: 100 } : { focus: 90 }))).filter((x) => x.id === 'workoutFocus').length, 0);
  });

  test('findings: the best weekday for focus', () => {
    const f = findings(days(28, (i) => ({ focus: i % 7 === 2 ? 120 : 30 }))).find((x) => x.id === 'bestDay');
    ok(f);
    eq(f.wd, 2);
  });

  test('totals: sums and averages over a stretch of days', () => {
    eq(totals(days(4, (i) => ({ todos: i, workout: i > 1, focus: 25, sleep: i ? 7 : null, mood: i === 3 ? 5 : null }))), { todos: 6, workouts: 2, focus: 100, sleep: 7, mood: 5, active: 4 });
  });
})();
