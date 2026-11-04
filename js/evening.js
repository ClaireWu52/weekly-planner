/*
 * Evening wrap-up: a card on Today from 7 pm (until 4 am, for the same day)
 * that sums up the day, moves unfinished focus items to tomorrow, takes
 * tomorrow's most important thing and a one-line note on the day.
 * The notes also show in the weekly review.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc } = LO;

  LO.strings('evening', {
    zh: {
      title: '今晚收尾', summary: (td, dd, dn, fm) => `今天完成了 ${td} 个待办，每日任务 ${dd}/${dn}，专注 ${fm} 分钟。`,
      left: '这些重点还没做完：', move: (n) => `挪到明天（${n}）`, moved: (n) => `已把 ${n} 件挪到明天`,
      tomorrow: '明天最重要的一件事', tomorrowPh: '写下来，明天打开就能看到', tomorrowAdded: '已加进明天的重点',
      note: '用一句话记下今天', notePh: '今天最开心的事、学到的东西，或者只是今天的感觉',
      done: '完成收尾', doneToast: '今天收尾完成，早点休息', later: '今天不收尾', wrapped: '今天已经收尾了', reopen: '再看看'
    },
    en: {
      title: 'Wrap up the day', summary: (td, dd, dn, fm) => `Today: ${td} to-dos done, dailies ${dd}/${dn}, ${fm} min of focus.`,
      left: 'Focus items still open:', move: (n) => `Move to tomorrow (${n})`, moved: (n) => `Moved ${n} to tomorrow`,
      tomorrow: "Tomorrow's most important thing", tomorrowPh: "Write it down and it's waiting for you tomorrow", tomorrowAdded: "Added to tomorrow's focus",
      note: 'Today in one line', notePh: 'The best part, something you learned, or just how it felt',
      done: 'Done for today', doneToast: 'All wrapped up. Get some rest.', later: 'Skip today', wrapped: 'Day wrapped up', reopen: 'Open again'
    }
  });
  const t = LO.ns('evening');

  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  // days: { 'YYYY-MM-DD': { note, done, skip } }
  const E = LO.createStore('evening', 'planner:evening:v1', () => ({ v: 1, days: {} }), (s) => {
    const out = { v: 1, days: {} };
    Object.entries((s && s.days) || {}).forEach(([k, d]) => {
      if (!isKey(k) || !d) return;
      out.days[k] = { note: typeof d.note === 'string' ? d.note : '', done: !!d.done, skip: !!d.skip };
    });
    return out;
  });

  // The day being wrapped up: today from 7 pm, yesterday until 4 am, otherwise none.
  function wrapDay(now) {
    const h = now.getHours();
    if (h >= 19) return LO.todayKey();
    if (h < 4) return LO.keyOf(LO.addDays(now, -1));
    return '';
  }
  const nextOf = (k) => LO.keyOf(LO.addDays(LO.parseKey(k), 1));
  const day = (k, create) => {
    if (!E.s.days[k] && create) E.s.days[k] = { note: '', done: false, skip: false };
    return E.s.days[k] || { note: '', done: false, skip: false };
  };
  let reopened = '';

  function openFocus(k) {
    return LO.tasks.store.s.todos.filter((x) => !x.done && x.focus === k);
  }

  function cardHTML() {
    const k = wrapDay(new Date());
    if (!k || !LO.tasks) return '';
    const d = day(k);
    if (d.skip) return '';
    if (d.done && reopened !== k) {
      return `<p class="hint evening-done">🌙 ${esc(t('wrapped'))} · <button type="button" class="link link-btn" data-eve="reopen">${esc(t('reopen'))}</button></p>`;
    }
    const T = LO.tasks;
    const date = LO.parseKey(k);
    const todosDone = T.store.s.todos.filter((x) => x.done && x.doneAt === k).length;
    const due = T.store.s.dailies.filter((x) => T.isDue(x, date));
    const dailiesDone = due.filter((x) => T.isDone(x, k)).length;
    const focusMin = LO.focus ? LO.focus.minutesOn(k) : 0;
    const left = openFocus(k);
    let h = `<section class="card evening"><header class="card-head"><h2>🌙 ${esc(t('title'))}</h2>`
      + `<button type="button" class="link link-btn" data-eve="skip">${esc(t('later'))}</button></header>`
      + `<p class="evening-sum">${esc(t('summary')(todosDone, dailiesDone, due.length, focusMin))}</p>`;
    if (left.length) {
      h += `<div class="evening-left"><span>${esc(t('left'))}</span><ul>${left.map((x) => `<li>${esc(x.title)}</li>`).join('')}</ul>`
        + `<button type="button" class="btn sm" data-eve="move">${esc(t('move')(left.length))}</button></div>`;
    }
    h += `<div class="fld"><span>${esc(t('tomorrow'))}</span><form class="quick-add" data-eveadd><input maxlength="80" autocomplete="off" placeholder="${esc(t('tomorrowPh'))}" aria-label="${esc(t('tomorrow'))}"><button type="submit" class="icon-btn" aria-label="${esc(LO.t('common.add'))}">${LO.icon.plus}</button></form></div>`
      + `<label class="fld"><span>${esc(t('note'))}</span><textarea class="input ta" rows="2" maxlength="300" data-evenote placeholder="${esc(t('notePh'))}">${esc(d.note)}</textarea></label>`
      + `<div class="evening-actions"><button type="button" class="btn primary" data-eve="done">${esc(t('done'))}</button></div></section>`;
    return h;
  }

  function act(a) {
    const k = wrapDay(new Date());
    if (!k) return;
    if (a === 'reopen') { reopened = k; LO.refresh(); return; }
    if (a === 'move') {
      const ids = openFocus(k).map((x) => x.id);
      const next = nextOf(k);
      LO.mutate(LO.tasks.store, (s) => { s.todos.forEach((x) => { if (ids.includes(x.id)) x.focus = next; }); }, t('moved')(ids.length));
      return;
    }
    LO.mutate(E, () => {
      const d = day(k, true);
      if (a === 'done') d.done = true;
      if (a === 'skip') d.skip = true;
    }, a === 'done' ? t('doneToast') : null);
    reopened = '';
  }

  function wire(view) {
    view.addEventListener('click', (e) => {
      const b = e.target.closest('[data-eve]');
      if (b) act(b.dataset.eve);
    });
    view.addEventListener('input', (e) => {
      if (!e.target.matches('[data-evenote]')) return;
      const k = wrapDay(new Date());
      if (!k) return;
      day(k, true).note = e.target.value;
      E.save();
    });
    view.addEventListener('submit', (e) => {
      const f = e.target.closest('[data-eveadd]');
      if (!f) return;
      e.preventDefault();
      const k = wrapDay(new Date());
      const title = $('input', f).value.trim();
      if (!k || !title) return;
      LO.tasks.addTodo({ title, focus: nextOf(k) });
      LO.toast(t('tomorrowAdded'));
    });
  }

  const view = $('#view-today');
  if (view) wire(view);

  LO.evening = {
    cardHTML,
    // one-line notes for a range of days, for the weekly review
    notes: (a, b) => Object.entries(E.s.days).filter(([k, d]) => k >= a && k <= b && d.note.trim()).sort(([x], [y]) => (x < y ? -1 : 1)).map(([k, d]) => ({ date: k, note: d.note.trim() }))
  };
})();
