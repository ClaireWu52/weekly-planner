/*
 * Semester numbers: which week of term it is, a course's grade from its
 * weighted items, the letter and grade points for it, and the term GPA.
 * Letters use the common US cutoffs (93 A, 90 A-, 87 B+ …, below 60 F).
 *
 * LO.termCalc has no page or storage behind it, so tests can run it on its own.
 */
(() => {
  'use strict';
  const LO = window.LO;

  const utc = (k) => { const [y, m, d] = String(k).split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const days = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);
  // Monday on or before a date key, as days since the epoch
  const monday = (k) => { const n = utc(k) / 864e5; return n - ((new Date(utc(k)).getUTCDay() + 6) % 7); };

  // { week, weeks, daysLeft, pct } for a term on a day, or null outside it
  function weekOf(term, today) {
    if (!term || !term.start || !term.end || term.end < term.start) return null;
    const weeks = (monday(term.end) - monday(term.start)) / 7 + 1;
    if (today < term.start) return { week: 0, weeks, daysLeft: days(today, term.end), startsIn: days(today, term.start), pct: 0 };
    if (today > term.end) return { week: weeks + 1, weeks, daysLeft: 0, pct: 1 };
    const week = (monday(today) - monday(term.start)) / 7 + 1;
    const total = days(term.start, term.end) || 1;
    return { week, weeks, daysLeft: days(today, term.end), pct: days(term.start, today) / total };
  }

  // Weighted percent over the items that have a score; null when none do.
  // An item's weight is its share of the course grade; with no weights at all,
  // every scored item counts the same.
  function coursePct(course) {
    const scored = (course.items || []).filter((x) => Number.isFinite(x.score) && x.max > 0);
    if (!scored.length) return null;
    const anyWeight = scored.some((x) => x.weight > 0);
    let sum = 0;
    let w = 0;
    scored.forEach((x) => {
      const wt = anyWeight ? (x.weight > 0 ? x.weight : 0) : 1;
      sum += wt * (x.score / x.max);
      w += wt;
    });
    return w ? (sum / w) * 100 : null;
  }

  const CUTS = [[93, 'A', 4], [90, 'A-', 3.7], [87, 'B+', 3.3], [83, 'B', 3], [80, 'B-', 2.7], [77, 'C+', 2.3], [73, 'C', 2], [70, 'C-', 1.7], [67, 'D+', 1.3], [63, 'D', 1], [60, 'D-', 0.7], [-Infinity, 'F', 0]];
  function letter(pct) {
    if (pct == null) return null;
    const c = CUTS.find(([min]) => pct >= min - 1e-9);
    return { letter: c[1], points: c[2] };
  }

  // Credit-weighted GPA of the courses that have a grade so far
  function gpa(courses) {
    let pts = 0;
    let cr = 0;
    courses.forEach((c) => {
      const l = letter(coursePct(c));
      const credits = c.credits > 0 ? c.credits : 0;
      if (!l || !credits) return;
      pts += l.points * credits;
      cr += credits;
    });
    return cr ? { gpa: pts / cr, credits: cr } : null;
  }

  // The score needed on what's left (ungraded weight) to reach a target percent;
  // null when nothing is left or no weights are set.
  function needed(course, target) {
    const items = course.items || [];
    if (!items.some((x) => x.weight > 0)) return null;
    let earned = 0;
    let done = 0;
    let left = 0;
    items.forEach((x) => {
      if (!(x.weight > 0)) return;
      if (Number.isFinite(x.score) && x.max > 0) { earned += x.weight * (x.score / x.max); done += x.weight; } else left += x.weight;
    });
    if (!left) return null;
    return ((target / 100) * (done + left) - earned) / left * 100;
  }

  LO.termCalc = { weekOf, coursePct, letter, gpa, needed };
})();
