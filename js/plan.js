/*
 * Yearly goals page: a theme for the year, goals with measurable key
 * results, a 12-month timeline, and a month-by-month breakdown.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, $$, esc, uid } = LO;
  const TCATS = ['study', 'work', 'club', 'health', 'life', 'other'];

  LO.strings('plan', {
    zh: {
      title: '年度目标', yearLabel: (y) => `${y} 年`, prevYear: '上一年', nextYear: '下一年',
      themeLabel: '今年的关键词', themePh: '比如：扎实、健康、勇敢',
      visionLabel: '到年底，我希望…', visionPh: '写下你希望一年后的自己是什么样子',
      goals: '目标', newGoal: '新建目标', editGoal: '编辑目标',
      goalsEmpty: '还没有目标。先写下今年最想做成的一两件事，再给它们定几个能衡量的标准。',
      goal: '目标', goalPh: '比如：保持 GPA 3.8 以上', why: '为什么重要', whyPh: '这个目标对你意味着什么？',
      span: '时间范围', to: '到',
      krs: '衡量标准', krAdd: '添加一条', krTextPh: '比如：读完 12 本书', krCur: '当前', krTarget: '目标', krUnitPh: '单位',
      krHint: '目标填 1 就是“完成 / 没完成”的勾选项。',
      done: '已完成', markDone: '整个目标已经完成',
      timeline: '全年时间线', timelineEmpty: '新建目标后，这里会按月份显示每个目标的安排和进度。',
      monthly: '每月拆解', monthlySub: '把年度目标拆成每个月能做完的小事。',
      monthAddPh: '这个月要做的事', noGoal: '不关联目标', thisMonth: '本月',
      toTodo: '加到待办', addedTodo: '已加到待办，截止到月底', linked: '已在待办里',
      monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      monthShort: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
      spanText: (a, b) => (a === 1 && b === 12 ? '全年' : `${a}月–${b}月`),
      errTitle: '请填写目标。', yearProgress: '全年进度'
    },
    en: {
      title: 'Yearly goals', yearLabel: (y) => `${y}`, prevYear: 'Previous year', nextYear: 'Next year',
      themeLabel: 'Word for the year', themePh: 'e.g. Steady, healthy, brave',
      visionLabel: 'By the end of the year, I hope…', visionPh: 'Describe who you want to be a year from now',
      goals: 'Goals', newGoal: 'New goal', editGoal: 'Edit goal',
      goalsEmpty: 'No goals yet. Write down the one or two things you most want to get done this year, then add ways to measure them.',
      goal: 'Goal', goalPh: 'e.g. Keep my GPA above 3.8', why: 'Why it matters', whyPh: 'What does this goal mean to you?',
      span: 'Months', to: 'to',
      krs: 'How you will measure it', krAdd: 'Add one', krTextPh: 'e.g. Read 12 books', krCur: 'Now', krTarget: 'Target', krUnitPh: 'Unit',
      krHint: 'A target of 1 becomes a simple done / not done checkbox.',
      done: 'Done', markDone: 'This whole goal is done',
      timeline: 'Year timeline', timelineEmpty: 'Once you add goals, this shows when each one happens and how far along it is.',
      monthly: 'Month by month', monthlySub: 'Break the yearly goals into things you can finish within a month.',
      monthAddPh: 'Something for this month', noGoal: 'No goal', thisMonth: 'This month',
      toTodo: 'Add to to-dos', addedTodo: 'Added to to-dos, due at month end', linked: 'In to-dos',
      monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      monthShort: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      spanText: (a, b) => (a === 1 && b === 12 ? 'All year' : `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][a - 1]}–${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][b - 1]}`),
      errTitle: 'Write the goal.', yearProgress: 'Year progress'
    }
  });
  const t = LO.ns('plan');
  const tc = LO.ns('common');

  /* ---------------- data ---------------- */
  const str = (v) => (typeof v === 'string' ? v : '');
  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const emptyYear = () => ({ theme: '', vision: '', goals: [], months: {} });
  function normYear(y) {
    const out = emptyYear();
    out.theme = str(y.theme);
    out.vision = str(y.vision);
    out.goals = (y.goals || []).filter((g) => g && typeof g.title === 'string').map((g) => {
      const start = LO.clamp(Math.round(+g.start) || 1, 1, 12);
      return {
        id: String(g.id || uid()), title: g.title, cat: TCATS.includes(g.cat) ? g.cat : 'other', why: str(g.why),
        start, end: LO.clamp(Math.round(+g.end) || 12, start, 12), done: !!g.done,
        krs: (g.krs || []).filter((k) => k && typeof k.text === 'string').map((k) => ({
          id: String(k.id || uid()), text: k.text, cur: Math.max(0, +k.cur || 0), target: Math.max(1, +k.target || 1), unit: str(k.unit)
        })),
        created: isKey(g.created) ? g.created : LO.todayKey()
      };
    });
    for (let m = 1; m <= 12; m++) {
      const list = ((y.months || {})[m] || []).filter((x) => x && typeof x.text === 'string');
      if (list.length) out.months[m] = list.map((x) => ({ id: String(x.id || uid()), goalId: str(x.goalId), text: x.text, done: !!x.done, todo: !!x.todo }));
    }
    return out;
  }
  function normalize(s) {
    const out = { v: 1, years: {} };
    Object.entries(s.years || {}).forEach(([k, y]) => { if (/^\d{4}$/.test(k) && y) out.years[k] = normYear(y); });
    return out;
  }
  const P = LO.createStore('plan', 'planner:plan:v1', () => ({ v: 1, years: {} }), normalize);

  let year = new Date().getFullYear();
  const yearOf = (s, y, create) => {
    const k = String(y);
    if (!s.years[k]) {
      if (!create) return emptyYear();
      s.years[k] = emptyYear();
    }
    return s.years[k];
  };
  const Y = () => yearOf(P.s, year, false);

  const krPct = (k) => Math.min(1, k.cur / k.target);
  const goalPct = (g) => (g.done ? 1 : g.krs.length ? g.krs.reduce((a, k) => a + krPct(k), 0) / g.krs.length : 0);
  const findGoal = (y, id) => y.goals.find((g) => g.id === id);

  /* ---------------- editor ---------------- */
  const krLine = (k) => `<div class="kr-edit" data-krid="${esc(k.id)}">`
    + `<input class="input sm" data-k="text" maxlength="80" value="${esc(k.text)}" placeholder="${esc(t('krTextPh'))}">`
    + `<input class="input sm num" type="number" min="0" step="any" data-k="cur" value="${k.cur}" aria-label="${esc(t('krCur'))}" title="${esc(t('krCur'))}">`
    + '<span class="kr-slash">/</span>'
    + `<input class="input sm num" type="number" min="1" step="any" data-k="target" value="${k.target}" aria-label="${esc(t('krTarget'))}" title="${esc(t('krTarget'))}">`
    + `<input class="input sm unit" data-k="unit" maxlength="10" value="${esc(k.unit)}" placeholder="${esc(t('krUnitPh'))}">`
    + `<button type="button" class="icon-btn sm ghost" data-krdel aria-label="${esc(tc('delete'))}">${LO.icon.x}</button></div>`;

  function monthSelect(name, sel) {
    return `<select name="${name}">${LO.seq(12).map((i) => `<option value="${i + 1}"${i + 1 === sel ? ' selected' : ''}>${esc(t('monthNames')[i])}</option>`).join('')}</select>`;
  }

  function openEditor(id) {
    const g = id ? findGoal(Y(), id) : null;
    const isNew = !g;
    const v = g || { title: '', cat: 'study', why: '', start: 1, end: 12, krs: [{ id: uid(), text: '', cur: 0, target: 1, unit: '' }], done: false };
    const body = `<label class="fld"><span>${esc(t('goal'))}</span><input class="input" name="title" maxlength="80" value="${esc(v.title)}" placeholder="${esc(t('goalPh'))}"></label>`
      + `<div class="fld"><span>${esc(tc('category'))}</span><div class="chips">${LO.chips('cat', TCATS.map((c) => [c, `<i class="sw"></i>${esc(tc('cats.' + c))}`, 'k-' + c]), 'radio', [v.cat])}</div></div>`
      + `<label class="fld"><span>${esc(t('why'))}</span><textarea class="input ta" name="why" rows="2" maxlength="300" placeholder="${esc(t('whyPh'))}">${esc(v.why)}</textarea></label>`
      + `<div class="fld"><span>${esc(t('span'))}</span><div class="row">${monthSelect('start', v.start)}<span>${esc(t('to'))}</span>${monthSelect('end', v.end)}</div></div>`
      + `<div class="fld"><span>${esc(t('krs'))}</span><div class="kr-list">${v.krs.map(krLine).join('')}</div>`
      + `<button type="button" class="btn sm" data-kradd>${LO.icon.plus}<span>${esc(t('krAdd'))}</span></button><p class="hint">${esc(t('krHint'))}</p></div>`
      + `<label class="check"><input type="checkbox" name="done"${v.done ? ' checked' : ''}>${esc(t('markDone'))}</label>`;
    LO.openForm({
      title: isNew ? t('newGoal') : t('editGoal'),
      body,
      onOpen(dlg) {
        const list = $('.kr-list', dlg);
        $('[data-kradd]', dlg).addEventListener('click', () => {
          list.insertAdjacentHTML('beforeend', krLine({ id: uid(), text: '', cur: 0, target: 1, unit: '' }));
          const inputs = $$('[data-k="text"]', list);
          inputs[inputs.length - 1].focus();
        });
        list.addEventListener('click', (e) => { const b = e.target.closest('[data-krdel]'); if (b) b.closest('.kr-edit').remove(); });
      },
      onSave(dlg) {
        const title = $('input[name="title"]', dlg).value.trim();
        if (!title) return t('errTitle');
        const start = +$('select[name="start"]', dlg).value;
        const end = Math.max(start, +$('select[name="end"]', dlg).value);
        const krs = $$('.kr-edit', dlg).map((row) => {
          const val = (k) => $(`[data-k="${k}"]`, row).value;
          const text = val('text').trim();
          return text ? { id: row.dataset.krid, text, cur: Math.max(0, +val('cur') || 0), target: Math.max(1, +val('target') || 1), unit: val('unit').trim() } : null;
        }).filter(Boolean);
        const fields = { title, cat: LO.checkedVal(dlg, 'cat') || 'other', why: $('textarea[name="why"]', dlg).value.trim(), start, end, krs, done: $('input[name="done"]', dlg).checked };
        LO.mutate(P, (s) => {
          const y = yearOf(s, year, true);
          if (isNew) y.goals.push(Object.assign({ id: uid(), created: LO.todayKey() }, fields));
          else Object.assign(findGoal(y, id), fields);
        }, isNew ? tc('added') : tc('saved'));
        return true;
      },
      onDelete: isNew ? null : () => LO.mutate(P, (s) => {
        const y = yearOf(s, year, true);
        y.goals = y.goals.filter((g) => g.id !== id);
        Object.values(y.months).forEach((list) => list.forEach((x) => { if (x.goalId === id) x.goalId = ''; }));
      }, tc('deleted'))
    });
  }

  /* ---------------- page ---------------- */
  const view = $('#view-plan');

  function goalCard(g) {
    const pct = goalPct(g);
    let krs = '';
    g.krs.forEach((k) => {
      const binary = k.target === 1;
      krs += `<li class="kr${krPct(k) >= 1 ? ' is-done' : ''}" data-kr="${esc(k.id)}">`
        + (binary
          ? `<label class="kr-check"><input type="checkbox" data-krtoggle${k.cur >= 1 ? ' checked' : ''}><span>${esc(k.text)}</span></label>`
          : `<div class="kr-row"><span class="kr-text">${esc(k.text)}</span><span class="kr-val">${LO.round1(k.cur)} / ${LO.round1(k.target)}${k.unit ? ' ' + esc(k.unit) : ''}</span>`
            + `<button type="button" class="icon-btn sm" data-krstep="-1" aria-label="-1">${LO.icon.minus}</button><button type="button" class="icon-btn sm" data-krstep="1" aria-label="+1">${LO.icon.plus}</button></div>`
            + `<div class="progress sm"><span style="width:${krPct(k) * 100}%"></span></div>`)
        + '</li>';
    });
    return `<article class="goal k-${g.cat}${g.done ? ' is-done' : ''}" data-goal="${esc(g.id)}">`
      + `<div class="goal-top"><span class="tag k-${g.cat}"><i class="sw"></i>${esc(tc('cats.' + g.cat))}</span><span class="goal-span">${esc(t('spanText')(g.start, g.end))}</span></div>`
      + `<h3 class="goal-title" data-gedit tabindex="0">${esc(g.title)}</h3>`
      + (g.why ? `<p class="goal-why">${esc(g.why)}</p>` : '')
      + `<div class="goal-prog"><div class="progress"><span style="width:${pct * 100}%"></span></div><b>${g.done ? esc(t('done')) : Math.round(pct * 100) + '%'}</b></div>`
      + (krs ? `<ul class="krs">${krs}</ul>` : '')
      + '</article>';
  }

  function timelineHTML(y) {
    if (!y.goals.length) return `<p class="empty-note">${esc(t('timelineEmpty'))}</p>`;
    const now = new Date();
    const isThisYear = now.getFullYear() === year;
    const nowPos = ((now.getMonth() + (now.getDate() - 1) / 31) / 12) * 100;
    let h = `<div class="tl"><div class="tl-row tl-head"><span class="tl-name"></span><div class="tl-track">${t('monthShort').map((m, i) => `<span class="${isThisYear && i === now.getMonth() ? 'is-now' : ''}">${esc(m)}</span>`).join('')}</div></div>`;
    y.goals.slice().sort((a, b) => a.start - b.start || a.end - b.end).forEach((g) => {
      const pct = goalPct(g);
      h += `<div class="tl-row"><span class="tl-name" title="${esc(g.title)}">${esc(g.title)}</span><div class="tl-track">`
        + `<i class="tl-bar k-${g.cat}" style="grid-column:${g.start} / ${g.end + 1}"><span style="width:${pct * 100}%"></span></i>`
        + (isThisYear ? `<i class="tl-now" style="left:${nowPos}%"></i>` : '')
        + '</div></div>';
    });
    return `${h}</div>`;
  }

  function monthsHTML(y) {
    const now = new Date();
    const curM = now.getFullYear() === year ? now.getMonth() + 1 : 0;
    const goalOpts = (sel) => `<option value="">${esc(t('noGoal'))}</option>${y.goals.map((g) => `<option value="${esc(g.id)}"${g.id === sel ? ' selected' : ''}>${esc(g.title)}</option>`).join('')}`;
    let h = '<div class="months">';
    for (let m = 1; m <= 12; m++) {
      const list = y.months[m] || [];
      const done = list.filter((x) => x.done).length;
      const past = (now.getFullYear() > year) || (now.getFullYear() === year && m < curM);
      h += `<section class="month${m === curM ? ' is-now' : ''}${past ? ' is-past' : ''}" data-month="${m}">`
        + `<header><h3>${esc(t('monthNames')[m - 1])}${m === curM ? `<span class="badge live">${esc(t('thisMonth'))}</span>` : ''}</h3>${list.length ? `<span class="count">${done}/${list.length}</span>` : ''}</header>`
        + `<ul class="mitems">${list.map((x) => {
          const g = findGoal(y, x.goalId);
          return `<li class="mi${x.done ? ' is-done' : ''}${g ? ' k-' + g.cat : ''}" data-mi="${esc(x.id)}">`
            + `<label><input type="checkbox" data-mtoggle${x.done ? ' checked' : ''}><span>${esc(x.text)}</span></label>`
            + (g ? `<i class="mi-dot" title="${esc(g.title)}"></i>` : '')
            + (x.done ? '' : x.todo ? `<span class="mi-linked" title="${esc(t('linked'))}">${LO.icon.check}</span>` : `<button type="button" class="icon-btn sm ghost" data-mtodo title="${esc(t('toTodo'))}" aria-label="${esc(t('toTodo'))}">${LO.icon.plus}</button>`)
            + `<button type="button" class="icon-btn sm ghost" data-mdel aria-label="${esc(tc('delete'))}">${LO.icon.x}</button></li>`;
        }).join('')}</ul>`
        + `<form class="madd" data-madd="${m}"><input maxlength="80" autocomplete="off" placeholder="${esc(t('monthAddPh'))}" aria-label="${esc(t('monthAddPh'))}">`
        + (y.goals.length ? `<select aria-label="${esc(t('goal'))}">${goalOpts('')}</select>` : '')
        + `<button type="submit" class="icon-btn sm" aria-label="${esc(tc('add'))}">${LO.icon.plus}</button></form>`
        + '</section>';
    }
    return `${h}</div>`;
  }

  function render() {
    const y = Y();
    const avg = y.goals.length ? y.goals.reduce((a, g) => a + goalPct(g), 0) / y.goals.length : 0;
    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1></div>`
      + `<div class="year-nav"><button type="button" class="icon-btn" data-year="-1" aria-label="${esc(t('prevYear'))}">‹</button><b>${esc(t('yearLabel')(year))}</b><button type="button" class="icon-btn" data-year="1" aria-label="${esc(t('nextYear'))}">›</button></div></div>`;
    h += '<section class="card vision">'
      + `<label class="fld"><span>${esc(t('themeLabel'))}</span><input class="input theme-input" data-yf="theme" maxlength="40" value="${esc(y.theme)}" placeholder="${esc(t('themePh'))}"></label>`
      + `<label class="fld"><span>${esc(t('visionLabel'))}</span><textarea class="input ta" data-yf="vision" rows="2" maxlength="500" placeholder="${esc(t('visionPh'))}">${esc(y.vision)}</textarea></label>`
      + (y.goals.length ? `<div class="vision-prog">${LO.ring(avg, 56, Math.round(avg * 100) + '%')}<span>${esc(t('yearProgress'))}</span></div>` : '')
      + '</section>';
    h += `<div class="section-head"><h2>${esc(t('goals'))}<span class="count">${y.goals.length}</span></h2><button type="button" class="btn primary" data-gnew>${LO.icon.plus}<span>${esc(t('newGoal'))}</span></button></div>`;
    h += y.goals.length ? `<div class="goal-grid">${y.goals.map(goalCard).join('')}</div>` : `<p class="empty-note big">${esc(t('goalsEmpty'))}</p>`;
    h += `<section class="card tl-card"><header class="card-head"><h2>${esc(t('timeline'))}</h2></header>${timelineHTML(y)}</section>`;
    h += `<div class="section-head"><div><h2>${esc(t('monthly'))}</h2><p class="hint">${esc(t('monthlySub'))}</p></div></div>`;
    h += monthsHTML(y);
    view.innerHTML = h;
  }

  /* ---------------- month items (shared with Today) ---------------- */
  function itemCtx(el) {
    const li = el.closest('[data-mi]');
    if (!li) return null;
    const box = el.closest('[data-month]');
    const yr = box && box.dataset.year ? +box.dataset.year : year;
    return { id: li.dataset.mi, m: +box.dataset.month, yr };
  }
  function toggleItem(c) {
    LO.mutate(P, (s) => { const x = (yearOf(s, c.yr, true).months[c.m] || []).find((i) => i.id === c.id); if (x) x.done = !x.done; });
  }
  function handleMonthClick(e) {
    const c = itemCtx(e.target);
    if (!c) return false;
    if (e.target.closest('[data-mdel]')) {
      LO.mutate(P, (s) => { const y = yearOf(s, c.yr, true); y.months[c.m] = (y.months[c.m] || []).filter((i) => i.id !== c.id); }, tc('deleted'));
      return true;
    }
    if (e.target.closest('[data-mtodo]')) {
      const y = yearOf(P.s, c.yr, true);
      const x = (y.months[c.m] || []).find((i) => i.id === c.id);
      if (!x || !LO.tasks) return true;
      const g = findGoal(y, x.goalId);
      x.todo = true;
      P.save();
      const last = new Date(c.yr, c.m, 0);
      LO.tasks.addTodo({ title: x.text, cat: g ? g.cat : 'other', due: LO.keyOf(last) });
      LO.toast(t('addedTodo'));
      return true;
    }
    return false;
  }
  function attachMonths(root) {
    root.addEventListener('click', (e) => { handleMonthClick(e); });
    root.addEventListener('change', (e) => {
      if (!e.target.matches('[data-mtoggle]')) return;
      const c = itemCtx(e.target);
      if (c) toggleItem(c);
    });
  }

  /* ---------------- events ---------------- */
  attachMonths(view);
  view.addEventListener('click', (e) => {
    const yb = e.target.closest('[data-year]');
    if (yb) { year += +yb.dataset.year; render(); return; }
    if (e.target.closest('[data-gnew]')) { openEditor(null); return; }
    const goalEl = e.target.closest('[data-goal]');
    if (!goalEl) return;
    const gid = goalEl.dataset.goal;
    const step = e.target.closest('[data-krstep]');
    if (step) {
      const kid = step.closest('[data-kr]').dataset.kr;
      const d = +step.dataset.krstep;
      LO.mutate(P, (s) => { const k = findGoal(yearOf(s, year, true), gid).krs.find((x) => x.id === kid); k.cur = Math.max(0, LO.round1(k.cur + d)); });
      return;
    }
    if (e.target.closest('[data-gedit]')) openEditor(gid);
  });
  view.addEventListener('change', (e) => {
    if (!e.target.matches('[data-krtoggle]')) return;
    const gid = e.target.closest('[data-goal]').dataset.goal;
    const kid = e.target.closest('[data-kr]').dataset.kr;
    LO.mutate(P, (s) => { const k = findGoal(yearOf(s, year, true), gid).krs.find((x) => x.id === kid); k.cur = e.target.checked ? k.target : 0; });
  });
  view.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-gedit]')) openEditor(e.target.closest('[data-goal]').dataset.goal); });
  view.addEventListener('input', (e) => {
    const f = e.target.dataset.yf;
    if (!f) return;
    yearOf(P.s, year, true)[f] = e.target.value;
    P.save();
  });
  view.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-madd]');
    if (!f) return;
    e.preventDefault();
    const text = $('input', f).value.trim();
    if (!text) return;
    const m = +f.dataset.madd;
    const sel = $('select', f);
    const goalId = sel ? sel.value : '';
    LO.mutate(P, (s) => {
      const y = yearOf(s, year, true);
      (y.months[m] = y.months[m] || []).push({ id: uid(), goalId, text, done: false, todo: false });
    });
    const again = $(`[data-madd="${m}"] input`, view);
    if (again) again.focus();
  });

  LO.view('plan', { render });

  /* ---------------- API ---------------- */
  LO.plan = {
    store: P,
    attachMonths,
    thisMonthHTML() {
      const now = new Date();
      const y = yearOf(P.s, now.getFullYear(), false);
      const m = now.getMonth() + 1;
      const list = y.months[m] || [];
      return {
        count: list.length,
        done: list.filter((x) => x.done).length,
        html: list.length ? `<ul class="mitems" data-month="${m}" data-year="${now.getFullYear()}">${list.map((x) => {
          const g = findGoal(y, x.goalId);
          return `<li class="mi${x.done ? ' is-done' : ''}${g ? ' k-' + g.cat : ''}" data-mi="${esc(x.id)}"><label><input type="checkbox" data-mtoggle${x.done ? ' checked' : ''}><span>${esc(x.text)}</span></label>${g ? `<i class="mi-dot" title="${esc(g.title)}"></i>` : ''}</li>`;
        }).join('')}</ul>` : ''
      };
    }
  };
})();
