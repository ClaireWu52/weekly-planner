/*
 * Core: shared helpers, settings, i18n, data stores with undo,
 * page router, toast, form dialog and backup.
 * Every other module talks to the app through window.LO.
 */
(() => {
  'use strict';
  const LO = (window.LO = {});

  /* ---------------- small helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  LO.$ = $;
  LO.$$ = $$;
  LO.uid = () => Math.random().toString(36).slice(2, 10);
  LO.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  LO.seq = (n) => Array.from({ length: n }, (_, i) => i);
  LO.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  LO.round1 = (n) => Math.round(n * 10) / 10;
  LO.isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  /* ---------------- dates (local time, keys are YYYY-MM-DD) ---------------- */
  const pad = (n) => String(n).padStart(2, '0');
  LO.keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  LO.parseKey = (k) => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  LO.addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  LO.todayKey = () => LO.keyOf(new Date());
  LO.wd = (d) => (d.getDay() + 6) % 7; // Monday = 0
  LO.mondayOf = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - LO.wd(x)); return x; };
  LO.dayDiff = (a, b) => {
    const [y1, m1, d1] = a.split('-').map(Number);
    const [y2, m2, d2] = b.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
  };
  LO.shortDate = (k) => { const d = LO.parseKey(k); return `${d.getMonth() + 1}/${d.getDate()}`; };
  LO.toMin = (s) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  LO.fmtMin = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

  /* ---------------- settings ---------------- */
  const SETTINGS_KEY = 'planner:settings';
  const readJSON = (key) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (_) { return null; } };
  LO.readJSON = readJSON;
  let settings = readJSON(SETTINGS_KEY);
  if (!settings || !['zh', 'en'].includes(settings.lang)) {
    const legacy = readJSON('weekly-planner:v2') || {};
    settings = {
      lang: ['zh', 'en'].includes(legacy.lang) ? legacy.lang : ((navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'),
      theme: ['auto', 'light', 'dark'].includes(legacy.theme) ? legacy.theme : 'auto'
    };
  }
  // Health used to be a single page; if it was hidden, hide all three of its tabs.
  if (!settings.healthTabs) {
    if (Array.isArray(settings.hidden) && settings.hidden.includes('health')) settings.hidden.push('rest', 'calm');
    settings.healthTabs = true;
  }
  // first day on this browser, for the backup reminder
  if (!settings.since) settings.since = LO.todayKey();
  const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) { /* ignore */ } };
  saveSettings();
  LO.lang = () => settings.lang;
  LO.saveSettings = () => saveSettings();
  LO.settings = () => settings;
  function applyTheme() {
    if (settings.theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', settings.theme);
  }
  applyTheme();

  /* ---------------- i18n ---------------- */
  const DICT = { zh: {}, en: {} };
  LO.strings = (ns, obj) => { DICT.zh[ns] = obj.zh; DICT.en[ns] = obj.en; };
  LO.t = (path) => {
    const v = path.split('.').reduce((o, k) => (o == null ? o : o[k]), DICT[settings.lang]);
    return v == null ? path : v;
  };
  LO.ns = (ns) => (p) => LO.t(`${ns}.${p}`);
  LO.applyI18n = () => {
    document.documentElement.lang = settings.lang === 'zh' ? 'zh-CN' : 'en';
    $$('[data-i18n]').forEach((el) => { el.textContent = LO.t(el.dataset.i18n); });
    $$('[data-i18n-ph]').forEach((el) => { el.placeholder = LO.t(el.dataset.i18nPh); });
    $$('[data-i18n-aria]').forEach((el) => {
      const v = LO.t(el.dataset.i18nAria);
      el.setAttribute('aria-label', v);
      el.title = v;
    });
    const k = $('#undoKbd');
    if (k) k.textContent = LO.isMac ? '⌘Z' : 'Ctrl+Z';
    const tv = $('#themeVal');
    if (tv) tv.textContent = LO.t('app.themeNames')[settings.theme];
    const sv = $('#syncVal');
    if (sv && LO.sync) sv.textContent = LO.sync.label();
    $$('[data-setlang]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.setlang === settings.lang)));
  };

  LO.strings('common', {
    zh: {
      save: '保存', cancel: '取消', delete: '删除', confirmDelete: '确认删除', add: '添加', edit: '编辑',
      undo: '撤销', undone: '已撤销', nothingToUndo: '没有可以撤销的操作', saveFailed: '浏览器存储已满，修改没有保存',
      added: '已添加', saved: '已保存', deleted: '已删除', done: '完成',
      today: '今天', tomorrow: '明天', yesterday: '昨天', overdue: '已逾期',
      days: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      daysShort: ['一', '二', '三', '四', '五', '六', '日'],
      weekdaysLong: ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'],
      min: '分钟', hours: '小时', cups: '杯', times: '次',
      cats: { study: '学习', work: '工作', club: '社团', health: '健康', life: '生活', other: '其他' },
      title: '名称', notes: '备注', category: '分类', notesPh: '可不填'
    },
    en: {
      save: 'Save', cancel: 'Cancel', delete: 'Delete', confirmDelete: 'Confirm delete', add: 'Add', edit: 'Edit',
      undo: 'Undo', undone: 'Undone', nothingToUndo: 'Nothing to undo', saveFailed: 'Browser storage is full; changes were not saved',
      added: 'Added', saved: 'Saved', deleted: 'Deleted', done: 'Done',
      today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday', overdue: 'Overdue',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      daysShort: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      weekdaysLong: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      min: 'min', hours: 'h', cups: 'cups', times: 'times',
      cats: { study: 'Study', work: 'Work', club: 'Club', health: 'Health', life: 'Life', other: 'Other' },
      title: 'Name', notes: 'Notes', category: 'Category', notesPh: 'Optional'
    }
  });
  LO.strings('app', {
    zh: {
      brand: '我的计划本',
      nav: { today: '今天', tasks: '任务', schedule: '课表', health: '健康', growth: '成长', life: '生活' },
      sub: { today: '今日概览', news: '今日新闻', health: '运动', rest: '作息', calm: '放松', plan: '年度目标', term: '学期', wishes: '心愿清单', learn: '学习清单', records: '成长记录', review: '每周回顾', food: '吃什么', money: '记账', dates: '纪念日', wardrobe: '电子衣橱', travel: '旅游攻略' },
      customize: '自定义页面', custHint: '取消勾选的页面会从导航里隐藏，数据不会删除，随时可以再打开。今日概览不能隐藏。', custToday: '今日概览里的卡片', custSaved: '导航已更新',
      sync: '同步设置', calendar: '导出到日历', calendarImport: '从日历导入课表', install: '装到手机桌面', installTitle: '装到手机桌面', ok: '知道了',
      installHow: ['iPhone：用 Safari 打开网站，点底部的“分享”按钮，选“添加到主屏幕”。', 'Android：用 Chrome 打开网站，点右上角的 ⋮，选“安装应用”或“添加到主屏幕”。', '电脑：用 Chrome 或 Edge 打开网站，点地址栏右侧的安装图标。', '装好之后，从桌面图标打开就像一个 App，没网时也能看已有的内容。'],
      more: '更多选项', search: '搜索（⌘K）', undo: '撤销', exportData: '导出全部数据', importData: '导入备份',
      backupTitle: (n) => `已经 ${n} 天没有备份了`, backupText: '数据只存在这个浏览器里。导出一份备份，或者开启同步，换手机或浏览器清理数据时就不会丢。',
      backupLater: '稍后', backupSync: '开启同步', backupExport: '导出备份', resetSchedule: '清空课表',
      theme: '外观', themeNames: { auto: '跟随系统', light: '浅色', dark: '深色' }, langSwitch: 'English', shortcuts: '快捷键',
      shortcutsText: '数字键切换页面　⌘/Ctrl+K 或 / 搜索　⌘/Ctrl+Z 撤销　课表页：N 新建　← → 切换周　T 本周　P 打印',
      imported: '备份已导入', importFailed: '这个文件不是有效的备份'
    },
    en: {
      brand: 'My Planner',
      nav: { today: 'Today', tasks: 'Tasks', schedule: 'Schedule', health: 'Health', growth: 'Growth', life: 'Life' },
      sub: { today: 'Overview', news: 'News', health: 'Exercise', rest: 'Daily rhythm', calm: 'Unwind', plan: 'Yearly goals', term: 'Semester', wishes: 'Wishes', learn: 'Learning', records: 'Growth log', review: 'Weekly review', food: 'What to eat', money: 'Spending', dates: 'Special days', wardrobe: 'Wardrobe', travel: 'Travel' },
      customize: 'Customize pages', custHint: 'Unchecked pages are hidden from the navigation. Nothing is deleted, and you can turn them back on anytime. Overview cannot be hidden.', custToday: 'Cards on Overview', custSaved: 'Navigation updated',
      sync: 'Sync settings', calendar: 'Export to calendar', calendarImport: 'Import from a calendar', install: 'Install on phone', installTitle: 'Install on your phone', ok: 'Got it',
      installHow: ['iPhone: open the site in Safari, tap Share at the bottom, then "Add to Home Screen".', 'Android: open the site in Chrome, tap ⋮ at the top right, then "Install app" or "Add to Home screen".', 'Computer: open the site in Chrome or Edge and click the install icon on the right of the address bar.', 'Once installed, it opens from the icon like an app and still shows your data offline.'],
      more: 'More options', search: 'Search (⌘K)', undo: 'Undo', exportData: 'Export all data', importData: 'Import backup',
      backupTitle: (n) => `No backup for ${n} days`, backupText: 'Your data lives only in this browser. Export a backup or turn on sync so it survives a new phone or a cleared browser.',
      backupLater: 'Later', backupSync: 'Turn on sync', backupExport: 'Export backup', resetSchedule: 'Clear schedule',
      theme: 'Appearance', themeNames: { auto: 'System', light: 'Light', dark: 'Dark' }, langSwitch: '中文', shortcuts: 'Keyboard shortcuts',
      shortcutsText: 'Number keys switch pages   ⌘/Ctrl+K or / search   ⌘/Ctrl+Z undo   Schedule: N new   ← → week   T this week   P print',
      imported: 'Backup imported', importFailed: "This file isn't a valid backup"
    }
  });
  const tc = LO.ns('common');

  /* ---------------- date labels ---------------- */
  LO.dueInfo = (key) => {
    if (!key) return null;
    const diff = LO.dayDiff(LO.todayKey(), key);
    if (diff < 0) return { text: `${tc('overdue')} ${LO.shortDate(key)}`, cls: 'is-overdue', diff };
    if (diff === 0) return { text: tc('today'), cls: 'is-today', diff };
    if (diff === 1) return { text: tc('tomorrow'), cls: 'is-soon', diff };
    const d = LO.parseKey(key);
    return { text: `${LO.shortDate(key)} ${tc('days')[LO.wd(d)]}`, cls: diff <= 3 ? 'is-soon' : '', diff };
  };

  /* ---------------- file store (IndexedDB, for photos) ---------------- */
  let dbPromise = null;
  function idb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) { reject(new Error('no indexedDB')); return; }
        const req = indexedDB.open('planner-files', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('files');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }
  const tx = (mode, fn) => idb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction('files', mode);
    const out = fn(t.objectStore('files'));
    t.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
    t.onerror = () => reject(t.error);
  }));
  LO.files = {
    put: (key, val) => tx('readwrite', (st) => { st.put(val, key); }),
    get: (key) => tx('readonly', (st) => st.get(key)),
    del: (key) => tx('readwrite', (st) => { st.delete(key); }),
    async all() {
      const db = await idb();
      return new Promise((resolve, reject) => {
        const out = {};
        const req = db.transaction('files', 'readonly').objectStore('files').openCursor();
        req.onsuccess = () => {
          const cur = req.result;
          if (cur) { out[cur.key] = cur.value; cur.continue(); } else resolve(out);
        };
        req.onerror = () => reject(req.error);
      });
    }
  };

  /* ---------------- stores with shared undo ---------------- */
  const stores = {};
  LO.frozen = false;
  LO.createStore = (name, key, defaults, normalize) => {
    let state;
    try { state = normalize(readJSON(key) || defaults()); } catch (_) { state = normalize(defaults()); }
    let timer = null;
    let dirty = false;
    const store = {
      name,
      key,
      get s() { return state; },
      replace(next) { state = normalize(next); store.save(); },
      save() { dirty = true; clearTimeout(timer); timer = setTimeout(store.saveNow, 250); },
      saveNow() {
        clearTimeout(timer);
        if (LO.frozen) return;
        try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) { LO.toast(tc('saveFailed')); return; }
        if (dirty) { dirty = false; if (LO.onChange) LO.onChange(name); }
      },
      snapshot: () => JSON.stringify(state),
      restore(json) { state = JSON.parse(json); store.save(); }
    };
    stores[name] = store;
    store.saveNow();
    return store;
  };
  LO.store = (name) => stores[name];
  LO.storeList = () => Object.values(stores).map((x) => ({ name: x.name, key: x.key }));
  window.addEventListener('pagehide', () => Object.values(stores).forEach((s) => s.saveNow()));

  // Ask the browser not to clear this site's data when space runs low. Asked the
  // first time something is saved, since Firefox shows a question for it.
  let keepAsked = false;
  function keepData() {
    if (keepAsked) return;
    keepAsked = true;
    const st = navigator.storage;
    if (st && st.persist) st.persisted().then((on) => on || st.persist()).catch(() => {});
  }

  const undoStack = [];
  LO.mutate = (store, fn, msg, extraActions) => {
    undoStack.push({ store, json: store.snapshot() });
    if (undoStack.length > 100) undoStack.shift();
    fn(store.s);
    store.save();
    keepData();
    LO.refresh();
    if (msg) LO.toast(msg, [{ label: tc('undo'), run: LO.undo }].concat(extraActions || []));
  };
  LO.undo = () => {
    const top = undoStack.pop();
    if (!top) { LO.toast(tc('nothingToUndo')); return; }
    top.store.restore(top.json);
    LO.refresh();
    LO.toast(tc('undone'));
  };

  /* ---------------- router ---------------- */
  // Top-level pages in the nav. "growth" holds the long-term pages (goals, semester,
  // wishes, learning, growth log, weekly review); old #/goals links still land there.
  const NAV = ['today', 'tasks', 'schedule', 'health', 'growth', 'life'];
  const GROUPS = { today: ['today', 'news'], health: ['health', 'rest', 'calm'], growth: ['plan', 'term', 'wishes', 'learn', 'records', 'review'], life: ['food', 'money', 'dates', 'wardrobe', 'travel'] };
  const PARENT = { news: 'today', rest: 'health', calm: 'health', plan: 'growth', term: 'growth', wishes: 'growth', learn: 'growth', records: 'growth', review: 'growth', food: 'life', money: 'life', dates: 'life', wardrobe: 'life', travel: 'life' };
  const hiddenList = () => (Array.isArray(settings.hidden) ? settings.hidden : []);
  const visibleSubs = (top) => GROUPS[top].filter((x) => x === 'today' || !hiddenList().includes(x));
  const topVisible = (top) => (GROUPS[top] ? visibleSubs(top).length > 0 : !hiddenList().includes(top));
  const visibleNav = () => NAV.filter(topVisible);
  // whether a page is switched on under ⋯ → Customize pages
  LO.pageShown = (leaf) => (PARENT[leaf] ? visibleSubs(PARENT[leaf]).includes(leaf) : topVisible(leaf));
  const lastSub = { today: 'today', health: 'health', growth: 'plan', life: 'food' };
  const views = {};
  let current = null;
  LO.view = (name, def) => { views[name] = def; };
  LO.route = () => current;
  LO.go = (name) => { window.location.hash = PARENT[name] ? `#/${PARENT[name]}/${name}` : `#/${name}`; };
  LO.refresh = () => {
    LO.applyI18n();
    if (current && views[current]) views[current].render();
  };
  function parseHash() {
    const h = window.location.hash.replace(/^#\/?/, '');
    if (h === 'print') return { top: 'schedule', leaf: 'schedule', print: true };
    const parts = h.split('/');
    const a = parts[0] === 'goals' ? 'growth' : parts[0];
    const b = parts[1];
    let r;
    if (GROUPS[a]) r = { top: a, leaf: GROUPS[a].includes(b) ? b : (a === 'today' ? 'today' : lastSub[a]) };
    else if (PARENT[a]) r = { top: PARENT[a], leaf: a };
    else { const top = NAV.includes(a) ? a : 'today'; r = { top, leaf: top, print: h === 'schedule/print' }; }
    if (!topVisible(r.top)) return { top: 'today', leaf: 'today' };
    if (GROUPS[r.top] && !visibleSubs(r.top).includes(r.leaf)) r.leaf = visibleSubs(r.top)[0];
    return r;
  }
  function renderSubnav(top, leaf) {
    const el = $('#subnav');
    if (!el) return;
    const subs = GROUPS[top] ? visibleSubs(top) : null;
    el.hidden = !subs || subs.length < 2;
    if (!subs || subs.length < 2) { el.innerHTML = ''; return; }
    el.innerHTML = subs.map((s) => `<a href="#/${top}/${s}"${s === leaf ? ' aria-current="page"' : ''}>${LO.esc(LO.t('app.sub.' + s))}</a>`).join('');
    // On narrow screens the tabs scroll sideways; keep the current one in view.
    const cur = $('[aria-current]', el);
    if (cur) el.scrollLeft = Math.max(0, cur.offsetLeft - el.offsetLeft - 16);
  }
  function show() {
    const { top, leaf, print } = parseHash();
    const changed = leaf !== current;
    current = leaf;
    if (GROUPS[top]) lastSub[top] = leaf;
    document.body.dataset.route = leaf;
    $$('.app-view').forEach((el) => { el.hidden = el.id !== `view-${leaf}`; });
    $$('[data-nav]').forEach((a) => {
      a.hidden = !topVisible(a.dataset.nav);
      if (a.dataset.nav === top) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const navEl = $('.app-nav');
    if (navEl) navEl.style.setProperty('--navn', visibleNav().length);
    renderSubnav(top, leaf);
    closeMenu();
    LO.applyI18n();
    document.title = `${LO.t(GROUPS[top] ? 'app.sub.' + leaf : 'app.nav.' + top)} | ${LO.t('app.brand')}`;
    const v = views[leaf];
    if (v) {
      if (print && v.setMode) v.setMode('print');
      else v.render();
      if (v.onShow) v.onShow();
    }
    if (changed) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', show);

  /* ---------------- toast ---------------- */
  let toastTimer = null;
  LO.toast = (msg, actions, ms) => {
    const el = $('#toast');
    if (!el) return;
    el.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);
    (actions || []).forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = a.label;
      b.addEventListener('click', () => { el.classList.remove('show'); a.run(); });
      el.appendChild(b);
    });
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms || ((actions || []).length ? 6000 : 2400));
  };

  /* ---------------- icons ---------------- */
  LO.icon = {
    check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6l1.95 3.95 4.35.63-3.15 3.07.74 4.33L8 11.53l-3.89 2.05.74-4.33L1.7 6.18l4.35-.63z" fill="currentColor"/></svg>',
    plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    minus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    x: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    edit: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 3l2.5 2.5L6 12.5 3 13l.5-3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'
  };

  /* ---------------- small UI builders ---------------- */
  LO.chips = (name, items, type, checked) => items.map(([v, label, cls]) =>
    `<label class="chip${cls ? ' ' + cls : ''}"><input type="${type}" name="${name}" value="${LO.esc(v)}"${checked.map(String).includes(String(v)) ? ' checked' : ''}><span>${label}</span></label>`
  ).join('');
  LO.checkedVals = (root, name) => $$(`input[name="${name}"]:checked`, root).map((i) => i.value);
  LO.checkedVal = (root, name) => { const el = $(`input[name="${name}"]:checked`, root); return el ? el.value : null; };

  LO.ring = (pct, size, label) => {
    const r = 16;
    const c = 2 * Math.PI * r;
    const p = LO.clamp(pct, 0, 1);
    return `<span class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 40 40" aria-hidden="true">`
      + `<circle cx="20" cy="20" r="${r}" class="ring-bg"/>`
      + `<circle cx="20" cy="20" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/></svg>`
      + `${label != null ? `<b>${label}</b>` : ''}</span>`;
  };

  LO.bars = (values, opts) => {
    // values: [{v, label, cls}] -> simple column chart
    const o = Object.assign({ height: 90, goal: null, unit: '' }, opts || {});
    const max = Math.max(o.goal || 0, ...values.map((x) => x.v), 1);
    let h = `<div class="bars" style="height:${o.height}px">`;
    if (o.goal) h += `<i class="bars-goal" style="bottom:${o.goal / max * 100}%"></i>`;
    values.forEach((x) => {
      h += `<span class="bar-col${x.cls ? ' ' + x.cls : ''}" title="${LO.esc(x.title || '')}"><span class="bar-fill" style="height:${x.v / max * 100}%"></span></span>`;
    });
    h += '</div><div class="bars-axis">';
    values.forEach((x) => { h += `<span>${x.label || ''}</span>`; });
    return `${h}</div>`;
  };

  /* ---------------- generic form dialog ---------------- */
  let fctx = null;
  LO.openForm = (opts) => {
    const dlg = $('#formDlg');
    fctx = opts;
    $('#formTitle').textContent = opts.title;
    const badge = $('#formBadge');
    badge.hidden = !opts.badge;
    badge.textContent = opts.badge || '';
    $('#formBody').innerHTML = opts.body;
    $('#formErr').textContent = '';
    const del = $('#formDel');
    del.hidden = !opts.onDelete;
    del.textContent = opts.deleteLabel || tc('delete');
    del.dataset.armed = '';
    $('#formSave').textContent = opts.saveLabel || tc('save');
    if (!dlg.open) dlg.showModal();
    if (opts.onOpen) opts.onOpen(dlg);
    setTimeout(() => {
      const f = $('[autofocus]', dlg) || $('input:not([type=hidden]),textarea', dlg);
      if (f) f.focus();
    }, 0);
  };
  LO.closeForm = () => { const d = $('#formDlg'); if (d.open) d.close(); };

  function wireFormDialog() {
    const dlg = $('#formDlg');
    $('#formForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!fctx) return;
      const r = fctx.onSave(dlg);
      if (typeof r === 'string') $('#formErr').textContent = r;
      else if (r !== false) dlg.close();
    });
    $('#formCancel').addEventListener('click', () => dlg.close());
    $('#formDel').addEventListener('click', (e) => {
      const b = e.currentTarget;
      if (!fctx || !fctx.onDelete) return;
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = fctx.confirmDeleteLabel || tc('confirmDelete'); return; }
      const fn = fctx.onDelete;
      dlg.close();
      fn();
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => { fctx = null; });
  }

  /* ---------------- menu, backup, keyboard ---------------- */
  function closeMenu() {
    const m = $('#menu');
    if (m) m.hidden = true;
    const b = $('#moreBtn');
    if (b) b.setAttribute('aria-expanded', 'false');
  }

  function openCustomize() {
    const hidden = hiddenList();
    let body = `<p class="hint">${LO.esc(LO.t('app.custHint'))}</p><div class="cust-list">`;
    NAV.forEach((top) => {
      const leaves = GROUPS[top] || [top];
      body += `<div class="cust-group"><b>${LO.esc(LO.t('app.nav.' + top))}</b><div class="chips">`
        + leaves.map((leaf) => {
          const label = GROUPS[top] ? LO.t('app.sub.' + leaf) : LO.t('app.nav.' + top);
          const locked = leaf === 'today';
          return `<label class="check"><input type="checkbox" name="pageon" value="${leaf}"${hidden.includes(leaf) ? '' : ' checked'}${locked ? ' disabled' : ''}>${LO.esc(label)}</label>`;
        }).join('') + '</div></div>';
    });
    if (LO.todayCards) {
      const off = Array.isArray(settings.todayHidden) ? settings.todayHidden : [];
      body += `<div class="cust-group"><b>${LO.esc(LO.t('app.custToday'))}</b><div class="chips">`
        + LO.todayCards().map((c) => `<label class="check"><input type="checkbox" name="cardon" value="${c.id}"${off.includes(c.id) ? '' : ' checked'}>${LO.esc(c.label)}</label>`).join('')
        + '</div></div>';
    }
    body += '</div>';
    LO.openForm({
      title: LO.t('app.customize'),
      body,
      onSave(dlg) {
        const on = LO.checkedVals(dlg, 'pageon');
        const cardsOn = LO.checkedVals(dlg, 'cardon');
        settings.todayHidden = $$('input[name="cardon"]', dlg).map((i) => i.value).filter((v) => !cardsOn.includes(v));
        settings.hidden = $$('input[name="pageon"]', dlg).map((i) => i.value).filter((v) => v !== 'today' && !on.includes(v));
        saveSettings();
        show();
        LO.toast(LO.t('app.custSaved'));
        return true;
      }
    });
  }

  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
  function openInstall() {
    if (installPrompt) { installPrompt.prompt(); installPrompt = null; return; }
    LO.openForm({
      title: LO.t('app.installTitle'),
      body: `<ol class="install-steps">${LO.t('app.installHow').map((x) => `<li>${LO.esc(x)}</li>`).join('')}</ol>`,
      saveLabel: LO.t('app.ok'),
      onSave: () => true
    });
  }

  function currentUndo() {
    const v = views[current];
    return v && v.undo ? v.undo : LO.undo;
  }

  async function exportAll() {
    Object.values(stores).forEach((s) => s.saveNow());
    if (LO.planner && LO.planner.flush) LO.planner.flush();
    let files = {};
    try { files = await LO.files.all(); } catch (_) { files = {}; }
    const data = {
      files,
      app: 'weekly-planner', v: 3, exportedAt: new Date().toISOString(), settings,
      planner: readJSON('weekly-planner:v2'),
      stores: Object.fromEntries(Object.values(stores).map((s) => [s.name, s.s]))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `planner-backup-${LO.todayKey()}.json`;
    settings.lastExport = LO.todayKey();
    saveSettings();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  // Without sync, a reminder on Today to export a backup every 30 days; "later" waits a week.
  LO.backup = {
    nudgeHTML() {
      if (!LO.sync || LO.sync.on()) return '';
      const today = LO.todayKey();
      const n = LO.dayDiff(settings.lastExport || settings.since || today, today);
      if (n < 30 || (settings.backupLater && LO.dayDiff(settings.backupLater, today) < 7)) return '';
      const say = (k) => LO.esc(LO.t(`app.${k}`));
      return `<section class="card review-nudge"><div><b>${LO.esc(LO.t('app.backupTitle')(n))}</b><p>${say('backupText')}</p></div>`
        + `<button type="button" class="btn ghost" data-backup="later">${say('backupLater')}</button>`
        + `<button type="button" class="btn ghost" data-backup="sync">${say('backupSync')}</button>`
        + `<button type="button" class="btn primary" data-backup="export">${say('backupExport')}</button></section>`;
    },
    act(a) {
      if (a === 'export') exportAll().then(() => LO.refresh());
      else if (a === 'sync') LO.sync.open();
      else { settings.backupLater = LO.todayKey(); saveSettings(); LO.refresh(); }
    }
  };

  async function importFile(file) {
    try {
      const obj = JSON.parse(await file.text());
      if (obj && obj.app === 'weekly-planner' && obj.v === 3) {
        LO.frozen = true;
        if (obj.planner) localStorage.setItem('weekly-planner:v2', JSON.stringify(obj.planner));
        Object.entries(obj.stores || {}).forEach(([name, data]) => {
          if (stores[name]) localStorage.setItem(stores[name].key, JSON.stringify(data));
        });
        if (obj.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj.settings));
        if (obj.files && typeof obj.files === 'object') {
          for (const [k, v] of Object.entries(obj.files)) {
            if (typeof v === 'string' && v.startsWith('data:image/')) await LO.files.put(k, v);
          }
        }
      } else if (obj && obj.v === 2 && Array.isArray(obj.recurring)) {
        LO.frozen = true;
        localStorage.setItem('weekly-planner:v2', JSON.stringify(obj));
      } else {
        throw new Error('bad');
      }
      if (LO.sync && LO.sync.touchAll) LO.sync.touchAll();
      sessionStorage.setItem('planner:imported', '1');
      window.location.reload();
    } catch (_) {
      LO.frozen = false;
      LO.toast(LO.t('app.importFailed'));
    }
  }

  function wireShell() {
    $$('[data-setlang]').forEach((b) => b.addEventListener('click', () => {
      if (settings.lang === b.dataset.setlang) return;
      settings.lang = b.dataset.setlang;
      saveSettings();
      LO.refresh();
    }));
    const menu = $('#menu');
    const moreBtn = $('#moreBtn');
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      moreBtn.setAttribute('aria-expanded', String(!menu.hidden));
    });
    document.addEventListener('click', (e) => { if (!menu.hidden && !$('#menuWrap').contains(e.target)) closeMenu(); });
    menu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act !== 'theme') closeMenu();
      if (act === 'undo') currentUndo()();
      else if (act === 'export') exportAll();
      else if (act === 'import') $('#importFile').click();
      else if (act === 'resetSchedule' && LO.planner) LO.planner.reset();
      else if (act === 'lang') {
        settings.lang = settings.lang === 'zh' ? 'en' : 'zh';
        saveSettings();
        LO.refresh();
      } else if (act === 'theme') {
        const order = ['auto', 'light', 'dark'];
        settings.theme = order[(order.indexOf(settings.theme) + 1) % order.length];
        saveSettings();
        applyTheme();
        LO.applyI18n();
      } else if (act === 'keys') {
        LO.toast(LO.t('app.shortcutsText'), [], 7000);
      } else if (act === 'customize') openCustomize();
      else if (act === 'install') openInstall();
      else if (act === 'sync' && LO.sync) LO.sync.open();
      else if (act === 'calendar' && LO.calendar) LO.calendar.open();
      else if (act === 'calendarImport' && LO.calendar) LO.calendar.openImport();
    });
    $('#importFile').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (f) importFile(f);
    });

    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      const anyDialog = $$('dialog').some((d) => d.open);
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z' && !typing && !anyDialog) {
        e.preventDefault();
        currentUndo()();
        return;
      }
      if (typing || anyDialog || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') { closeMenu(); return; }
      if (/^[1-9]$/.test(e.key) && visibleNav()[+e.key - 1]) { window.location.hash = `#/${visibleNav()[+e.key - 1]}`; return; }
      const v = views[current];
      if (v && v.keys) v.keys(e);
    });
  }

  /* ---------------- day rollover ---------------- */
  let lastDay = LO.todayKey();
  setInterval(() => {
    const k = LO.todayKey();
    if (k !== lastDay) { lastDay = k; LO.refresh(); }
  }, 30 * 1000);

  /* ---------------- start ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    wireShell();
    wireFormDialog();
    show();
    if ('serviceWorker' in navigator && window.isSecureContext && window.location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    if (LO.sync && LO.sync.start) LO.sync.start();
    if (sessionStorage.getItem('planner:imported')) {
      sessionStorage.removeItem('planner:imported');
      LO.toast(LO.t('app.imported'));
    }
  });
})();
