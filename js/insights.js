/*
 * Monthly and yearly summaries and the patterns found in the logs (sleep,
 * mood, workouts, focus, to-dos), shown on the review page next to the weekly
 * review. The math is in insight-calc.js; this file gathers the days and words.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { esc } = LO;
  const C = LO.insightCalc;

  LO.strings('insights', {
    zh: {
      week: '每周', month: '月度总结', year: '年度总结', prev: '上一个', next: '下一个',
      monthTitle: (y, m) => `${y} 年 ${m} 月`, yearTitle: (y) => `${y} 年`,
      todos: '完成的待办', dailies: '每日任务打卡', workouts: '运动', workoutsLine: (n, m) => `${n} 次，共 ${m} 分钟`, focus: '专注',
      focusLine: (m) => (m >= 60 ? `${Math.round(m / 6) / 10} 小时` : `${m} 分钟`), sleep: '平均睡眠', sleepLine: (h) => `${h} 小时`, mood: '平均心情',
      active: '活跃的天数', activeLine: (n, of) => `${n} / ${of} 天`, books: '读完的书', records: '成长记录', trips: '去过的地方', spend: '日常花费',
      topType: (x) => `最常做：${x}`, none: '没有', nothing: '这段时间还没有记录。',
      patterns: '发现的规律', patternsHint: '根据最近 60 天的记录自动算出来的，记得越多越准。', noPatterns: '记录再多几天（睡眠、心情、运动、专注），这里会出现你自己的规律。',
      p: {
        sleepMood: (f) => (f.diff > 0 ? `睡够 7 小时的日子，心情平均高 ${f.diff.toFixed(1)} 分` : `睡够 7 小时的日子，心情反而低 ${(-f.diff).toFixed(1)} 分`),
        workoutMood: (f) => (f.diff > 0 ? `运动过的日子，心情平均高 ${f.diff.toFixed(1)} 分` : `运动过的日子，心情平均低 ${(-f.diff).toFixed(1)} 分，可能是太累了`),
        sleepFocus: (f) => (f.diff > 0 ? `睡够 7 小时的日子，平均多专注 ${Math.round(f.diff)} 分钟` : `睡不够 7 小时的日子，专注反而多 ${Math.round(-f.diff)} 分钟`),
        workoutFocus: (f) => (f.diff > 0 ? `运动过的日子，平均多专注 ${Math.round(f.diff)} 分钟` : `运动过的日子，专注少 ${Math.round(-f.diff)} 分钟`),
        bestDay: (f, days) => `${days[f.wd]}是你最能专注的一天，平均 ${Math.round(f.yes)} 分钟`
      },
      basis: (a, b) => `（${a} 天对比 ${b} 天）`
    },
    en: {
      week: 'Weekly', month: 'Month', year: 'Year', prev: 'Previous', next: 'Next',
      monthTitle: (y, m) => new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }), yearTitle: (y) => String(y),
      todos: 'To-dos done', dailies: 'Daily check-ins', workouts: 'Workouts', workoutsLine: (n, m) => `${n}, ${m} min in all`, focus: 'Focus',
      focusLine: (m) => (m >= 60 ? `${Math.round(m / 6) / 10} h` : `${m} min`), sleep: 'Average sleep', sleepLine: (h) => `${h} h`, mood: 'Average mood',
      active: 'Active days', activeLine: (n, of) => `${n} of ${of}`, books: 'Books finished', records: 'Growth log', trips: 'Trips', spend: 'Everyday spending',
      topType: (x) => `Most often: ${x}`, none: 'None', nothing: 'Nothing logged in this stretch yet.',
      patterns: 'Patterns', patternsHint: 'Worked out from the last 60 days. The more you log, the better they get.', noPatterns: 'Log a few more days of sleep, mood, workouts and focus and your own patterns will show up here.',
      p: {
        sleepMood: (f) => (f.diff > 0 ? `After 7+ hours of sleep your mood is ${f.diff.toFixed(1)} higher on average` : `After 7+ hours of sleep your mood is ${(-f.diff).toFixed(1)} lower, oddly`),
        workoutMood: (f) => (f.diff > 0 ? `On days you work out, your mood is ${f.diff.toFixed(1)} higher` : `On days you work out, your mood is ${(-f.diff).toFixed(1)} lower. Maybe you're tired`),
        sleepFocus: (f) => (f.diff > 0 ? `After 7+ hours of sleep you focus ${Math.round(f.diff)} min more` : `On short-sleep days you focus ${Math.round(-f.diff)} min more`),
        workoutFocus: (f) => (f.diff > 0 ? `On workout days you focus ${Math.round(f.diff)} min more` : `On workout days you focus ${Math.round(-f.diff)} min less`),
        bestDay: (f, days) => `${days[f.wd]} is your best day for focus, ${Math.round(f.yes)} min on average`
      },
      basis: (a, b) => ` (${a} days vs ${b})`
    }
  });
  const t = LO.ns('insights');

  const keysBetween = (a, b) => {
    const out = [];
    for (let d = LO.parseKey(a); LO.keyOf(d) <= b; d = LO.addDays(d, 1)) out.push(LO.keyOf(d));
    return out;
  };

  // One record per day for the insight math
  function daysBetween(a, b) {
    const today = LO.todayKey();
    const end = b < today ? b : today;
    if (end < a) return [];
    const done = {};
    if (LO.tasks) LO.tasks.store.s.todos.forEach((x) => { if (x.done && x.doneAt) done[x.doneAt] = (done[x.doneAt] || 0) + 1; });
    const H = LO.health;
    return keysBetween(a, end).map((k) => ({
      date: k,
      wd: LO.wd(LO.parseKey(k)),
      sleep: H ? H.sleepHours(k) : null,
      mood: H && H.store.s.mood.days[k] ? H.store.s.mood.days[k].v : null,
      workout: H ? H.metOn('workout', k) : false,
      focus: LO.focus ? LO.focus.minutesOn(k) : 0,
      todos: done[k] || 0
    }));
  }

  function patternsHTML() {
    const a = LO.keyOf(LO.addDays(new Date(), -59));
    // start from the first day with anything logged, so days before then don't count as "no workout"
    const all = daysBetween(a, LO.todayKey());
    const first = all.findIndex((d) => d.sleep != null || d.mood != null || d.workout || d.focus || d.todos);
    const list = first < 0 ? [] : C.findings(all.slice(first)).slice(0, 4);
    const days = LO.t('common.weekdaysLong');
    return `<section class="card rv-card insight-card"><h3 class="rv-h">💡 ${esc(t('patterns'))}</h3>`
      + (list.length ? `<ul class="insight-list">${list.map((f) => `<li>${esc(t('p')[f.id](f, days))}${f.ny ? `<small>${esc(t('basis')(f.ny, f.nn))}</small>` : ''}</li>`).join('')}</ul><p class="hint">${esc(t('patternsHint'))}</p>`
        : `<p class="hint">${esc(t('noPatterns'))}</p>`) + '</section>';
  }

  function rangeOf(mode, off) {
    const now = new Date();
    if (mode === 'year') {
      const y = now.getFullYear() + off;
      return { a: `${y}-01-01`, b: `${y}-12-31`, title: t('yearTitle')(y) };
    }
    const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { a: LO.keyOf(d), b: LO.keyOf(last), title: t('monthTitle')(d.getFullYear(), d.getMonth() + 1) };
  }

  function summaryHTML(mode, off) {
    const { a, b, title } = rangeOf(mode, off);
    const days = daysBetween(a, b);
    const s = C.totals(days);
    const H = LO.health;
    const ws = H ? H.store.s.workouts.filter((w) => w.date >= a && w.date <= b) : [];
    const wmin = ws.reduce((x, w) => x + w.min, 0);
    const typeCount = {};
    ws.forEach((w) => w.types.forEach((ty) => { typeCount[ty] = (typeCount[ty] || 0) + 1; }));
    const top = Object.entries(typeCount).sort((x, y) => y[1] - x[1])[0];
    let checks = 0;
    if (LO.tasks) LO.tasks.store.s.dailies.forEach((d) => { checks += LO.tasks.doneDates(d, a).filter((k) => k <= b).length; });
    const books = LO.learn ? LO.learn.store.s.books.filter((x) => x.status === 'done' && x.finished >= a && x.finished <= b).map((x) => x.title) : [];
    const recs = LO.records ? LO.records.store.s.records.filter((x) => x.date >= a && x.date <= b).map((x) => x.title) : [];
    const tv = LO.store('travel');
    const trips = tv ? tv.s.trips.filter((x) => x.start && x.start >= a && x.start <= b && x.start <= LO.todayKey()).map((x) => x.dest) : [];
    const spend = LO.money ? LO.money.totalBetween(a, b) : 0;
    const moods = LO.t('health.moods');
    const card = (h, big, sub) => `<section class="card rv-card"><h3 class="rv-h">${esc(h)}</h3><p class="rv-big">${esc(big)}</p>${sub ? `<p class="hint">${esc(sub)}</p>` : ''}</section>`;
    const list = (xs) => (xs.length ? xs.join(LO.lang() === 'zh' ? '、' : ', ') : t('none'));
    let h = `<h2 class="insight-title">${esc(title)}</h2>`;
    if (!days.length || (!s.todos && !checks && !s.workouts && !s.focus && s.sleep == null && s.mood == null && !books.length && !recs.length)) {
      return `${h}<p class="hint">${esc(t('nothing'))}</p>`;
    }
    h += '<div class="rv-grid">'
      + card(t('active'), t('activeLine')(s.active, days.length))
      + card(t('todos'), String(s.todos), `${t('dailies')} ${checks}`)
      + card(t('workouts'), t('workoutsLine')(ws.length, wmin), top ? t('topType')(LO.t('health.wt')[top[0]]) : '')
      + card(t('focus'), t('focusLine')(s.focus))
      + card(t('sleep'), s.sleep != null ? t('sleepLine')(s.sleep) : '–', s.mood != null ? `${t('mood')} ${s.mood} · ${moods[Math.round(s.mood) - 1]}` : '')
      + (spend ? card(t('spend'), LO.money.fmt(spend)) : '')
      + card(t('books'), String(books.length), list(books))
      + card(t('records'), String(recs.length), list(recs.slice(0, 8)))
      + (trips.length ? card(t('trips'), list(trips)) : '')
      + '</div>';
    return h;
  }

  LO.insights = { patternsHTML, summaryHTML, daysBetween };
})();
