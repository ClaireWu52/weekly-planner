/*
 * First-run guide on Today: three steps to get going (language, the class
 * schedule, a first to-do), plus the semester if there's a Growth page.
 * It shows only while the planner is still empty and goes away for good once
 * dismissed or done.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc } = LO;

  LO.strings('welcome', {
    zh: {
      title: '欢迎！三步开始用', hint: '每一步都可以以后再做，数据都只存在这个浏览器里。', skip: '我自己看看', done: '都好了',
      s1: '选语言', s2: '导入课表', s2how: '从学校系统或 Google 日历导出 .ics 文件导入，或者直接在课表上拖动新建。', s2btn: '从日历导入', s2open: '打开课表',
      s3: '加第一个待办', s3ph: '比如：周五交作业', s4: '设置学期（可选）', s4how: '填上开学和期末，会显示第几周、离期末几天，还能算 GPA。', s4btn: '设置学期'
    },
    en: {
      title: 'Welcome! Three steps to start', hint: 'Any step can wait. Everything stays in this browser.', skip: "I'll look around", done: 'All set',
      s1: 'Pick a language', s2: 'Bring in your classes', s2how: "Import an .ics file from your school's system or Google Calendar, or drag on the schedule to add classes.", s2btn: 'Import a calendar', s2open: 'Open schedule',
      s3: 'Add your first to-do', s3ph: 'e.g. essay due fri', s4: 'Set up the semester (optional)', s4how: 'Add the start and end dates to see the week of term, days to finals and your GPA.', s4btn: 'Set up'
    }
  });
  const t = LO.ns('welcome');

  // still empty: nothing in to-dos, workouts or the growth log
  function fresh() {
    const tk = LO.store('tasks');
    const h = LO.store('health');
    const r = LO.store('records');
    return (!tk || !tk.s.todos.length) && (!h || !h.s.workouts.length) && (!r || !r.s.records.length);
  }

  function html() {
    const st = LO.settings();
    if (st.welcomeDone || !fresh()) return '';
    const seen = st.welcomeSteps || {};
    const step = (n, done, title, body) => `<li class="${done ? 'is-done' : ''}"><span class="wel-n">${done ? LO.icon.check : n}</span><div><b>${esc(title)}</b>${body}</div></li>`;
    const lang = `<div class="row">${['zh', 'en'].map((l) => `<button type="button" class="btn sm${st.lang === l ? ' primary' : ''}" data-setlang="${l}">${l === 'zh' ? '中文' : 'English'}</button>`).join('')}</div>`;
    return `<section class="card welcome"><header class="card-head"><h2>👋 ${esc(t('title'))}</h2><button type="button" class="link link-btn" data-wel="skip">${esc(t('skip'))}</button></header>`
      + `<p class="hint">${esc(t('hint'))}</p><ol class="wel-steps">`
      + step(1, !!seen.lang, t('s1'), lang)
      + step(2, !!seen.schedule, t('s2'), `<p class="hint">${esc(t('s2how'))}</p><div class="row"><button type="button" class="btn sm" data-wel="import">${esc(t('s2btn'))}</button><button type="button" class="btn sm ghost" data-wel="schedule">${esc(t('s2open'))}</button></div>`)
      + step(3, false, t('s3'), `<form class="quick-add" data-weltodo><input maxlength="80" autocomplete="off" placeholder="${esc(t('s3ph'))}" aria-label="${esc(t('s3'))}"><button type="submit" class="icon-btn" aria-label="${esc(LO.t('common.add'))}">${LO.icon.plus}</button></form>`)
      + (LO.pageShown('term') ? step(4, !!seen.term, t('s4'), `<p class="hint">${esc(t('s4how'))}</p><button type="button" class="btn sm" data-wel="term">${esc(t('s4btn'))}</button>`) : '')
      + '</ol></section>';
  }

  const mark = (k) => {
    const st = LO.settings();
    st.welcomeSteps = Object.assign({}, st.welcomeSteps, { [k]: true });
    LO.saveSettings();
  };

  const view = $('#view-today');
  view.addEventListener('click', (e) => {
    const lb = e.target.closest('.welcome [data-setlang]');
    if (lb) { LO.settings().lang = lb.dataset.setlang; mark('lang'); LO.refresh(); return; }
    const b = e.target.closest('[data-wel]');
    if (!b) return;
    const a = b.dataset.wel;
    if (a === 'skip') { LO.settings().welcomeDone = true; LO.saveSettings(); LO.refresh(); }
    else if (a === 'import') { mark('schedule'); LO.calendar.openImport(); }
    else if (a === 'schedule') { mark('schedule'); LO.go('schedule'); }
    else if (a === 'term') { mark('term'); LO.go('term'); }
  });
  view.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-weltodo]');
    if (!f) return;
    e.preventDefault();
    const text = $('input', f).value.trim();
    if (!text) return;
    const p = LO.quickDate(text);
    // the first to-do ends the guide: the planner isn't empty any more
    LO.settings().welcomeDone = true;
    LO.saveSettings();
    LO.tasks.addTodo({ title: p.title, due: p.due || '' });
    LO.toast(LO.t('welcome.done'));
  });

  LO.welcome = { html };
})();
