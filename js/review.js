/*
 * Weekly review: an automatic summary of the week across every page,
 * a few reflection prompts, and next week's three priorities.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, $$, esc } = LO;

  LO.strings('review', {
    zh: {
      title: '每周回顾', prev: '上一周', next: '下一周', thisWeek: '本周', lastWeek: '上周',
      tasks: '任务', todosDone: (n) => `完成了 ${n} 个待办`, dailyRate: (a, b) => `每日任务完成 ${a}/${b}`, habits: (u, d) => `好习惯 +${u}，坏习惯 −${d}`,
      schedule: '课表时间', scheduleEmpty: '这周课表是空的。', total: '合计', hours: '小时',
      exercise: '运动', exLine: (n, m, d) => `${n} 次，共 ${m} 分钟，活跃 ${d} 天`, goal: (g) => `每周目标 ${g} 分钟`,
      body: '睡眠和喝水', sleepAvg: (h) => `平均睡 ${h} 小时`, noSleep: '这周没有记录睡眠', water: (a) => `喝水达标 ${a} 天`,
      mood: '心情', focus: '专注和学习', focusLine: (n, m) => `专注 ${n} 次，共 ${m} 分钟`, books: '读完的书', records: '成长记录', none: '没有',
      reflect: '写写这一周', wins: '这周做得好的事', winsPh: '哪怕是很小的事，比如按时交了作业、去了健身房', hard: '遇到的困难', hardPh: '什么让你卡住了？下次可以怎么做？',
      learned: '学到了什么', learnedPh: '一个新知识、一个想法或者对自己的新认识', energy: '这周整体状态', energies: ['很累', '有点累', '一般', '不错', '很好'],
      nextTitle: '下周最重要的三件事', nextPh: (i) => `第 ${i} 件`, push: '加到下周的待办', pushed: '已经加进待办了', pushedToast: (n) => `已把 ${n} 件事加到下周的待办`,
      nothingToPush: '先写下至少一件事。', saved: '自动保存', past: '以前的回顾', planWorkout: '运动详情和下周计划', promptTitle: (w) => `该写${w}的回顾了`, promptText: '花五分钟回顾这一周，定下下周的三件重点。', promptBtn: '开始回顾', promptSkip: '这次不写'
    },
    en: {
      title: 'Weekly review', prev: 'Previous week', next: 'Next week', thisWeek: 'This week', lastWeek: 'Last week',
      tasks: 'Tasks', todosDone: (n) => `${n} to-dos finished`, dailyRate: (a, b) => `Dailies ${a}/${b}`, habits: (u, d) => `Good habits +${u}, bad −${d}`,
      schedule: 'Scheduled time', scheduleEmpty: 'Nothing on the schedule this week.', total: 'Total', hours: 'h',
      exercise: 'Exercise', exLine: (n, m, d) => `${n} workouts, ${m} min, ${d} active days`, goal: (g) => `Weekly goal ${g} min`,
      body: 'Sleep and water', sleepAvg: (h) => `Average sleep ${h} h`, noSleep: 'No sleep logged this week', water: (a) => `Water goal hit on ${a} days`,
      mood: 'Mood', focus: 'Focus and learning', focusLine: (n, m) => `${n} focus sessions, ${m} min`, books: 'Books finished', records: 'Growth log', none: 'None',
      reflect: 'Reflect on the week', wins: 'What went well', winsPh: 'Even small things, like handing in work on time or going to the gym', hard: 'What was hard', hardPh: 'What got you stuck? What would you try next time?',
      learned: 'What I learned', learnedPh: 'Something new, an idea, or something about yourself', energy: 'Overall energy', energies: ['Drained', 'Tired', 'Okay', 'Good', 'Great'],
      nextTitle: "Next week's top three", nextPh: (i) => `Priority ${i}`, push: "Add to next week's to-dos", pushed: 'Already added to to-dos', pushedToast: (n) => `Added ${n} to next week's to-dos`,
      nothingToPush: 'Write at least one first.', saved: 'Saved automatically', past: 'Past reviews', planWorkout: "Exercise details and next week's plan", promptTitle: (w) => `Time to review ${w.toLowerCase()}`, promptText: 'Take five minutes to look back and pick three priorities for next week.', promptBtn: 'Start review', promptSkip: 'Not this time'
    }
  });
  const t = LO.ns('review');

  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const str = (v) => (typeof v === 'string' ? v : '');
  const R = LO.createStore('review', 'planner:review:v1', () => ({ v: 1, weeks: {} }), (s) => {
    const out = { v: 1, weeks: {} };
    Object.entries(s.weeks || {}).forEach(([k, w]) => {
      if (!isKey(k) || !w) return;
      const next = Array.isArray(w.next) ? w.next.map(str).slice(0, 3) : [];
      while (next.length < 3) next.push('');
      out.weeks[k] = { wins: str(w.wins), hard: str(w.hard), learned: str(w.learned), energy: [0, 1, 2, 3, 4, 5].includes(w.energy) ? w.energy : 0, next, pushed: !!w.pushed };
    });
    return out;
  });

  const blank = () => ({ wins: '', hard: '', learned: '', energy: 0, next: ['', '', ''], pushed: false });
  const isEmpty = (w) => !w || (!w.wins && !w.hard && !w.learned && !w.energy && !w.next.some(Boolean));
  let offset = LO.wd(new Date()) <= 2 ? -1 : 0;

  function range(off) {
    const mon = LO.addDays(LO.mondayOf(new Date()), off * 7);
    const keys = LO.seq(7).map((i) => LO.keyOf(LO.addDays(mon, i)));
    return { mon, a: keys[0], b: keys[6], keys };
  }
  function rangeLabel(mon) {
    const end = LO.addDays(mon, 6);
    return LO.lang() === 'zh'
      ? `${mon.getMonth() + 1}月${mon.getDate()}日 – ${end.getMonth() + 1}月${end.getDate()}日`
      : `${mon.toLocaleString('en-US', { month: 'short' })} ${mon.getDate()} – ${end.toLocaleString('en-US', { month: 'short' })} ${end.getDate()}`;
  }

  function summary(off) {
    const { mon, a, b, keys } = range(off);
    const today = LO.todayKey();
    const past = keys.filter((k) => k <= today);
    const out = {};
    if (LO.tasks) {
      const T = LO.tasks.store.s;
      out.todos = T.todos.filter((x) => x.done && x.doneAt >= a && x.doneAt <= b).length;
      let due = 0;
      let done = 0;
      past.forEach((k) => {
        const date = LO.parseKey(k);
        T.dailies.forEach((d) => {
          if (k < d.created || !LO.tasks.isDue(d, date)) return;
          due++;
          if (LO.tasks.isDone(d, k)) done++;
        });
      });
      out.dailyDone = done;
      out.dailyDue = due;
      let u = 0;
      let dn = 0;
      T.habits.forEach((h) => keys.forEach((k) => { const x = h.log[k]; if (x) { u += x.u; dn += x.d; } }));
      out.up = u;
      out.down = dn;
    }
    out.hours = LO.planner ? LO.planner.weekHours(mon) : {};
    if (LO.health) {
      out.ex = LO.health.weekStats(off);
      out.exGoal = LO.health.store.s.workoutGoal;
      out.sleep = LO.health.sleepAvg(keys);
      out.water = past.filter((k) => LO.health.metOn('water', k)).length;
      out.moods = keys.map((k) => LO.health.store.s.mood.days[k] || null);
    }
    if (LO.focus) {
      out.focusN = keys.reduce((x, k) => x + LO.focus.countOn(k), 0);
      out.focusMin = keys.reduce((x, k) => x + LO.focus.minutesOn(k), 0);
    }
    out.books = LO.learn ? LO.learn.store.s.books.filter((x) => x.status === 'done' && x.finished >= a && x.finished <= b).map((x) => x.title) : [];
    out.records = LO.records ? LO.records.store.s.records.filter((x) => x.date >= a && x.date <= b).map((x) => x.title) : [];
    return out;
  }

  const view = $('#view-review');

  function render() {
    const { mon, a } = range(offset);
    const s = summary(offset);
    const w = R.s.weeks[a] || blank();
    const label = offset === 0 ? t('thisWeek') : offset === -1 ? t('lastWeek') : '';
    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1><p class="sub">${esc(rangeLabel(mon))}${label ? `，${esc(label)}` : ''}</p></div>`
      + `<div class="year-nav"><button type="button" class="icon-btn" data-roff="-1" aria-label="${esc(t('prev'))}">‹</button>`
      + `<button type="button" class="icon-btn" data-roff="1" aria-label="${esc(t('next'))}"${offset >= 0 ? ' disabled' : ''}>›</button></div></div>`;

    const card = (title, inner) => `<section class="card rv-card"><h3 class="rv-h">${esc(title)}</h3>${inner}</section>`;
    const totalH = Object.values(s.hours).reduce((x, y) => x + y, 0);
    const hourRows = Object.entries(s.hours).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]);
    h += '<div class="rv-grid">';
    h += card(t('tasks'), `<p class="rv-big">${esc(t('todosDone')(s.todos || 0))}</p><p>${esc(t('dailyRate')(s.dailyDone || 0, s.dailyDue || 0))}</p>`
      + `<div class="progress sm"><span style="width:${s.dailyDue ? s.dailyDone / s.dailyDue * 100 : 0}%"></span></div><p class="hint">${esc(t('habits')(s.up || 0, s.down || 0))}</p>`);
    h += card(t('schedule'), hourRows.length
      ? `<ul class="hours">${hourRows.map(([c, v]) => `<li class="cat-${c}"><span class="hn"><i class="sw"></i>${esc(LO.planner.catLabel(c))}</span><b>${LO.round1(v)} ${esc(t('hours'))}</b></li>`).join('')}</ul><p class="hours-total"><span>${esc(t('total'))}</span><b>${LO.round1(totalH)} ${esc(t('hours'))}</b></p>`
      : `<p class="hint">${esc(t('scheduleEmpty'))}</p>`);
    if (s.ex) {
      h += card(t('exercise'), `<p class="rv-big">${esc(t('exLine')(s.ex.n, s.ex.min, s.ex.days))}</p><div class="progress sm k-health"><span style="width:${Math.min(1, s.ex.min / s.exGoal) * 100}%"></span></div><p class="hint">${esc(t('goal')(s.exGoal))}</p>`
        + `<a class="link" href="#/health/health">${esc(t('planWorkout'))}</a>`);
      h += card(t('body'), `<p class="rv-big">${esc(s.sleep != null ? t('sleepAvg')(s.sleep) : t('noSleep'))}</p><p>${esc(t('water')(s.water))}</p>`);
      h += card(t('mood'), `<div class="rv-moods">${s.moods.map((m, i) => `<span class="rv-mood"><small>${esc(LO.t('common.daysShort')[i])}</small>${m ? LO.health.face(m.v, 28) : '<i class="rv-nomood"></i>'}</span>`).join('')}</div>`);
    }
    h += card(t('focus'), `<p class="rv-big">${esc(t('focusLine')(s.focusN || 0, s.focusMin || 0))}</p>`
      + `<p class="hint">${esc(t('books'))}：${esc(s.books.length ? s.books.join('、') : t('none'))}</p>`
      + `<p class="hint">${esc(t('records'))}：${esc(s.records.length ? s.records.join('、') : t('none'))}</p>`);
    h += '</div>';

    h += `<section class="card rv-reflect"><header class="card-head"><h2>${esc(t('reflect'))}</h2><span class="hint">${esc(t('saved'))}</span></header>`
      + `<div class="rv-fields">`
      + `<label class="fld"><span>${esc(t('wins'))}</span><textarea class="input ta" rows="3" data-rf="wins" placeholder="${esc(t('winsPh'))}">${esc(w.wins)}</textarea></label>`
      + `<label class="fld"><span>${esc(t('hard'))}</span><textarea class="input ta" rows="3" data-rf="hard" placeholder="${esc(t('hardPh'))}">${esc(w.hard)}</textarea></label>`
      + `<label class="fld"><span>${esc(t('learned'))}</span><textarea class="input ta" rows="3" data-rf="learned" placeholder="${esc(t('learnedPh'))}">${esc(w.learned)}</textarea></label>`
      + `<div class="fld"><span>${esc(t('energy'))}</span><div class="chips">${LO.chips('renergy', [1, 2, 3, 4, 5].map((n) => [n, esc(t('energies')[n - 1])]), 'radio', [w.energy])}</div></div>`
      + '</div>'
      + `<h3 class="sub-head">${esc(t('nextTitle'))}</h3><div class="rv-next">${[0, 1, 2].map((i) => `<input class="input" data-rnext="${i}" maxlength="80" value="${esc(w.next[i])}" placeholder="${esc(t('nextPh')(i + 1))}">`).join('')}</div>`
      + `<div class="row"><button type="button" class="btn primary" data-rpush${w.pushed ? ' disabled' : ''}>${esc(w.pushed ? t('pushed') : t('push'))}</button></div></section>`;

    const pastKeys = Object.keys(R.s.weeks).filter((k) => k !== a && !isEmpty(R.s.weeks[k])).sort().reverse().slice(0, 12);
    if (pastKeys.length) {
      h += `<div class="section-head"><h2>${esc(t('past'))}</h2></div><div class="rv-past">${pastKeys.map((k) => {
        const x = R.s.weeks[k];
        return `<button type="button" class="rv-past-item" data-rweek="${k}"><b>${esc(rangeLabel(LO.parseKey(k)))}</b><span>${esc(x.wins || x.learned || x.hard || x.next.filter(Boolean).join('、'))}</span></button>`;
      }).join('')}</div>`;
    }
    view.innerHTML = h;
  }

  function cur() {
    const { a } = range(offset);
    if (!R.s.weeks[a]) R.s.weeks[a] = blank();
    return R.s.weeks[a];
  }

  view.addEventListener('click', (e) => {
    const o = e.target.closest('[data-roff]');
    if (o) { offset = Math.min(0, offset + +o.dataset.roff); render(); return; }
    const pw = e.target.closest('[data-rweek]');
    if (pw) {
      const diff = Math.round(LO.dayDiff(LO.keyOf(LO.mondayOf(new Date())), pw.dataset.rweek) / 7);
      offset = Math.min(0, diff);
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (e.target.closest('[data-rpush]')) {
      const w = cur();
      const items = w.next.map((x) => x.trim()).filter(Boolean);
      if (!items.length) { LO.toast(t('nothingToPush')); return; }
      const { mon } = range(offset);
      const due = LO.keyOf(LO.addDays(mon, 13));
      items.forEach((title) => LO.tasks.addTodo({ title, due, pri: 2 }));
      w.pushed = true;
      R.save();
      LO.refresh();
      LO.toast(t('pushedToast')(items.length));
    }
  });
  view.addEventListener('input', (e) => {
    const f = e.target.dataset.rf;
    const n = e.target.dataset.rnext;
    if (!f && n == null) return;
    const w = cur();
    if (f) w[f] = e.target.value;
    else w.next[+n] = e.target.value;
    R.save();
  });
  view.addEventListener('change', (e) => {
    if (e.target.name !== 'renergy') return;
    cur().energy = +e.target.value;
    R.save();
  });

  LO.view('review', { render });

  // On the weekend the review is for this week; on Monday and Tuesday it is
  // for the week that just ended. Returns that week's offset, or null.
  const nudgeOffset = () => {
    const wd = LO.wd(new Date());
    const off = wd >= 5 ? 0 : wd <= 1 ? -1 : null;
    if (off == null) return null;
    const k = range(off).a;
    return isEmpty(R.s.weeks[k]) && LO.settings().reviewSkip !== k ? off : null;
  };

  LO.review = {
    nudgeHTML() {
      const off = nudgeOffset();
      if (off == null) return '';
      return `<section class="card review-nudge"><div><b>${esc(t('promptTitle')(off ? t('lastWeek') : t('thisWeek')))}</b><p>${esc(t('promptText'))}</p></div>`
        + `<button type="button" class="btn ghost" data-rskip="${range(off).a}">${esc(t('promptSkip'))}</button>`
        + `<button type="button" class="btn primary" data-ropen="${off}">${esc(t('promptBtn'))}</button></section>`;
    },
    open(off) { offset = off; LO.go('review'); },
    skip(k) { LO.settings().reviewSkip = k; LO.saveSettings(); LO.refresh(); }
  };
})();
