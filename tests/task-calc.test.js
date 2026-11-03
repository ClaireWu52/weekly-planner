/*
 * Tests for js/task-calc.js: which days a daily is due, and streaks.
 */
(() => {
  'use strict';
  const { isDue, streak, keyOf } = window.LO.taskCalc;

  // A daily with just what the calculations read; override any part.
  const daily = (o = {}) => Object.assign({ days: [1, 1, 1, 1, 1, 1, 1], every: 1, anchor: '', mday: 0, created: '2026-01-01' }, o);
  const D = (y, m, d) => new Date(y, m - 1, d);
  // the dates in a range a daily is due on, as M/D
  const dueIn = (dl, from, n) => Array.from({ length: n }, (_, i) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + i))
    .filter((x) => isDue(dl, x)).map((x) => `${x.getMonth() + 1}/${x.getDate()}`);

  test('isDue: weekly on chosen weekdays', () => {
    const wk = daily({ days: [1, 0, 1, 0, 1, 0, 0] }); // Mon, Wed, Fri
    eq(dueIn(wk, D(2026, 11, 2), 7), ['11/2', '11/4', '11/6']);
  });

  test('isDue: every other week counts from the anchor week', () => {
    const bi = daily({ days: [0, 1, 0, 0, 0, 0, 0], every: 2, anchor: '2026-11-02' }); // Tuesdays
    eq(dueIn(bi, D(2026, 11, 2), 42), ['11/3', '11/17', '12/1'], 'on in the anchor week, off the next');
    eq(isDue(bi, D(2026, 10, 27)), false, 'the week before the anchor is off');
    eq(isDue(bi, D(2026, 10, 20)), true, 'two weeks before the anchor is on');
  });

  test('isDue: every other week with no anchor counts from when it was created', () => {
    const bi = daily({ days: [1, 0, 0, 0, 0, 0, 0], every: 2, created: '2026-11-04' }); // created on a Wednesday
    eq(isDue(bi, D(2026, 11, 2)), true, 'Monday of the creation week');
    eq(isDue(bi, D(2026, 11, 9)), false);
    eq(isDue(bi, D(2026, 11, 16)), true);
  });

  test('isDue: every other week across a clock change and a new year', () => {
    const bi = daily({ days: [0, 0, 0, 0, 0, 0, 1], every: 2, anchor: '2026-10-26' }); // Sundays
    eq(isDue(bi, D(2026, 11, 1)), true, 'US clocks go back on Nov 1');
    eq(isDue(bi, D(2026, 11, 8)), false);
    eq(isDue(bi, D(2026, 12, 27)), true);
    eq(isDue(bi, D(2027, 1, 3)), false);
    eq(isDue(bi, D(2027, 1, 10)), true);
  });

  test('isDue: monthly on a day of the month', () => {
    const rent = daily({ mday: 5 });
    eq(dueIn(rent, D(2026, 11, 1), 61), ['11/5', '12/5']);
  });

  test('isDue: monthly on the 31st falls on the last day of shorter months', () => {
    const m = daily({ mday: 31 });
    eq(dueIn(m, D(2026, 10, 1), 92), ['10/31', '11/30', '12/31']);
    eq(isDue(m, D(2027, 2, 28)), true, 'February, not a leap year');
    eq(isDue(m, D(2028, 2, 29)), true, 'leap year');
    eq(isDue(m, D(2028, 2, 28)), false);
  });

  test('isDue: monthly ignores the weekday flags', () => {
    eq(isDue(daily({ mday: 3, days: [0, 0, 0, 0, 0, 0, 0] }), D(2026, 11, 3)), true);
  });

  test('streak: counts due days in a row and skips days off', () => {
    const wk = daily({ days: [1, 0, 1, 0, 1, 0, 0] }); // Mon, Wed, Fri
    const done = new Set(['2026-10-30', '2026-11-02', '2026-11-04']);
    eq(streak(wk, D(2026, 11, 5), (k) => done.has(k)), 3, 'Thursday: Fri, Mon, Wed');
  });

  test('streak: an unticked today does not break it, a missed day does', () => {
    const ev = daily();
    const done = new Set(['2026-11-01', '2026-11-02']);
    eq(streak(ev, D(2026, 11, 3), (k) => done.has(k)), 2, 'today not done yet');
    eq(streak(ev, D(2026, 11, 4), (k) => done.has(k)), 0, 'yesterday was missed');
  });

  test('streak: stops at the day the daily was created', () => {
    const ev = daily({ created: '2026-11-02' });
    eq(streak(ev, D(2026, 11, 3), () => true), 2);
  });

  test('streak: every other week and monthly count their own occurrences', () => {
    const bi = daily({ days: [1, 0, 0, 0, 0, 0, 0], every: 2, anchor: '2026-10-19' });
    const doneBi = new Set(['2026-10-19', '2026-11-02']);
    eq(streak(bi, D(2026, 11, 10), (k) => doneBi.has(k)), 2);
    const m = daily({ mday: 31, created: '2026-01-01' });
    const doneM = new Set(['2026-09-30', '2026-10-31']);
    eq(streak(m, D(2026, 11, 15), (k) => doneM.has(k)), 2, 'Sep 30 counts for the 31st');
  });

  test('keyOf pads months and days', () => {
    eq(keyOf(D(2026, 3, 7)), '2026-03-07');
  });
})();
