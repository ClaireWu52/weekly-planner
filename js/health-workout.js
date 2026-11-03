/*
 * Health, Exercise tab: the workout log with workout groups, this week's
 * summary and the workout plan that can go onto the schedule.
 * Plugs into health.js through LO.healthKit.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, $$, esc, uid } = LO;
  const K = LO.healthKit;
  const { H, t, tc, WTYPES, normItems, itemText, weekRange, weekStats, minutesOn, weekMinutes, render } = K;
  const view = K.VIEWS.health;

  const draft = { date: '', types: [], min: '', level: 2, note: '', routine: '', items: [] };
  let planOffset = 1;
  function applyRoutine(r) {
    draft.routine = r.name;
    draft.types = r.types.slice();
    draft.min = String(r.min);
    draft.level = r.level;
    draft.items = r.items.map((x) => Object.assign({}, x));
  }
  const exRow = (x, i) => `<div class="ex-row" data-i="${i}">`
    + `<input class="input sm" data-f="name" list="exList" maxlength="40" value="${esc(x.name)}" placeholder="${esc(t('exPh'))}" aria-label="${esc(t('exName'))}">`
    + `<input class="input sm num" type="number" min="0" max="99" data-f="sets" value="${x.sets || ''}" placeholder="${esc(t('sets'))}" aria-label="${esc(t('sets'))}">`
    + '<span class="ex-x">×</span>'
    + `<input class="input sm" data-f="reps" maxlength="20" value="${esc(x.reps)}" placeholder="${esc(t('repsPh'))}" aria-label="${esc(t('reps'))}">`
    + `<input class="input sm" data-f="weight" maxlength="20" value="${esc(x.weight)}" placeholder="${esc(t('weightPh'))}" aria-label="${esc(t('weight'))}">`
    + `<button type="button" class="icon-btn sm ghost" data-exdel aria-label="${esc(tc('delete'))}">${LO.icon.x}</button></div>`;

  function workoutCard() {
    if (!draft.date) draft.date = LO.todayKey();
    const S = H.s;
    let h = `<section class="card hcard" id="hw-workout"><header class="card-head"><h2>${esc(t('wTitle'))}</h2></header>`;
    h += `<div class="routine-bar"><span class="lbl">${esc(t('routines'))}</span>`
      + S.routines.map((r) => `<span class="rt${draft.routine === r.name ? ' on' : ''}"><button type="button" class="rt-pick" data-rt="${esc(r.id)}">${esc(r.name)}</button>`
        + `<button type="button" class="rt-edit" data-rtedit="${esc(r.id)}" aria-label="${esc(t('editRoutine'))}" title="${esc(t('editRoutine'))}">✎</button></span>`).join('')
      + `<button type="button" class="btn sm ghost" data-rtnew>${LO.icon.plus}<span>${esc(t('newRoutine'))}</span></button></div>`
      + `<p class="hint">${esc(t('routineHint'))}</p>`;
    h += '<form class="wform" data-form="workout">'
      + `<div class="fld"><span>${esc(t('types'))}</span><div class="chips">${LO.chips('wtype', WTYPES.map((x) => [x, esc(t('wt.' + x))]), 'checkbox', draft.types)}</div></div>`
      + '<div class="form-row">'
      + `<label class="fld"><span>${esc(t('date'))}</span><input type="date" class="input" name="wdate" value="${esc(draft.date)}" max="${LO.todayKey()}"></label>`
      + `<label class="fld"><span>${esc(t('minutes'))}</span><input type="number" class="input" name="wmin" min="1" max="1440" inputmode="numeric" value="${esc(draft.min)}"></label>`
      + '</div>'
      + `<div class="quick">${[15, 30, 45, 60, 90].map((m) => `<button type="button" class="btn sm" data-qmin="${m}">${m}</button>`).join('')}</div>`
      + `<div class="fld"><span>${esc(t('level'))}</span><div class="chips">${LO.chips('wlevel', [1, 2, 3].map((l) => [l, esc(t('levels')[l - 1])]), 'radio', [draft.level])}</div></div>`
      + `<div class="fld"><span>${esc(t('exercises'))}</span><div class="ex-rows" data-exrows="draft">${draft.items.map(exRow).join('')}</div>`
      + `<button type="button" class="btn sm" data-exadd="draft">${LO.icon.plus}<span>${esc(t('addEx'))}</span></button></div>`
      + `<label class="fld"><span>${esc(t('note'))}</span><input class="input" name="wnote" maxlength="200" value="${esc(draft.note)}" placeholder="${esc(t('notePh'))}"></label>`
      + `<p class="err" data-err="workout"></p><div class="row"><button type="submit" class="btn primary">${esc(t('log'))}</button>`
      + `${draft.routine || draft.items.length ? `<button type="button" class="btn ghost" data-wclear>${esc(t('clearRoutine'))}</button>` : ''}</div></form>`
      + `<datalist id="exList">${S.exercises.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`;

    const days = LO.seq(30).map((i) => LO.addDays(new Date(), i - 29));
    h += `<h3 class="sub-head">${esc(t('last30'))}</h3>`
      + LO.bars(days.map((d, i) => {
        const k = LO.keyOf(d);
        const m = minutesOn(k);
        return { v: m, label: i % 7 === 1 || i === 29 ? LO.shortDate(k) : '', title: `${LO.shortDate(k)}: ${m} ${tc('min')}`, cls: 'c-work' };
      }), { height: 80 });

    const list = S.workouts.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 8);
    h += `<h3 class="sub-head">${esc(t('recent'))}</h3>`;
    if (!list.length) h += `<p class="empty-note">${esc(t('noWorkouts'))}</p>`;
    else {
      h += `<ul class="log-list">${list.map((w) => `<li><span class="log-date">${LO.shortDate(w.date)}</span>`
        + `<span class="log-main"><b>${esc(w.routine || w.types.map((x) => t('wt.' + x)).join('、'))}</b> ${w.min} ${esc(tc('min'))}<span class="lvl l${w.level}">${esc(t('levels')[w.level - 1])}</span>`
        + `${w.items.length ? `<span class="log-note">${esc(w.items.map(itemText).join('、'))}</span>` : ''}`
        + `${w.note ? `<span class="log-note">${esc(w.note)}</span>` : ''}</span>`
        + `<button type="button" class="icon-btn sm ghost" data-delw="${esc(w.id)}" aria-label="${esc(tc('delete'))}">${LO.icon.x}</button></li>`).join('')}</ul>`;
    }
    return `${h}</section>`;
  }

  function summaryCard() {
    const cur = weekStats(0);
    const prev = weekStats(-1);
    const maxT = Math.max(1, ...Object.values(cur.byType));
    const top = Object.entries(cur.ex).sort((a, b) => b[1].n - a[1].n || b[1].sets - a[1].sets).slice(0, 5);
    const goal = H.s.workoutGoal;
    let h = `<section class="card hcard" id="hw-summary"><header class="card-head"><h2>${esc(t('summary'))}</h2>`
      + `<label class="mini-field">${esc(t('weekGoal'))}<input type="number" min="10" max="2000" step="10" class="input sm num" data-goal="workout" value="${goal}"></label></header>`
      + `<div class="progress"><span style="width:${LO.clamp(cur.min / goal, 0, 1) * 100}%"></span></div>`
      + `<p class="progress-label">${cur.min} / ${goal} ${esc(tc('min'))}</p>`
      + `<p class="sum-line"><b>${esc(t('sumLine')(cur.n, cur.min, cur.days))}</b><span class="hint">${esc(t('vsLast')(cur.min - prev.min))}</span></p>`;
    const types = Object.entries(cur.byType).sort((a, b) => b[1] - a[1]);
    if (types.length) {
      h += `<h3 class="sub-head">${esc(t('byType'))}</h3><ul class="hours">${types.map(([k, m]) => `<li class="k-health"><span class="hn">${esc(t('wt.' + k))}</span><b>${Math.round(m)} ${esc(tc('min'))}</b>`
        + `<span class="bar"><span style="width:${m / maxT * 100}%"></span></span></li>`).join('')}</ul>`;
    }
    h += `<h3 class="sub-head">${esc(t('topEx'))}</h3>`;
    h += top.length ? `<ul class="top-ex">${top.map(([n, v]) => `<li><span>${esc(n)}</span><span class="hint">${esc(t('exTimes')(v.n, v.sets))}</span></li>`).join('')}</ul>`
      : `<p class="empty-note">${esc(t('noEx'))}</p>`;
    h += `<h3 class="sub-head">${esc(t('last4'))}</h3>` + LO.bars([-3, -2, -1, 0].map((o) => {
      const st = weekStats(o);
      const { mon } = weekRange(o);
      return { v: st.min, label: LO.shortDate(LO.keyOf(mon)), title: `${st.min} ${tc('min')}`, cls: 'c-work' };
    }), { height: 70, goal: H.s.workoutGoal });
    return `${h}</section>`;
  }

  function planCard() {
    const S = H.s;
    const { mon, a } = weekRange(planOffset);
    const plan = S.plan[a] || {};
    let h = `<section class="card hcard" id="hw-plan"><header class="card-head"><h2>${esc(t('planTitle'))}</h2>`
      + `<div class="seg sm"><button type="button" data-pw="0" aria-selected="${planOffset === 0}">${esc(t('thisWk'))}</button><button type="button" data-pw="1" aria-selected="${planOffset === 1}">${esc(t('nextWk'))}</button></div></header>`;
    h += '<div class="plan-rows">';
    LO.seq(7).forEach((d) => {
      const x = plan[d] || { r: '', time: '18:00' };
      const date = LO.addDays(mon, d);
      h += `<div class="plan-row${x.r ? ' on' : ''}"><span class="pd">${esc(tc('days')[d])} <small>${LO.shortDate(LO.keyOf(date))}</small></span>`
        + `<select data-pday="${d}" aria-label="${esc(tc('days')[d])}"><option value="">${esc(t('rest'))}</option>${S.routines.map((r) => `<option value="${esc(r.id)}"${x.r === r.id ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select>`
        + `<input type="time" class="input sm" data-ptime="${d}" value="${esc(x.time)}"${x.r ? '' : ' disabled'}></div>`;
    });
    h += '</div>';
    h += `<div class="row plan-actions"><button type="button" class="btn primary" data-padd>${esc(t('addToSchedule'))}</button>`
      + `<span class="hint">${esc(plan.added ? t('planAdded') : t('planHint'))}</span></div>`;
    return `${h}</section>`;
  }

  function openRoutine(id) {
    const r = id ? H.s.routines.find((x) => x.id === id) : null;
    const v = r || { name: '', types: ['gym'], min: 45, level: 2, items: [{ name: '', sets: 3, reps: '10', weight: '' }] };
    LO.openForm({
      title: r ? t('editRoutine') : t('newRoutine'),
      body: `<label class="fld"><span>${esc(t('routineName'))}</span><input class="input" name="rname" maxlength="40" value="${esc(v.name)}" placeholder="${esc(t('routineNamePh'))}"></label>`
        + `<div class="fld"><span>${esc(t('types'))}</span><div class="chips">${LO.chips('rtype', WTYPES.map((x) => [x, esc(t('wt.' + x))]), 'checkbox', v.types)}</div></div>`
        + `<div class="form-row"><label class="fld"><span>${esc(t('routineMin'))}</span><input class="input" type="number" min="5" max="600" name="rmin" value="${v.min}"></label>`
        + `<div class="fld"><span>${esc(t('level'))}</span><div class="chips">${LO.chips('rlevel', [1, 2, 3].map((l) => [l, esc(t('levels')[l - 1])]), 'radio', [v.level])}</div></div></div>`
        + `<div class="fld"><span>${esc(t('exercises'))}</span><div class="ex-rows" data-exrows="dlg">${v.items.map(exRow).join('')}</div>`
        + `<button type="button" class="btn sm" data-exadd="dlg">${LO.icon.plus}<span>${esc(t('addEx'))}</span></button></div>`
        + `<datalist id="exListDlg">${H.s.exercises.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`,
      onOpen(dlg) {
        const rows = $('.ex-rows', dlg);
        $$('input[data-f="name"]', rows).forEach((i) => i.setAttribute('list', 'exListDlg'));
        $('[data-exadd="dlg"]', dlg).addEventListener('click', () => {
          rows.insertAdjacentHTML('beforeend', exRow({ name: '', sets: 3, reps: '10', weight: '' }, rows.children.length));
          const last = rows.lastElementChild;
          $('input[data-f="name"]', last).setAttribute('list', 'exListDlg');
          $('input[data-f="name"]', last).focus();
        });
        rows.addEventListener('click', (e) => { const b = e.target.closest('[data-exdel]'); if (b) b.closest('.ex-row').remove(); });
      },
      onSave(dlg) {
        const name = $('input[name="rname"]', dlg).value.trim();
        if (!name) return t('errRoutine');
        const items = normItems($$('.ex-row', dlg).map((row) => ({
          name: $('[data-f="name"]', row).value, sets: $('[data-f="sets"]', row).value,
          reps: $('[data-f="reps"]', row).value.trim(), weight: $('[data-f="weight"]', row).value.trim()
        })));
        const fields = { name, types: LO.checkedVals(dlg, 'rtype').filter((x) => WTYPES.includes(x)), min: LO.clamp(Math.round(+$('input[name="rmin"]', dlg).value) || 30, 5, 600), level: +(LO.checkedVal(dlg, 'rlevel') || 2), items };
        LO.mutate(H, (s) => {
          if (r) Object.assign(s.routines.find((x) => x.id === id), fields);
          else s.routines.push(Object.assign({ id: uid() }, fields));
          items.forEach((x) => { if (!s.exercises.includes(x.name)) s.exercises.push(x.name); });
        }, r ? tc('saved') : tc('added'));
        return true;
      },
      onDelete: r ? () => LO.mutate(H, (s) => { s.routines = s.routines.filter((x) => x.id !== id); }, tc('deleted')) : null
    });
  }

  function addPlanToSchedule() {
    const { mon, a } = weekRange(planOffset);
    const plan = H.s.plan[a] || {};
    const items = [];
    LO.seq(7).forEach((d) => {
      const x = plan[d];
      if (!x || !x.r) return;
      const r = H.s.routines.find((y) => y.id === x.r);
      if (!r) return;
      const start = LO.toMin(x.time || '18:00');
      items.push({ day: d, start, end: Math.min(start + r.min, 1440), title: r.name, cat: 'health', note: r.items.map(itemText).join('、') });
    });
    if (!items.length) { LO.toast(t('planEmpty')); return; }
    if (!LO.planner || !LO.planner.addWeekEvents) return;
    LO.planner.addWeekEvents(mon, items);
    H.s.plan[a] = Object.assign({}, plan, { added: true });
    H.save();
    LO.refresh();
  }

  /* ---------------- events (Exercise tab only) ---------------- */
  view.addEventListener('click', (e) => {
    const rt = e.target.closest('[data-rt]');
    if (rt) { const r = H.s.routines.find((x) => x.id === rt.dataset.rt); if (r) { applyRoutine(r); render(); } return; }
    const rte = e.target.closest('[data-rtedit]');
    if (rte) { openRoutine(rte.dataset.rtedit); return; }
    if (e.target.closest('[data-rtnew]')) { openRoutine(null); return; }
    if (e.target.closest('[data-wclear]')) { draft.routine = ''; draft.items = []; draft.types = []; draft.min = ''; draft.level = 2; render(); return; }
    if (e.target.closest('[data-exadd="draft"]')) {
      draft.items.push({ name: '', sets: 3, reps: '', weight: '' });
      render();
      const rows = $$('[data-exrows="draft"] .ex-row', view);
      if (rows.length) $('input[data-f="name"]', rows[rows.length - 1]).focus();
      return;
    }
    const exd = e.target.closest('[data-exrows="draft"] [data-exdel]');
    if (exd) { draft.items.splice(+exd.closest('.ex-row').dataset.i, 1); render(); return; }
    const pw = e.target.closest('[data-pw]');
    if (pw) { planOffset = +pw.dataset.pw; render(); return; }
    if (e.target.closest('[data-padd]')) { addPlanToSchedule(); return; }
    const q = e.target.closest('[data-qmin]');
    if (q) { draft.min = q.dataset.qmin; const i = $('input[name="wmin"]', view); if (i) i.value = draft.min; return; }
    const del = e.target.closest('[data-delw]');
    if (del) { const id = del.dataset.delw; LO.mutate(H, (s) => { s.workouts = s.workouts.filter((x) => x.id !== id); }, tc('deleted')); }
  });

  view.addEventListener('input', (e) => {
    const el = e.target;
    const exRowEl = el.closest('[data-exrows="draft"] .ex-row');
    if (exRowEl && el.dataset.f) {
      const it = draft.items[+exRowEl.dataset.i];
      if (it) it[el.dataset.f] = el.dataset.f === 'sets' ? (+el.value || 0) : el.value;
      return;
    }
    if (el.name === 'wnote') draft.note = el.value;
    else if (el.name === 'wmin') draft.min = el.value;
  });

  view.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.pday != null || el.dataset.ptime != null) {
      const { a } = weekRange(planOffset);
      const d = el.dataset.pday != null ? +el.dataset.pday : +el.dataset.ptime;
      LO.mutate(H, (s) => {
        const wk = s.plan[a] || (s.plan[a] = {});
        const x = wk[d] || { r: '', time: '18:00' };
        if (el.dataset.pday != null) x.r = el.value; else x.time = el.value || '18:00';
        if (x.r) wk[d] = x; else delete wk[d];
      });
      return;
    }
    if (el.closest('[data-exrows]')) return;
    if (el.name === 'wtype') draft.types = LO.checkedVals(view, 'wtype');
    else if (el.name === 'wlevel') draft.level = +el.value;
    else if (el.name === 'wdate') draft.date = el.value || LO.todayKey();
  });

  view.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form="workout"]');
    if (!f) return;
    e.preventDefault();
    const types = LO.checkedVals(f, 'wtype');
    const min = Math.round(+$('input[name="wmin"]', f).value);
    const err = $('[data-err="workout"]', f);
    if (!types.length) { err.textContent = t('errTypes'); return; }
    if (!(min > 0)) { err.textContent = t('errMin'); return; }
    const items = normItems(draft.items);
    const rec = { id: uid(), date: $('input[name="wdate"]', f).value || LO.todayKey(), types, min: Math.min(min, 1440), level: +(LO.checkedVal(f, 'wlevel') || 2), note: $('input[name="wnote"]', f).value.trim(), routine: draft.routine, items };
    draft.types = []; draft.min = ''; draft.note = ''; draft.level = 2; draft.routine = ''; draft.items = [];
    LO.mutate(H, (s) => {
      s.workouts.push(rec);
      items.forEach((x) => { if (!s.exercises.includes(x.name)) s.exercises.push(x.name); });
    }, t('logged'));
  });

  Object.assign(K, { workoutCard, summaryCard, planCard });
})();
