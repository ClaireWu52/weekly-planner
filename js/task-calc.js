/*
 * Daily-task calculations with no page or storage behind them, so tests can
 * run them on their own (see tests/): which days a daily is due, and streaks.
 * Loads before tasks.js; exposed as LO.taskCalc.
 *
 * A daily repeats one of three ways:
 *   every week        days: [Mon..Sun] flags, every: 1
 *   every other week  days as above, every: 2, counted from the week of `anchor`
 *   every month       mday: 1–31; in shorter months it falls on the last day
 */
(() => {
  'use strict';
  const LO = window.LO;

  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = (k) => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const wd = (d) => (d.getDay() + 6) % 7; // Monday = 0
  const mondayOf = (d) => addDays(d, -wd(d));
  // whole days between two dates, ignoring clock changes
  const days = (a, b) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);

  function isDue(d, date) {
    if (d.mday) {
      const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      return date.getDate() === Math.min(d.mday, last);
    }
    if (!d.days[wd(date)]) return false;
    if (!(d.every > 1)) return true;
    const weeks = days(mondayOf(parseKey(d.anchor || d.created)), mondayOf(date)) / 7;
    return ((weeks % d.every) + d.every) % d.every === 0;
  }

  // Due days in a row that were done, counting back from today. Today only
  // breaks the streak once it's over, so an unticked today doesn't reset it.
  function streak(d, today, isDone) {
    let n = 0;
    for (let k = 0; k < 800; k++) {
      const date = addDays(today, -k);
      const key = keyOf(date);
      if (key < d.created) break;
      if (!isDue(d, date)) continue;
      if (isDone(key)) n++;
      else if (k === 0) continue;
      else break;
    }
    return n;
  }

  LO.taskCalc = { isDue, streak, keyOf, parseKey, mondayOf };
})();
