/*
 * Schedule calculations with no page or storage behind them, so tests can
 * run them on their own (see tests/): which events show in a given week,
 * laying out events that overlap, and grouping one class across weekdays.
 * Loads before planner.js; exposed as LO.schedCalc.
 *
 * Events: { id, title, cat, day (Mon = 0), start, end (minutes), place,
 *   from?, until? (YYYY-MM-DD, weekly events only), group? }
 * A week: { added: [events for that week only], skipped: [weekly event ids] }
 */
(() => {
  'use strict';
  const LO = window.LO;

  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // The events in the week starting on Monday `monKey`: weekly ones that are in their
  // date range on their own weekday and not skipped that week (rec: true), then the
  // week's own one-offs (rec: false).
  function weekEvents(recurring, w, monKey) {
    const [y, m, d] = monKey.split('-').map(Number);
    const active = (e) => {
      if (!e.from && !e.until) return true;
      const k = keyOf(new Date(y, m - 1, d + e.day));
      return (!e.from || k >= e.from) && (!e.until || k <= e.until);
    };
    const skipped = (w && w.skipped) || [];
    return recurring.filter((e) => !skipped.includes(e.id) && active(e)).map((e) => Object.assign({}, e, { rec: true }))
      .concat(((w && w.added) || []).map((e) => Object.assign({}, e, { rec: false })));
  }

  // Side-by-side layout for one day: events that overlap share the width.
  // Returns copies with _i (column) and _n (columns in that cluster).
  function lanes(list) {
    const sorted = list.map((e) => Object.assign({}, e)).sort((a, b) => a.start - b.start || b.end - a.end);
    const out = [];
    let group = [];
    let groupEnd = -1;
    const flush = () => {
      const ends = [];
      group.forEach((e) => {
        let i = ends.findIndex((x) => x <= e.start);
        if (i < 0) { i = ends.length; ends.push(0); }
        ends[i] = e.end;
        e._i = i;
      });
      group.forEach((e) => { e._n = ends.length; out.push(e); });
      group = [];
    };
    sorted.forEach((e) => {
      if (group.length && e.start >= groupEnd) { flush(); groupEnd = -1; }
      group.push(e);
      groupEnd = Math.max(groupEnd, e.end);
    });
    if (group.length) flush();
    return out;
  }

  // Recurring events with the same title, type, time, place and dates on different
  // weekdays form one group, so a class on Tue and Thu is edited together.
  // Events that already have a group keep it. Changes the list in place.
  function groupRecurring(list) {
    const keys = {};
    list.forEach((e) => {
      if (e.group) return;
      const k = [e.title, e.cat, e.start, e.end, e.place, e.from || '', e.until || ''].join('|');
      keys[k] = keys[k] || ('g' + Math.random().toString(36).slice(2, 10));
      e.group = keys[k];
    });
    return list;
  }

  LO.schedCalc = { weekEvents, lanes, groupRecurring };
})();
