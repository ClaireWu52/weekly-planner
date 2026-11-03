/*
 * Tasks page: habits (+/− counters), dailies (repeat on chosen weekdays,
 * streaks) and to-dos (due dates, priority, checklists, "today's focus").
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, $$, esc, uid } = LO;
  const TCATS = ['study', 'work', 'club', 'health', 'life', 'other'];
  const AUTOS = ['', 'workout', 'water', 'sleep', 'focus', 'mood'];

  LO.strings('tasks', {
    zh: {
      title: '任务',
      habits: '习惯', dailies: '每日任务', todos: '待办',
      addHabit: '添加一个习惯', addDaily: '添加一个每日任务', addTodo: '添加一个待办',
      habitsEmpty: '习惯没有固定时间。做到一次好习惯就点 +，犯了坏习惯就点 −。',
      dailiesEmpty: '每日任务按你选的星期重复，第二天自动重置。',
      todosEmpty: '所有要做的事都放这里。加上截止日期，快到期的会排在最前面。',
      doneEmpty: '还没有完成的待办。',
      fDue: '今天要做', fAll: '全部', fActive: '进行中', fToday: '今天', fDone: '已完成',
      notDueToday: '今天不用做', streak: '连续', todayCount: '今天',
      statDailies: '今天的每日任务', statHabits: '今天的习惯', statTodos: '未完成待办', statWeek: '本周完成',
      overdueN: (n) => `${n} 项逾期`, dueTodayN: (n) => `${n} 项今天到期`, allClear: '没有逾期',
      weekSub: '待办和每日任务',
      newHabit: '新建习惯', editHabit: '编辑习惯', newDaily: '新建每日任务', editDaily: '编辑每日任务',
      newTodo: '新建待办', editTodo: '编辑待办',
      direction: '方向', dirUp: '好习惯 +', dirDown: '坏习惯 −',
      repeat: '重复', everyday: '每天', weekdays: '工作日', weekends: '周末',
      due: '截止日期', clearDue: '不设', nextWeek: '下周一',
      pri: '优先级', priLow: '低', priMid: '普通', priHigh: '高',
      checklist: '子任务', checklistAdd: '添加子任务', checklistPh: '子任务内容',
      focus: '设为今天重点', unfocus: '取消今天重点', focusFull: '今天已经有三件重点了，先完成一件吧',
      clearDone: '清除已完成', cleared: '已清除', completed: '完成了',
      autoLabel: '自动打卡', autoHint: '满足条件时会自动勾上，不用手动点。', autoDone: '这一项会根据你的记录自动打卡',
      autos: { '': '不自动', workout: '记了运动', water: '喝水达标', sleep: '记了睡眠', focus: '专注过一次', mood: '记了心情' }, autoTag: (x) => `自动：${x}`,
      errTitle: '请填写名称。', errDays: '至少选一天。', errDir: '至少选一个方向。',
      seedHabits: [['吃蔬菜水果', 'health', 1, 0], ['走楼梯或多走路', 'health', 1, 0], ['喝含糖饮料', 'health', 0, 1], ['专注学习 25 分钟', 'study', 1, 0]],
      seedDailies: [['吃早餐', 'health', [1, 1, 1, 1, 1, 1, 1]], ['拉伸 10 分钟', 'health', [1, 1, 1, 1, 1, 1, 1]],
        ['复习当天的课堂笔记', 'study', [1, 1, 1, 1, 1, 0, 0]], ['睡前半小时放下手机', 'health', [1, 1, 1, 1, 1, 1, 1]]]
    },
    en: {
      title: 'Tasks',
      habits: 'Habits', dailies: 'Dailies', todos: 'To-dos',
      addHabit: 'Add a habit', addDaily: 'Add a daily', addTodo: 'Add a to-do',
      habitsEmpty: 'Habits have no schedule. Tap + when you do a good one, − when you slip.',
      dailiesEmpty: 'Dailies repeat on the weekdays you pick and reset every day.',
      todosEmpty: 'Everything you need to get done. Add a due date and it rises to the top as it gets close.',
      doneEmpty: 'No finished to-dos yet.',
      fDue: 'Due today', fAll: 'All', fActive: 'Active', fToday: 'Today', fDone: 'Done',
      notDueToday: 'Not due today', streak: 'Streak', todayCount: 'Today',
      statDailies: "Today's dailies", statHabits: "Today's habits", statTodos: 'Open to-dos', statWeek: 'Done this week',
      overdueN: (n) => `${n} overdue`, dueTodayN: (n) => `${n} due today`, allClear: 'Nothing overdue',
      weekSub: 'To-dos and dailies',
      newHabit: 'New habit', editHabit: 'Edit habit', newDaily: 'New daily', editDaily: 'Edit daily',
      newTodo: 'New to-do', editTodo: 'Edit to-do',
      direction: 'Direction', dirUp: 'Good habit +', dirDown: 'Bad habit −',
      repeat: 'Repeat', everyday: 'Every day', weekdays: 'Weekdays', weekends: 'Weekends',
      due: 'Due date', clearDue: 'None', nextWeek: 'Next Monday',
      pri: 'Priority', priLow: 'Low', priMid: 'Normal', priHigh: 'High',
      checklist: 'Checklist', checklistAdd: 'Add item', checklistPh: 'Checklist item',
      focus: "Make it one of today's focus", unfocus: "Remove from today's focus", focusFull: 'You already have three focus items today. Finish one first.',
      clearDone: 'Clear finished', cleared: 'Cleared', completed: 'Done',
      autoLabel: 'Auto check-in', autoHint: 'Checks itself off when the condition is met.', autoDone: 'This one checks itself off from your logs',
      autos: { '': 'Manual', workout: 'Logged a workout', water: 'Hit water goal', sleep: 'Logged sleep', focus: 'Did a focus session', mood: 'Logged mood' }, autoTag: (x) => `Auto: ${x}`,
      errTitle: 'Add a name.', errDays: 'Pick at least one day.', errDir: 'Pick at least one direction.',
      seedHabits: [['Eat fruit or vegetables', 'health', 1, 0], ['Take the stairs or walk more', 'health', 1, 0], ['Sugary drinks', 'health', 0, 1], ['Focused study, 25 min', 'study', 1, 0]],
      seedDailies: [['Eat breakfast', 'health', [1, 1, 1, 1, 1, 1, 1]], ['Stretch for 10 minutes', 'health', [1, 1, 1, 1, 1, 1, 1]],
        ["Review today's class notes", 'study', [1, 1, 1, 1, 1, 0, 0]], ['Phone away 30 min before bed', 'health', [1, 1, 1, 1, 1, 1, 1]]]
    }
  });
  const t = LO.ns('tasks');
  const tc = LO.ns('common');

  /* ---------------- data ---------------- */
  const str = (v) => (typeof v === 'string' ? v : '');
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const cat = (c, d) => (TCATS.includes(c) ? c : d);

  function defaults() {
    const today = LO.todayKey();
    return {
      v: 1,
      habits: t('seedHabits').map(([title, c, up, down]) => ({ id: uid(), title, notes: '', cat: c, up: !!up, down: !!down, log: {}, created: today })),
      dailies: t('seedDailies').map(([title, c, days]) => ({ id: uid(), title, notes: '', cat: c, days: days.slice(), done: {}, created: today })),
      todos: []
    };
  }
  function normalize(s) {
    const today = LO.todayKey();
    const out = { v: 1, habits: [], dailies: [], todos: [] };
    (s.habits || []).forEach((h) => {
      if (!h || typeof h.title !== 'string') return;
      out.habits.push({ id: String(h.id || uid()), title: h.title, notes: str(h.notes), cat: cat(h.cat, 'other'), up: h.up !== false, down: !!h.down, log: obj(h.log), created: isKey(h.created) ? h.created : today });
    });
    (s.dailies || []).forEach((d) => {
      if (!d || typeof d.title !== 'string') return;
      const days = Array.isArray(d.days) && d.days.length === 7 ? d.days.map((x) => (x ? 1 : 0)) : [1, 1, 1, 1, 1, 1, 1];
      out.dailies.push({ id: String(d.id || uid()), title: d.title, notes: str(d.notes), cat: cat(d.cat, 'other'), days, done: obj(d.done), auto: AUTOS.includes(d.auto) ? d.auto : '', created: isKey(d.created) ? d.created : today });
    });
    (s.todos || []).forEach((x) => {
      if (!x || typeof x.title !== 'string') return;
      out.todos.push({
        id: String(x.id || uid()), title: x.title, notes: str(x.notes), cat: cat(x.cat, 'other'),
        due: isKey(x.due) ? x.due : '', pri: [0, 1, 2].includes(x.pri) ? x.pri : 1,
        checklist: Array.isArray(x.checklist) ? x.checklist.filter((c) => c && typeof c.text === 'string').map((c) => ({ id: String(c.id || uid()), text: c.text, done: !!c.done })) : [],
        done: !!x.done, doneAt: isKey(x.doneAt) ? x.doneAt : '', focus: isKey(x.focus) ? x.focus : '',
        created: isKey(x.created) ? x.created : today
      });
    });
    return out;
  }
  const T = LO.createStore('tasks', 'planner:tasks:v1', defaults, normalize);

  // One-time move of the old per-week to-dos from the schedule sidebar.
  if (LO.planner && LO.planner.takeLegacyTodos) {
    const legacy = LO.planner.takeLegacyTodos();
    legacy.forEach((l) => T.s.todos.push({
      id: uid(), title: l.text, notes: '', cat: 'other', due: '', pri: 1, checklist: [],
      done: !!l.done, doneAt: l.done ? l.week : '', focus: '', created: l.week
    }));
    if (legacy.length) T.saveNow();
  }

  /* ---------------- derived values ---------------- */
  const isDue = (d, date) => !!d.days[LO.wd(date)];
  function autoMet(d, key) {
    if (!d.auto) return false;
    if (d.auto === 'focus') return !!(LO.focus && LO.focus.countOn(key) > 0);
    return !!(LO.health && LO.health.metOn(d.auto, key));
  }
  const isDone = (d, key) => !!d.done[key] || autoMet(d, key);
  function doneDates(d, sinceKey) {
    const out = [];
    const start = sinceKey > d.created ? sinceKey : d.created;
    const today = LO.todayKey();
    if (start > today) return out;
    let date = LO.parseKey(start);
    for (let i = 0; i < 800; i++) {
      const k = LO.keyOf(date);
      if (k > today) break;
      if (isDue(d, date) && isDone(d, k)) out.push(k);
      date = LO.addDays(date, 1);
    }
    return out;
  }

  function streak(d) {
    const today = new Date();
    let n = 0;
    for (let k = 0; k < 400; k++) {
      const date = LO.addDays(today, -k);
      const key = LO.keyOf(date);
      if (key < d.created) break;
      if (!isDue(d, date)) continue;
      if (isDone(d, key)) n++;
      else if (k === 0) continue;
      else break;
    }
    return n;
  }

  function last7(d) {
    const today = new Date();
    return LO.seq(7).map((i) => {
      const date = LO.addDays(today, i - 6);
      const key = LO.keyOf(date);
      if (key < d.created || !isDue(d, date)) return 'off';
      if (isDone(d, key)) return 'on';
      return i === 6 ? 'wait' : 'miss';
    });
  }

  const habitDay = (h, key) => h.log[key] || { u: 0, d: 0 };

  function sortTodos(list) {
    const today = LO.todayKey();
    return list.slice().sort((a, b) => {
      const af = a.focus === today ? 0 : 1;
      const bf = b.focus === today ? 0 : 1;
      if (af !== bf) return af - bf;
      const ad = a.due || '9999-99-99';
      const bd = b.due || '9999-99-99';
      if (ad !== bd) return ad < bd ? -1 : 1;
      if (a.pri !== b.pri) return b.pri - a.pri;
      return a.created < b.created ? -1 : a.created > b.created ? 1 : 0;
    });
  }

  const openTodos = () => T.s.todos.filter((x) => !x.done);
  const focusTodos = () => sortTodos(T.s.todos.filter((x) => x.focus === LO.todayKey() && (!x.done || x.doneAt === LO.todayKey())));

  function stats() {
    const now = new Date();
    const today = LO.todayKey();
    const due = T.s.dailies.filter((d) => isDue(d, now));
    const doneDailies = due.filter((d) => isDone(d, today)).length;
    let up = 0;
    let down = 0;
    T.s.habits.forEach((h) => { const x = habitDay(h, today); up += x.u; down += x.d; });
    const open = openTodos();
    const overdue = open.filter((x) => x.due && x.due < today).length;
    const dueToday = open.filter((x) => x.due === today).length;
    const mon = LO.keyOf(LO.mondayOf(now));
    let week = T.s.todos.filter((x) => x.done && x.doneAt >= mon).length;
    T.s.dailies.forEach((d) => { week += doneDates(d, mon).length; });
    return { dueCount: due.length, doneDailies, up, down, open: open.length, overdue, dueToday, week };
  }

  /* ---------------- row templates (shared with the Today page) ---------------- */
  const tag = (c) => `<span class="tag k-${c}"><i class="sw"></i>${esc(tc('cats.' + c))}</span>`;

  function habitRow(h, compact) {
    const today = LO.todayKey();
    const x = habitDay(h, today);
    const days = LO.seq(7).map((i) => { const y = habitDay(h, LO.keyOf(LO.addDays(new Date(), i - 6))); return y.u - y.d; });
    const max = Math.max(1, ...days.map(Math.abs));
    const spark = `<span class="spark" aria-hidden="true">${days.map((v) => `<i class="${v >= 0 ? 'pos' : 'neg'}" style="height:${Math.max(2, Math.abs(v) / max * 100)}%"></i>`).join('')}</span>`;
    const count = `${t('todayCount')} ${h.up ? `<b class="pos">+${x.u}</b>` : ''}${h.up && h.down ? ' ' : ''}${h.down ? `<b class="neg">−${x.d}</b>` : ''}`;
    return `<li class="task habit k-${h.cat}" data-kind="habit" data-id="${esc(h.id)}">`
      + `<button type="button" class="hbtn up" data-act="hup"${h.up ? '' : ' disabled'} aria-label="+1 ${esc(h.title)}">${LO.icon.plus}</button>`
      + `<div class="task-body" data-act="edit"><div class="task-title">${esc(h.title)}</div>`
      + (h.notes && !compact ? `<div class="task-notes">${esc(h.notes)}</div>` : '')
      + `<div class="task-meta">${compact ? '' : tag(h.cat)}<span>${count}</span>${compact ? '' : spark}</div></div>`
      + `<button type="button" class="hbtn down" data-act="hdown"${h.down ? '' : ' disabled'} aria-label="−1 ${esc(h.title)}">${LO.icon.minus}</button></li>`;
  }

  function dailyRow(d, compact) {
    const today = LO.todayKey();
    const due = isDue(d, new Date());
    const done = isDone(d, today);
    const s = streak(d);
    const dots = `<span class="dots" aria-hidden="true">${last7(d).map((x) => `<i class="${x}"></i>`).join('')}</span>`;
    return `<li class="task daily k-${d.cat}${due ? '' : ' is-off'}${done ? ' is-done' : ''}" data-kind="daily" data-id="${esc(d.id)}">`
      + `<button type="button" class="check" data-act="dcheck"${due ? '' : ' disabled'} aria-pressed="${done}" aria-label="${esc(d.title)}">${LO.icon.check}</button>`
      + `<div class="task-body" data-act="edit"><div class="task-title">${esc(d.title)}</div>`
      + (d.notes && !compact ? `<div class="task-notes">${esc(d.notes)}</div>` : '')
      + `<div class="task-meta">${compact ? '' : tag(d.cat)}${due ? '' : `<span>${esc(t('notDueToday'))}</span>`}${d.auto ? `<span class="auto-tag">${esc(t('autoTag')(t('autos')[d.auto]))}</span>` : ''}`
      + `${compact ? '' : dots}${s > 0 ? `<span class="streak">${esc(t('streak'))} <b>${s}</b></span>` : ''}</div></div></li>`;
  }

  function todoRow(x, compact) {
    const today = LO.todayKey();
    const due = LO.dueInfo(x.due);
    const cl = x.checklist;
    const clDone = cl.filter((c) => c.done).length;
    const focused = x.focus === today;
    let meta = compact ? '' : tag(x.cat);
    if (due && !x.done) meta += `<span class="due ${due.cls}">${esc(due.text)}</span>`;
    if (x.done && x.doneAt) meta += `<span>${esc(tc('done'))} ${LO.shortDate(x.doneAt)}</span>`;
    if (cl.length) meta += `<span>${clDone}/${cl.length}</span>`;
    if (x.pri === 2 && !x.done) meta += `<span class="pri-high">${esc(t('priHigh'))}</span>`;
    let sub = '';
    if (cl.length && !compact && !x.done) {
      sub = `<ul class="subs">${cl.map((c) => `<li><label><input type="checkbox" data-act="sub" data-sub="${esc(c.id)}"${c.done ? ' checked' : ''}><span>${esc(c.text)}</span></label></li>`).join('')}</ul>`;
    }
    return `<li class="task todo k-${x.cat}${x.done ? ' is-done' : ''}${x.pri === 2 ? ' is-high' : ''}" data-kind="todo" data-id="${esc(x.id)}">`
      + `<button type="button" class="check round" data-act="tcheck" aria-pressed="${x.done}" aria-label="${esc(x.title)}">${LO.icon.check}</button>`
      + `<div class="task-body"><div data-act="edit"><div class="task-title">${esc(x.title)}</div>`
      + (x.notes && !compact ? `<div class="task-notes">${esc(x.notes)}</div>` : '')
      + `<div class="task-meta">${meta}</div></div>${sub}</div>`
      + (x.done ? '' : `<button type="button" class="star${focused ? ' on' : ''}" data-act="focus" aria-pressed="${focused}" aria-label="${esc(focused ? t('unfocus') : t('focus'))}" title="${esc(focused ? t('unfocus') : t('focus'))}">${LO.icon.star}</button>`)
      + '</li>';
  }

  /* ---------------- actions ---------------- */
  const find = (kind, id) => (kind === 'habit' ? T.s.habits : kind === 'daily' ? T.s.dailies : T.s.todos).find((x) => x.id === id);

  function habitClick(id, dir) {
    LO.mutate(T, (s) => {
      const h = s.habits.find((x) => x.id === id);
      if (!h) return;
      const key = LO.todayKey();
      const x = Object.assign({ u: 0, d: 0 }, h.log[key]);
      if (dir > 0) x.u++; else x.d++;
      h.log[key] = x;
    });
  }
  function toggleDaily(id) {
    const dd = T.s.dailies.find((x) => x.id === id);
    if (dd && autoMet(dd, LO.todayKey()) && !dd.done[LO.todayKey()]) { LO.toast(t('autoDone')); return; }
    LO.mutate(T, (s) => {
      const d = s.dailies.find((x) => x.id === id);
      if (!d) return;
      const key = LO.todayKey();
      if (d.done[key]) delete d.done[key]; else d.done[key] = 1;
    });
  }
  function toggleTodo(id) {
    const x = find('todo', id);
    if (!x) return;
    const finishing = !x.done;
    LO.mutate(T, (s) => {
      const y = s.todos.find((z) => z.id === id);
      y.done = finishing;
      y.doneAt = finishing ? LO.todayKey() : '';
    }, finishing ? `${t('completed')}: ${x.title}` : null);
  }
  function toggleFocus(id) {
    const x = find('todo', id);
    if (!x) return;
    const today = LO.todayKey();
    if (x.focus !== today && T.s.todos.filter((y) => y.focus === today && !y.done).length >= 3) {
      LO.toast(t('focusFull'));
      return;
    }
    LO.mutate(T, (s) => {
      const y = s.todos.find((z) => z.id === id);
      y.focus = y.focus === today ? '' : today;
    });
  }
  function toggleSub(todoId, subId) {
    LO.mutate(T, (s) => {
      const y = s.todos.find((z) => z.id === todoId);
      const c = y && y.checklist.find((z) => z.id === subId);
      if (c) c.done = !c.done;
    });
  }
  function addTodo(fields) {
    const today = LO.todayKey();
    LO.mutate(T, (s) => {
      s.todos.push(Object.assign({ id: uid(), title: '', notes: '', cat: 'other', due: '', pri: 1, checklist: [], done: false, doneAt: '', focus: '', created: today }, fields));
    });
  }

  /* ---------------- editor dialog ---------------- */
  function catChips(sel) {
    return LO.chips('cat', TCATS.map((c) => [c, `<i class="sw"></i>${esc(tc('cats.' + c))}`, 'k-' + c]), 'radio', [sel]);
  }

  function openEditor(kind, id) {
    const item = id ? find(kind, id) : null;
    const isNew = !item;
    const v = item || {
      title: '', notes: '', cat: kind === 'daily' || kind === 'habit' ? 'health' : 'other',
      up: true, down: false, days: [1, 1, 1, 1, 1, 1, 1], due: '', pri: 1, checklist: []
    };
    let body = `<label class="fld"><span>${esc(tc('title'))}</span><input class="input" name="title" maxlength="80" value="${esc(v.title)}" autocomplete="off"></label>`
      + `<label class="fld"><span>${esc(tc('notes'))}</span><textarea class="input ta" name="notes" rows="2" maxlength="400" placeholder="${esc(tc('notesPh'))}">${esc(v.notes)}</textarea></label>`
      + `<div class="fld"><span>${esc(tc('category'))}</span><div class="chips">${catChips(v.cat)}</div></div>`;
    if (kind === 'habit') {
      const dirs = [];
      if (v.up) dirs.push('up');
      if (v.down) dirs.push('down');
      body += `<div class="fld"><span>${esc(t('direction'))}</span><div class="chips">${LO.chips('dir', [['up', esc(t('dirUp'))], ['down', esc(t('dirDown'))]], 'checkbox', dirs)}</div></div>`;
    } else if (kind === 'daily') {
      body += `<div class="fld"><span>${esc(t('repeat'))}</span><div class="chips">${LO.chips('days', LO.seq(7).map((i) => [i, tc('days')[i]]), 'checkbox', LO.seq(7).filter((i) => v.days[i]))}</div>`
        + `<div class="quick"><button type="button" class="btn sm" data-qd="all">${esc(t('everyday'))}</button><button type="button" class="btn sm" data-qd="wk">${esc(t('weekdays'))}</button><button type="button" class="btn sm" data-qd="we">${esc(t('weekends'))}</button></div></div>`
        + `<div class="fld"><span>${esc(t('autoLabel'))}</span><div class="chips">${LO.chips('dauto', AUTOS.map((a) => [a, esc(t('autos')[a])]), 'radio', [v.auto || ''])}</div><p class="hint">${esc(t('autoHint'))}</p></div>`;
    } else {
      body += `<div class="fld"><span>${esc(t('due'))}</span><div class="row"><input class="input date" type="date" name="due" value="${esc(v.due)}">`
        + `<button type="button" class="btn sm" data-qdue="0">${esc(tc('today'))}</button><button type="button" class="btn sm" data-qdue="1">${esc(tc('tomorrow'))}</button>`
        + `<button type="button" class="btn sm" data-qdue="mon">${esc(t('nextWeek'))}</button><button type="button" class="btn sm ghost" data-qdue="">${esc(t('clearDue'))}</button></div></div>`
        + `<div class="fld"><span>${esc(t('pri'))}</span><div class="chips">${LO.chips('pri', [[0, esc(t('priLow'))], [1, esc(t('priMid'))], [2, esc(t('priHigh'))]], 'radio', [v.pri])}</div></div>`
        + `<div class="fld"><span>${esc(t('checklist'))}</span><ul class="cl-edit">${v.checklist.map((c) => clLine(c)).join('')}</ul>`
        + `<button type="button" class="btn sm" data-cladd>${LO.icon.plus}<span>${esc(t('checklistAdd'))}</span></button></div>`;
    }
    const titleKey = { habit: isNew ? 'newHabit' : 'editHabit', daily: isNew ? 'newDaily' : 'editDaily', todo: isNew ? 'newTodo' : 'editTodo' }[kind];

    LO.openForm({
      title: t(titleKey),
      body,
      onOpen(dlg) {
        dlg.querySelectorAll('[data-qd]').forEach((b) => b.addEventListener('click', () => {
          const pat = { all: [1, 1, 1, 1, 1, 1, 1], wk: [1, 1, 1, 1, 1, 0, 0], we: [0, 0, 0, 0, 0, 1, 1] }[b.dataset.qd];
          $$('input[name="days"]', dlg).forEach((i) => { i.checked = !!pat[+i.value]; });
        }));
        dlg.querySelectorAll('[data-qdue]').forEach((b) => b.addEventListener('click', () => {
          const q = b.dataset.qdue;
          let val = '';
          if (q === '0' || q === '1') val = LO.keyOf(LO.addDays(new Date(), +q));
          else if (q === 'mon') val = LO.keyOf(LO.addDays(LO.mondayOf(new Date()), 7));
          $('input[name="due"]', dlg).value = val;
        }));
        const list = $('.cl-edit', dlg);
        if (list) {
          const addLine = () => {
            list.insertAdjacentHTML('beforeend', clLine({ id: uid(), text: '', done: false }));
            const inputs = $$('input[data-cl]', list);
            inputs[inputs.length - 1].focus();
          };
          $('[data-cladd]', dlg).addEventListener('click', addLine);
          list.addEventListener('click', (e) => { const b = e.target.closest('[data-cldel]'); if (b) b.closest('li').remove(); });
          list.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input[data-cl]')) { e.preventDefault(); addLine(); } });
        }
      },
      onSave(dlg) {
        const title = $('input[name="title"]', dlg).value.trim();
        if (!title) return t('errTitle');
        const fields = { title, notes: $('textarea[name="notes"]', dlg).value.trim(), cat: LO.checkedVal(dlg, 'cat') || 'other' };
        if (kind === 'habit') {
          const dirs = LO.checkedVals(dlg, 'dir');
          if (!dirs.length) return t('errDir');
          fields.up = dirs.includes('up');
          fields.down = dirs.includes('down');
        } else if (kind === 'daily') {
          const days = LO.checkedVals(dlg, 'days').map(Number);
          if (!days.length) return t('errDays');
          fields.days = LO.seq(7).map((i) => (days.includes(i) ? 1 : 0));
          fields.auto = LO.checkedVal(dlg, 'dauto') || '';
        } else {
          fields.due = $('input[name="due"]', dlg).value || '';
          fields.pri = +(LO.checkedVal(dlg, 'pri') || 1);
          const old = item ? item.checklist : [];
          fields.checklist = $$('.cl-edit li', dlg).map((li) => {
            const inp = $('input[data-cl]', li);
            const text = inp.value.trim();
            const prev = old.find((c) => c.id === inp.dataset.cl);
            return text ? { id: inp.dataset.cl, text, done: prev ? prev.done : false } : null;
          }).filter(Boolean);
        }
        const today = LO.todayKey();
        LO.mutate(T, (s) => {
          if (isNew) {
            const base = { id: uid(), created: today };
            if (kind === 'habit') s.habits.push(Object.assign(base, { log: {} }, fields));
            else if (kind === 'daily') s.dailies.push(Object.assign(base, { done: {} }, fields));
            else s.todos.push(Object.assign(base, { done: false, doneAt: '', focus: '' }, fields));
          } else {
            const target = (kind === 'habit' ? s.habits : kind === 'daily' ? s.dailies : s.todos).find((x) => x.id === id);
            if (target) Object.assign(target, fields);
          }
        }, isNew ? tc('added') : tc('saved'));
        return true;
      },
      onDelete: isNew ? null : () => {
        LO.mutate(T, (s) => {
          const key = kind === 'habit' ? 'habits' : kind === 'daily' ? 'dailies' : 'todos';
          s[key] = s[key].filter((x) => x.id !== id);
        }, tc('deleted'));
      }
    });
  }
  const clLine = (c) => `<li><input class="input sm" data-cl="${esc(c.id)}" value="${esc(c.text)}" maxlength="120" placeholder="${esc(t('checklistPh'))}"><button type="button" class="icon-btn sm" data-cldel aria-label="${esc(tc('delete'))}">${LO.icon.x}</button></li>`;

  /* ---------------- shared event handling ---------------- */
  function handle(e) {
    const actEl = e.target.closest('[data-act]');
    const row = e.target.closest('[data-kind]');
    if (!actEl || !row) return false;
    const kind = row.dataset.kind;
    const id = row.dataset.id;
    const act = actEl.dataset.act;
    if (act === 'hup') habitClick(id, 1);
    else if (act === 'hdown') habitClick(id, -1);
    else if (act === 'dcheck') toggleDaily(id);
    else if (act === 'tcheck') toggleTodo(id);
    else if (act === 'focus') toggleFocus(id);
    else if (act === 'sub') { if (e.type === 'change') toggleSub(id, actEl.dataset.sub); return true; }
    else if (act === 'edit') {
      if (window.getSelection && String(window.getSelection())) return true;
      openEditor(kind, id);
    } else return false;
    return true;
  }
  function attach(root) {
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="sub"]')) return; // handled on change
      handle(e);
    });
    root.addEventListener('change', (e) => { if (e.target.closest('[data-act="sub"]')) handle(e); });
    root.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act="edit"]')) { e.preventDefault(); handle(e); }
    });
  }

  /* ---------------- page ---------------- */
  const view = $('#view-tasks');
  let dailyFilter = 'due';
  let todoFilter = 'active';
  let mtab = 'todos';

  function seg(name, items, sel) {
    return `<div class="seg sm" role="tablist">${items.map(([v, label]) => `<button type="button" role="tab" data-${name}="${v}" aria-selected="${v === sel}">${esc(label)}</button>`).join('')}</div>`;
  }

  function render() {
    const now = new Date();
    const today = LO.todayKey();
    const st = stats();
    const habits = T.s.habits;
    let dailies = T.s.dailies.slice().sort((a, b) => (isDue(b, now) - isDue(a, now)) || (isDone(a, today) - isDone(b, today)));
    if (dailyFilter === 'due') dailies = dailies.filter((d) => isDue(d, now));
    let todos;
    if (todoFilter === 'done') todos = T.s.todos.filter((x) => x.done).sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));
    else if (todoFilter === 'today') todos = sortTodos(openTodos().filter((x) => x.focus === today || (x.due && x.due <= today)));
    else todos = sortTodos(openTodos());

    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1><p class="sub">${esc(dateLine(now))}</p></div></div>`;
    h += '<div class="stats">'
      + `<div class="stat">${LO.ring(st.dueCount ? st.doneDailies / st.dueCount : 0, 46)}<div><span class="stat-label">${esc(t('statDailies'))}</span><b class="stat-num">${st.doneDailies}<small>/${st.dueCount}</small></b></div></div>`
      + `<div class="stat"><div><span class="stat-label">${esc(t('statHabits'))}</span><b class="stat-num"><span class="pos">+${st.up}</span> <span class="neg">−${st.down}</span></b></div></div>`
      + `<div class="stat"><div><span class="stat-label">${esc(t('statTodos'))}</span><b class="stat-num">${st.open}</b><span class="stat-sub${st.overdue ? ' warn' : ''}">${esc(st.overdue ? t('overdueN')(st.overdue) : st.dueToday ? t('dueTodayN')(st.dueToday) : t('allClear'))}</span></div></div>`
      + `<div class="stat"><div><span class="stat-label">${esc(t('statWeek'))}</span><b class="stat-num">${st.week}</b><span class="stat-sub">${esc(t('weekSub'))}</span></div></div>`
      + '</div>';

    h += `<div class="mtabs">${seg('mtab', [['habits', t('habits')], ['dailies', t('dailies')], ['todos', t('todos')]], mtab)}</div>`;
    h += `<div class="task-cols" data-show="${mtab}">`;

    h += `<section class="tcol" data-col="habits"><header class="tcol-head"><h2>${esc(t('habits'))}<span class="count">${habits.length}</span></h2></header>`
      + quickAdd('habit', t('addHabit'))
      + (habits.length ? `<ul class="tlist">${habits.map((x) => habitRow(x)).join('')}</ul>` : `<p class="empty-note">${esc(t('habitsEmpty'))}</p>`)
      + '</section>';

    h += `<section class="tcol" data-col="dailies"><header class="tcol-head"><h2>${esc(t('dailies'))}<span class="count">${st.doneDailies}/${st.dueCount}</span></h2>${seg('dfilter', [['due', t('fDue')], ['all', t('fAll')]], dailyFilter)}</header>`
      + quickAdd('daily', t('addDaily'))
      + (dailies.length ? `<ul class="tlist">${dailies.map((x) => dailyRow(x)).join('')}</ul>` : `<p class="empty-note">${esc(t('dailiesEmpty'))}</p>`)
      + '</section>';

    h += `<section class="tcol" data-col="todos"><header class="tcol-head"><h2>${esc(t('todos'))}<span class="count">${st.open}</span></h2>${seg('tfilter', [['active', t('fActive')], ['today', t('fToday')], ['done', t('fDone')]], todoFilter)}</header>`
      + (todoFilter === 'done' ? '' : quickAdd('todo', t('addTodo')))
      + (todos.length ? `<ul class="tlist">${todos.map((x) => todoRow(x)).join('')}</ul>` : `<p class="empty-note">${esc(todoFilter === 'done' ? t('doneEmpty') : t('todosEmpty'))}</p>`)
      + (todoFilter === 'done' && todos.length ? `<button type="button" class="btn sm ghost clear-done" data-cleardone>${esc(t('clearDone'))}</button>` : '')
      + '</section>';

    h += '</div>';
    view.innerHTML = h;
  }

  const quickAdd = (kind, ph) => `<form class="quick-add" data-add="${kind}"><input maxlength="80" autocomplete="off" placeholder="${esc(ph)}" aria-label="${esc(ph)}"><button type="submit" class="icon-btn" aria-label="${esc(tc('add'))}">${LO.icon.plus}</button></form>`;

  function dateLine(d) {
    return LO.lang() === 'zh'
      ? `${d.getMonth() + 1}月${d.getDate()}日 ${tc('weekdaysLong')[LO.wd(d)]}`
      : `${tc('weekdaysLong')[LO.wd(d)]}, ${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}`;
  }
  LO.dateLine = dateLine;

  attach(view);
  const scheduleSide = $('#side');
  if (scheduleSide) attach(scheduleSide);
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dfilter],[data-tfilter],[data-mtab]');
    if (b) {
      if (b.dataset.dfilter) dailyFilter = b.dataset.dfilter;
      if (b.dataset.tfilter) todoFilter = b.dataset.tfilter;
      if (b.dataset.mtab) mtab = b.dataset.mtab;
      render();
      return;
    }
    if (e.target.closest('[data-cleardone]')) {
      LO.mutate(T, (s) => { s.todos = s.todos.filter((x) => !x.done); }, t('cleared'));
    }
  });
  view.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-add]');
    if (!f) return;
    e.preventDefault();
    const input = $('input', f);
    const title = input.value.trim();
    if (!title) return;
    const kind = f.dataset.add;
    const today = LO.todayKey();
    LO.mutate(T, (s) => {
      const base = { id: uid(), title, notes: '', created: today };
      if (kind === 'habit') s.habits.push(Object.assign(base, { cat: 'health', up: true, down: false, log: {} }));
      else if (kind === 'daily') s.dailies.push(Object.assign(base, { cat: 'health', days: [1, 1, 1, 1, 1, 1, 1], done: {} }));
      else s.todos.push(Object.assign(base, { cat: 'other', due: todoFilter === 'today' ? today : '', pri: 1, checklist: [], done: false, doneAt: '', focus: '' }));
    });
    const again = $(`[data-add="${kind}"] input`, view);
    if (again) again.focus();
  });

  LO.view('tasks', {
    render,
    keys(e) {
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); mtab = 'todos'; render(); const i = $('[data-add="todo"] input', view); if (i) i.focus(); }
    }
  });

  /* ---------------- API for other pages ---------------- */
  LO.tasks = {
    store: T,
    attach,
    habitRow, dailyRow, todoRow,
    openEditor, addTodo, stats, focusTodos, sortTodos,
    dueDailies: () => T.s.dailies.filter((d) => isDue(d, new Date())),
    dueDailiesBy: (c) => T.s.dailies.filter((d) => d.cat === c && isDue(d, new Date())),
    openTodos,
    upcoming(days) {
      const today = LO.todayKey();
      const limit = LO.keyOf(LO.addDays(new Date(), days));
      return sortTodos(openTodos().filter((x) => x.focus !== today && x.due && x.due <= limit));
    },
    todosDoneSince: (k) => T.s.todos.filter((x) => x.done && x.doneAt >= k).length,
    activity(add) {
      T.s.todos.forEach((x) => { if (x.done && x.doneAt) add(x.doneAt, 'todos', 1); });
      const since = LO.keyOf(LO.addDays(new Date(), -400));
      T.s.dailies.forEach((d) => doneDates(d, since).forEach((k) => add(k, 'dailies', 1)));
    },
    dailyChecksSince: (k) => T.s.dailies.reduce((a, d) => a + doneDates(d, k).length, 0),
    isDone,
    doneDates
  };
})();
