/*
 * Tests for js/ics-parse.js: reading calendar files into schedule entries.
 */
(() => {
  'use strict';
  const parse = window.LO.icsParse;
  const cal = (...events) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Test//EN', ...events.flat(), 'END:VCALENDAR'].join('\r\n');
  const ev = (...lines) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'];

  test('icsParse: a weekly class on two days with a room and an end date', () => {
    const r = parse(cal(ev(
      'UID:math306@school', 'SUMMARY:MATH306', 'LOCATION:Jepson Hall 109',
      'DTSTART;TZID=America/New_York:20260825T090000', 'DTEND;TZID=America/New_York:20260825T101500',
      'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261208T235959Z'
    )));
    eq(r.weekly.length, 1);
    const w = r.weekly[0];
    eq([w.title, w.place, w.days, w.start, w.end, w.from], ['MATH306', 'Jepson Hall 109', [1, 3], 540, 615, '2026-08-25']);
    ok(w.until === '2026-12-08' || w.until === '2026-12-09', `until ${w.until}`);
    eq(r.once, []);
  });

  test('icsParse: no BYDAY means the weekday it starts on; no end means it keeps going', () => {
    const r = parse(cal(ev('SUMMARY:Lab', 'DTSTART:20260902T140000', 'DURATION:PT2H', 'RRULE:FREQ=WEEKLY')));
    eq([r.weekly[0].days, r.weekly[0].start, r.weekly[0].end, r.weekly[0].until], [[2], 840, 960, '']);
  });

  test('icsParse: COUNT turns into the date of the last class', () => {
    const r = parse(cal(ev('SUMMARY:Seminar', 'DTSTART:20260831T160000', 'DTEND:20260831T170000', 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=5')));
    eq(r.weekly[0].until, '2026-09-14', 'Mon 8/31, Wed 9/2, Mon 9/7, Wed 9/9, Mon 9/14');
  });

  test('icsParse: skipped days (EXDATE) are kept as exceptions', () => {
    const r = parse(cal(ev(
      'SUMMARY:DSST329', 'DTSTART;TZID=America/New_York:20260825T133000', 'DTEND;TZID=America/New_York:20260825T144500',
      'RRULE:FREQ=WEEKLY;BYDAY=TU,TH', 'EXDATE;TZID=America/New_York:20261013T133000,20261015T133000'
    )));
    eq(r.weekly[0].except, ['2026-10-13', '2026-10-15']);
  });

  test('icsParse: one moved class becomes a one-off and its old day an exception', () => {
    const r = parse(cal(
      ev('UID:mus229', 'SUMMARY:MUS229', 'DTSTART:20260826T150000', 'DTEND:20260826T161500', 'RRULE:FREQ=WEEKLY;BYDAY=WE'),
      ev('UID:mus229', 'RECURRENCE-ID:20260930T150000', 'SUMMARY:MUS229 (recital hall)', 'DTSTART:20261001T190000', 'DTEND:20261001T203000')
    ));
    eq(r.weekly[0].except, ['2026-09-30']);
    eq(r.once.map((o) => [o.title, o.date, o.start, o.end]), [['MUS229 (recital hall)', '2026-10-01', 1140, 1230]]);
  });

  test('icsParse: every other week is spread out as one-offs', () => {
    const r = parse(cal(ev('SUMMARY:Club', 'DTSTART:20260903T180000', 'DTEND:20260903T190000', 'RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261001')));
    eq(r.weekly, []);
    eq(r.once.map((o) => o.date), ['2026-09-03', '2026-09-17', '2026-10-01']);
  });

  test('icsParse: single events, all-day events and cancelled ones', () => {
    const r = parse(cal(
      ev('SUMMARY:Midterm', 'DTSTART:20261020T190000', 'DTEND:20261020T210000'),
      ev('SUMMARY:Fall break', 'DTSTART;VALUE=DATE:20261012', 'DTEND;VALUE=DATE:20261014'),
      ev('SUMMARY:Cancelled talk', 'STATUS:CANCELLED', 'DTSTART:20261021T120000', 'DTEND:20261021T130000'),
      ev('SUMMARY:Monthly meeting', 'DTSTART:20261001T120000', 'DTEND:20261001T130000', 'RRULE:FREQ=MONTHLY')
    ));
    eq(r.once.map((o) => [o.title, o.date, o.start, o.end]), [['Midterm', '2026-10-20', 1140, 1260]]);
    eq(r.skipped, { allDay: 1, other: 1 });
  });

  test('icsParse: UTC times are moved to local time', () => {
    const r = parse(cal(ev('SUMMARY:Call', 'DTSTART:20261103T140000Z', 'DTEND:20261103T150000Z')));
    const local = new Date(Date.UTC(2026, 10, 3, 14, 0));
    eq(r.once[0].start, local.getHours() * 60 + local.getMinutes());
    eq(r.once[0].end - r.once[0].start, 60);
  });

  test('icsParse: folded lines, escaped text and alarms inside events', () => {
    const r = parse(['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'SUMMARY:Intro to Data Sc', ' ience\\, Section 2', 'LOCATION:Boatwright Library\\; Room 3',
      'DESCRIPTION:Bring laptop\\nand charger', 'DTSTART:20260825T133000', 'DTEND:20260825T144500',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'TRIGGER:-PT15M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\n'));
    eq([r.once[0].title, r.once[0].place, r.once[0].note], ['Intro to Data Science, Section 2', 'Boatwright Library; Room 3', 'Bring laptop\nand charger']);
  });

  test('icsParse: an event past midnight stops at 24:00; no end means an hour', () => {
    const r = parse(cal(
      ev('SUMMARY:Late shift', 'DTSTART:20261106T220000', 'DTEND:20261107T020000'),
      ev('SUMMARY:Office hours', 'DTSTART:20261105T100000')
    ));
    eq(r.once.map((o) => [o.start, o.end]), [[1320, 1440], [600, 660]]);
  });

  test('icsParse: not a calendar file', () => {
    eq(parse('hello'), { weekly: [], once: [], skipped: { allDay: 0, other: 0 } });
  });
})();
