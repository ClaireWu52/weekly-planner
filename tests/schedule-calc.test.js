/*
 * Tests for js/schedule-calc.js: which events show in a week, overlap layout
 * and grouping a class across weekdays.
 */
(() => {
  'use strict';
  const { weekEvents, lanes, groupRecurring } = window.LO.schedCalc;

  const ev = (o) => Object.assign({ id: 'e', title: 'Class', cat: 'class', day: 0, start: 540, end: 600, place: '' }, o);
  const ids = (list) => list.map((e) => e.id);

  test('weekEvents: weekly events show every week, one-offs only in their week', () => {
    const rec = [ev({ id: 'math', day: 1 })];
    const w = { added: [ev({ id: 'quiz', day: 3 })], skipped: [] };
    eq(ids(weekEvents(rec, w, '2026-11-02')), ['math', 'quiz']);
    eq(weekEvents(rec, w, '2026-11-02').map((e) => e.rec), [true, false]);
    eq(ids(weekEvents(rec, undefined, '2026-11-09')), ['math'], 'a week with nothing of its own');
  });

  test('weekEvents: "skip this week" hides a weekly event for that week only', () => {
    const rec = [ev({ id: 'math', day: 1 }), ev({ id: 'lab', day: 2 })];
    eq(ids(weekEvents(rec, { added: [], skipped: ['lab'] }, '2026-11-02')), ['math']);
    eq(ids(weekEvents(rec, { added: [], skipped: [] }, '2026-11-09')), ['math', 'lab']);
  });

  test('weekEvents: start and end dates are checked on the event\'s own weekday', () => {
    // Tue/Thu class from Tue 8/25 to Thu 12/10
    const rec = [ev({ id: 'tue', day: 1, from: '2026-08-25', until: '2026-12-10' }), ev({ id: 'thu', day: 3, from: '2026-08-25', until: '2026-12-10' })];
    eq(ids(weekEvents(rec, null, '2026-08-17')), [], 'week before it starts');
    eq(ids(weekEvents(rec, null, '2026-08-24')), ['tue', 'thu'], 'first week, starting on Tuesday');
    eq(ids(weekEvents(rec, null, '2026-12-07')), ['tue', 'thu'], 'last week, ending on Thursday');
    eq(ids(weekEvents(rec, null, '2026-12-14')), [], 'week after it ends');
  });

  test('weekEvents: a range that starts or ends mid-week cuts that week in two', () => {
    const rec = [ev({ id: 'mon', day: 0, from: '2026-11-04' }), ev({ id: 'fri', day: 4, from: '2026-11-04' }), ev({ id: 'wed', day: 2, until: '2026-11-03' })];
    eq(ids(weekEvents(rec, null, '2026-11-02')), ['fri'], 'Monday is before the start, Wednesday after the end');
  });

  test('weekEvents: date ranges across a month and a year', () => {
    const rec = [ev({ id: 'sun', day: 6, from: '2026-11-01', until: '2027-01-03' })];
    eq(ids(weekEvents(rec, null, '2026-10-26')), ['sun'], 'Sunday 11/1 is in a week that starts in October');
    eq(ids(weekEvents(rec, null, '2026-12-28')), ['sun'], 'Sunday 1/3 is in a week that starts in December');
    eq(ids(weekEvents(rec, null, '2027-01-04')), []);
  });

  test('weekEvents: returns copies, so the saved events are not changed', () => {
    const rec = [ev({ id: 'a' })];
    weekEvents(rec, null, '2026-11-02')[0].title = 'changed';
    eq(rec[0].title, 'Class');
    eq('rec' in rec[0], false);
  });

  test('lanes: events that do not overlap each get the full width', () => {
    const out = lanes([ev({ id: 'b', start: 600, end: 660 }), ev({ id: 'a', start: 540, end: 600 })]);
    eq(out.map((e) => [e.id, e._i, e._n]), [['a', 0, 1], ['b', 0, 1]]);
  });

  test('lanes: overlapping events share the width; a later free column is reused', () => {
    const out = lanes([
      ev({ id: 'long', start: 540, end: 720 }),
      ev({ id: 'early', start: 540, end: 600 }),
      ev({ id: 'later', start: 600, end: 660 }),
      ev({ id: 'after', start: 720, end: 780 })
    ]);
    eq(out.map((e) => [e.id, e._i, e._n]), [['long', 0, 2], ['early', 1, 2], ['later', 1, 2], ['after', 0, 1]]);
  });

  test('lanes: three at once get three columns', () => {
    const out = lanes([ev({ id: 'a', start: 540, end: 600 }), ev({ id: 'b', start: 550, end: 610 }), ev({ id: 'c', start: 560, end: 620 })]);
    eq(out.map((e) => [e._i, e._n]), [[0, 3], [1, 3], [2, 3]]);
  });

  test('groupRecurring: the same class on different days shares a group', () => {
    const list = groupRecurring([ev({ id: 'tue', day: 1 }), ev({ id: 'thu', day: 3 }), ev({ id: 'lab', day: 3, title: 'Lab' })]);
    eq(list[0].group, list[1].group);
    ok(list[2].group !== list[0].group, 'a different class gets its own group');
  });

  test('groupRecurring: different dates or rooms are separate; existing groups stay', () => {
    const list = groupRecurring([ev({ id: 'a', until: '2026-12-10' }), ev({ id: 'b', day: 2 }), ev({ id: 'c', day: 3, group: 'gKeep' })]);
    ok(list[0].group !== list[1].group, 'an end date makes it a different class');
    eq(list[2].group, 'gKeep');
  });
})();
