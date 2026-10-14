/*
 * Schedule page: the editable, printable weekly timetable.
 * Data is stored in localStorage under "weekly-planner:v2".
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
      cats: { class: '课程', work: '工作', meeting: '会议 / 社团', other: '其他' },
      defaultTitle: '我的一周', titleAria: '标题（点击修改）',
      thisWeek: '本周', prevWeek: '上一周', nextWeek: '下一周',
      tabEdit: '编辑', tabPrint: '打印',
      newEvent: '新建', more: '更多选项',
      undo: '撤销', exportData: '导出备份', importData: '导入备份', reset: '恢复初始课表',
      langSwitch: 'English', theme: '外观', themeNames: { auto: '跟随系统', light: '浅色', dark: '深色' },
      shortcuts: '快捷键',
      hoursTitle: '本周时间', total: '合计', hoursEmpty: '这周还没有安排。', hoursUnit: ' 小时',
      todoTitle: '本周待办', todoPh: '添加待办，回车保存', todoEmpty: '这周没有到期的待办。', openTasks: '全部待办', add: '添加',
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
      imported: '备份已导入', importFailed: '这个文件不是有效的备份', resetDone: '已恢复初始课表',
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
      cats: { class: 'Class', work: 'Work', meeting: 'Meeting / Club', other: 'Other' },
      defaultTitle: 'My Week', titleAria: 'Title (click to edit)',
      thisWeek: 'This week', prevWeek: 'Previous week', nextWeek: 'Next week',
      tabEdit: 'Edit', tabPrint: 'Print',
      newEvent: 'New', more: 'More options',
      undo: 'Undo', exportData: 'Export backup', importData: 'Import backup', reset: 'Restore default schedule',
      langSwitch: '中文', theme: 'Appearance', themeNames: { auto: 'System', light: 'Light', dark: 'Dark' },
      shortcuts: 'Keyboard shortcuts',
      hoursTitle: 'Hours this week', total: 'Total', hoursEmpty: 'Nothing scheduled this week.', hoursUnit: ' h',
      todoTitle: 'To-dos this week', todoPh: 'Add a to-do, press Enter', todoEmpty: 'Nothing due this week.', openTasks: 'All to-dos', add: 'Add',
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
      imported: 'Backup imported', importFailed: "This file isn't a valid backup", resetDone: 'Default schedule restored',
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
  const CATS = ['class', 'work', 'meeting', 'other'];
  const STORE = 'weekly-planner:v2';
  const SNAP = 15;          // minutes
  const HOUR_PX = 52;       // screen hour height
  const PAPER = { letter: [1056, 816], a4: [1122, 793] }; // CSS px at 96dpi (long, short)
  const PAGE_PAD = 34;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const uid = () => Math.random().toString(36).slice(2, 10);
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
      cats: { class: 1, work: 1, meeting: 1, other: 1 },
      start: 9, end: 23, showTime: 1, showPlace: 1, showOnce: 1, showSide: 1, mono: 0
    };
  }

  function defaultState() {
    const lang = (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    return {
      v: 2, title: '', lang, theme: 'auto',
      recurring: seedRecurring(), weeks: {},
      view: { start: 8, end: 23 }, print: defaultPrint()
    };
  }

  const validEvent = (e) => e && typeof e.title === 'string' && Number.isInteger(e.day) && e.day >= 0 && e.day <= 6
    && Number.isFinite(e.start) && Number.isFinite(e.end) && e.end > e.start && e.start >= 0 && e.end <= 1440;
  const cleanEvent = (e) => ({
    id: String(e.id || uid()), title: e.title, cat: CATS.includes(e.cat) ? e.cat : 'other',
    day: e.day, start: e.start, end: e.end, place: typeof e.place === 'string' ? e.place : ''
  });

  function normalize(s) {
    const d = defaultState();
    const out = {
      v: 2,
      title: typeof s.title === 'string' ? s.title : '',
      lang: ['zh', 'en'].includes(s.lang) ? s.lang : d.lang,
      theme: ['auto', 'light', 'dark'].includes(s.theme) ? s.theme : 'auto',
      recurring: (s.recurring || []).filter(validEvent).map(cleanEvent),
      weeks: {},
      view: Object.assign({}, d.view, s.view || {}),
      print: Object.assign({}, d.print, s.print || {})
    };
    out.print.cats = Object.assign({}, d.print.cats, (s.print || {}).cats || {});
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

  function persistNow() {
    clearTimeout(saveTimer);
    if (LO.frozen) return;
    try { localStorage.setItem(STORE, JSON.stringify(state)); }
    catch (_) { LO.toast(t('saveFailed')); }
  }
  function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(persistNow, 250); }
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
  function weekEvents(key) {
    const w = week(key);
    return state.recurring.filter((e) => !w.skipped.includes(e.id)).map((e) => Object.assign({}, e, { rec: true }))
      .concat(w.added.map((e) => Object.assign({}, e, { rec: false })));
  }
  const plain = (e) => ({ id: e.id, title: e.title, cat: e.cat, day: e.day, start: e.start, end: e.end, place: e.place });

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
  function lanes(list) {
    const sorted = list.map((e) => Object.assign({}, e)).sort((a, b) => a.start - b.start || b.end - a.end);
    const out = [];
    let group = [];
    let groupEnd = -1;
    const flush = () => {
      const ends = [];
      group.forEach((e) => {
        let i = ends.findIndex((x) => x <= e.start);
        if (i < 0) { i = ends.length; ends.push(0); }
        ends[i] = e.end;
        e._i = i;
      });
      group.forEach((e) => { e._n = ends.length; out.push(e); });
      group = [];
    };
    sorted.forEach((e) => {
      if (group.length && e.start >= groupEnd) { flush(); groupEnd = -1; }
      group.push(e);
      groupEnd = Math.max(groupEnd, e.end);
    });
    if (group.length) flush();
    return out;
  }

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
    const label = `${e.title}, ${L().days[e.day]} ${fmt(e.start)}–${fmtEnd(e.end)}${e.place ? ', ' + e.place : ''}`;
    const attrs = c.interactive ? ` tabindex="0" role="button" aria-label="${esc(label)}"` : '';
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
      h += `<div class="g-dayhead${today ? ' is-today' : ''}"><span class="dn">${L().days[d]}</span><span class="dd">${dt.getMonth() + 1}/${dt.getDate()}</span></div>`;
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

  function legendHTML(evs) {
    let h = CATS.filter((c) => evs.some((e) => e.cat === c))
      .map((c) => `<span class="lg cat-${c}"><i class="sw"></i>${esc(t('cats.' + c))}</span>`).join('');
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

  function renderHeader() {
    const input = $('#title');
    if (document.activeElement !== input) input.value = state.title || '';
    input.placeholder = t('defaultTitle');
    $('#range').textContent = rangeLabel(curMonday(), false);
    document.title = `${titleText()} | ${rangeLabel(curMonday(), false)}`;
  }

  function renderGrid() {
    const mon = curMonday();
    const evs = weekEvents(keyOf(mon));
    const [sMin, eMin] = screenRange(evs);
    const now = new Date();
    gridEl.dataset.s = sMin;
    gridEl.dataset.e = eMin;
    gridEl.innerHTML = gridHTML({
      monday: mon, days: seq(7), sMin, eMin, events: evs,
      pxPerHour: HOUR_PX, bodyH: (eMin - sMin) / 60 * HOUR_PX,
      interactive: true, showTime: true, showPlace: true, halfLines: true, print: false,
      todayKey: keyOf(now), nowMin: now.getHours() * 60 + now.getMinutes()
    });
    $('#legend').innerHTML = legendHTML(evs);
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
     print rendering
     ========================================================= */
  const printForm = $('#printForm');
  const printRoot = $('#printRoot');
  const pageFrame = $('#pageFrame');
  const previewArea = $('#previewArea');

  function pageSize() {
    const [lg, sh] = PAPER[state.print.paper] || PAPER.letter;
    // shave a few px so rounding never spills onto a second sheet
    return state.print.orient === 'portrait' ? [sh - 2, lg - 6] : [lg - 2, sh - 6];
  }

  function printDays() {
    const d = seq(7).filter((i) => state.print.days[i]);
    return d.length ? d : seq(7);
  }
  function printEvents(days) {
    const P = state.print;
    return weekEvents(curKey()).filter((e) => P.cats[e.cat] && (P.showOnce || e.rec) && days.includes(e.day));
  }

  function renderPrint() {
    const P = state.print;
    const mon = curMonday();
    const w = week(curKey());
    const days = printDays();
    const evs = printEvents(days);
    const sMin = clamp(P.start, 0, 23) * 60;
    const eMin = clamp(Math.max(P.end, P.start + 1), 1, 24) * 60;
    const [W, H] = pageSize();
    const portrait = P.orient === 'portrait';
    const usableH = H - 2 * PAGE_PAD - 54 - 26 - 22 - (P.showSide && portrait ? 204 : 0);
    const pxPerHour = usableH / ((eMin - sMin) / 60);

    let h = `<div class="page ${portrait ? 'portrait' : 'landscape'}${P.mono ? ' mono' : ''}" style="width:${W}px;height:${H}px">`;
    h += `<header class="p-head"><h1>${esc(titleText())}</h1><div class="p-range">${esc(rangeLabel(mon, true))}</div></header>`;
    h += '<div class="p-main"><div class="p-grid">';
    h += gridHTML({
      monday: mon, days, sMin, eMin, events: evs, pxPerHour,
      interactive: false, showTime: !!P.showTime, showPlace: !!P.showPlace,
      halfLines: pxPerHour >= 34, print: true, todayKey: null, nowMin: null
    });
    h += '</div>';
    if (P.showSide) {
      const todos = weekTodos(mon).map((td) => `<li class="${td.done ? 'done' : ''}">${esc(td.title)}</li>`).join('');
      h += '<aside class="p-side">'
        + `<div class="p-sec"><h4>${esc(t('todoTitle'))}</h4><ul class="p-todos">${todos}</ul><div class="ruled"></div></div>`
        + `<div class="p-sec"><h4>${esc(t('notesTitle'))}</h4>${w.notes ? `<p class="p-notes">${esc(w.notes)}</p>` : ''}<div class="ruled"></div></div>`
        + '</aside>';
    }
    h += `</div><footer class="p-foot">${legendHTML(evs)}</footer></div>`;
    printRoot.innerHTML = h;
    $('#pageStyle').textContent = `@page { size: ${P.paper === 'a4' ? 'A4' : 'letter'} ${P.orient}; margin: 0; }`;
    fitPreview();
  }

  function fitPreview() {
    const page = $('.page', printRoot);
    if (!page) return;
    const [W, H] = pageSize();
    const avail = previewArea.clientWidth;
    if (avail <= 0) return;
    const s = Math.min(1, avail / W);
    pageFrame.style.width = `${W * s}px`;
    pageFrame.style.height = `${H * s}px`;
    page.style.transform = `scale(${s})`;
  }
  if ('ResizeObserver' in window) new ResizeObserver(fitPreview).observe(previewArea);
  else window.addEventListener('resize', fitPreview);

  function renderPrintForm() {
    const P = state.print;
    const chip = (name, val, label, checked, type, extra) =>
      `<label class="chip${extra ? ' ' + extra : ''}"><input type="${type}" name="${name}" value="${val}"${checked ? ' checked' : ''}><span>${label}</span></label>`;
    const check = (k) => `<label class="check"><input type="checkbox" id="p_${k}"${P[k] ? ' checked' : ''}>${esc(t('p.' + k))}</label>`;
    let h = '';
    h += `<div class="fld"><span>${esc(t('p.paper'))}</span><div class="chips">`
      + chip('paper', 'letter', 'Letter', P.paper === 'letter', 'radio') + chip('paper', 'a4', 'A4', P.paper === 'a4', 'radio') + '</div></div>';
    h += `<div class="fld"><span>${esc(t('p.orient'))}</span><div class="chips">`
      + chip('orient', 'landscape', esc(t('p.landscape')), P.orient === 'landscape', 'radio')
      + chip('orient', 'portrait', esc(t('p.portrait')), P.orient === 'portrait', 'radio') + '</div></div>';
    h += `<div class="fld"><span>${esc(t('p.days'))}</span><div class="chips">`
      + seq(7).map((d) => chip('pday', d, L().days[d], P.days[d], 'checkbox')).join('')
      + `</div><div class="quick"><button type="button" class="btn sm" data-q="all">${esc(t('p.all'))}</button>`
      + `<button type="button" class="btn sm" data-q="weekdays">${esc(t('p.weekdays'))}</button></div></div>`;
    h += `<div class="fld"><span>${esc(t('p.cats'))}</span><div class="chips">`
      + CATS.map((c) => chip('pcat', c, `<i class="sw"></i>${esc(t('cats.' + c))}`, P.cats[c], 'checkbox', 'cat-' + c)).join('') + '</div></div>';
    h += `<div class="fld"><span>${esc(t('p.range'))}</span><div class="row">${hourSelect('pStart', 0, 23, P.start)}<span>${esc(t('to'))}</span>`
      + `${hourSelect('pEnd', 1, 24, P.end)}<button type="button" class="btn sm" data-q="fit">${esc(t('p.auto'))}</button></div></div>`;
    h += `<div class="fld"><span>${esc(t('p.content'))}</span>${['showTime', 'showPlace', 'showOnce', 'showSide', 'mono'].map(check).join('')}</div>`;
    h += `<div class="actions"><button type="button" class="btn primary block" data-q="print">${esc(t('p.print'))}</button>`
      + `<p class="tip">${esc(t('p.tip'))}</p></div>`;
    printForm.innerHTML = h;
  }

  function readPrintForm() {
    const P = state.print;
    const radio = (n) => { const el = $(`input[name="${n}"]:checked`, printForm); return el ? el.value : null; };
    P.paper = radio('paper') || 'letter';
    P.orient = radio('orient') || 'landscape';
    P.days = $$('input[name="pday"]', printForm).map((i) => (i.checked ? 1 : 0));
    $$('input[name="pcat"]', printForm).forEach((i) => { P.cats[i.value] = i.checked ? 1 : 0; });
    P.start = +$('#pStart').value;
    P.end = +$('#pEnd').value;
    if (P.end <= P.start) { P.end = Math.min(24, P.start + 1); $('#pEnd').value = String(P.end); }
    ['showTime', 'showPlace', 'showOnce', 'showSide', 'mono'].forEach((k) => { P[k] = $(`#p_${k}`).checked ? 1 : 0; });
    persist();
    renderPrint();
  }

  printForm.addEventListener('change', readPrintForm);
  printForm.addEventListener('submit', (e) => e.preventDefault());
  printForm.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]');
    if (!q) return;
    const P = state.print;
    if (q.dataset.q === 'all') P.days = [1, 1, 1, 1, 1, 1, 1];
    else if (q.dataset.q === 'weekdays') P.days = [1, 1, 1, 1, 1, 0, 0];
    else if (q.dataset.q === 'fit') {
      const evs = printEvents(printDays());
      if (evs.length) {
        P.start = Math.floor(Math.min(...evs.map((x) => x.start)) / 60);
        P.end = Math.ceil(Math.max(...evs.map((x) => x.end)) / 60);
      }
    } else if (q.dataset.q === 'print') { doPrint(); return; }
    persist();
    renderPrintForm();
    renderPrint();
  });

  function doPrint() {
    renderPrint();
    window.print();
  }
  window.addEventListener('beforeprint', renderPrint);

  /* =========================================================
     render everything
     ========================================================= */
  let currentView = 'edit';
  function renderAll() {
    renderHeader();
    renderGrid();
    renderSide();
    renderSkipped();
    if (currentView === 'print') { renderPrintForm(); renderPrint(); }
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
     dialog
     ========================================================= */
  const dlg = $('#dlg');
  let dctx = null;
  let delArmed = false;

  const chipsHTML = (name, items, type, checked) => items.map(([v, label, cls]) =>
    `<label class="chip${cls ? ' ' + cls : ''}"><input type="${type}" name="${name}" value="${v}"${checked.includes(String(v)) ? ' checked' : ''}><span>${label}</span></label>`
  ).join('');

  function openNew(day, start, end) {
    dctx = { mode: 'new', rec: false };
    fillDialog({ title: '', cat: 'other', days: [day], start, end, place: '', repeat: 'once' });
  }

  function openEdit(id, rec) {
    const ev = rec ? state.recurring.find((e) => e.id === id) : week(curKey()).added.find((e) => e.id === id);
    if (!ev) return;
    dctx = { mode: 'edit', rec, id };
    fillDialog({ title: ev.title, cat: ev.cat, days: [ev.day], start: ev.start, end: ev.end, place: ev.place, repeat: rec ? 'weekly' : 'once' });
  }

  function fillDialog(v) {
    const c = dctx;
    $('#dlgTitle').textContent = c.mode === 'new' ? t('dlgNew') : t('dlgEdit');
    const badge = $('#dlgBadge');
    badge.hidden = c.mode === 'new';
    badge.textContent = c.rec ? t('badgeWeekly') : t('badgeOnce');
    $('#fTitle').value = v.title;
    $('#fPlace').value = v.place || '';
    $('#fStart').value = fmt(v.start);
    $('#fEnd').value = v.end >= 1440 ? '00:00' : fmt(v.end);
    $('#fCat').innerHTML = chipsHTML('fcat', CATS.map((k) => [k, `<i class="sw"></i>${esc(t('cats.' + k))}`, 'cat-' + k]), 'radio', [v.cat]);
    $('#fDays').innerHTML = chipsHTML('fday', seq(7).map((d) => [d, L().days[d]]), 'checkbox', v.days.map(String));
    $('#fRepeat').innerHTML = chipsHTML('frep', [['weekly', esc(t('weekly'))], ['once', esc(t('onceThisWeek'))]], 'radio', [v.repeat]);
    $('#repeatFld').hidden = c.rec;
    $('#fSave').textContent = c.rec ? t('saveWeekly') : t('save');
    $('#fSaveWeek').hidden = !c.rec;
    $('#fDel').hidden = c.mode === 'new';
    $('#fSkip').hidden = !c.rec;
    $('#fDel').textContent = t('del');
    $('#fErr').textContent = '';
    delArmed = false;
    if (!dlg.open) dlg.showModal();
    setTimeout(() => { const i = $('#fTitle'); i.focus(); if (c.mode === 'new') i.select(); }, 0);
  }

  function readDialog() {
    const title = $('#fTitle').value.trim();
    const catEl = $('input[name="fcat"]:checked', dlg);
    const cat = catEl ? catEl.value : 'other';
    const days = $$('input[name="fday"]:checked', dlg).map((i) => +i.value);
    const sv = $('#fStart').value;
    const ev = $('#fEnd').value;
    const start = toMin(sv);
    let end = toMin(ev);
    if (ev && end === 0) end = 1440; // "00:00" as end means midnight
    const place = $('#fPlace').value.trim();
    const repEl = $('input[name="frep"]:checked', dlg);
    const repeat = dctx.rec ? 'weekly' : (repEl ? repEl.value : 'once');
    const err = !title ? t('errTitle') : !days.length ? t('errDays') : (!sv || !ev || end <= start) ? t('errTime') : '';
    if (err) { $('#fErr').textContent = err; return null; }
    return { title, cat, days, start, end, place, repeat };
  }

  function saveDialog(scope) {
    const v = readDialog();
    if (!v) return;
    const c = dctx;
    const key = curKey();
    const base = { title: v.title, cat: v.cat, start: v.start, end: v.end, place: v.place };
    mutate(() => {
      const w = week(key, true);
      if (c.mode === 'new') {
        v.days.forEach((day) => (v.repeat === 'weekly' ? state.recurring : w.added).push(Object.assign({ id: uid(), day }, base)));
      } else if (!c.rec) {
        w.added = w.added.filter((e) => e.id !== c.id);
        v.days.forEach((day, i) => (v.repeat === 'weekly' ? state.recurring : w.added).push(Object.assign({ id: i === 0 ? c.id : uid(), day }, base)));
      } else if (scope === 'week') {
        if (!w.skipped.includes(c.id)) w.skipped.push(c.id);
        v.days.forEach((day) => w.added.push(Object.assign({ id: uid(), day }, base)));
      } else {
        const orig = state.recurring.find((e) => e.id === c.id);
        if (orig) Object.assign(orig, base, { day: v.days[0] });
        v.days.slice(1).forEach((day) => state.recurring.push(Object.assign({ id: uid(), day }, base)));
      }
    }, c.mode === 'new' ? t('added') : (c.rec && scope === 'week' ? t('changedThisWeek') : t('saved')));
    dlg.close();
  }

  $('#dlgForm').addEventListener('submit', (e) => { e.preventDefault(); saveDialog('weekly'); });
  $('#fSaveWeek').addEventListener('click', () => saveDialog('week'));
  $('#fCancel').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { dctx = null; delArmed = false; });

  $('#fDel').addEventListener('click', () => {
    const c = dctx;
    if (!c) return;
    if (!delArmed) {
      delArmed = true;
      $('#fDel').textContent = c.rec ? t('confirmDelWeekly') : t('confirmDel');
      return;
    }
    const key = curKey();
    mutate(() => {
      if (c.rec) {
        state.recurring = state.recurring.filter((e) => e.id !== c.id);
        Object.values(state.weeks).forEach((w) => { w.skipped = w.skipped.filter((i) => i !== c.id); });
      } else {
        const w = week(key, true);
        w.added = w.added.filter((e) => e.id !== c.id);
      }
    }, t('deleted'));
    dlg.close();
  });

  $('#fSkip').addEventListener('click', () => {
    const c = dctx;
    if (!c || !c.rec) return;
    const key = curKey();
    mutate(() => {
      const w = week(key, true);
      if (!w.skipped.includes(c.id)) w.skipped.push(c.id);
    }, t('skippedToast'));
    dlg.close();
  });

  /* =========================================================
     grid interactions: click, drag to create / move / resize
     ========================================================= */
  let drag = null;
  const snap = (v) => Math.round(v / SNAP) * SNAP;

  function bodyMetrics() {
    const r = $('.g-body', gridEl).getBoundingClientRect();
    return { top: r.top, height: r.height, s: +gridEl.dataset.s, e: +gridEl.dataset.e };
  }
  const yToMin = (y, m) => m.s + (y - m.top) / m.height * (m.e - m.s);

  function dayAt(x) {
    let best = null;
    let bestD = Infinity;
    $$('.g-day', gridEl).forEach((col) => {
      const r = col.getBoundingClientRect();
      const d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      if (d < bestD) { bestD = d; best = col; }
    });
    return best;
  }

  function placeEl(el, start, end, m) {
    const span = m.e - m.s;
    el.style.top = `calc(${(start - m.s) / span * 100}% + 1px)`;
    el.style.height = `calc(${(end - start) / span * 100}% - 2px)`;
    const tm = el.querySelector('[data-time]');
    if (tm) tm.textContent = `${fmt(start)}–${fmtEnd(end)}`;
  }

  function findEvent(id, rec) {
    return rec ? state.recurring.find((e) => e.id === id) : week(curKey()).added.find((e) => e.id === id);
  }

  gridEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || drag) return;
    const dayEl = e.target.closest('.g-day');
    if (!dayEl) return;
    const evEl = e.target.closest('.ev');
    const m = bodyMetrics();
    const touch = e.pointerType === 'touch';
    if (evEl) {
      const rec = evEl.dataset.rec === '1';
      const ev = findEvent(evEl.dataset.id, rec);
      if (!ev) return;
      drag = {
        kind: e.target.closest('.grip') ? 'resize' : 'move', el: evEl, ev: plain(ev), rec,
        x0: e.clientX, y0: e.clientY, m0: yToMin(e.clientY, m), touch, moved: false,
        day: ev.day, start: ev.start, end: ev.end
      };
    } else {
      const anchor = clamp(Math.floor(yToMin(e.clientY, m) / SNAP) * SNAP, m.s, m.e - SNAP);
      drag = { kind: 'create', dayEl, day: +dayEl.dataset.day, x0: e.clientX, y0: e.clientY, anchor, touch, moved: false };
    }
    if (!touch) e.preventDefault();
  });

  function beginDragVisual() {
    document.body.classList.add('is-dragging');
    if (drag.kind === 'create') {
      const g = document.createElement('div');
      g.className = 'ev ghost';
      g.innerHTML = `<span class="ev-t">${esc(t('newGhost'))}</span><span class="ev-m" data-time></span>`;
      g.style.left = '2px';
      g.style.width = 'calc(100% - 4px)';
      drag.dayEl.appendChild(g);
      drag.el = g;
    } else {
      drag.el.classList.add('dragging');
      drag.el.style.left = '2px';
      drag.el.style.width = 'calc(100% - 4px)';
    }
  }

  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved) {
      const dist = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
      if (dist < (drag.touch ? 10 : 4)) return;
      if (drag.touch) { drag = null; return; } // let touch scroll the page
      drag.moved = true;
      beginDragVisual();
    }
    const m = bodyMetrics();
    if (drag.kind === 'move') {
      const dur = drag.ev.end - drag.ev.start;
      const delta = snap(yToMin(e.clientY, m) - drag.m0);
      drag.start = clamp(drag.ev.start + delta, m.s, m.e - dur);
      drag.end = drag.start + dur;
      const col = dayAt(e.clientX);
      if (col && col !== drag.el.parentElement) col.appendChild(drag.el);
      drag.day = +drag.el.parentElement.dataset.day;
      placeEl(drag.el, drag.start, drag.end, m);
    } else if (drag.kind === 'resize') {
      drag.end = clamp(snap(yToMin(e.clientY, m)), drag.ev.start + SNAP, m.e);
      placeEl(drag.el, drag.ev.start, drag.end, m);
    } else {
      const cur = clamp(snap(yToMin(e.clientY, m)), m.s, m.e);
      if (cur >= drag.anchor) { drag.start = drag.anchor; drag.end = Math.max(cur, drag.anchor + SNAP); }
      else { drag.start = cur; drag.end = drag.anchor + SNAP; }
      placeEl(drag.el, drag.start, drag.end, m);
    }
  });

  window.addEventListener('pointerup', () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    document.body.classList.remove('is-dragging');
    if (!d.moved) {
      if (d.kind === 'create') {
        const s = clamp(Math.floor(d.anchor / 30) * 30, 0, 1410);
        openNew(d.day, s, Math.min(s + 60, 1440));
      } else {
        openEdit(d.ev.id, d.rec);
      }
      return;
    }
    if (d.kind === 'create') {
      d.el.remove();
      openNew(d.day, d.start, d.end);
      return;
    }
    const props = d.kind === 'move' ? { day: d.day, start: d.start, end: d.end } : { day: d.ev.day, start: d.ev.start, end: d.end };
    if (props.day === d.ev.day && props.start === d.ev.start && props.end === d.ev.end) { renderGrid(); return; }
    commitMove(d, props);
  });

  window.addEventListener('pointercancel', () => {
    if (!drag) return;
    drag = null;
    document.body.classList.remove('is-dragging');
    renderGrid();
  });

  function commitMove(d, props) {
    const key = curKey();
    if (d.rec) {
      mutate(() => {
        const ev = state.recurring.find((x) => x.id === d.ev.id);
        if (ev) Object.assign(ev, props);
      }, t('movedWeekly'), [{
        label: t('onlyThisWeek'),
        run: () => {
          rollbackSilently();
          mutate(() => {
            const w = week(key, true);
            const ev = state.recurring.find((x) => x.id === d.ev.id);
            if (!ev) return;
            if (!w.skipped.includes(ev.id)) w.skipped.push(ev.id);
            w.added.push(Object.assign(plain(ev), { id: uid() }, props));
          }, t('changedThisWeek'));
        }
      }]);
    } else {
      mutate(() => {
        const ev = week(key, true).added.find((x) => x.id === d.ev.id);
        if (ev) Object.assign(ev, props);
      }, t('moved'));
    }
  }

  gridEl.addEventListener('keydown', (e) => {
    const evEl = e.target.closest('.ev');
    if (!evEl || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    openEdit(evEl.dataset.id, evEl.dataset.rec === '1');
  });

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
  const goWeek = (n) => { weekOffset = n === 0 ? 0 : weekOffset + n; renderAll(); };
  $('#prevWeek').addEventListener('click', () => goWeek(-1));
  $('#nextWeek').addEventListener('click', () => goWeek(1));
  $('#thisWeek').addEventListener('click', () => goWeek(0));
  $('#tabEdit').addEventListener('click', () => setView('edit'));
  $('#tabPrint').addEventListener('click', () => setView('print'));

  function newFromButton() {
    const now = new Date();
    const day = weekOffset === 0 ? (now.getDay() + 6) % 7 : 0;
    const s = weekOffset === 0 ? clamp(now.getHours() + 1, 7, 22) * 60 : 9 * 60;
    openNew(day, s, s + 60);
  }
  $('#newBtn').addEventListener('click', newFromButton);

  $('#title').addEventListener('input', (e) => {
    state.title = e.target.value;
    persist();
    document.title = `${titleText()} | ${rangeLabel(curMonday(), false)}`;
    if (currentView === 'print') renderPrint();
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
    catLabel: (c) => t('cats.' + c)
  };

  LO.view('schedule', {
    render: renderAll,
    undo,
    keys,
    setMode: setView,
    onShow() { if (currentView === 'print') requestAnimationFrame(fitPreview); }
  });

  setInterval(() => { if (!drag && currentView === 'edit' && LO.route() === 'schedule') renderGrid(); }, 60 * 1000);
})();
