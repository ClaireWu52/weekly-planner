/*
 * Schedule, editing: the event dialog (new, edit, this week only, skip,
 * copy, delete) and the grid's click, drag to create, move and resize.
 * Plugs into planner.js through LO.plannerKit.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const K = LO.plannerKit;
  const { $, $$, esc, t, L, seq, clamp, uid, CATS, SNAP, curKey, week, mutate, plain, groupOf, rollbackSilently, renderGrid, fmt, fmtEnd, toMin, gridEl } = K;
  const dlg = $('#dlg');
  let dctx = null;
  let delArmed = false;

  const chipsHTML = (name, items, type, checked) => items.map(([v, label, cls]) =>
    `<label class="chip${cls ? ' ' + cls : ''}"><input type="${type}" name="${name}" value="${v}"${checked.includes(String(v)) ? ' checked' : ''}><span>${label}</span></label>`
  ).join('');

  function openNew(day, start, end) {
    dctx = { mode: 'new', rec: false };
    fillDialog({ title: '', cat: 'other', days: [day], start, end, place: '', note: '', from: '', until: '', repeat: 'once' });
  }

  function openEdit(id, rec) {
    const ev = rec ? K.state.recurring.find((e) => e.id === id) : week(curKey()).added.find((e) => e.id === id);
    if (!ev) return;
    dctx = { mode: 'edit', rec, id };
    const days = rec ? groupOf(id).map((e) => e.day).sort() : [ev.day];
    fillDialog({ title: ev.title, cat: ev.cat, days, start: ev.start, end: ev.end, place: ev.place, note: ev.note || '', from: ev.from || '', until: ev.until || '', repeat: rec ? 'weekly' : 'once' });
  }

  function fillDialog(v) {
    const c = dctx;
    $('#dlgTitle').textContent = c.mode === 'new' ? t('dlgNew') : t('dlgEdit');
    const badge = $('#dlgBadge');
    badge.hidden = c.mode === 'new';
    badge.textContent = c.rec ? t('badgeWeekly') : t('badgeOnce');
    $('#fTitle').value = v.title;
    $('#fPlace').value = v.place || '';
    $('#fNote').value = v.note || '';
    $('#fFrom').value = v.from || '';
    $('#fUntil').value = v.until || '';
    $('#fDurs').innerHTML = [30, 50, 60, 75, 90, 120].map((m) => `<button type="button" class="btn sm" data-dur="${m}">${m} ${esc(t('minUnit'))}</button>`).join('');
    $('#fStart').value = fmt(v.start);
    $('#fEnd').value = v.end >= 1440 ? '00:00' : fmt(v.end);
    $('#fCat').innerHTML = chipsHTML('fcat', CATS.map((k) => [k, `<i class="sw"></i>${esc(t('cats.' + k))}`, 'cat-' + k]), 'radio', [v.cat]);
    $('#fDays').innerHTML = chipsHTML('fday', seq(7).map((d) => [d, L().days[d]]), 'checkbox', v.days.map(String));
    $('#fRepeat').innerHTML = chipsHTML('frep', [['weekly', esc(t('weekly'))], ['once', esc(t('onceThisWeek'))]], 'radio', [v.repeat]);
    $('#repeatFld').hidden = c.rec;
    $('#fSave').textContent = c.rec ? t('saveWeekly') : t('save');
    $('#fSaveWeek').hidden = !c.rec;
    $('#fDel').hidden = c.mode === 'new';
    $('#fDup').hidden = c.mode === 'new';
    $('#fSkip').hidden = !c.rec;
    syncRange();
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
    const note = $('#fNote').value.trim();
    const from = $('#fFrom').value || '';
    const until = $('#fUntil').value || '';
    const repEl = $('input[name="frep"]:checked', dlg);
    const repeat = dctx.rec ? 'weekly' : (repEl ? repEl.value : 'once');
    const err = !title ? t('errTitle') : !days.length ? t('errDays') : (!sv || !ev || end <= start) ? t('errTime') : '';
    if (err) { $('#fErr').textContent = err; return null; }
    return { title, cat, days, start, end, place, note, from, until, repeat };
  }

  function saveDialog(scope) {
    const v = readDialog();
    if (!v) return;
    const c = dctx;
    const key = curKey();
    const base = { title: v.title, cat: v.cat, start: v.start, end: v.end, place: v.place };
    if (v.note) base.note = v.note;
    const rbase = Object.assign({}, base);
    if (v.from) rbase.from = v.from;
    if (v.until) rbase.until = v.until;
    const pick = (weekly) => (weekly ? rbase : base);
    mutate(() => {
      const w = week(key, true);
      const gid = 'g' + uid();
      if (c.mode === 'new') {
        v.days.forEach((day) => {
          if (v.repeat === 'weekly') K.state.recurring.push(Object.assign({ id: uid(), day, group: gid }, rbase));
          else w.added.push(Object.assign({ id: uid(), day }, base));
        });
      } else if (!c.rec) {
        w.added = w.added.filter((e) => e.id !== c.id);
        v.days.forEach((day, i) => {
          if (v.repeat === 'weekly') K.state.recurring.push(Object.assign({ id: i === 0 ? c.id : uid(), day, group: gid }, rbase));
          else w.added.push(Object.assign({ id: i === 0 ? c.id : uid(), day }, base));
        });
      } else if (scope === 'week') {
        groupOf(c.id).forEach((m) => { if (!w.skipped.includes(m.id)) w.skipped.push(m.id); });
        v.days.forEach((day) => w.added.push(Object.assign({ id: uid(), day }, base)));
      } else {
        const members = groupOf(c.id);
        const byDay = {};
        members.forEach((m) => { byDay[m.day] = m; });
        const keep = members.length && members[0].group ? members[0].group : gid;
        const ids = members.map((m) => m.id);
        K.state.recurring = K.state.recurring.filter((e) => !ids.includes(e.id));
        v.days.forEach((day) => K.state.recurring.push(Object.assign({ id: byDay[day] ? byDay[day].id : uid(), day, group: keep }, rbase)));
      }
    }, c.mode === 'new' ? t('added') : (c.rec && scope === 'week' ? t('changedThisWeek') : t('saved')));
    dlg.close();
  }

  $('#dlgForm').addEventListener('submit', (e) => { e.preventDefault(); saveDialog('weekly'); });
  $('#fSaveWeek').addEventListener('click', () => saveDialog('week'));
  function syncRange() {
    if (!dctx) return;
    const repEl = $('input[name="frep"]:checked', dlg);
    const weekly = dctx.rec || (repEl && repEl.value === 'weekly');
    $('#rangeFld').hidden = !weekly;
  }
  $('#fRepeat').addEventListener('change', syncRange);
  $('#fDurs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dur]');
    if (!b) return;
    const sv = $('#fStart').value;
    if (!sv) return;
    const end = Math.min(toMin(sv) + +b.dataset.dur, 1440);
    $('#fEnd').value = end >= 1440 ? '00:00' : fmt(end);
  });
  $('#fDup').addEventListener('click', () => {
    if (!dctx) return;
    const v = readDialog();
    if (!v) return;
    dctx = { mode: 'new', rec: false };
    fillDialog(v);
    LO.toast(t('duped'));
  });
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
        const ids = groupOf(c.id).map((m) => m.id);
        K.state.recurring = K.state.recurring.filter((e) => !ids.includes(e.id));
        Object.values(K.state.weeks).forEach((w) => { w.skipped = w.skipped.filter((i) => !ids.includes(i)); });
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
    return rec ? K.state.recurring.find((e) => e.id === id) : week(curKey()).added.find((e) => e.id === id);
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
        const ev = K.state.recurring.find((x) => x.id === d.ev.id);
        if (!ev) return;
        if (props.day === ev.day) {
          // same weekday, new time: move every day of the group together
          groupOf(ev.id).forEach((m) => { m.start = props.start; m.end = props.end; });
        } else {
          Object.assign(ev, props);
        }
      }, t('movedWeekly'), [{
        label: t('onlyThisWeek'),
        run: () => {
          rollbackSilently();
          mutate(() => {
            const w = week(key, true);
            const ev = K.state.recurring.find((x) => x.id === d.ev.id);
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

  // the "N due" tag on a day: one to-do opens it, several open the Tasks page
  gridEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-due]');
    if (!b) return;
    const due = LO.tasks.openTodos().filter((x) => x.due === b.dataset.due);
    if (due.length === 1) LO.tasks.openEditor('todo', due[0].id);
    else LO.go('tasks');
  });

  gridEl.addEventListener('keydown', (e) => {
    const evEl = e.target.closest('.ev');
    if (!evEl || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    openEdit(evEl.dataset.id, evEl.dataset.rec === '1');
  });

  Object.assign(K, { openNew, isDragging: () => !!drag });
})();
