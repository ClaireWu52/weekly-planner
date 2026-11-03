/*
 * Schedule page: the editable, printable weekly timetable.
 * Data is stored in localStorage under "weekly-planner:v2".
 * This file holds the data, the grid and the page controls; the print view
 * is in planner-print.js and the event dialog and dragging in planner-edit.js
 * (shared through LO.plannerKit). Week rules and layout are in schedule-calc.js.
 */
(() => {
  'use strict';
  const LO = window.LO;

  /* =========================================================
     i18n
     ========================================================= */
  const I18N = {
    zh: {
      days: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      cats: { class: '课程', study: '自习', work: '工作', meeting: '会议 / 社团', health: '运动', life: '生活', other: '其他' },
      fNote: '备注', fNotePh: '可不填，比如：带水杯、交作业', fRange: '生效日期', fRangeHint: '可不填。比如课只排到期末那天，之后就不再显示。',
      dup: '复制一份', duped: '已复制，改好后保存', viewWeek: '周', viewDay: '日', legendHint: '点类别可以隐藏或显示', minUnit: '分钟',
      addedPlan: (n) => `已把 ${n} 个安排加进课表`,
      defaultTitle: '我的一周', titleAria: '标题（点击修改）',
      thisWeek: '本周', prevWeek: '上一周', nextWeek: '下一周',
      tabEdit: '编辑', tabPrint: '打印',
      newEvent: '新建', more: '更多选项',
      undo: '撤销', exportData: '导出备份', importData: '导入备份', reset: '清空课表',
      langSwitch: 'English', theme: '外观', themeNames: { auto: '跟随系统', light: '浅色', dark: '深色' },
      shortcuts: '快捷键',
      hoursTitle: '本周时间', total: '合计', hoursEmpty: '这周还没有安排。', hoursUnit: ' 小时',
      dueTag: (n) => `截止 ${n}`, dueTip: (list) => `这天截止：${list}`, todoTitle: '本周待办', todoPh: '添加待办，回车保存', todoEmpty: '这周没有到期的待办。', openTasks: '全部待办', add: '添加',
      notesTitle: '备注', notesPh: '这周要记住的事…',
      viewRange: '显示时段', to: '到',
      skipped: '本周跳过了：', restore: '恢复',
      gridHint: '在空白处拖动可以新建；拖动方块改时间或换到别的天；拖方块底边改结束时间。',
      dlgNew: '新建安排', dlgEdit: '编辑安排', badgeWeekly: '每周固定', badgeOnce: '只在本周',
      fTitle: '名称', fTitlePh: '例如：Office hour、Math Club 例会', fCat: '类型', fDays: '星期', fTime: '时间',
      fPlace: '地点', fPlacePh: '可不填', fRepeat: '重复', weekly: '每周', onceThisWeek: '只在本周',
      save: '保存', saveWeekly: '保存到每周', saveThisWeek: '只改本周', cancel: '取消',
      del: '删除', confirmDel: '确认删除', confirmDelWeekly: '确认删除（每周都删）', skipThisWeek: '本周跳过',
      errTitle: '请填写名称。', errDays: '至少选一天。', errTime: '结束时间要晚于开始时间。',
      added: '已添加', saved: '已保存', deleted: '已删除', skippedToast: '这周不显示了，其他周不变',
      movedWeekly: '已调整每周的安排', moved: '已调整', onlyThisWeek: '改成只改本周', changedThisWeek: '只改了这一周',
      undone: '已撤销', nothingToUndo: '没有可以撤销的操作', restored: '已恢复',
      imported: '备份已导入', importFailed: '这个文件不是有效的备份', resetDone: '课表已清空',
      saveFailed: '浏览器存储已满，修改没有保存',
      legendOnce: '斜纹：只在本周', newGhost: '新建',
      shortcutsText: 'N 新建　← → 切换周　T 回到本周　P 打印视图　⌘/Ctrl+Z 撤销',
      p: {
        paper: '纸张', orient: '方向', landscape: '横向', portrait: '纵向',
        days: '打印哪几天', all: '全部', weekdays: '周一到周五',
        cats: '打印哪些类型', range: '时间范围', auto: '按内容自动',
        content: '显示内容', showTime: '时间', showPlace: '地点', showOnce: '只在本周的安排',
        showSide: '待办和备注栏', mono: '黑白（省墨）',
        print: '打印',
        tip: '打印窗口里勾选“背景图形”，颜色才会打出来。想要 PDF，目标打印机选“存储为 PDF”。'
      }
    },
    en: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      cats: { class: 'Class', study: 'Study', work: 'Work', meeting: 'Meeting / Club', health: 'Exercise', life: 'Life', other: 'Other' },
      fNote: 'Notes', fNotePh: 'Optional, e.g. bring a water bottle', fRange: 'Active dates', fRangeHint: 'Optional. For example, end a class on the last day of the semester.',
      dup: 'Duplicate', duped: 'Copied. Adjust it and save.', viewWeek: 'Week', viewDay: 'Day', legendHint: 'Click a category to hide or show it', minUnit: 'min',
      addedPlan: (n) => `Added ${n} items to the schedule`,
      defaultTitle: 'My Week', titleAria: 'Title (click to edit)',
      thisWeek: 'This week', prevWeek: 'Previous week', nextWeek: 'Next week',
      tabEdit: 'Edit', tabPrint: 'Print',
      newEvent: 'New', more: 'More options',
      undo: 'Undo', exportData: 'Export backup', importData: 'Import backup', reset: 'Clear schedule',
      langSwitch: '中文', theme: 'Appearance', themeNames: { auto: 'System', light: 'Light', dark: 'Dark' },
      shortcuts: 'Keyboard shortcuts',
      hoursTitle: 'Hours this week', total: 'Total', hoursEmpty: 'Nothing scheduled this week.', hoursUnit: ' h',
      dueTag: (n) => `${n} due`, dueTip: (list) => `Due this day: ${list}`, todoTitle: 'To-dos this week', todoPh: 'Add a to-do, press Enter', todoEmpty: 'Nothing due this week.', openTasks: 'All to-dos', add: 'Add',
      notesTitle: 'Notes', notesPh: 'Anything to remember this week…',
      viewRange: 'Visible hours', to: 'to',
      skipped: 'Skipped this week:', restore: 'Restore',
      gridHint: 'Drag on empty space to create. Drag a block to move it to another time or day; drag its bottom edge to change the end time.',
      dlgNew: 'New event', dlgEdit: 'Edit event', badgeWeekly: 'Every week', badgeOnce: 'This week only',
      fTitle: 'Name', fTitlePh: 'e.g. Office hours, Math Club meeting', fCat: 'Type', fDays: 'Days', fTime: 'Time',
      fPlace: 'Location', fPlacePh: 'Optional', fRepeat: 'Repeat', weekly: 'Every week', onceThisWeek: 'This week only',
      save: 'Save', saveWeekly: 'Save for every week', saveThisWeek: 'This week only', cancel: 'Cancel',
      del: 'Delete', confirmDel: 'Confirm delete', confirmDelWeekly: 'Delete from every week', skipThisWeek: 'Skip this week',
      errTitle: 'Add a name.', errDays: 'Pick at least one day.', errTime: 'End time must be after start time.',
      added: 'Added', saved: 'Saved', deleted: 'Deleted', skippedToast: 'Skipped for this week only',
      movedWeekly: 'Changed for every week', moved: 'Changed', onlyThisWeek: 'Only this week', changedThisWeek: 'Changed for this week only',
      undone: 'Undone', nothingToUndo: 'Nothing to undo', restored: 'Restored',
      imported: 'Backup imported', importFailed: "This file isn't a valid backup", resetDone: 'Schedule cleared',
      saveFailed: 'Browser storage is full; changes were not saved',
      legendOnce: 'Striped: this week only', newGhost: 'New',
      shortcutsText: 'N new   ← → change week   T this week   P print view   ⌘/Ctrl+Z undo',
      p: {
        paper: 'Paper', orient: 'Orientation', landscape: 'Landscape', portrait: 'Portrait',
        days: 'Days to print', all: 'All', weekdays: 'Mon–Fri',
        cats: 'Types to print', range: 'Time range', auto: 'Fit to events',
        content: 'Show', showTime: 'Times', showPlace: 'Locations', showOnce: 'This-week-only events',
        showSide: 'To-do and notes column', mono: 'Black and white',
        print: 'Print',
        tip: 'Turn on "Background graphics" in the print dialog so colors print. To get a PDF, choose "Save as PDF".'
      }
    }
  };

  /* =========================================================
     helpers
     ========================================================= */
  const CATS = ['class', 'study', 'work', 'meeting', 'health', 'life', 'other'];
  const STORE = 'weekly-planner:v2';
  const SNAP = 15;          // minutes
  const HOUR_PX = 52;       // screen hour height
  const PAPER = { letter: [1056, 816], a4: [1122, 793] }; // CSS px at 96dpi (long, short)
  const PAGE_PAD = 34;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const { groupRecurring, lanes } = LO.schedCalc;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const toMin = (s) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const fmt = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const fmtEnd = (m) => (m >= 1440 ? '24:00' : fmt(m));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const seq = (n) => Array.from({ length: n }, (_, i) => i);
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  /* =========================================================
     state
     ========================================================= */
  function seedRecurring() {
    const src = Array.isArray(window.DEFAULT_SCHEDULE) ? window.DEFAULT_SCHEDULE : [];
    const out = [];
    src.forEach((it) => (it.days || []).forEach((day) => {
      const start = toMin(it.start);
      const end = toMin(it.end) || 1440;
      if (!(end > start) || day < 0 || day > 6) return;
      out.push({
        id: uid(), title: String(it.title || ''), cat: CATS.includes(it.cat) ? it.cat : 'other',
        day, start, end, place: String(it.place || '')
      });
    }));
    return out;
  }

  function defaultPrint() {
    return {
      paper: 'letter', orient: 'landscape', days: [1, 1, 1, 1, 1, 1, 1],
      cats: { class: 1, study: 1, work: 1, meeting: 1, health: 1, life: 1, other: 1 },
      start: 9, end: 23, showTime: 1, showPlace: 1, showOnce: 1, showSide: 1, mono: 0
    };
  }

  function defaultState() {
    const lang = (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    return {
      v: 2, title: '', lang, theme: 'auto',
      recurring: groupRecurring(seedRecurring()), weeks: {},
      view: { start: 8, end: 23, hidden: [] }, print: defaultPrint()
    };
  }

  const validEvent = (e) => e && typeof e.title === 'string' && Number.isInteger(e.day) && e.day >= 0 && e.day <= 6
    && Number.isFinite(e.start) && Number.isFinite(e.end) && e.end > e.start && e.start >= 0 && e.end <= 1440;
  const isDateKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const cleanEvent = (e) => {
    const out = {
      id: String(e.id || uid()), title: e.title, cat: CATS.includes(e.cat) ? e.cat : 'other',
      day: e.day, start: e.start, end: e.end, place: typeof e.place === 'string' ? e.place : ''
    };
    if (typeof e.note === 'string' && e.note) out.note = e.note;
    if (isDateKey(e.from)) out.from = e.from;
    if (isDateKey(e.until)) out.until = e.until;
    if (typeof e.group === 'string' && e.group) out.group = e.group;
    return out;
  };

  function normalize(s) {
    const d = defaultState();
    const out = {
      v: 2,
      title: typeof s.title === 'string' ? s.title : '',
      lang: ['zh', 'en'].includes(s.lang) ? s.lang : d.lang,
      theme: ['auto', 'light', 'dark'].includes(s.theme) ? s.theme : 'auto',
      recurring: groupRecurring((s.recurring || []).filter(validEvent).map(cleanEvent)),
      weeks: {},
      view: Object.assign({}, d.view, s.view || {}),
      print: Object.assign({}, d.print, s.print || {})
    };
    out.print.cats = Object.assign({}, d.print.cats, (s.print || {}).cats || {});
    if (!Array.isArray(out.view.hidden)) out.view.hidden = [];
    out.view.hidden = out.view.hidden.filter((c) => CATS.includes(c));
    if (!Array.isArray(out.print.days) || out.print.days.length !== 7) out.print.days = d.print.days;
    Object.entries(s.weeks || {}).forEach(([k, w]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !w) return;
      out.weeks[k] = {
        added: (w.added || []).filter(validEvent).map(cleanEvent),
        skipped: Array.isArray(w.skipped) ? w.skipped.map(String) : [],
        todos: Array.isArray(w.todos) ? w.todos.filter((t) => t && typeof t.text === 'string').map((t) => ({ id: String(t.id || uid()), text: t.text, done: !!t.done })) : [],
        notes: typeof w.notes === 'string' ? w.notes : ''
      };
    });
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.v === 2 && Array.isArray(s.recurring)) return normalize(s);
      }
    } catch (_) { /* fall through */ }
    return defaultState();
  }

  let state = load();
  let saveTimer = null;

  let dirty = false;
  function persistNow() {
    clearTimeout(saveTimer);
    if (LO.frozen) return;
    try { localStorage.setItem(STORE, JSON.stringify(state)); }
    catch (_) { LO.toast(t('saveFailed')); return; }
    if (dirty) { dirty = false; if (LO.onChange) LO.onChange('planner'); }
  }
  function persist() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(persistNow, 250); }
  const groupOf = (id) => {
    const ev = state.recurring.find((e) => e.id === id);
    if (!ev) return [];
    return ev.group ? state.recurring.filter((e) => e.group === ev.group) : [ev];
  };
  window.addEventListener('pagehide', persistNow);

  /* ---------- undo ---------- */
  const undoStack = [];
  function mutate(fn, msg, extraActions) {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 80) undoStack.shift();
    fn();
    persist();
    renderAll();
    if (msg) LO.toast(msg, [{ label: t('undo'), run: undo }].concat(extraActions || []));
  }
  function restoreSnapshot(json) {
    // undo affects schedule data only; keep the current UI preferences
    const keep = { lang: state.lang, theme: state.theme, print: state.print, view: state.view, title: state.title };
    state = Object.assign(JSON.parse(json), keep);
  }
  function undo() {
    const prev = undoStack.pop();
    if (!prev) { LO.toast(t('nothingToUndo')); return; }
    restoreSnapshot(prev);
    persist();
    renderAll();
    LO.toast(t('undone'));
  }
  function rollbackSilently() {
    const prev = undoStack.pop();
    if (prev) restoreSnapshot(prev);
  }

  /* ---------- weeks ---------- */
  let weekOffset = 0;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function mondayOf(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  const curMonday = () => addDays(mondayOf(new Date()), weekOffset * 7);
  const curKey = () => keyOf(curMonday());

  function week(key, create) {
    let w = state.weeks[key];
    if (!w) {
      w = { added: [], skipped: [], todos: [], notes: '' };
      if (create) state.weeks[key] = w;
    }
    return w;
  }
  const weekEvents = (key) => LO.schedCalc.weekEvents(state.recurring, week(key), key);
  const plain = (e) => {
    const o = { id: e.id, title: e.title, cat: e.cat, day: e.day, start: e.start, end: e.end, place: e.place };
    if (e.note) o.note = e.note;
    if (e.from) o.from = e.from;
    if (e.until) o.until = e.until;
    return o;
  };

  /* =========================================================
     i18n application
     ========================================================= */
  const L = () => I18N[LO.lang()] || I18N.zh;
  function t(path) {
    const v = path.split('.').reduce((o, k) => (o == null ? o : o[k]), L());
    return v == null ? path : v;
  }
  const titleText = () => (state.title || '').trim() || t('defaultTitle');
  const fmtHours = (h) => `${Math.round(h * 10) / 10}${t('hoursUnit')}`;

  function rangeLabel(mon, withYear) {
    const end = addDays(mon, 6);
    if (LO.lang() === 'zh') {
      const crossYear = mon.getFullYear() !== end.getFullYear();
      const a = `${withYear || crossYear ? mon.getFullYear() + '年' : ''}${mon.getMonth() + 1}月${mon.getDate()}日`;
      const b = crossYear ? `${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`
        : mon.getMonth() === end.getMonth() ? `${end.getDate()}日` : `${end.getMonth() + 1}月${end.getDate()}日`;
      return `${a} – ${b}`;
    }
    const mo = (d) => d.toLocaleString('en-US', { month: 'short' });
    const a = `${mo(mon)} ${mon.getDate()}`;
    const b = mon.getMonth() === end.getMonth() ? `${end.getDate()}` : `${mo(end)} ${end.getDate()}`;
    return `${a} – ${b}${withYear || mon.getFullYear() !== new Date().getFullYear() ? `, ${end.getFullYear()}` : ''}`;
  }

  /* =========================================================
     grid rendering (shared by screen and print)
     ========================================================= */

  function eventHTML(e, c, span) {
    const s = Math.max(e.start, c.sMin);
    const en = Math.min(e.end, c.eMin);
    const top = (s - c.sMin) / span * 100;
    const hgt = (en - s) / span * 100;
    const w = 100 / e._n;
    const left = e._i * w;
    const px = (en - s) / 60 * c.pxPerHour;
    const tight = px < (c.print ? 27 : 38);
    const oneLine = px < (c.print ? 44 : 66);
    let inner = `<span class="ev-t">${esc(e.title)}</span>`;
    if (c.showTime) inner += `<span class="ev-m" data-time>${fmt(e.start)}–${fmtEnd(e.end)}</span>`;
    if (c.showPlace && e.place && px >= (c.print ? 36 : 56)) inner += `<span class="ev-m">${esc(e.place)}</span>`;
    if (c.interactive) inner += '<span class="grip" aria-hidden="true"></span>';
    const label = `${e.title}, ${L().days[e.day]} ${fmt(e.start)}–${fmtEnd(e.end)}${e.place ? ', ' + e.place : ''}${e.note ? ', ' + e.note : ''}`;
    const attrs = c.interactive ? ` tabindex="0" role="button" aria-label="${esc(label)}" title="${esc(label)}"` : '';
    const cls = `ev cat-${e.cat}${e.rec ? '' : ' once'}${tight ? ' tight' : ''}${oneLine ? ' one' : ''}`;
    return `<div class="${cls}" data-id="${esc(e.id)}" data-rec="${e.rec ? 1 : 0}"${attrs} style="top:calc(${top}% + 1px);height:calc(${hgt}% - 2px);left:calc(${left}% + 2px);width:calc(${w}% - 4px)">${inner}</div>`;
  }

  function gridHTML(c) {
    const span = c.eMin - c.sMin;
    const pct = (m) => (m - c.sMin) / span * 100;
    let h = `<div class="g" style="--cols:${c.days.length}">`;
    h += '<div class="g-head"><div class="g-corner"></div>';
    c.days.forEach((d) => {
      const dt = addDays(c.monday, d);
      const today = c.todayKey === keyOf(dt);
      // open to-dos due that day, on screen only (not in print)
      const due = c.interactive && LO.tasks ? LO.tasks.openTodos().filter((x) => x.due === keyOf(dt)) : [];
      const tag = due.length ? `<button type="button" class="dh-due" data-due="${keyOf(dt)}" title="${esc(t('dueTip')(due.map((x) => x.title).join(LO.lang() === 'zh' ? '、' : ', ')))}">${esc(t('dueTag')(due.length))}</button>` : '';
      h += `<div class="g-dayhead${today ? ' is-today' : ''}"><span class="dn">${L().days[d]}</span><span class="dd">${dt.getMonth() + 1}/${dt.getDate()}</span>${tag}</div>`;
    });
    h += `</div><div class="g-body"${c.bodyH ? ` style="height:${c.bodyH}px"` : ''}>`;
    h += '<div class="g-times">';
    for (let m = c.sMin; m <= c.eMin; m += 60) {
      const cls = m === c.sMin ? 'first' : m === c.eMin ? 'last' : '';
      h += `<span class="${cls}" style="top:${pct(m)}%">${fmtEnd(m)}</span>`;
    }
    h += '</div>';
    c.days.forEach((d) => {
      const dt = addDays(c.monday, d);
      const today = c.todayKey === keyOf(dt);
      h += `<div class="g-day${today ? ' is-today' : ''}" data-day="${d}">`;
      for (let m = c.sMin; m < c.eMin; m += 60) {
        if (m > c.sMin) h += `<i class="hl" style="top:${pct(m)}%"></i>`;
        if (c.halfLines) h += `<i class="hl half" style="top:${pct(m + 30)}%"></i>`;
      }
      lanes(c.events.filter((e) => e.day === d && e.end > c.sMin && e.start < c.eMin))
        .forEach((e) => { h += eventHTML(e, c, span); });
      if (today && c.nowMin != null && c.nowMin > c.sMin && c.nowMin < c.eMin) {
        h += `<div class="now" style="top:${pct(c.nowMin)}%"></div>`;
      }
      h += '</div>';
    });
    h += '</div></div>';
    return h;
  }

  function legendHTML(evs, interactive) {
    const hidden = interactive ? state.view.hidden : [];
    let h = CATS.filter((c) => evs.some((e) => e.cat === c))
      .map((c) => (interactive
        ? `<button type="button" class="lg lg-btn cat-${c}${hidden.includes(c) ? ' off' : ''}" data-lgcat="${c}" aria-pressed="${!hidden.includes(c)}" title="${esc(t('legendHint'))}"><i class="sw"></i>${esc(t('cats.' + c))}</button>`
        : `<span class="lg cat-${c}"><i class="sw"></i>${esc(t('cats.' + c))}</span>`)).join('');
    if (evs.some((e) => !e.rec)) h += `<span class="lg"><i class="sw stripe"></i>${esc(t('legendOnce'))}</span>`;
    return h;
  }

  /* =========================================================
     screen rendering
     ========================================================= */
  const gridEl = $('#grid');
  const sideEl = $('#side');

  function screenRange(evs) {
    let s = clamp(state.view.start, 0, 23) * 60;
    let e = clamp(Math.max(state.view.end, state.view.start + 1), 1, 24) * 60;
    evs.forEach((x) => { s = Math.min(s, Math.floor(x.start / 60) * 60); e = Math.max(e, Math.ceil(x.end / 60) * 60); });
    return [s, Math.min(e, 1440)];
  }

  let viewMode = window.innerWidth < 700 ? 'day' : 'week';
  let selDay = (new Date().getDay() + 6) % 7;

  function dayLabel() {
    const d = addDays(curMonday(), selDay);
    return LO.lang() === 'zh'
      ? `${d.getMonth() + 1}月${d.getDate()}日 ${L().days[selDay]}`
      : `${L().days[selDay]}, ${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
  }

  function renderHeader() {
    const input = $('#title');
    if (document.activeElement !== input) input.value = state.title || '';
    input.placeholder = t('defaultTitle');
    $('#range').textContent = viewMode === 'day' ? dayLabel() : rangeLabel(curMonday(), false);
    const vw = $('#viewWeek');
    const vd = $('#viewDay');
    if (vw && vd) { vw.setAttribute('aria-selected', String(viewMode === 'week')); vd.setAttribute('aria-selected', String(viewMode === 'day')); }
    document.title = `${titleText()} | ${rangeLabel(curMonday(), false)}`;
  }

  function renderGrid() {
    const mon = curMonday();
    const all = weekEvents(keyOf(mon));
    const evs = all.filter((e) => !state.view.hidden.includes(e.cat));
    const [sMin, eMin] = screenRange(evs);
    const now = new Date();
    gridEl.dataset.s = sMin;
    gridEl.dataset.e = eMin;
    gridEl.classList.toggle('is-day', viewMode === 'day');
    gridEl.innerHTML = gridHTML({
      monday: mon, days: viewMode === 'day' ? [selDay] : seq(7), sMin, eMin, events: evs,
      pxPerHour: HOUR_PX, bodyH: (eMin - sMin) / 60 * HOUR_PX,
      interactive: true, showTime: true, showPlace: true, halfLines: true, print: false,
      todayKey: keyOf(now), nowMin: now.getHours() * 60 + now.getMinutes()
    });
    $('#legend').innerHTML = legendHTML(all, true);
  }

  const hourSelect = (id, lo, hi, sel) => `<select id="${id}">${seq(hi - lo + 1).map((i) => {
    const v = lo + i;
    return `<option value="${v}"${v === sel ? ' selected' : ''}>${String(v).padStart(2, '0')}:00</option>`;
  }).join('')}</select>`;

  function weekTodos(mon) {
    if (!LO.tasks) return [];
    const a = keyOf(mon);
    const b = keyOf(addDays(mon, 6));
    const today = keyOf(new Date());
    const current = a <= today && today <= b;
    return LO.tasks.sortTodos(LO.tasks.store.s.todos.filter((x) => {
      if (x.done) return x.doneAt >= a && x.doneAt <= b && x.due && x.due >= a && x.due <= b;
      if (x.due && x.due >= a && x.due <= b) return true;
      return current && ((x.due && x.due < a) || x.focus === today);
    }));
  }

  function renderSide() {
    const key = curKey();
    const w = week(key);
    const evs = weekEvents(key);
    const hrs = {};
    CATS.forEach((c) => { hrs[c] = 0; });
    evs.forEach((e) => { hrs[e.cat] += (e.end - e.start) / 60; });
    const total = CATS.reduce((a, c) => a + hrs[c], 0);
    const max = Math.max(1, ...CATS.map((c) => hrs[c]));

    let h = `<section class="card"><h3>${esc(t('hoursTitle'))}</h3>`;
    if (total === 0) {
      h += `<p class="empty">${esc(t('hoursEmpty'))}</p>`;
    } else {
      h += '<ul class="hours">';
      CATS.filter((c) => hrs[c] > 0).forEach((c) => {
        h += `<li class="cat-${c}"><span class="hn"><i class="sw"></i>${esc(t('cats.' + c))}</span><b>${fmtHours(hrs[c])}</b>`
          + `<span class="bar"><span style="width:${hrs[c] / max * 100}%"></span></span></li>`;
      });
      h += `</ul><p class="hours-total"><span>${esc(t('total'))}</span><b>${fmtHours(total)}</b></p>`;
    }
    h += '</section>';

    const wTodos = weekTodos(curMonday());
    h += `<section class="card"><div class="card-head"><h3>${esc(t('todoTitle'))}</h3><a class="link" href="#/tasks">${esc(t('openTasks'))}</a></div>`
      + (wTodos.length ? `<ul class="tlist compact">${wTodos.map((x) => LO.tasks.todoRow(x, true)).join('')}</ul>` : `<p class="hint">${esc(t('todoEmpty'))}</p>`)
      + `<form class="todo-add" id="todoForm"><input id="todoInput" maxlength="140" autocomplete="off" placeholder="${esc(t('todoPh'))}">`
      + `<button class="btn sm" type="submit">${esc(t('add'))}</button></form></section>`;

    h += `<section class="card"><h3>${esc(t('notesTitle'))}</h3><textarea id="notes" placeholder="${esc(t('notesPh'))}">${esc(w.notes)}</textarea></section>`;

    h += `<section class="card"><h3>${esc(t('viewRange'))}</h3><div class="row">${hourSelect('vStart', 0, 23, state.view.start)}`
      + `<span>${esc(t('to'))}</span>${hourSelect('vEnd', 1, 24, state.view.end)}</div></section>`;
    sideEl.innerHTML = h;
  }

  function renderSkipped() {
    const el = $('#skipped');
    const w = week(curKey());
    const list = state.recurring.filter((e) => w.skipped.includes(e.id));
    el.hidden = !list.length;
    if (!list.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<span>${esc(t('skipped'))}</span>` + list.map((e) =>
      `<button type="button" data-restore="${esc(e.id)}">${esc(e.title)}, ${L().days[e.day]} ${fmt(e.start)}<u>${esc(t('restore'))}</u></button>`
    ).join('');
  }

  /* =========================================================
     shared with planner-print.js and planner-edit.js
     ========================================================= */
  // The print view and the editing code live in their own files and reach the
  // schedule through this. `state` is a getter because undo replaces it.
  const kit = LO.plannerKit = {
    get state() { return state; },
    $, $$, esc, t, L, seq, clamp, uid, CATS, SNAP, PAPER, PAGE_PAD,
    fmt, fmtEnd, toMin, curKey, curMonday, week, weekEvents, weekTodos, plain, groupOf,
    gridEl, gridHTML, legendHTML, titleText, rangeLabel, hourSelect,
    persist, mutate, rollbackSilently, renderGrid,
    // filled in by the other two files
    renderPrint() {}, renderPrintForm() {}, fitPreview() {}, openNew() {}, isDragging: () => false
  };

  /* =========================================================
     render everything
     ========================================================= */
  let currentView = 'edit';
  function renderAll() {
    renderHeader();
    renderGrid();
    renderSide();
    renderSkipped();
    if (currentView === 'print') { kit.renderPrintForm(); kit.renderPrint(); }
  }

  function setView(v) {
    currentView = v;
    $('#editView').hidden = v !== 'edit';
    $('#printView').hidden = v !== 'print';
    $('#tabEdit').setAttribute('aria-selected', String(v === 'edit'));
    $('#tabPrint').setAttribute('aria-selected', String(v === 'print'));
    $('#newBtn').hidden = v === 'print';
    renderAll();
  }

  /* =========================================================
     side panel interactions
     ========================================================= */
  sideEl.addEventListener('submit', (e) => {
    if (e.target.id !== 'todoForm') return;
    e.preventDefault();
    const v = $('#todoInput').value.trim();
    if (!v) return;
    const due = weekOffset === 0 ? keyOf(new Date()) : keyOf(curMonday());
    LO.tasks.addTodo({ title: v, due });
    const i = $('#todoInput');
    if (i) i.focus();
  });
  sideEl.addEventListener('change', (e) => {
    if (e.target.id === 'vStart' || e.target.id === 'vEnd') {
      state.view.start = +$('#vStart').value;
      state.view.end = Math.max(+$('#vEnd').value, state.view.start + 1);
      persist();
      renderGrid();
      renderSide();
    }
  });
  sideEl.addEventListener('input', (e) => {
    if (e.target.id !== 'notes') return;
    week(curKey(), true).notes = e.target.value;
    persist();
  });

  $('#skipped').addEventListener('click', (e) => {
    const b = e.target.closest('[data-restore]');
    if (!b) return;
    const id = b.dataset.restore;
    mutate(() => {
      const w = week(curKey(), true);
      w.skipped = w.skipped.filter((x) => x !== id);
    }, t('restored'));
  });

  /* =========================================================
     top bar, menu, keyboard
     ========================================================= */
  const goWeek = (n) => {
    if (n === 0) { weekOffset = 0; selDay = (new Date().getDay() + 6) % 7; }
    else if (viewMode === 'day') {
      selDay += n;
      if (selDay < 0) { selDay = 6; weekOffset--; }
      if (selDay > 6) { selDay = 0; weekOffset++; }
    } else weekOffset += n;
    renderAll();
  };
  const setViewMode = (m) => { viewMode = m; renderHeader(); renderGrid(); };
  $('#viewWeek').addEventListener('click', () => setViewMode('week'));
  $('#viewDay').addEventListener('click', () => setViewMode('day'));
  $('#legend').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lgcat]');
    if (!b) return;
    const c = b.dataset.lgcat;
    const h = state.view.hidden;
    state.view.hidden = h.includes(c) ? h.filter((x) => x !== c) : h.concat(c);
    persist();
    renderGrid();
  });
  // Day view (phones): swipe left or right on the timetable for the next or previous day.
  // A swipe never starts a drag: touch drags give way as soon as the finger moves.
  let swipe = null;
  gridEl.addEventListener('touchstart', (e) => {
    swipe = viewMode === 'day' && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null;
  }, { passive: true });
  gridEl.addEventListener('touchend', (e) => {
    if (!swipe) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - swipe.x;
    const dy = p.clientY - swipe.y;
    const quick = Date.now() - swipe.t < 700;
    swipe = null;
    if (!quick || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    goWeek(dx < 0 ? 1 : -1);
    const g = gridEl.firstElementChild;
    if (g) g.classList.add(dx < 0 ? 'slide-l' : 'slide-r');
  }, { passive: true });

  $('#prevWeek').addEventListener('click', () => goWeek(-1));
  $('#nextWeek').addEventListener('click', () => goWeek(1));
  $('#thisWeek').addEventListener('click', () => goWeek(0));
  $('#tabEdit').addEventListener('click', () => setView('edit'));
  $('#tabPrint').addEventListener('click', () => setView('print'));

  function newFromButton() {
    const now = new Date();
    const day = viewMode === 'day' ? selDay : weekOffset === 0 ? (now.getDay() + 6) % 7 : 0;
    const s = weekOffset === 0 ? clamp(now.getHours() + 1, 7, 22) * 60 : 9 * 60;
    kit.openNew(day, s, s + 60);
  }
  $('#newBtn').addEventListener('click', newFromButton);

  $('#title').addEventListener('input', (e) => {
    state.title = e.target.value;
    persist();
    document.title = `${titleText()} | ${rangeLabel(curMonday(), false)}`;
    if (currentView === 'print') kit.renderPrint();
  });
  $('#title').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });

  /* =========================================================
     keyboard (only while this page is open)
     ========================================================= */
  function keys(e) {
    const k = e.key.toLowerCase();
    if (e.key === 'ArrowLeft') goWeek(-1);
    else if (e.key === 'ArrowRight') goWeek(1);
    else if (k === 't') goWeek(0);
    else if (k === 'n' && currentView === 'edit') { e.preventDefault(); newFromButton(); }
    else if (k === 'p') setView(currentView === 'print' ? 'edit' : 'print');
  }

  /* =========================================================
     register with the app
     ========================================================= */
  LO.strings('planner', I18N);
  persistNow(); // pin the seeded ids so "skip this week" survives reloads

  LO.planner = {
    flush: persistNow,
    takeLegacyTodos() {
      const out = [];
      Object.entries(state.weeks).forEach(([k, w]) => {
        (w.todos || []).forEach((td) => out.push({ text: td.text, done: td.done, week: k }));
        w.todos = [];
      });
      if (out.length) persistNow();
      return out;
    },
    undo,
    reset() {
      LO.go('schedule');
      mutate(() => {
        const keep = { lang: state.lang, theme: state.theme, print: state.print, view: state.view, title: state.title };
        state = Object.assign(defaultState(), keep);
      }, t('resetDone'));
    },
    eventsOn(date) {
      const di = (date.getDay() + 6) % 7;
      return weekEvents(keyOf(mondayOf(date))).filter((e) => e.day === di).sort((a, b) => a.start - b.start);
    },
    weekHours(date) {
      const hrs = {};
      weekEvents(keyOf(mondayOf(date))).forEach((e) => { hrs[e.cat] = (hrs[e.cat] || 0) + (e.end - e.start) / 60; });
      return hrs;
    },
    catLabel: (c) => t('cats.' + c),
    raw: () => state,
    raw: () => state,
    weekEventsOf: (date) => weekEvents(keyOf(mondayOf(date))),
    // Adds what LO.icsParse read from a calendar file. Weekly entries become repeating
    // events (one group per class), their skipped days become "skip this week", and
    // one-offs go into their own week. Anything already on the schedule at the same
    // day and time with the same name is left out. Returns how many were added.
    importCalendar(data, cat, msg) {
      const out = { weekly: 0, once: 0 };
      const toKey = (k) => keyOf(mondayOf(LO.parseKey(k)));
      const same = (a, b) => a.title === b.title && a.day === b.day && a.start === b.start && a.end === b.end;
      mutate(() => {
        data.weekly.forEach((x) => {
          const gid = 'g' + uid();
          const made = {};
          x.days.forEach((day) => {
            const e = cleanEvent({ id: uid(), title: x.title, cat, day, start: x.start, end: x.end, place: x.place, note: x.note, from: x.from, until: x.until, group: gid });
            if (state.recurring.some((r) => same(r, e))) return;
            state.recurring.push(e);
            made[day] = e.id;
          });
          if (!Object.keys(made).length) return;
          out.weekly++;
          (x.except || []).forEach((k) => {
            const id = made[LO.wd(LO.parseKey(k))];
            const w = id && week(toKey(k), true);
            if (w && !w.skipped.includes(id)) w.skipped.push(id);
          });
        });
        data.once.forEach((x) => {
          const day = LO.wd(LO.parseKey(x.date));
          const e = cleanEvent({ id: uid(), title: x.title, cat, day, start: x.start, end: x.end, place: x.place, note: x.note });
          const w = week(toKey(x.date), true);
          if (w.added.some((a) => same(a, e))) return;
          w.added.push(e);
          out.once++;
        });
      });
      if (!out.weekly && !out.once) undoStack.pop(); // nothing changed, so nothing to undo
      // the message needs the counts, so it's shown once the import has run
      if (msg) LO.toast(msg(out), out.weekly || out.once ? [{ label: t('undo'), run: undo }] : []);
      return out;
    },
    addWeekEvents(date, items) {
      // items: [{ day, start, end, title, place, cat, note }] added as this-week-only events
      const key = keyOf(mondayOf(date));
      const list = items.filter((x) => x && x.title && x.end > x.start);
      if (!list.length) return 0;
      mutate(() => {
        const w = week(key, true);
        list.forEach((x) => w.added.push(cleanEvent(Object.assign({ id: uid(), cat: 'health', place: '' }, x))));
      }, t('addedPlan')(list.length));
      return list.length;
    }
  };

  LO.view('schedule', {
    render: renderAll,
    undo,
    keys,
    setMode: setView,
    onShow() { if (currentView === 'print') requestAnimationFrame(kit.fitPreview); }
  });

  setInterval(() => { if (!kit.isDragging() && currentView === 'edit' && LO.route() === 'schedule') renderGrid(); }, 60 * 1000);
})();
