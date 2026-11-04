/*
 * Tests for js/term-calc.js: week of term, course grades, letters, GPA.
 */
(() => {
  'use strict';
  const { weekOf, coursePct, letter, gpa, needed } = window.LO.termCalc;
  const term = { start: '2026-08-24', end: '2026-12-11' }; // Monday to a Friday

  test('weekOf: counts weeks from the Monday of the start week', () => {
    eq(weekOf(term, '2026-08-24').week, 1);
    eq(weekOf(term, '2026-08-30').week, 1, 'Sunday is still week 1');
    eq(weekOf(term, '2026-08-31').week, 2);
    eq(weekOf(term, '2026-12-11').week, 16);
    eq(weekOf(term, '2026-12-11').weeks, 16);
    eq(weekOf(term, '2026-12-01').daysLeft, 10);
  });

  test('weekOf: a term that starts mid-week, before and after the term', () => {
    const t2 = { start: '2027-01-13', end: '2027-01-20' }; // Wednesday to Wednesday
    eq(weekOf(t2, '2027-01-18').week, 2);
    eq(weekOf(t2, '2027-01-18').weeks, 2);
    eq(weekOf(t2, '2027-01-10').week, 0);
    eq(weekOf(t2, '2027-01-10').startsIn, 3);
    eq(weekOf(t2, '2027-01-25').daysLeft, 0);
    eq(weekOf({ start: '', end: '' }, '2027-01-01'), null);
  });

  test('coursePct: weighted by each item\'s share, ignoring ungraded items', () => {
    const c = { items: [{ weight: 20, score: 18, max: 20 }, { weight: 30, score: 24, max: 30 }, { weight: 50, score: null, max: 100 }] };
    near(coursePct(c), (20 * 0.9 + 30 * 0.8) / 50 * 100);
    eq(coursePct({ items: [] }), null);
  });

  test('coursePct: with no weights every scored item counts the same', () => {
    near(coursePct({ items: [{ score: 8, max: 10 }, { score: 50, max: 50 }] }), 90);
  });

  test('letter: cutoffs at the edges', () => {
    eq(letter(93).letter, 'A');
    eq(letter(92.99).letter, 'A-');
    eq(letter(89.5).letter, 'B+');
    eq(letter(59).letter, 'F');
    eq(letter(null), null);
  });

  test('gpa: weighted by credits, skipping courses with no grade or credits', () => {
    const A = { credits: 4, items: [{ score: 95, max: 100 }] };
    const B = { credits: 3, items: [{ score: 84, max: 100 }] };
    const none = { credits: 3, items: [] };
    const zero = { credits: 0, items: [{ score: 50, max: 100 }] };
    near(gpa([A, B, none, zero]).gpa, (4 * 4 + 3 * 3) / 7);
    eq(gpa([A, B, none, zero]).credits, 7);
    eq(gpa([none]), null);
  });

  test('needed: what is left has to score to reach the target', () => {
    const c = { items: [{ weight: 50, score: 80, max: 100 }, { weight: 50, score: null, max: 100 }] };
    near(needed(c, 90), 100);
    near(needed(c, 85), 90);
    eq(needed({ items: [{ weight: 100, score: 90, max: 100 }] }, 90), null, 'nothing left');
  });
})();
