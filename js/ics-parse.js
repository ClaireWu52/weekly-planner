/*
 * Reads a calendar file (.ics), such as a class schedule exported from the
 * school's system or Google Calendar, into what the schedule page can hold.
 * No page or storage behind it, so tests can run it on its own (see tests/).
 * Exposed as LO.icsParse(text) → {
 *   weekly:  [{ title, place, note, days: [0..6], start, end, from, until, except: [date keys] }],
 *   once:    [{ title, place, note, date, start, end }],
 *   skipped: { allDay, other }
 * }
 * Times are minutes from midnight; days count from Monday = 0; dates are YYYY-MM-DD.
 * A time with a time zone name (TZID) is taken as written, which is right when the
 * calendar is in the same zone as the reader; a UTC time (ending in Z) is converted
 * to the reader's local time.
 */
(() => {
  'use strict';
  const LO = window.LO;

  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const wd = (d) => (d.getDay() + 6) % 7;
  const BYDAY = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 };
  // spread-out weekly events with no end are listed for half a year
  const OPEN_WEEKS = 26;
  const MAX_ONCE = 400;

  const unescape = (s) => s.replace(/\\([\\;,nN])/g, (m, c) => (c === 'n' || c === 'N' ? '\n' : c));

  // "20260825T093000Z" / "20260825T093000" / "20260825" → { date: Date (local), min, allDay }
  function readTime(value, params) {
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
    if (!m) return null;
    const [, y, mo, d, h, mi, , z] = m;
    if (h == null || /VALUE=DATE(?!-)/i.test(params)) return { date: new Date(+y, mo - 1, +d), min: 0, allDay: true };
    const local = z ? new Date(Date.UTC(+y, mo - 1, +d, +h, +mi)) : new Date(+y, mo - 1, +d, +h, +mi);
    return { date: new Date(local.getFullYear(), local.getMonth(), local.getDate()), min: local.getHours() * 60 + local.getMinutes(), allDay: false };
  }
  // "PT1H15M" / "P1D" → minutes
  function readDuration(v) {
    const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?)?$/.exec(v.trim());
    if (!m) return null;
    return ((+m[1] || 0) * 7 + (+m[2] || 0)) * 1440 + (+m[3] || 0) * 60 + (+m[4] || 0);
  }

  // Unfolds lines and groups each VEVENT's properties as { NAME: [{ params, value }] }.
  function events(text) {
    const lines = String(text || '').replace(/\r\n|\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
    const out = [];
    let cur = null;
    let depth = 0; // skip VALARM and the like inside an event
    lines.forEach((line) => {
      if (/^BEGIN:VEVENT$/i.test(line)) { cur = {}; depth = 0; return; }
      if (!cur) return;
      if (/^END:VEVENT$/i.test(line)) { out.push(cur); cur = null; return; }
      if (/^BEGIN:/i.test(line)) { depth++; return; }
      if (/^END:/i.test(line)) { depth--; return; }
      if (depth) return;
      const i = line.indexOf(':');
      if (i < 0) return;
      const head = line.slice(0, i);
      const name = head.split(';')[0].toUpperCase();
      (cur[name] = cur[name] || []).push({ params: head.slice(name.length), value: line.slice(i + 1) });
    });
    return out;
  }
  const one = (ev, name) => (ev[name] ? ev[name][0] : null);
  const text = (ev, name) => { const p = one(ev, name); return p ? unescape(p.value).trim() : ''; };

  function icsParse(src) {
    const res = { weekly: [], once: [], skipped: { allDay: 0, other: 0 } };
    const masters = {};
    const overrides = [];
    events(src).forEach((ev) => {
      if (/^CANCELLED$/i.test(text(ev, 'STATUS'))) return;
      const ds = one(ev, 'DTSTART');
      const st = ds && readTime(ds.value, ds.params);
      if (!st) { res.skipped.other++; return; }
      if (st.allDay) { res.skipped.allDay++; return; }
      let len = 60;
      const de = one(ev, 'DTEND');
      const du = one(ev, 'DURATION');
      if (de) {
        const en = readTime(de.value, de.params);
        if (en) len = Math.round((en.date - st.date) / 6e4) + en.min - st.min;
      } else if (du && readDuration(du.value) != null) len = readDuration(du.value);
      if (!(len > 0)) len = 60;
      const base = {
        title: text(ev, 'SUMMARY') || '(untitled)', place: text(ev, 'LOCATION'), note: text(ev, 'DESCRIPTION').slice(0, 300),
        start: st.min, end: Math.min(1440, st.min + len)
      };
      const uidv = text(ev, 'UID');
      const rid = one(ev, 'RECURRENCE-ID');
      if (rid) {
        // one changed class in a series: keep it as a one-off and drop that day from the series
        const r = readTime(rid.value, rid.params);
        overrides.push({ uid: uidv, was: r ? keyOf(r.date) : '', once: Object.assign({ date: keyOf(st.date) }, base) });
        return;
      }
      const except = [];
      (ev.EXDATE || []).forEach((p) => p.value.split(',').forEach((v) => { const x = readTime(v, p.params); if (x) except.push(keyOf(x.date)); }));

      const rr = one(ev, 'RRULE');
      if (!rr) { res.once.push(Object.assign({ date: keyOf(st.date) }, base)); return; }
      const rule = {};
      rr.value.split(';').forEach((kv) => { const [k, v] = kv.split('='); if (k && v) rule[k.toUpperCase()] = v.toUpperCase(); });
      if (rule.FREQ !== 'WEEKLY' && rule.FREQ !== 'DAILY') { res.skipped.other++; return; }
      let days = rule.FREQ === 'DAILY' ? [0, 1, 2, 3, 4, 5, 6]
        : (rule.BYDAY ? rule.BYDAY.split(',').map((x) => BYDAY[x.replace(/^[+-]?\d+/, '')]).filter((x) => x != null) : [wd(st.date)]);
      days = [...new Set(days)].sort((a, b) => a - b);
      const every = Math.max(1, +rule.INTERVAL || 1);
      // every other week (or every few days) can't be one weekly entry, so it's spread out as one-offs
      const spread = every > 1;
      let until = '';
      if (rule.UNTIL) { const u = readTime(rule.UNTIL, /T/.test(rule.UNTIL) ? '' : ';VALUE=DATE'); if (u) until = keyOf(u.date); }
      // walk the dates it falls on: needed for COUNT, and to spread out every-other-week series
      const dates = [];
      const weekly = rule.FREQ === 'WEEKLY';
      const mon0 = addDays(st.date, -wd(st.date));
      const limit = rule.COUNT ? +rule.COUNT : Infinity;
      const lastKey = until || (spread ? keyOf(addDays(st.date, OPEN_WEEKS * 7)) : '');
      if (rule.COUNT || spread) {
        for (let i = 0; dates.length < Math.min(limit, MAX_ONCE) && i < 3700; i++) {
          const d = addDays(st.date, i);
          const k = keyOf(d);
          if (lastKey && k > lastKey) break;
          const on = weekly ? Math.round((addDays(d, -wd(d)) - mon0) / 6048e5) % every === 0 : i % every === 0;
          if (on && days.includes(wd(d))) dates.push(k);
        }
      }
      if (spread) {
        dates.filter((k) => !except.includes(k)).forEach((k) => res.once.push(Object.assign({ date: k }, base)));
        return;
      }
      if (rule.COUNT && dates.length) until = dates[dates.length - 1];
      res.weekly.push(Object.assign({ days, from: keyOf(st.date), until, except, uid: uidv }, base));
    });
    overrides.forEach((o) => {
      const m = res.weekly.find((w) => w.uid && w.uid === o.uid);
      if (m && o.was && !m.except.includes(o.was)) m.except.push(o.was);
      res.once.push(o.once);
    });
    res.weekly.forEach((w) => { delete w.uid; });
    if (res.once.length > MAX_ONCE) res.once.length = MAX_ONCE;
    return res;
  }

  LO.icsParse = icsParse;
})();
