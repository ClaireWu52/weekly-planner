/*
 * Click-through tests of the app itself (see ui-harness.js): typing, tapping
 * buttons and filling dialogs the way a person would, then checking the page
 * and the saved data.
 */
(() => {
  'use strict';

  // fill the shared dialog's fields by name and press its save button
  async function fillForm(app, fields) {
    const dlg = app.$('#formDlg');
    if (!dlg.open) throw new Error('the dialog is not open');
    Object.entries(fields).forEach(([name, v]) => {
      const els = app.$$(`[name="${name}"]`, dlg);
      if (!els.length) throw new Error(`no field ${name}`);
      if (els[0].type === 'radio' || els[0].type === 'checkbox') els.forEach((el) => { el.checked = String(el.value) === String(v); });
      else app.type(els[0], v);
    });
    await app.click('#formSave');
    const err = app.$('#formErr').textContent;
    if (dlg.open && err) throw new Error(`the dialog said: ${err}`);
  }
  const key = (app, n) => app.LO.keyOf(app.LO.addDays(new Date(), n));

  uiTest('every page opens without errors, in both languages', async (app) => {
    // '#/health' alone reopens the last Health tab, so each tab is named
    const pages = ['#/today', '#/today/news', '#/tasks', '#/schedule', '#/health/health', '#/health/rest', '#/health/calm', '#/growth/plan', '#/growth/term',
      '#/growth/wishes', '#/growth/learn', '#/growth/records', '#/growth/review', '#/life/food', '#/life/money', '#/life/dates', '#/life/wardrobe', '#/life/travel'];
    for (const lang of ['zh', 'en']) {
      await app.click(`[data-setlang="${lang}"]`);
      for (const p of pages) {
        await app.go(p);
        const leaf = p.split('/').pop();
        ok(!app.$(`#view-${leaf}`).hidden, `${p} is showing`);
        ok(app.$(`#view-${leaf}`).textContent.trim().length > 0, `${p} has content`);
      }
    }
  });

  uiTest('tasks: quick add reads a due date, ticking it off finishes it, undo brings it back', async (app) => {
    await app.go('#/tasks');
    app.$('[data-add="todo"] input').value = '交作业 明天';
    await app.submit('[data-add="todo"]');
    const x = app.LO.tasks.store.s.todos.find((y) => y.title === '交作业');
    ok(x, 'the to-do was added without the date in its name');
    eq(x.due, key(app, 1));
    ok(app.$(`[data-kind="todo"][data-id="${x.id}"]`), 'it is on the page');
    await app.click(`[data-kind="todo"][data-id="${x.id}"] [data-act="tcheck"]`);
    ok(app.LO.tasks.todoById(x.id).done, 'ticked off');
    app.LO.undo();
    eq(app.LO.tasks.todoById(x.id).done, false, 'undo');
  });

  uiTest('to-do on the schedule: shows on the grid, opens the to-do, crossed out when done', async (app) => {
    app.LO.tasks.addTodo({ title: 'Write essay', cat: 'study' });
    const x = app.LO.tasks.store.s.todos[app.LO.tasks.store.s.todos.length - 1];
    app.LO.tasks.openEditor('todo', x.id);
    await fillForm(app, { bdate: key(app, 0), btime: '14:00', est: 90 });
    eq(app.LO.planner.todoBlock(x.id), { date: key(app, 0), start: 840, end: 930 });
    await app.go('#/schedule');
    const ev = app.$('.ev.is-todo');
    ok(ev && ev.textContent.includes('Write essay'), 'on the grid');
    app.LO.tasks.toggleTodo(x.id);
    await app.wait(30);
    ok(app.$('.ev.is-todo').classList.contains('is-done'), 'crossed out');
    // taking it off the schedule
    app.LO.tasks.openEditor('todo', x.id);
    await app.click('[data-bclear]');
    await app.click('#formSave');
    eq(app.LO.planner.todoBlock(x.id), null);
  });

  uiTest('Today quick add: water, a workout, mood, spending and a to-do', async (app) => {
    await app.go('#/today');
    for (const line of ['喝了2杯水', '跑步 30分钟', '心情 4', '花了 25 午饭', '周五 交报告']) {
      app.$('[data-quick] input').value = line;
      await app.submit('[data-quick]');
    }
    const H = app.LO.health.store.s;
    const k = app.LO.todayKey();
    eq(H.water.days[k], 2);
    eq(H.workouts.map((w) => [w.types[0], w.min]), [['run', 30]]);
    eq(H.mood.days[k].v, 4);
    eq(app.LO.store('money').s.entries.map((e) => [e.amount, e.cat, e.note]), [[25, 'food', '午饭']]);
    ok(app.LO.tasks.store.s.todos.some((x) => x.title === '交报告' && x.due), 'a to-do with a due date');
  });

  uiTest('evening wrap-up: moves open focus items to tomorrow and keeps the note', async (app) => {
    app.w.Date.prototype.getHours = () => 21;
    app.LO.tasks.addTodo({ title: 'Read two chapters', focus: app.LO.todayKey() });
    await app.go('#/today');
    ok(app.$('.evening'), 'the card shows in the evening');
    await app.click('[data-eve="move"]');
    eq(app.LO.tasks.store.s.todos.find((x) => x.title === 'Read two chapters').focus, key(app, 1));
    app.type('[data-evenote]', 'A good day');
    await app.click('[data-eve="done"]');
    ok(app.$('.evening-done'), 'folded once done');
    eq(app.LO.evening.notes('2000-01-01', '2999-12-31').map((n) => n.note), ['A good day']);
  });

  uiTest('semester: a term, a course from the schedule and a graded exam give a GPA', async (app) => {
    app.LO.planner.importCalendar({ weekly: [{ title: 'CMSC 150', days: [0, 2], start: 600, end: 650, place: '', note: '', from: '', until: '', except: [] }], once: [] }, 'class');
    await app.go('#/growth/term');
    await app.click('[data-tnew]');
    await fillForm(app, { tname: 'Fall', tstart: key(app, -30), tend: key(app, 60) });
    await app.click('[data-tfrom]');
    const courses = app.LO.term.all()[0].courses;
    ok(courses.length > 0, 'classes on the schedule became courses');
    await app.click(`[data-course="${courses[0].id}"] [data-inew]`);
    await fillForm(app, { iname: 'Midterm', ikind: 'exam', iscore: 88, imax: 100, iweight: 30 });
    ok(app.$('#view-term').textContent.includes('B+'), 'letter grade shown');
    ok(app.$('#view-term').textContent.includes('3.30'), 'GPA shown');
    await app.go('#/today');
    ok(/第 \d+\/\d+ 周|Week \d+\/\d+/.test(app.$('#view-today .sub').textContent), 'Today shows the week of term');
  });

  uiTest('spending: an entry, a fixed monthly cost and the budget', async (app) => {
    await app.go('#/life/money');
    app.$('[name="mamt"]').value = '12.5';
    app.$('[name="mnote"]').value = 'coffee';
    await app.submit('[data-madd]');
    await app.click('[data-mset]');
    await fillForm(app, { sbud: 600 });
    await app.click('[data-fnew]');
    await fillForm(app, { fname: 'Rent', famt: 800, fday: 1 });
    const M = app.LO.store('money').s;
    eq(M.entries.map((e) => [e.amount, e.cat]).sort(), [[12.5, 'food'], [800, 'home']]);
    ok(app.$('#view-money').textContent.includes('812.5'), 'month total');
    // coming back to the app the same month logs nothing more
    app.d.dispatchEvent(new app.w.Event('visibilitychange'));
    eq(M.entries.length, 2);
  });

  uiTest('special days: shows on Today ahead of time and adds a gift to-do', async (app) => {
    await app.go('#/life/dates');
    await app.click('[data-dnew]');
    const soon = key(app, 3);
    await fillForm(app, { dname: 'Mom', ddate: `1975-${soon.slice(5)}`, dyear: 1975 });
    await app.go('#/today');
    ok(app.$('.dates-today') && app.$('.dates-today').textContent.includes('Mom'), 'on Today');
    await app.click('.dates-today [data-dgift]');
    const g = app.LO.tasks.store.s.todos.find((x) => x.title.includes('Mom'));
    ok(g, 'gift to-do');
    eq(g.due, key(app, 1));
  });

  uiTest('semester: a dated assignment is a to-do; ticking it off asks for the score; the score finishes it', async (app) => {
    app.LO.planner.importCalendar({ weekly: [{ title: 'MATH 211', days: [1], start: 600, end: 650, place: '', note: '', from: '', until: '', except: [] }], once: [] }, 'class');
    await app.go('#/growth/term');
    await app.click('[data-tnew]');
    await fillForm(app, { tname: 'Fall', tstart: key(app, -30), tend: key(app, 60) });
    await app.click('[data-tfrom]');
    const c0 = app.LO.term.all()[0].courses[0];
    // a syllabus: homework 40% by points, final 60%; and an A from 94
    await app.click(`[data-course="${c0.id}"] [data-cedit]`);
    for (const [n, w] of [['Homework', 40], ['Final', 60]]) {
      await app.click('[data-catadd]');
      const li = app.$$('.cat-edit li').pop();
      app.type(app.$('[data-catn]', li), n);
      app.type(app.$('[data-catw]', li), String(w));
    }
    await fillForm(app, { cscale: 'custom', 'cut-A': 94, 'cut-A-': 90 });
    let c = app.LO.term.all()[0].courses[0];
    eq(c.cats.map((k) => [k.name, k.weight]), [['Homework', 40], ['Final', 60]]);
    await app.click(`[data-course="${c.id}"] [data-inew]`);
    await fillForm(app, { iname: 'HW 1', icat: c.cats[0].id, idate: key(app, 2), imax: 20 });
    c = app.LO.term.all()[0].courses[0];
    const hw = c.items.find((i) => i.title === 'HW 1');
    const todo = app.LO.tasks.todoById(`term-${hw.id}`);
    ok(todo && todo.due === key(app, 2), 'a to-do due that day');
    app.LO.tasks.toggleTodo(todo.id);
    await app.wait(30);
    ok(app.$$('#toast button').some((b) => b.textContent === app.LO.t('term.addScore')), 'offers to add the score');
    ok(app.$('.term-wait'), 'listed as waiting for a grade');
    await app.click(`.term-wait [data-item="${hw.id}"]`);
    await fillForm(app, { iscore: 19 });
    ok(!app.$('.term-wait'), 'no longer waiting');
    ok(app.$(`[data-course="${c.id}"] .term-grade`).textContent.includes('95%') && app.$(`[data-course="${c.id}"] .term-grade`).textContent.includes('A'), '19/20 is 95%, an A here');
  });

  uiTest('undo after deleting a to-do on the schedule brings back its time too', async (app) => {
    app.LO.tasks.addTodo({ title: 'Lab report' });
    const x = app.LO.tasks.store.s.todos[app.LO.tasks.store.s.todos.length - 1];
    app.LO.tasks.openEditor('todo', x.id);
    await fillForm(app, { bdate: key(app, 1), btime: '10:00' });
    app.LO.tasks.openEditor('todo', x.id);
    await app.click('#formDel');
    await app.click('#formDel');
    eq(app.LO.planner.todoBlock(x.id), null, 'gone from the schedule');
    app.LO.undo();
    ok(app.LO.tasks.todoById(x.id), 'the to-do is back');
    eq(app.LO.planner.todoBlock(x.id), { date: key(app, 1), start: 600, end: 660 }, 'and its time');
  });

  uiTest('Today: fold a card, then move a card to the top under Customize', async (app) => {
    await app.go('#/today');
    await app.click('[data-cfold="schedule"]');
    ok(app.$('.is-folded [data-cfold="schedule"]'), 'folded to its title');
    await app.click('.is-folded [data-cfold="schedule"]');
    ok(!app.$('.is-folded [data-cfold="schedule"]'), 'open again');
    await app.click('#moreBtn');
    await app.click('[data-act="customize"]');
    const li = app.$('.card-order li[data-card="health"]');
    for (let i = 0; i < 15; i++) await app.click(app.$('[data-cmove="-1"]', li));
    await app.click('#formSave');
    eq(app.LO.settings().todayOrder[0], 'health');
    eq(app.$('#view-today .o4').style.order, '1', 'first down the page on a phone');
  });

  uiTest('search: finds a to-do and opens it', async (app) => {
    app.LO.tasks.addTodo({ title: 'Buy a lab notebook' });
    app.d.dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }));
    await app.wait(30);
    app.type('[data-sq]', 'lab note');
    ok(app.$('.search-list li b').textContent.includes('lab notebook'), 'listed');
    app.$('[data-sq]').dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await app.wait(30);
    ok(app.$('#formDlg').open && app.$('[name="title"]').value === 'Buy a lab notebook', 'its editor opened');
  });
})();
