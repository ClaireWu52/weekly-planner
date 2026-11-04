/*
 * Birthdays and anniversaries: when a yearly date next comes round and how
 * many years it will be. Feb 29 falls on Feb 28 in other years.
 *
 * LO.datesCalc has no page or storage behind it, so tests can run it on its own.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const pad = (n) => String(n).padStart(2, '0');
  const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const utc = (k) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };

  // The day an "MM-DD" falls on in a year
  function inYear(md, y) {
    const [m, d] = md.split('-').map(Number);
    return `${y}-${pad(m)}-${pad(m === 2 && d === 29 && !leap(y) ? 28 : d)}`;
  }

  // { date, days, years } for the next time md comes round, today included.
  // years is how many years it will be since `year` (0 when the year isn't known).
  function next(md, year, today) {
    const y = +today.slice(0, 4);
    let date = inYear(md, y);
    if (date < today) date = inYear(md, y + 1);
    const days = Math.round((utc(date) - utc(today)) / 864e5);
    const years = year ? +date.slice(0, 4) - year : 0;
    return { date, days, years: years > 0 ? years : 0 };
  }

  LO.datesCalc = { next, inYear };
})();
