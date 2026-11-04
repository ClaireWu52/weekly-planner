/*
 * Tests for js/dates-calc.js: when birthdays and anniversaries come round.
 */
(() => {
  'use strict';
  const { next } = window.LO.datesCalc;

  test('next: later this year, today, or next year', () => {
    eq(next('11-20', 0, '2026-11-04'), { date: '2026-11-20', days: 16, years: 0 });
    eq(next('11-04', 0, '2026-11-04'), { date: '2026-11-04', days: 0, years: 0 });
    eq(next('01-02', 0, '2026-12-30'), { date: '2027-01-02', days: 3, years: 0 });
  });

  test('next: counts the years when the year is known', () => {
    eq(next('03-15', 2004, '2026-11-04').years, 23, 'birthday next March');
    eq(next('12-01', 2020, '2026-11-04').years, 6);
    eq(next('12-01', 2026, '2026-11-04').years, 0, 'the very first one');
  });

  test('next: Feb 29 falls on Feb 28 in other years', () => {
    eq(next('02-29', 2004, '2027-01-10').date, '2027-02-28');
    eq(next('02-29', 2004, '2028-01-10').date, '2028-02-29');
  });
})();
