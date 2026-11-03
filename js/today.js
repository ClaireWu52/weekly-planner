/*
 * Today page: one screen with today's schedule, focus items, dailies,
 * upcoming to-dos, quick health logging, habits, wishes and a focus timer.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc } = LO;

  LO.strings('today', {
    zh: {
      greet: (h) => (h < 5 ? '夜深了，早点休息' : h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'),
      schedule: '今天的安排', noEvents: '今天没有课和工作安排。', openSchedule: '打开课表', now: '进行中', next: '接下来',
      focusTitle: '今天的三件重点', focusPh: '今天最重要的一件事', pickTodo: '从待办里挑一件…', focusHint: '只挑三件，做完它们今天就算赢了。',
      dailies: '每日任务', allDailies: '全部', noDailies: '今天没有要做的每日任务。',
      upcoming: '快到期的待办', noUpcoming: '未来 7 天没有到期的待办。', allTodos: '全部待办',
      health: '健康', water: '喝水', mood: '心情', exercise: (m, g) => `本周运动 ${m} / ${g} 分钟`,
      slept: (h) => `昨晚睡了 ${h} 小时`, logSleep: '记录昨晚的睡眠', openHealth: '打开健康',
      habits: '习惯', noHabits: '还没有习惯。', wishes: '心愿进度', noWishes: '还没有心愿。', openWishes: '全部心愿',
      timer: '专注计时', work: '专注', brk: '休息', start: '开始', pause: '暂停', resume: '继续', reset: '重置', skip: '跳过',
      sessions: (n, m) => `今天专注了 ${n} 次，共 ${m} 分钟`, workDone: '专注完成，休息一下吧', breakDone: '休息结束，可以开始下一轮了',
      startBreak: '开始休息', focusing: '专注中', resting: '休息中', length: '时长',
      news: '今日新闻', moreNews: '全部新闻', noNews: '网站部署到 GitHub 后，这里每天会自动更新头条。',
      month: '本月重点', openPlan: '全年目标', noMonth: '这个月还没有拆解的目标。', streak: (g, n) => `${g}。已经连续活跃 ${n} 天了`
    },
    en: {
      greet: (h) => (h < 5 ? "It's late. Get some rest." : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'),
      schedule: "Today's schedule", noEvents: 'No classes or shifts today.', openSchedule: 'Open schedule', now: 'Now', next: 'Next',
      focusTitle: "Today's three focus items", focusPh: 'The most important thing today', pickTodo: 'Pick from your to-dos…', focusHint: 'Pick three. Finish them and today is a win.',
      dailies: 'Dailies', allDailies: 'All', noDailies: 'No dailies due today.',
      upcoming: 'Due soon', noUpcoming: 'Nothing due in the next 7 days.', allTodos: 'All to-dos',
      health: 'Health', water: 'Water', mood: 'Mood', exercise: (m, g) => `Exercise this week: ${m} / ${g} min`,
      slept: (h) => `Slept ${h} h last night`, logSleep: "Log last night's sleep", openHealth: 'Open Health',
      habits: 'Habits', noHabits: 'No habits yet.', wishes: 'Wishes', noWishes: 'No wishes yet.', openWishes: 'All wishes',
      timer: 'Focus timer', work: 'Focus', brk: 'Break', start: 'Start', pause: 'Pause', resume: 'Resume', reset: 'Reset', skip: 'Skip',
      sessions: (n, m) => `${n} sessions today, ${m} min`, workDone: 'Session done. Take a break.', breakDone: 'Break over. Ready for the next one.',
      startBreak: 'Start break', focusing: 'Focusing', resting: 'On break', length: 'Length',
      news: "Today's news", moreNews: 'All news', noNews: 'Headlines appear here once the site is deployed on GitHub.',
      month: 'This month', openPlan: 'Yearly goals', noMonth: 'Nothing planned for this month yet.', streak: (g, n) => `${g}. ${n}-day streak`
    }
  });
  const t = LO.ns('today');
  const tc = LO.ns('common');

  /* ---------------- focus timer ---------------- */
  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const F = LO.createStore('focus', 'planner:focus:v1', () => ({ v: 1, work: 25, brk: 5, days: {} }), (s) => {
    const out = { v: 1, work: [15, 25, 45, 50].includes(s.work) ? s.work : 25, brk: [5, 10, 15].includes(s.brk) ? s.brk : 5, days: {} };
    Object.entries(s.days || {}).forEach(([k, v]) => { if (isKey(k) && v && +v.n > 0) out.days[k] = { n: +v.n, min: +v.min || 0 }; });
    return out;
  });
  const timer = { mode: 'work', running: false, endAt: 0, remain: F.s.work * 60000, tick: null };
  const baseTitle = () => `${LO.t('app.nav.' + (LO.route() || 'today'))} | ${LO.t('app.brand')}`;

  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      [0, 0.25].forEach((delay) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.2);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + delay);
        o.stop(ctx.currentTime + delay + 0.22);
      });
      setTimeout(() => ctx.close(), 800);
    } catch (_) { /* audio not available */ }
  }
  const remainNow = () => (timer.running ? Math.max(0, timer.endAt - Date.now()) : timer.remain);
  const fmtClock = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

  function paintTimer() {
    const box = $('#focusBox');
    const ms = remainNow();
    const total = (timer.mode === 'work' ? F.s.work : F.s.brk) * 60000;
    if (box) {
      $('.ft-clock', box).textContent = fmtClock(ms);
      const ring = $('.ring-fg', box);
      if (ring) {
        const c = 2 * Math.PI * 16;
        ring.setAttribute('stroke-dashoffset', String(c * (1 - ms / total)));
      }
      box.dataset.mode = timer.mode;
      box.dataset.running = String(timer.running);
    }
    document.title = timer.running ? `${fmtClock(ms)} ${timer.mode === 'work' ? t('focusing') : t('resting')}` : baseTitle();
  }
  function tick() {
    if (!timer.running) return;
    if (remainNow() <= 0) { finish(); return; }
    paintTimer();
  }
  function startTimer() {
    timer.running = true;
    timer.endAt = Date.now() + timer.remain;
    clearInterval(timer.tick);
    timer.tick = setInterval(tick, 500);
    refreshTimerCard();
  }
  function pauseTimer() {
    timer.remain = remainNow();
    timer.running = false;
    clearInterval(timer.tick);
    refreshTimerCard();
  }
  function resetTimer(mode) {
    clearInterval(timer.tick);
    timer.running = false;
    timer.mode = mode || 'work';
    timer.remain = (timer.mode === 'work' ? F.s.work : F.s.brk) * 60000;
    refreshTimerCard();
  }
  function finish() {
    clearInterval(timer.tick);
    timer.running = false;
    beep();
    if (timer.mode === 'work') {
      const k = LO.todayKey();
      const mins = F.s.work;
      F.s.days[k] = { n: ((F.s.days[k] || {}).n || 0) + 1, min: ((F.s.days[k] || {}).min || 0) + mins };
      F.saveNow();
      resetTimer('brk');
      LO.toast(t('workDone'), [{ label: t('startBreak'), run: startTimer }], 10000);
      if (LO.route() === 'today' || LO.route() === 'wishes') LO.refresh();
    } else {
      resetTimer('work');
      LO.toast(t('breakDone'));
    }
  }
  function refreshTimerCard() {
    const slot = $('#focusSlot');
    if (slot) slot.innerHTML = timerCard();
    paintTimer();
  }

  function timerCard() {
    const today = F.s.days[LO.todayKey()] || { n: 0, min: 0 };
    const running = timer.running;
    const paused = !running && timer.remain < (timer.mode === 'work' ? F.s.work : F.s.brk) * 60000;
    return `<div class="focus" id="focusBox" data-mode="${timer.mode}" data-running="${running}">`
      + `<div class="seg sm"><button type="button" data-fmode="work" aria-selected="${timer.mode === 'work'}">${esc(t('work'))}</button><button type="button" data-fmode="brk" aria-selected="${timer.mode === 'brk'}">${esc(t('brk'))}</button></div>`
      + `<div class="ft-dial">${LO.ring(1, 150)}<span class="ft-clock">${fmtClock(remainNow())}</span></div>`
      + `<div class="ft-actions"><button type="button" class="btn primary" data-ft="${running ? 'pause' : 'start'}">${esc(running ? t('pause') : paused ? t('resume') : t('start'))}</button>`
      + `<button type="button" class="btn" data-ft="reset">${esc(t('reset'))}</button><button type="button" class="btn ghost" data-ft="skip">${esc(t('skip'))}</button></div>`
      + `<div class="ft-len"><span>${esc(t('length'))}</span>${timer.mode === 'work'
        ? [15, 25, 45, 50].map((m) => `<button type="button" class="btn sm${F.s.work === m ? ' on' : ''}" data-flen="${m}">${m}</button>`).join('')
        : [5, 10, 15].map((m) => `<button type="button" class="btn sm${F.s.brk === m ? ' on' : ''}" data-flen="${m}">${m}</button>`).join('')}</div>`
      + `<p class="hint">${esc(t('sessions')(today.n, today.min))}</p></div>`;
  }

  LO.focus = {
    sessionsSince: (k) => Object.entries(F.s.days).filter(([d]) => d >= k).reduce((a, [, v]) => a + v.n, 0),
    countOn: (k) => (F.s.days[k] || {}).n || 0,
    minutesOn: (k) => (F.s.days[k] || {}).min || 0,
    activity(add) { Object.entries(F.s.days).forEach(([k, v]) => add(k, 'focus', v.n)); }
  };

  /* ---------------- page ---------------- */
  const view = $('#view-today');

  function scheduleCard() {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const evs = LO.planner ? LO.planner.eventsOn(now) : [];
    let nextMarked = false;
    const items = evs.map((e) => {
      let state = '';
      if (e.end <= nowMin) state = 'past';
      else if (e.start <= nowMin) state = 'now';
      else if (!nextMarked) { state = 'next'; nextMarked = true; }
      const badge = state === 'now' ? `<span class="badge live">${esc(t('now'))}</span>` : state === 'next' ? `<span class="badge">${esc(t('next'))}</span>` : '';
      return `<li class="ev-line cat-${e.cat}${state ? ' is-' + state : ''}"><span class="ev-time">${LO.fmtMin(e.start)}<br><small>${e.end >= 1440 ? '24:00' : LO.fmtMin(e.end)}</small></span>`
        + `<span class="ev-info"><b>${esc(e.title)}</b>${e.place ? `<small>${esc(e.place)}</small>` : ''}</span>${badge}</li>`;
    }).join('');
    return `<section class="card o2"><header class="card-head"><h2>${esc(t('schedule'))}</h2><a class="link" href="#/schedule">${esc(t('openSchedule'))}</a></header>`
      + (evs.length ? `<ul class="timeline">${items}</ul>` : `<p class="empty-note">${esc(t('noEvents'))}</p>`) + '</section>';
  }

  function tripCard() {
    const tr = LO.travel && LO.travel.today();
    if (!tr) return soonCard();
    const tt = LO.ns('travel');
    const items = tr.items.map((p) => `<li class="ev-line cat-life${p.done ? ' is-past' : ''}"><span class="ev-time">${esc(p.time || '·')}</span>`
      + `<span class="ev-info"><b>${esc(p.name)}</b>${p.note ? `<small>${esc(p.note)}</small>` : ''}</span></li>`).join('');
    return `<section class="card o2 trip-today"><header class="card-head"><h2>${esc(tt('todayCard')(tr.dest, tr.n))}</h2><button type="button" class="link link-btn" data-opentrip="${esc(tr.id)}">${esc(tt('openTrip'))}</button></header>`
      + (items ? `<ul class="timeline">${items}</ul>` : `<p class="empty-note">${esc(tt('todayEmpty'))}</p>`) + '</section>';
  }

  // A trip starting within the week: first bookings and packing left.
  function soonCard() {
    const tr = LO.travel && LO.travel.soon();
    if (!tr) return '';
    const tt = LO.ns('travel');
    const items = tr.items.map((p) => `<li class="ev-line cat-life"><span class="ev-time">${esc(p.time)}</span>`
      + `<span class="ev-info"><b>${esc(p.name)}</b>${p.note ? `<small>${esc(p.note)}</small>` : ''}</span></li>`).join('');
    const pack = tr.packTotal ? (tr.packLeft ? tt('soonPack')(tr.packLeft, tr.packTotal) : tt('soonPacked')) : '';
    return `<section class="card o2 trip-today"><header class="card-head"><h2>${esc(tt('soonCard')(tr.dest, tr.n))}</h2><button type="button" class="link link-btn" data-opentrip="${esc(tr.id)}">${esc(tt('openTrip'))}</button></header>`
      + (items ? `<ul class="timeline">${items}</ul>` : `<p class="empty-note">${esc(tt('soonNoBook'))}</p>`)
      + (pack ? `<p class="hint trip-soon-pack">🧳 ${esc(pack)}</p>` : '') + '</section>';
  }

  function focusCard() {
    const T = LO.tasks;
    const list = T.focusTodos();
    const openFocus = list.filter((x) => !x.done).length;
    const today = LO.todayKey();
    const pick = T.openTodos().filter((x) => x.focus !== today);
    let h = `<section class="card focus-card o1"><header class="card-head"><h2>${esc(t('focusTitle'))}</h2><span class="count">${list.filter((x) => x.done).length}/${list.length || 3}</span></header>`;
    h += list.length ? `<ul class="tlist compact">${list.map((x) => T.todoRow(x, true)).join('')}</ul>` : `<p class="hint">${esc(t('focusHint'))}</p>`;
    if (openFocus < 3) {
      h += `<form class="quick-add" data-focusadd><input maxlength="80" autocomplete="off" placeholder="${esc(t('focusPh'))}" aria-label="${esc(t('focusPh'))}"><button type="submit" class="icon-btn" aria-label="${esc(tc('add'))}">${LO.icon.plus}</button></form>`;
      if (pick.length) {
        h += `<select class="pick" data-pick aria-label="${esc(t('pickTodo'))}"><option value="">${esc(t('pickTodo'))}</option>${T.sortTodos(pick).slice(0, 40).map((x) => `<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('')}</select>`;
      }
    }
    return `${h}</section>`;
  }

  function dailiesCard() {
    const T = LO.tasks;
    const list = T.dueDailies();
    const today = LO.todayKey();
    const done = list.filter((d) => T.isDone(d, today)).length;
    return `<section class="card o3"><header class="card-head"><h2>${esc(t('dailies'))}</h2><span class="head-ring">${LO.ring(list.length ? done / list.length : 0, 28)}<span class="count">${done}/${list.length}</span></span></header>`
      + (list.length ? `<ul class="tlist compact">${list.slice().sort((a, b) => T.isDone(a, today) - T.isDone(b, today)).map((d) => T.dailyRow(d, true)).join('')}</ul>` : `<p class="empty-note">${esc(t('noDailies'))}</p>`)
      + '</section>';
  }

  function upcomingCard() {
    const T = LO.tasks;
    const list = T.upcoming(7).slice(0, 6);
    return `<section class="card o5"><header class="card-head"><h2>${esc(t('upcoming'))}</h2><a class="link" href="#/tasks">${esc(t('allTodos'))}</a></header>`
      + (list.length ? `<ul class="tlist compact">${list.map((x) => T.todoRow(x, true)).join('')}</ul>` : `<p class="empty-note">${esc(t('noUpcoming'))}</p>`)
      + '</section>';
  }

  function healthCard() {
    const Hh = LO.health;
    const S = Hh.store.s;
    const cups = Hh.waterToday();
    const mood = Hh.moodToday();
    const slept = Hh.sleepHours(LO.todayKey());
    const moods = LO.t('health.moods');
    return `<section class="card o4"><header class="card-head"><h2>${esc(t('health'))}</h2><a class="link" href="#/health">${esc(t('openHealth'))}</a></header>`
      + `<div class="mini-row"><span class="mini-label">${esc(t('water'))}</span><button type="button" class="icon-btn sm" data-water="-1" aria-label="-1">${LO.icon.minus}</button>`
      + `<span class="mini-val"><b>${cups}</b> / ${S.water.goal} ${esc(tc('cups'))}</span><button type="button" class="icon-btn sm" data-water="1" aria-label="+1">${LO.icon.plus}</button>`
      + `<span class="mini-bar"><span style="width:${LO.clamp(cups / S.water.goal, 0, 1) * 100}%"></span></span></div>`
      + `<div class="mini-row"><span class="mini-label">${esc(t('mood'))}</span><span class="mini-moods">${[1, 2, 3, 4, 5].map((v) => `<button type="button" class="mood-btn sm${mood && mood.v === v ? ' on' : ''}" data-mood="${v}" aria-pressed="${!!(mood && mood.v === v)}" aria-label="${esc(moods[v - 1])}" title="${esc(moods[v - 1])}">${Hh.face(v, 28)}</button>`).join('')}</span></div>`
      + `<p class="mini-line">${esc(t('exercise')(Hh.weekMinutes(), S.workoutGoal))}</p>`
      + `<p class="mini-line">${slept != null ? esc(t('slept')(slept)) : `<a class="link" href="#/health">${esc(t('logSleep'))}</a>`}</p>`
      + '</section>';
  }

  function habitsCard() {
    const T = LO.tasks;
    const list = T.store.s.habits;
    return `<section class="card o6"><header class="card-head"><h2>${esc(t('habits'))}</h2></header>`
      + (list.length ? `<ul class="tlist compact">${list.map((x) => T.habitRow(x, true)).join('')}</ul>` : `<p class="empty-note">${esc(t('noHabits'))}</p>`)
      + '</section>';
  }

  function monthCard() {
    if (!LO.plan) return '';
    const m = LO.plan.thisMonthHTML();
    return `<section class="card o8"><header class="card-head"><h2>${esc(t('month'))}${m.count ? `<span class="count">${m.done}/${m.count}</span>` : ''}</h2><a class="link" href="#/goals/plan">${esc(t('openPlan'))}</a></header>`
      + (m.count ? m.html : `<p class="empty-note">${esc(t('noMonth'))}</p>`) + '</section>';
  }

  function newsCard() {
    if (!LO.news) return '';
    const list = LO.news.top(4);
    return `<section class="card o9"><header class="card-head"><h2>${esc(t('news'))}</h2><a class="link" href="#/today/news">${esc(t('moreNews'))}</a></header>`
      + (list.length ? `<ul class="news-list compact">${list.map((x) => LO.news.itemHTML(x, true)).join('')}</ul>` : `<p class="empty-note">${esc(t('noNews'))}</p>`)
      + '</section>';
  }

  function wishesCard() {
    const list = LO.wishes.top(3);
    return `<section class="card o10"><header class="card-head"><h2>${esc(t('wishes'))}</h2><a class="link" href="#/goals/wishes">${esc(t('openWishes'))}</a></header>`
      + (list.length ? `<ul class="wish-mini">${list.map(({ w, p }) => `<li class="${LO.wishes.catClass(w.cat)}"><div class="wm-top"><b>${esc(w.title)}</b><span>${p.ready ? esc(LO.t('wishes.ready')) : esc(p.label)}</span></div><div class="progress sm"><span style="width:${p.pct * 100}%"></span></div></li>`).join('')}</ul>`
        : `<p class="empty-note">${esc(t('noWishes'))}</p>`)
      + '</section>';
  }

  function render() {
    const now = new Date();
    const streak = LO.records ? LO.records.streak() : 0;
    const greet = t('greet')(now.getHours());
    let h = `<div class="view-head"><div><h1>${esc(LO.dateLine(now))}</h1><p class="sub">${esc(streak >= 2 ? t('streak')(greet.replace(/[。.]$/, ''), streak) : greet)}</p></div></div>`;
    h += '<div class="today-grid">';
    h += `<div class="tcol-a">${tripCard()}${scheduleCard()}<section class="card o7"><header class="card-head"><h2>${esc(t('timer'))}</h2></header><div id="focusSlot">${timerCard()}</div></section></div>`;
    h += `<div class="tcol-b">${focusCard()}${dailiesCard()}${upcomingCard()}</div>`;
    h += `<div class="tcol-c">${healthCard()}${habitsCard()}${monthCard()}${newsCard()}${wishesCard()}</div>`;
    h += '</div>';
    view.innerHTML = h;
    paintTimer();
  }

  /* ---------------- events ---------------- */
  LO.tasks.attach(view);
  if (LO.plan) LO.plan.attachMonths(view);
  view.addEventListener('click', (e) => {
    const ot = e.target.closest('[data-opentrip]');
    if (ot) { LO.travel.show(ot.dataset.opentrip); return; }
    const w = e.target.closest('[data-water]');
    if (w) { LO.health.addWater(+w.dataset.water); return; }
    const m = e.target.closest('[data-mood]');
    if (m) { LO.health.setMood(+m.dataset.mood); return; }
    const ft = e.target.closest('[data-ft]');
    if (ft) {
      const a = ft.dataset.ft;
      if (a === 'start') startTimer();
      else if (a === 'pause') pauseTimer();
      else if (a === 'reset') resetTimer(timer.mode);
      else if (a === 'skip') resetTimer(timer.mode === 'work' ? 'brk' : 'work');
      return;
    }
    const fm = e.target.closest('[data-fmode]');
    if (fm) { if (!timer.running) resetTimer(fm.dataset.fmode); return; }
    const fl = e.target.closest('[data-flen]');
    if (fl) {
      const v = +fl.dataset.flen;
      if (timer.mode === 'work') F.s.work = v; else F.s.brk = v;
      F.save();
      if (!timer.running) resetTimer(timer.mode); else refreshTimerCard();
    }
  });
  view.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-focusadd]');
    if (!f) return;
    e.preventDefault();
    const title = $('input', f).value.trim();
    if (!title) return;
    LO.tasks.addTodo({ title, focus: LO.todayKey() });
    const i = $('[data-focusadd] input', view);
    if (i) i.focus();
  });
  view.addEventListener('change', (e) => {
    if (!e.target.matches('[data-pick]') || !e.target.value) return;
    const id = e.target.value;
    LO.mutate(LO.tasks.store, (s) => { const x = s.todos.find((y) => y.id === id); if (x) x.focus = LO.todayKey(); });
  });

  LO.view('today', { render });
  setInterval(() => { if (LO.route() === 'today' && !document.querySelector('dialog[open]') && !view.contains(document.activeElement)) render(); }, 60 * 1000);
})();
