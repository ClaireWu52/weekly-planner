/*
 * Finds patterns in day-by-day logs, like "on days after 7+ hours of sleep your
 * mood is 0.8 higher". Each day is { date, wd (Mon = 0), sleep (hours or null),
 * mood (1–5 or null), workout (bool), focus (minutes), todos (count done) }.
 * A pattern needs at least 3 days on each side and a difference big enough to
 * mean something; the strongest come first.
 *
 * LO.insightCalc has no page or storage behind it, so tests can run it on its own.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const MIN_N = 3;

  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  // Average a metric over the days that pass a test and the days that don't.
  function split(days, test, metric) {
    const yes = [];
    const no = [];
    days.forEach((d) => {
      const t = test(d);
      const v = metric(d);
      if (t == null || v == null) return;
      (t ? yes : no).push(v);
    });
    if (yes.length < MIN_N || no.length < MIN_N) return null;
    return { yes: avg(yes), no: avg(no), ny: yes.length, nn: no.length };
  }

  const slept7 = (d) => (d.sleep == null ? null : d.sleep >= 7);
  const mood = (d) => d.mood;
  const focus = (d) => d.focus;

  // [{ id, yes, no, diff, ... }], strongest first. Mood differences count from
  // 0.3 points, focus from 15 minutes and a quarter more.
  function findings(days) {
    const out = [];
    const moodRule = (id, test) => {
      const r = split(days, test, mood);
      if (r && Math.abs(r.yes - r.no) >= 0.3) out.push(Object.assign({ id, diff: r.yes - r.no, weight: Math.abs(r.yes - r.no) / 4 }, r));
    };
    const focusRule = (id, test) => {
      const r = split(days, test, focus);
      if (r && Math.abs(r.yes - r.no) >= 15 && Math.abs(r.yes - r.no) >= 0.25 * Math.max(r.yes, r.no)) {
        out.push(Object.assign({ id, diff: r.yes - r.no, weight: Math.abs(r.yes - r.no) / Math.max(r.yes, r.no) }, r));
      }
    };
    moodRule('sleepMood', slept7);
    moodRule('workoutMood', (d) => d.workout);
    focusRule('sleepFocus', slept7);
    focusRule('workoutFocus', (d) => d.workout);

    // the weekday with the most focus, when it stands out from the average
    const wds = Array.from({ length: 7 }, () => []);
    days.forEach((d) => { if (d.focus != null) wds[d.wd].push(d.focus); });
    const means = wds.map((xs) => (xs.length >= 2 ? avg(xs) : null));
    const all = avg(days.filter((d) => d.focus != null).map((d) => d.focus));
    const best = means.reduce((b, m, i) => (m != null && (b < 0 || m > means[b]) ? i : b), -1);
    if (best >= 0 && all > 0 && means[best] >= all * 1.3 && means[best] - all >= 15) out.push({ id: 'bestDay', wd: best, yes: means[best], no: all, diff: means[best] - all, weight: (means[best] - all) / means[best] });
    return out.sort((a, b) => b.weight - a.weight);
  }

  // Totals for a stretch of days (a month or a year)
  function totals(days) {
    const sleeps = days.map((d) => d.sleep).filter((x) => x != null);
    const moods = days.map((d) => d.mood).filter((x) => x != null);
    return {
      todos: days.reduce((a, d) => a + (d.todos || 0), 0),
      workouts: days.filter((d) => d.workout).length,
      focus: days.reduce((a, d) => a + (d.focus || 0), 0),
      sleep: sleeps.length ? Math.round(avg(sleeps) * 10) / 10 : null,
      mood: moods.length ? Math.round(avg(moods) * 10) / 10 : null,
      active: days.filter((d) => d.workout || d.focus > 0 || d.todos > 0).length
    };
  }

  LO.insightCalc = { findings, totals, split };
})();
