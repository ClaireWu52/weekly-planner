/*
 * Birthdays and anniversaries (Life → 纪念日): friends' and family's birthdays,
 * anniversaries and other yearly days. They show on Today a few days ahead,
 * can add a "get a gift" to-do, and go into the calendar export as yearly events.
 * The date math is in dates-calc.js.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;
  const D = LO.datesCalc;
  const KINDS = ['birthday', 'anniv', 'other'];
  const ICON = { birthday: '🎂', anniv: '💝', other: '📌' };
  const REMIND = [0, 1, 3, 7, 14];

  LO.strings('dates', {
    zh: {
      title: '纪念日', sub: '生日、纪念日和每年都要记得的日子，快到时会在今天页提醒你。', add: '添加', newDate: '新的纪念日', editDate: '编辑纪念日',
      name: '名称', namePh: '比如：妈妈、和小林认识', kind: '类型', kinds: { birthday: '生日', anniv: '纪念日', other: '其他' },
      date: '日期', year: '哪一年（可不填）', yearHint: '填了年份会显示几岁或几周年。', remind: '提前几天在今天页提醒',
      remindOpt: (n) => (n ? `${n} 天` : '当天'), note: '备注', notePh: '比如：喜欢的东西、想送的礼物',
      empty: '还没有纪念日。把家人和朋友的生日加进来，就不会忘了。', errName: '请填写名称。', errDate: '请选一个日期。',
      inDays: (n) => (n === 0 ? '就是今天' : n === 1 ? '明天' : `${n} 天后`), age: (k, n) => (k === 'birthday' ? `${n} 岁生日` : `${n} 周年`),
      birthday: (name) => `${name}的生日`, gift: '加个待办：准备礼物', giftTodo: (name) => `给${name}准备礼物`, giftAdded: '已加到待办',
      todayCard: '快到的日子', todayIs: (x) => `今天是${x}`, open: '全部'
    },
    en: {
      title: 'Special days', sub: 'Birthdays, anniversaries and other days to remember. Today reminds you as they come up.', add: 'Add', newDate: 'New special day', editDate: 'Edit special day',
      name: 'Name', namePh: 'e.g. Mom, the day we met', kind: 'Type', kinds: { birthday: 'Birthday', anniv: 'Anniversary', other: 'Other' },
      date: 'Date', year: 'Year (optional)', yearHint: 'With a year it shows the age or how many years.', remind: 'Show on Today this many days ahead',
      remindOpt: (n) => (n ? `${n} day${n > 1 ? 's' : ''}` : 'On the day'), note: 'Notes', notePh: 'e.g. what they like, gift ideas',
      empty: "No special days yet. Add your family's and friends' birthdays and you won't forget them.", errName: 'Add a name.', errDate: 'Pick a date.',
      inDays: (n) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`), age: (k, n) => (k === 'birthday' ? `turns ${n}` : `${n} year${n > 1 ? 's' : ''}`),
      birthday: (name) => `${name}'s birthday`, gift: 'Add a to-do: get a gift', giftTodo: (name) => `Get a gift for ${name}`, giftAdded: 'Added to to-dos',
      todayCard: 'Coming up', todayIs: (x) => `Today: ${x}`, open: 'All'
    }
  });
  const t = LO.ns('dates');
  const tc = LO.ns('common');

  const isMd = (v) => typeof v === 'string' && /^\d{2}-\d{2}$/.test(v);
  const S = LO.createStore('dates', 'planner:dates:v1', () => ({ v: 1, list: [] }), (s) => ({
    v: 1,
    list: (s.list || []).filter((x) => x && typeof x.name === 'string' && isMd(x.md)).map((x) => ({
      id: String(x.id || uid()), name: x.name.slice(0, 40), md: x.md, year: Number.isInteger(x.year) && x.year > 1900 && x.year < 2200 ? x.year : 0,
      kind: KINDS.includes(x.kind) ? x.kind : 'birthday', note: typeof x.note === 'string' ? x.note : '', remind: REMIND.includes(x.remind) ? x.remind : 7
    }))
  }));

  const label = (x) => (x.kind === 'birthday' ? t('birthday')(x.name) : x.name);
  const upcoming = () => {
    const today = LO.todayKey();
    return S.s.list.map((x) => Object.assign({ x }, D.next(x.md, x.year, today))).sort((a, b) => a.days - b.days);
  };
  const mdText = (md) => { const [m, d] = md.split('-').map(Number); return LO.lang() === 'zh' ? `${m}月${d}日` : new Date(2000, m - 1, d).toLocaleString('en-US', { month: 'short', day: 'numeric' }); };
  const line = (u) => `${ICON[u.x.kind]} <b>${esc(label(u.x))}</b><span class="hint">${esc(t('inDays')(u.days))}${u.years ? ` · ${esc(t('age')(u.x.kind, u.years))}` : ''}</span>`;

  /* ---------------- page ---------------- */
  const view = $('#view-dates');
  function render() {
    const list = upcoming();
    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1><p class="sub">${esc(t('sub'))}</p></div>`
      + `<button type="button" class="btn primary" data-dnew>${LO.icon.plus}<span>${esc(t('add'))}</span></button></div>`;
    h += list.length
      ? `<ul class="dates-list card">${list.map((u) => `<li data-did="${esc(u.x.id)}"><button type="button" class="dates-main" data-dedit>${line(u)}<small>${esc(mdText(u.x.md))}${u.x.note ? ` · ${esc(u.x.note)}` : ''}</small></button>`
        + `<button type="button" class="btn sm ghost" data-dgift>${esc(t('gift'))}</button></li>`).join('')}</ul>`
      : `<section class="card empty-card"><p>${esc(t('empty'))}</p><button type="button" class="btn primary" data-dnew>${esc(t('add'))}</button></section>`;
    view.innerHTML = h;
  }

  function edit(id) {
    const x = id ? S.s.list.find((y) => y.id === id) : null;
    const v = x || { name: '', md: '', year: 0, kind: 'birthday', note: '', remind: 7 };
    // the date input needs a year; a leap year keeps Feb 29 possible
    const dateVal = v.md ? `${v.year || 2000}-${v.md}` : '';
    LO.openForm({
      title: x ? t('editDate') : t('newDate'),
      body: `<label class="fld"><span>${esc(t('name'))}</span><input class="input" name="dname" maxlength="40" value="${esc(v.name)}" placeholder="${esc(t('namePh'))}"></label>`
        + `<div class="fld"><span>${esc(t('kind'))}</span><div class="chips">${LO.chips('dkind', KINDS.map((k) => [k, `${ICON[k]} ${esc(t('kinds')[k])}`]), 'radio', [v.kind])}</div></div>`
        + `<div class="row"><label class="fld"><span>${esc(t('date'))}</span><input class="input date" type="date" name="ddate" value="${esc(dateVal)}"></label>`
        + `<label class="fld"><span>${esc(t('year'))}</span><input class="input sm" type="number" min="1900" max="2199" name="dyear" value="${v.year || ''}"></label></div><p class="hint">${esc(t('yearHint'))}</p>`
        + `<div class="fld"><span>${esc(t('remind'))}</span><div class="chips">${LO.chips('dremind', REMIND.map((n) => [n, esc(t('remindOpt')(n))]), 'radio', [v.remind])}</div></div>`
        + `<label class="fld"><span>${esc(t('note'))}</span><input class="input" name="dnote" maxlength="120" value="${esc(v.note)}" placeholder="${esc(t('notePh'))}"></label>`,
      onOpen(dlg) {
        // picking a date fills the year field once, if it's empty
        $('input[name="ddate"]', dlg).addEventListener('change', (e) => {
          const y = $('input[name="dyear"]', dlg);
          if (!y.value && e.target.value && !x) y.value = e.target.value.slice(0, 4);
        });
      },
      onSave(dlg) {
        const name = $('input[name="dname"]', dlg).value.trim();
        const date = $('input[name="ddate"]', dlg).value;
        if (!name) return t('errName');
        if (!date) return t('errDate');
        const yr = Math.round(+$('input[name="dyear"]', dlg).value) || 0;
        const fields = { name, md: date.slice(5), year: yr > 1900 && yr < 2200 ? yr : 0, kind: LO.checkedVal(dlg, 'dkind') || 'birthday', remind: +(LO.checkedVal(dlg, 'dremind') || 7), note: $('input[name="dnote"]', dlg).value.trim() };
        LO.mutate(S, (s) => {
          const y = x && s.list.find((z) => z.id === x.id);
          if (y) Object.assign(y, fields); else s.list.push(Object.assign({ id: uid() }, fields));
        }, x ? tc('saved') : tc('added'));
        return true;
      },
      onDelete: x ? () => LO.mutate(S, (s) => { s.list = s.list.filter((z) => z.id !== x.id); }, tc('deleted')) : null
    });
  }

  // a to-do due two days before (or today, when it's closer than that)
  function gift(id) {
    const u = upcoming().find((y) => y.x.id === id);
    if (!u || !LO.tasks) return;
    const due = u.days >= 2 ? LO.keyOf(LO.addDays(LO.parseKey(u.date), -2)) : LO.todayKey();
    LO.tasks.addTodo({ title: t('giftTodo')(u.x.name), due, cat: 'life', notes: u.x.note });
    LO.toast(t('giftAdded'), [{ label: tc('undo'), run: LO.undo }]);
  }

  function wire(root) {
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-dnew]')) { edit(null); return; }
      const li = e.target.closest('[data-did]');
      if (!li) return;
      if (e.target.closest('[data-dgift]')) gift(li.dataset.did);
      else if (e.target.closest('[data-dedit]')) edit(li.dataset.did);
    });
  }
  wire(view);
  const todayView = $('#view-today');
  if (todayView) wire(todayView);

  LO.view('dates', { render });

  LO.dates = {
    // Today's card: days within each one's reminder window
    todayHTML() {
      const list = upcoming().filter((u) => u.days <= u.x.remind);
      if (!list.length) return '';
      return `<section class="card o3 dates-today"><header class="card-head"><h2>${esc(t('todayCard'))}</h2><a class="link" href="#/life/dates">${esc(t('open'))}</a></header>`
        + `<ul class="dates-list compact">${list.map((u) => `<li data-did="${esc(u.x.id)}"${u.days === 0 ? ' class="is-today"' : ''}><button type="button" class="dates-main" data-dedit>${line(u)}</button>${u.days > 0 ? `<button type="button" class="btn sm ghost" data-dgift>🎁</button>` : ''}</li>`).join('')}</ul></section>`;
    },
    // yearly all-day events for the calendar export
    calendarItems: () => S.s.list.map((x) => ({ uid: `date-${x.id}`, title: `${ICON[x.kind]} ${label(x)}`, md: x.md, start: D.next(x.md, 0, LO.todayKey()).date, desc: x.note }))
  };
})();
