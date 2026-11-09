/*
 * Search everything (⌘K / Ctrl+K, or the magnifier in the header): to-dos,
 * dailies, habits, the schedule, the semester, goals, wishes, books, courses,
 * links, the growth log, clothes and food.
 * Picking a result opens it, or the page it lives on.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc } = LO;

  LO.strings('search', {
    zh: {
      title: '搜索', ph: '搜索待办、课程、书、旅行、衣服…', empty: '没有找到', hint: '↑↓ 选择，回车打开，Esc 关闭',
      kinds: { todo: '待办', daily: '每日任务', habit: '习惯', event: '课表', course: '学期课程', item: '作业/考试', goal: '年度目标', wish: '心愿', book: '书', lcourse: '学习课程', link: '收藏', record: '成长记录', cloth: '衣橱', food: '吃什么', birthday: '生日纪念日' }
    },
    en: {
      title: 'Search', ph: 'Search to-dos, courses, books, clothes…', empty: 'Nothing found', hint: '↑↓ to choose, Enter to open, Esc to close',
      kinds: { todo: 'To-do', daily: 'Daily', habit: 'Habit', event: 'Schedule', course: 'Course', item: 'Assignment', goal: 'Goal', wish: 'Wish', book: 'Book', lcourse: 'Learning', link: 'Saved link', record: 'Growth log', cloth: 'Wardrobe', food: 'Food', birthday: 'Birthday' }
    }
  });
  const t = LO.ns('search');

  const st = (name) => (LO.store(name) ? LO.store(name).s : null);
  const go = (page) => () => LO.go(page);

  // Every searchable thing as { kind, text, sub, open }
  function entries() {
    const out = [];
    const add = (kind, text, sub, open) => { if (text) out.push({ kind, text: String(text), sub: sub ? String(sub) : '', open }); };
    const tk = st('tasks');
    if (tk) {
      tk.todos.forEach((x) => add('todo', x.title, [x.notes, x.due && LO.shortDate(x.due), x.done && LO.t('common.done')].filter(Boolean).join(' · '), () => LO.tasks.openEditor('todo', x.id)));
      tk.dailies.forEach((x) => add('daily', x.title, x.notes, () => LO.tasks.openEditor('daily', x.id)));
      tk.habits.forEach((x) => add('habit', x.title, x.notes, () => LO.tasks.openEditor('habit', x.id)));
    }
    if (LO.planner) {
      const seen = new Set();
      LO.planner.raw().recurring.forEach((e) => {
        const k = `${e.title}|${e.place}`;
        if (seen.has(k)) return;
        seen.add(k);
        add('event', e.title, [e.place, e.note].filter(Boolean).join(' · '), go('schedule'));
      });
    }
    (LO.term ? LO.term.all() : []).forEach((tm) => tm.courses.forEach((c) => {
      add('course', c.name, tm.name, go('term'));
      c.items.forEach((i) => add('item', i.title, `${c.name}${i.date ? ' · ' + LO.shortDate(i.date) : ''}`, go('term')));
    }));
    const pl = st('plan');
    if (pl) Object.entries(pl.years).forEach(([y, yr]) => (yr.goals || []).forEach((g) => add('goal', g.title, y, go('plan'))));
    const wi = st('wishes');
    if (wi) wi.wishes.forEach((w) => add('wish', w.title, '', go('wishes')));
    const le = st('learn');
    if (le) {
      le.books.forEach((b) => add('book', b.title, [b.author, b.notes].filter(Boolean).join(' · '), go('learn')));
      le.courses.forEach((c) => add('lcourse', c.title, c.platform, go('learn')));
      le.links.forEach((l) => add('link', l.title, [l.topic, l.note].filter(Boolean).join(' · '), go('learn')));
    }
    const rc = st('records');
    if (rc) rc.records.forEach((r) => add('record', r.title, [r.date && LO.shortDate(r.date), r.note].filter(Boolean).join(' · '), go('records')));
    const wd = st('wardrobe');
    if (wd) wd.items.forEach((x) => add('cloth', x.name, [x.color, (x.tags || []).join(' '), x.note].filter(Boolean).join(' · '), go('wardrobe')));
    const fd = st('food');
    if (fd) fd.options.forEach((o) => add('food', o.name, o.places.join('、'), go('food')));
    const bd = st('dates');
    if (bd) bd.list.forEach((x) => add('birthday', x.name, x.note, go('dates')));
    return out;
  }

  // every word has to appear somewhere; title matches rank first
  function find(q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return entries().map((e) => {
      const a = e.text.toLowerCase();
      const b = e.sub.toLowerCase();
      if (!words.every((w) => a.includes(w) || b.includes(w))) return null;
      const score = (a.startsWith(words[0]) ? 0 : 1) + (words.every((w) => a.includes(w)) ? 0 : 2);
      return Object.assign({ score }, e);
    }).filter(Boolean).sort((x, y) => x.score - y.score).slice(0, 30);
  }

  let dlg = null;
  let results = [];
  let sel = 0;
  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'search-dlg';
    dlg.setAttribute('aria-label', t('title'));
    dlg.innerHTML = `<div class="search-box"><input class="input" type="search" autocomplete="off" data-sq><ul class="search-list" role="listbox"></ul><p class="hint search-hint"></p></div>`;
    document.body.appendChild(dlg);
    const input = $('[data-sq]', dlg);
    input.addEventListener('input', () => { sel = 0; paint(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, results.length - 1); paint(true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); paint(true); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
    });
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) { dlg.close(); return; }
      const li = e.target.closest('[data-si]');
      if (li) pick(+li.dataset.si);
    });
  }
  function paint(keepList) {
    const q = $('[data-sq]', dlg).value.trim();
    const list = $('.search-list', dlg);
    if (!keepList) results = find(q);
    list.innerHTML = results.map((r, i) => `<li role="option" data-si="${i}" aria-selected="${i === sel}"><span class="search-kind">${esc(t('kinds')[r.kind])}</span><b>${esc(r.text)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</li>`).join('')
      + (q && !results.length ? `<li class="search-none">${esc(t('empty'))}</li>` : '');
    const on = $('[aria-selected="true"]', list);
    if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function pick(i) {
    const r = results[i];
    if (!r) return;
    dlg.close();
    r.open();
  }
  function open() {
    if (!dlg) build();
    if ($$open()) return;
    const input = $('[data-sq]', dlg);
    input.placeholder = t('ph');
    $('.search-hint', dlg).textContent = t('hint');
    input.value = '';
    results = [];
    paint(true);
    dlg.showModal();
    input.focus();
  }
  const $$open = () => Array.from(document.querySelectorAll('dialog')).some((d) => d.open);

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); return; }
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); open(); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    const b = $('#searchBtn');
    if (b) b.addEventListener('click', open);
  });

  LO.search = { open, find };
})();
