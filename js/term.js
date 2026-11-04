/*
 * Semester page (Growth → 学期): the term's dates and week count, each course's
 * grade from its assignments and exams, the term GPA, and what's coming up.
 * Grade math is in term-calc.js. Today shows the week of term under the date.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;
  const C = LO.termCalc;
  const KINDS = ['hw', 'quiz', 'exam', 'project', 'other'];

  LO.strings('term', {
    zh: {
      title: '学期', none: '还没有设置学期', noneHint: '填上开始和结束日期，就能看到现在是第几周、离期末还有几天；再加上课程和成绩，会自动算出每门课的成绩和 GPA。',
      setup: '设置学期', newTerm: '新学期', editTerm: '编辑学期', name: '名称', namePh: '比如 2026 秋季', start: '开始日期', end: '结束日期（期末最后一天）',
      errDates: '请填好开始和结束日期，结束不能早于开始。', errName: '请填写名称。',
      week: (n, m) => `第 ${n}/${m} 周`, before: (n) => `${n} 天后开学`, after: '这学期已经结束', left: '距期末', daysN: (n) => `${n} 天`,
      gpa: '学期 GPA', gpaNone: '还没有成绩', gpaCredits: (n) => `${n} 学分有成绩`, courses: '课程',
      upcoming: '接下来的作业和考试', upEmpty: '没有带日期、还没出分的作业或考试。',
      addCourse: '添加课程', fromSchedule: '从课表添加课程', fromNone: '课表里没有还没加进来的「课程」类安排。', fromAdded: (n) => `已添加 ${n} 门课`,
      newCourse: '新课程', editCourse: '编辑课程', cname: '课程名', credits: '学分', target: '目标成绩（%）',
      addItem: '添加作业或考试', newItem: '新的作业或考试', editItem: '编辑', iname: '名称', iPh: '比如 期中考试、作业 3',
      kind: '类型', kinds: { hw: '作业', quiz: '小测', exam: '考试', project: '项目', other: '其他' },
      weight: '占总成绩的比例（%）', weightHint: '可不填。都不填时，每一项按分数一样算。', score: '得分', scorePh: '还没出分就空着', max: '满分', date: '日期',
      noItems: '还没有作业或考试。', notGraded: '还没有成绩', needed: (p) => `剩下的要拿到平均 ${p}% 才能达到目标`, reached: '已经稳稳达到目标了', tooHigh: '剩下的满分也够不到目标了',
      inDays: (n) => (n === 0 ? '今天' : n === 1 ? '明天' : `${n} 天后`), letterHint: '字母成绩按常见的美国标准换算（93 以上 A，90 A-，87 B+…），各校可能不同。',
      deleteTerm: '删除这个学期', delCourse: '删除课程', todayLine: (w, m, d) => `第 ${w}/${m} 周 · 距期末 ${d} 天`
    },
    en: {
      title: 'Semester', none: 'No semester set up yet', noneHint: "Add the start and end dates to see which week of term it is and how long until finals. Add your courses and grades and it works out each course's grade and your GPA.",
      setup: 'Set up a semester', newTerm: 'New semester', editTerm: 'Edit semester', name: 'Name', namePh: 'e.g. Fall 2026', start: 'Start date', end: 'End date (last day of finals)',
      errDates: 'Fill in both dates; the end cannot come before the start.', errName: 'Add a name.',
      week: (n, m) => `Week ${n}/${m}`, before: (n) => `Starts in ${n} days`, after: 'This semester is over', left: 'Until finals end', daysN: (n) => `${n} days`,
      gpa: 'Semester GPA', gpaNone: 'No grades yet', gpaCredits: (n) => `${n} credits graded`, courses: 'Courses',
      upcoming: 'Coming up', upEmpty: 'No dated assignments or exams waiting for a grade.',
      addCourse: 'Add a course', fromSchedule: 'Add courses from the schedule', fromNone: 'No class events on the schedule that are not added yet.', fromAdded: (n) => `Added ${n} courses`,
      newCourse: 'New course', editCourse: 'Edit course', cname: 'Course', credits: 'Credits', target: 'Target grade (%)',
      addItem: 'Add an assignment or exam', newItem: 'New assignment or exam', editItem: 'Edit', iname: 'Name', iPh: 'e.g. Midterm, Homework 3',
      kind: 'Type', kinds: { hw: 'Homework', quiz: 'Quiz', exam: 'Exam', project: 'Project', other: 'Other' },
      weight: 'Share of the final grade (%)', weightHint: 'Optional. If none have one, every item counts the same.', score: 'Score', scorePh: 'Leave empty until graded', max: 'Out of', date: 'Date',
      noItems: 'No assignments or exams yet.', notGraded: 'No grade yet', needed: (p) => `Average ${p}% on the rest to reach your target`, reached: 'Target reached already', tooHigh: 'Even full marks on the rest will not reach the target',
      inDays: (n) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`), letterHint: 'Letters use common US cutoffs (93 A, 90 A-, 87 B+…); your school may differ.',
      deleteTerm: 'Delete this semester', delCourse: 'Delete course', todayLine: (w, m, d) => `Week ${w}/${m} · ${d} days to finals`
    }
  });
  const t = LO.ns('term');
  const tc = LO.ns('common');

  /* ---------------- data ---------------- */
  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const str = (v) => (typeof v === 'string' ? v : '');
  const num = (v) => (v === '' || v == null || !Number.isFinite(+v) ? null : +v);
  function normalize(s) {
    const out = { v: 1, terms: [], cur: str(s && s.cur) };
    ((s && s.terms) || []).forEach((x) => {
      if (!x || typeof x.name !== 'string') return;
      out.terms.push({
        id: String(x.id || uid()), name: x.name, start: isKey(x.start) ? x.start : '', end: isKey(x.end) ? x.end : '',
        courses: (x.courses || []).filter((c) => c && typeof c.name === 'string').map((c) => ({
          id: String(c.id || uid()), name: c.name, credits: Math.max(0, num(c.credits) || 0), target: num(c.target),
          items: (c.items || []).filter((i) => i && typeof i.title === 'string').map((i) => ({
            id: String(i.id || uid()), title: i.title, kind: KINDS.includes(i.kind) ? i.kind : 'hw',
            weight: Math.max(0, num(i.weight) || 0), score: num(i.score), max: num(i.max) > 0 ? num(i.max) : 100, date: isKey(i.date) ? i.date : ''
          }))
        }))
      });
    });
    if (!out.terms.some((x) => x.id === out.cur)) out.cur = out.terms.length ? out.terms[out.terms.length - 1].id : '';
    return out;
  }
  const S = LO.createStore('term', 'planner:term:v1', () => ({ v: 1, terms: [], cur: '' }), normalize);
  const curTerm = () => S.s.terms.find((x) => x.id === S.s.cur) || null;
  // the term today falls in, or else the chosen one
  const activeTerm = () => {
    const k = LO.todayKey();
    return S.s.terms.find((x) => x.start && x.start <= k && k <= x.end) || curTerm();
  };
  const fmtPct = (p) => `${LO.round1(p)}%`;

  /* ---------------- page ---------------- */
  const view = $('#view-term');

  function render() {
    const tm = curTerm();
    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1>${tm ? `<p class="sub">${esc(tm.name)} · ${esc(LO.shortDate(tm.start))} – ${esc(LO.shortDate(tm.end))}</p>` : ''}</div>`
      + '<div class="row">';
    if (S.s.terms.length > 1) h += `<select class="input sm" data-tpick aria-label="${esc(t('title'))}">${S.s.terms.map((x) => `<option value="${esc(x.id)}"${x.id === S.s.cur ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`;
    if (tm) h += `<button type="button" class="btn sm" data-tedit>${esc(t('editTerm'))}</button>`;
    h += `<button type="button" class="btn sm" data-tnew>${esc(t('newTerm'))}</button></div></div>`;
    if (!tm) {
      view.innerHTML = `${h}<section class="card empty-card"><h2>${esc(t('none'))}</h2><p class="hint">${esc(t('noneHint'))}</p><button type="button" class="btn primary" data-tnew>${esc(t('setup'))}</button></section>`;
      return;
    }
    const today = LO.todayKey();
    const wk = C.weekOf(tm, today);
    const g = C.gpa(tm.courses);
    const weekText = !wk ? '' : wk.week === 0 ? t('before')(wk.startsIn) : wk.week > wk.weeks ? t('after') : t('week')(wk.week, wk.weeks);
    h += '<div class="stats">'
      + `<div class="stat">${LO.ring(wk ? wk.pct : 0, 46)}<div><span class="stat-label">${esc(t('title'))}</span><b class="stat-num">${esc(weekText)}</b></div></div>`
      + `<div class="stat"><div><span class="stat-label">${esc(t('left'))}</span><b class="stat-num">${esc(t('daysN')(wk ? wk.daysLeft : 0))}</b></div></div>`
      + `<div class="stat"><div><span class="stat-label">${esc(t('gpa'))}</span><b class="stat-num">${g ? g.gpa.toFixed(2) : '–'}</b><span class="stat-sub">${esc(g ? t('gpaCredits')(g.credits) : t('gpaNone'))}</span></div></div>`
      + `<div class="stat"><div><span class="stat-label">${esc(t('courses'))}</span><b class="stat-num">${tm.courses.length}</b></div></div></div>`;

    const up = [];
    tm.courses.forEach((c) => c.items.forEach((i) => { if (i.date && i.date >= today && i.score == null) up.push({ c, i }); }));
    up.sort((a, b) => (a.i.date < b.i.date ? -1 : 1));
    h += `<section class="card term-up"><header class="card-head"><h2>${esc(t('upcoming'))}</h2></header>`
      + (up.length ? `<ul class="term-up-list">${up.slice(0, 8).map(({ c, i }) => `<li class="${i.kind === 'exam' ? 'is-exam' : ''}" data-course="${esc(c.id)}" data-item="${esc(i.id)}"><span class="term-when">${esc(t('inDays')(LO.dayDiff(today, i.date)))}</span><b>${esc(i.title)}</b><span class="hint">${esc(c.name)} · ${esc(t('kinds')[i.kind])} · ${esc(LO.shortDate(i.date))}</span></li>`).join('')}</ul>`
        : `<p class="hint">${esc(t('upEmpty'))}</p>`) + '</section>';

    h += `<div class="section-head"><h2>${esc(t('courses'))}</h2><div class="row"><button type="button" class="btn sm" data-tfrom>${esc(t('fromSchedule'))}</button><button type="button" class="btn sm primary" data-cnew>${LO.icon.plus}<span>${esc(t('addCourse'))}</span></button></div></div>`;
    h += `<div class="term-grid">${tm.courses.map(courseCard).join('')}</div><p class="hint">${esc(t('letterHint'))}</p>`;
    view.innerHTML = h;
  }

  function courseCard(c) {
    const p = C.coursePct(c);
    const l = C.letter(p);
    let goal = '';
    if (c.target != null) {
      const n = C.needed(c, c.target);
      if (n != null) goal = n <= 0 ? t('reached') : n > 100 ? t('tooHigh') : t('needed')(Math.ceil(n));
    }
    return `<section class="card term-course" data-course="${esc(c.id)}"><header class="card-head"><h3 class="link-btn" data-cedit tabindex="0" role="button">${esc(c.name)}</h3><span class="hint">${c.credits ? `${c.credits} ${esc(t('credits'))}` : ''}</span></header>`
      + `<p class="term-grade">${p == null ? `<span class="hint">${esc(t('notGraded'))}</span>` : `<b>${esc(fmtPct(p))}</b> <span class="term-letter">${esc(l.letter)}</span>`}${c.target != null ? `<small class="hint"> / ${esc(fmtPct(c.target))}</small>` : ''}</p>`
      + (goal ? `<p class="hint">${esc(goal)}</p>` : '')
      + (c.items.length ? `<ul class="term-items">${c.items.slice().sort((a, b) => (a.date || '9') < (b.date || '9') ? -1 : 1).map((i) => `<li data-item="${esc(i.id)}" tabindex="0" role="button"><span>${esc(i.title)}<small> ${esc(t('kinds')[i.kind])}${i.weight ? ` · ${i.weight}%` : ''}${i.date ? ` · ${esc(LO.shortDate(i.date))}` : ''}</small></span><b>${i.score == null ? '–' : `${LO.round1(i.score)}/${LO.round1(i.max)}`}</b></li>`).join('')}</ul>` : `<p class="hint">${esc(t('noItems'))}</p>`)
      + `<button type="button" class="btn sm ghost" data-inew>${LO.icon.plus}<span>${esc(t('addItem'))}</span></button></section>`;
  }

  /* ---------------- dialogs ---------------- */
  function editTerm(id) {
    const x = id ? S.s.terms.find((y) => y.id === id) : null;
    LO.openForm({
      title: x ? t('editTerm') : t('newTerm'),
      body: `<label class="fld"><span>${esc(t('name'))}</span><input class="input" name="tname" maxlength="40" value="${esc(x ? x.name : '')}" placeholder="${esc(t('namePh'))}"></label>`
        + `<div class="row"><label class="fld"><span>${esc(t('start'))}</span><input class="input date" type="date" name="tstart" value="${esc(x ? x.start : '')}"></label>`
        + `<label class="fld"><span>${esc(t('end'))}</span><input class="input date" type="date" name="tend" value="${esc(x ? x.end : '')}"></label></div>`,
      deleteLabel: t('deleteTerm'),
      onSave(dlg) {
        const name = $('input[name="tname"]', dlg).value.trim();
        const start = $('input[name="tstart"]', dlg).value;
        const end = $('input[name="tend"]', dlg).value;
        if (!name) return t('errName');
        if (!start || !end || end < start) return t('errDates');
        LO.mutate(S, (s) => {
          const y = x && s.terms.find((z) => z.id === x.id);
          if (y) Object.assign(y, { name, start, end });
          else { const nid = uid(); s.terms.push({ id: nid, name, start, end, courses: [] }); s.cur = nid; }
        }, x ? tc('saved') : tc('added'));
        return true;
      },
      onDelete: x ? () => LO.mutate(S, (s) => { s.terms = s.terms.filter((z) => z.id !== x.id); s.cur = s.terms.length ? s.terms[s.terms.length - 1].id : ''; }, tc('deleted')) : null
    });
  }

  function editCourse(cid) {
    const tm = curTerm();
    const c = cid ? tm.courses.find((y) => y.id === cid) : null;
    LO.openForm({
      title: c ? t('editCourse') : t('newCourse'),
      body: `<label class="fld"><span>${esc(t('cname'))}</span><input class="input" name="cname" maxlength="60" value="${esc(c ? c.name : '')}"></label>`
        + `<div class="row"><label class="fld"><span>${esc(t('credits'))}</span><input class="input sm" type="number" min="0" max="12" step="0.5" name="ccred" value="${c ? c.credits : 3}"></label>`
        + `<label class="fld"><span>${esc(t('target'))}</span><input class="input sm" type="number" min="0" max="110" step="1" name="ctarget" value="${c && c.target != null ? c.target : ''}"></label></div>`,
      deleteLabel: t('delCourse'),
      onSave(dlg) {
        const name = $('input[name="cname"]', dlg).value.trim();
        if (!name) return t('errName');
        const credits = Math.max(0, num($('input[name="ccred"]', dlg).value) || 0);
        const target = num($('input[name="ctarget"]', dlg).value);
        LO.mutate(S, () => {
          if (c) Object.assign(c, { name, credits, target });
          else tm.courses.push({ id: uid(), name, credits, target, items: [] });
        }, c ? tc('saved') : tc('added'));
        return true;
      },
      onDelete: c ? () => LO.mutate(S, () => { tm.courses = tm.courses.filter((y) => y.id !== c.id); }, tc('deleted')) : null
    });
  }

  function editItem(cid, iid) {
    const tm = curTerm();
    const c = tm && tm.courses.find((y) => y.id === cid);
    if (!c) return;
    const i = iid ? c.items.find((y) => y.id === iid) : null;
    const v = i || { title: '', kind: 'hw', weight: 0, score: null, max: 100, date: '' };
    LO.openForm({
      title: i ? t('editItem') : t('newItem'),
      badge: c.name,
      body: `<label class="fld"><span>${esc(t('iname'))}</span><input class="input" name="iname" maxlength="60" value="${esc(v.title)}" placeholder="${esc(t('iPh'))}"></label>`
        + `<div class="fld"><span>${esc(t('kind'))}</span><div class="chips">${LO.chips('ikind', KINDS.map((k) => [k, esc(t('kinds')[k])]), 'radio', [v.kind])}</div></div>`
        + `<div class="row"><label class="fld"><span>${esc(t('score'))}</span><input class="input sm" type="number" step="any" min="0" name="iscore" value="${v.score == null ? '' : v.score}" placeholder="${esc(t('scorePh'))}"></label>`
        + `<label class="fld"><span>${esc(t('max'))}</span><input class="input sm" type="number" step="any" min="0" name="imax" value="${v.max}"></label></div>`
        + `<div class="row"><label class="fld"><span>${esc(t('weight'))}</span><input class="input sm" type="number" step="any" min="0" max="100" name="iweight" value="${v.weight || ''}"></label>`
        + `<label class="fld"><span>${esc(t('date'))}</span><input class="input date" type="date" name="idate" value="${esc(v.date)}"></label></div><p class="hint">${esc(t('weightHint'))}</p>`,
      onSave(dlg) {
        const title = $('input[name="iname"]', dlg).value.trim();
        if (!title) return t('errName');
        const max = num($('input[name="imax"]', dlg).value);
        const fields = {
          title, kind: LO.checkedVal(dlg, 'ikind') || 'hw', score: num($('input[name="iscore"]', dlg).value),
          max: max > 0 ? max : 100, weight: Math.max(0, num($('input[name="iweight"]', dlg).value) || 0), date: $('input[name="idate"]', dlg).value || ''
        };
        LO.mutate(S, () => {
          if (i) Object.assign(i, fields);
          else c.items.push(Object.assign({ id: uid() }, fields));
        }, i ? tc('saved') : tc('added'));
        return true;
      },
      onDelete: i ? () => LO.mutate(S, () => { c.items = c.items.filter((y) => y.id !== i.id); }, tc('deleted')) : null
    });
  }

  // Each weekly "class" event on the schedule becomes a course, once.
  function fromSchedule() {
    const tm = curTerm();
    const have = new Set(tm.courses.map((c) => c.name.trim().toLowerCase()));
    const names = [];
    ((LO.planner && LO.planner.raw().recurring) || []).forEach((e) => {
      const n = e.title.trim();
      if (e.cat === 'class' && n && !have.has(n.toLowerCase())) { have.add(n.toLowerCase()); names.push(n); }
    });
    if (!names.length) { LO.toast(t('fromNone')); return; }
    LO.mutate(S, () => { names.forEach((name) => tm.courses.push({ id: uid(), name, credits: 3, target: null, items: [] })); }, t('fromAdded')(names.length));
  }

  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-tnew]')) { editTerm(null); return; }
    if (e.target.closest('[data-tedit]')) { editTerm(S.s.cur); return; }
    if (e.target.closest('[data-tfrom]')) { fromSchedule(); return; }
    if (e.target.closest('[data-cnew]')) { editCourse(null); return; }
    const card = e.target.closest('[data-course]');
    if (!card) return;
    if (e.target.closest('[data-cedit]')) { editCourse(card.dataset.course); return; }
    if (e.target.closest('[data-inew]')) { editItem(card.dataset.course, null); return; }
    const it = e.target.closest('[data-item]');
    if (it) editItem(card.dataset.course, it.dataset.item);
  });
  view.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-item],[data-cedit]')) { e.preventDefault(); e.target.click(); }
  });
  view.addEventListener('change', (e) => {
    if (!e.target.matches('[data-tpick]')) return;
    S.s.cur = e.target.value;
    S.save();
    render();
  });

  LO.view('term', { render });

  LO.term = {
    // "Week 8/15 · 23 days to finals" for Today, or '' outside a term
    todayLine() {
      const tm = activeTerm();
      const wk = tm && C.weekOf(tm, LO.todayKey());
      if (!wk || wk.week < 1 || wk.week > wk.weeks) return '';
      return t('todayLine')(wk.week, wk.weeks, wk.daysLeft);
    },
    // dated items waiting for a grade, for search and Today
    upcoming(days) {
      const tm = activeTerm();
      if (!tm) return [];
      const a = LO.todayKey();
      const b = LO.keyOf(LO.addDays(new Date(), days));
      const out = [];
      tm.courses.forEach((c) => c.items.forEach((i) => { if (i.date && i.date >= a && i.date <= b && i.score == null) out.push({ course: c.name, title: i.title, kind: i.kind, date: i.date }); }));
      return out.sort((x, y) => (x.date < y.date ? -1 : 1));
    },
    all: () => S.s.terms
  };
})();
