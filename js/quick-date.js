/*
 * Reads a due date typed at the start or end of a quick-added to-do, such as
 * 「周五 交作业」, 「明天考试」, 「交报告 11月20日」 or "essay due fri".
 * Only the start and end are looked at, so 「复习周一的笔记」 stays as it is.
 * No page or storage behind it, so tests can run it on its own (see tests/).
 * Exposed as LO.quickDate(text, today) → { title, due } with due '' when none.
 */
(() => {
  'use strict';
  const LO = window.LO;

  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const wd = (d) => (d.getDay() + 6) % 7; // Monday = 0

  const ZH_DAY = { 一: 0, 二: 1, 三: 2, 四: 3, 五: 4, 六: 5, 日: 6, 天: 6 };
  const EN_DAY = { mon: 0, tue: 1, tues: 1, wed: 2, thu: 3, thur: 3, thurs: 3, fri: 4, sat: 5, sun: 6 };
  const ZH_NUM = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

  // The next date with weekday w, today included.
  const nextWeekday = (today, w) => addDays(today, (w - wd(today) + 7) % 7);
  // Weekday w in the week after this one (weeks start on Monday).
  const weekdayNextWeek = (today, w) => addDays(today, 7 - wd(today) + w);
  // A month and day with no year: this year, or next year once it has passed.
  function monthDay(today, m, d) {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    let x = new Date(today.getFullYear(), m - 1, d);
    if (x.getMonth() !== m - 1) return null; // 2月30日 and the like
    if (x < today) x = new Date(today.getFullYear() + 1, m - 1, d);
    return x;
  }

  // Each rule: a pattern for the date words alone, how to turn a match into a date,
  // and whether it may touch the rest of the text with no space (Chinese date words
  // can; "1/2" in 「1/2杯水」 and English words must be set apart by a space).
  const RULES = [
    [/今天|今日/, (t) => t, true],
    [/明天|明日/, (t) => addDays(t, 1), true],
    [/大后天/, (t) => addDays(t, 3), true],
    [/后天/, (t) => addDays(t, 2), true],
    [/(?:下周|下星期|下礼拜)([一二三四五六日天])/, (t, m) => weekdayNextWeek(t, ZH_DAY[m[1]]), true],
    [/(?:本周|这周|周|星期|礼拜)([一二三四五六日天])/, (t, m) => nextWeekday(t, ZH_DAY[m[1]]), true],
    [/(\d{1,2})月(\d{1,2})[日号]?/, (t, m) => monthDay(t, +m[1], +m[2]), true],
    [/(\d{1,2}|[一两二三四五六七八九十])天(?:后|以后|之后)/, (t, m) => addDays(t, +m[1] || ZH_NUM[m[1]]), true],
    [/(\d{1,2})\/(\d{1,2})/, (t, m) => monthDay(t, +m[1], +m[2])],
    [/today/i, (t) => t],
    [/tomorrow|tmr/i, (t) => addDays(t, 1)],
    [/next (mon|tues?|wed|thu(?:rs?)?|fri|sat|sun)[a-z]*/i, (t, m) => weekdayNextWeek(t, EN_DAY[m[1].toLowerCase()])],
    [/(?:this )?(mon|tues?|wed|thu(?:rs?)?|fri|sat|sun)(?:day|nesday|sday|rsday|urday)?/i, (t, m) => nextWeekday(t, EN_DAY[m[1].toLowerCase()])],
    [/in (\d{1,2}) days?/i, (t, m) => addDays(t, +m[1])]
  ];
  // In English, "due" or "by" may come right before a date at the end.
  const LEAD = '(?:(?:due|by)\\s+)?';

  function quickDate(text, today = new Date()) {
    const raw = String(text || '').trim();
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    for (const [re, toDate, loose] of RULES) {
      const src = re.source;
      const fl = re.flags.includes('i') ? 'i' : '';
      // date first: 「周五 交作业」 / 「明天考试」 / 「明天9点上课」 / "fri essay"
      const start = new RegExp(`^(?:${src})(?:\\s+${loose ? '|(?=\\S)' : ''})`, fl);
      // date last: 「交作业 周五」 / 「交作业周五」 / "essay due fri"
      const end = new RegExp(`(?:\\s+${loose ? '|(?<=[^\\sa-z0-9])' : ''})${LEAD}(?:${src})$`, fl);
      for (const at of [start, end]) {
        const m = raw.match(at);
        if (!m) continue;
        const inner = m[0].trim().replace(/^(?:due|by)\s+/i, '').match(re);
        const d = inner && toDate(base, inner);
        const title = (raw.slice(0, m.index) + raw.slice(m.index + m[0].length)).trim();
        if (d && title) return { title, due: keyOf(d) };
      }
    }
    return { title: raw, due: '' };
  }

  LO.quickDate = quickDate;
})();
