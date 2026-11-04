/*
 * Semester numbers: which week of term it is, a course's grade from its
 * items, the letter and grade points for it, and the term GPA.
 *
 * A course's grade comes from groups of items, each with a share of the grade:
 *   - with categories (course.cats: [{ id, weight }], "homework 30%"), each
 *     category is one group and its items count by points within it; an item
 *     outside any category but with its own weight is a group of its own
 *   - without categories, each item with a weight is a group; with no weights
 *     at all, every scored item counts the same
 * Letters use the common US cutoffs (93 A, 90 A-, 87 B+ …, below 60 F) unless
 * the course picks the plain scale (90 A, 80 B …) or its own cutoffs.
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

  const scoredOk = (x) => Number.isFinite(x.score) && x.max > 0;

  // [{ weight, items }]: see the top of the file. weighted is false when nothing has a weight.
  function groups(course) {
    const items = course.items || [];
    const cats = (course.cats || []).filter((c) => c.weight > 0);
    if (cats.length) {
      const ids = new Set(cats.map((c) => c.id));
      return { weighted: true, list: cats.map((c) => ({ weight: c.weight, items: items.filter((x) => x.cat === c.id) }))
        .concat(items.filter((x) => !ids.has(x.cat) && x.weight > 0).map((x) => ({ weight: x.weight, items: [x] }))) };
    }
    if (items.some((x) => x.weight > 0)) return { weighted: true, list: items.filter((x) => x.weight > 0).map((x) => ({ weight: x.weight, items: [x] })) };
    return { weighted: false, list: items.map((x) => ({ weight: 1, items: [x] })) };
  }

  // Percent over the groups that have a score; null when none do
  function coursePct(course) {
    let sum = 0;
    let w = 0;
    groups(course).list.forEach((g) => {
      const scored = g.items.filter(scoredOk);
      if (!scored.length) return;
      const got = scored.reduce((a, x) => a + x.score, 0);
      const of = scored.reduce((a, x) => a + x.max, 0);
      sum += g.weight * (got / of);
      w += g.weight;
    });
    return w ? (sum / w) * 100 : null;
  }

  const US = [[93, 'A', 4], [90, 'A-', 3.7], [87, 'B+', 3.3], [83, 'B', 3], [80, 'B-', 2.7], [77, 'C+', 2.3], [73, 'C', 2], [70, 'C-', 1.7], [67, 'D+', 1.3], [63, 'D', 1], [60, 'D-', 0.7], [-Infinity, 'F', 0]];
  const PLAIN = [[90, 'A', 4], [80, 'B', 3], [70, 'C', 2], [60, 'D', 1], [-Infinity, 'F', 0]];
  const LETTERS = US.slice(0, -1).map((c) => c[1]);
  // course.scale: 'plain', 'custom' with course.cuts { A: 94, 'A-': 90, … }, or the US default.
  // In custom cutoffs a letter left out (or set to 0) isn't used.
  function scaleOf(course) {
    if (!course) return US;
    if (course.scale === 'plain') return PLAIN;
    if (course.scale === 'custom' && course.cuts) {
      const list = US.slice(0, -1).filter(([, l]) => course.cuts[l] > 0).map(([, l, p]) => [course.cuts[l], l, p]).sort((a, b) => b[0] - a[0]);
      return list.concat([[-Infinity, 'F', 0]]);
    }
    return US;
  }
  function letter(pct, scale) {
    if (pct == null) return null;
    const c = (scale || US).find(([min]) => pct >= min - 1e-9);
    return { letter: c[1], points: c[2] };
  }

  // Credit-weighted GPA of the courses that have a grade so far
  function gpa(courses) {
    let pts = 0;
    let cr = 0;
    courses.forEach((c) => {
      const l = letter(coursePct(c), scaleOf(c));
      const credits = c.credits > 0 ? c.credits : 0;
      if (!l || !credits) return;
      pts += l.points * credits;
      cr += credits;
    });
    return cr ? { gpa: pts / cr, credits: cr } : null;
  }

  // The average needed on what's left to reach a target percent; null when nothing is
  // left or no weights are set. Within a group, what's left is the points of its ungraded
  // items; a group with no items yet is all still to come.
  function needed(course, target) {
    const g = groups(course);
    if (!g.weighted) return null;
    let earned = 0;
    let left = 0;
    let total = 0;
    g.list.forEach(({ weight, items }) => {
      total += weight;
      if (!items.length) { left += weight; return; }
      const of = items.reduce((a, x) => a + (x.max > 0 ? x.max : 0), 0);
      if (!of) return;
      items.forEach((x) => {
        if (scoredOk(x)) earned += weight * (x.score / of);
        else if (x.max > 0) left += weight * (x.max / of);
      });
    });
    if (left < 1e-9) return null;
    return ((target / 100) * total - earned) / left * 100;
  }

  LO.termCalc = { weekOf, coursePct, letter, gpa, needed, scaleOf, LETTERS };
})();
