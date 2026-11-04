/*
 * Everyday spending (Life → 记账): what you spend day to day, by category,
 * against a monthly budget, with how much is left per day. Trip spending stays
 * on each trip. Today's quick add can also log spending here ("花了 25 午饭").
 * Fixed monthly costs (rent, subscriptions) are logged by themselves on their day,
 * and everything can be exported as a CSV file that Excel opens.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;
  const CATS = ['food', 'shop', 'trans', 'fun', 'study', 'home', 'health', 'other'];
  const CURS = { USD: '$', CNY: '¥', EUR: '€', GBP: '£', JPY: '¥', KRW: '₩', HKD: 'HK$', CAD: 'C$', AUD: 'A$' };
  // a note's words that pick its category when none is chosen
  const GUESS = [
    ['food', /饭|餐|咖啡|奶茶|外卖|零食|水果|超市|菜|面|火锅|lunch|dinner|breakfast|coffee|tea|food|grocer|snack|pizza|burger|starbucks|chipotle|restaurant|meal/i],
    ['trans', /地铁|公交|打车|车票|机票|油|停车|uber|lyft|taxi|bus|train|metro|gas|parking|flight/i],
    ['study', /书|课本|文具|打印|学费|课程|book|textbook|print|tuition|course|stationery/i],
    ['home', /房租|水电|网费|话费|rent|utilities|internet|phone bill|wifi/i],
    ['fun', /电影|游戏|演唱会|ktv|门票|movie|game|concert|ticket|netflix|spotify/i],
    ['health', /药|医院|看病|健身房|药店|pharmacy|doctor|medicine|gym/i],
    ['shop', /衣服|鞋|淘宝|网购|化妆|amazon|target|clothes|shoes|shopping|walmart/i]
  ];

  LO.strings('money', {
    zh: {
      title: '记账', sub: '日常的花费，旅行的花费记在每个行程里。',
      spent: '这个月花了', budget: '月预算', left: '还剩', perDay: (x) => `每天还能花 ${x}`, over: (x) => `超出预算 ${x}`, noBudget: '没设预算',
      vsLast: (p) => (p > 0 ? `比上个月同期多 ${p}%` : p < 0 ? `比上个月同期少 ${-p}%` : '和上个月同期差不多'),
      byCat: '按类别', add: '记一笔', amount: '金额', note: '备注', notePh: '比如：午饭、地铁、课本', date: '日期', cat: '类别',
      cats: { food: '餐饮', shop: '购物', trans: '交通', fun: '娱乐', study: '学习', home: '住房', health: '医疗健康', other: '其他' },
      settings: '设置', currency: '货币', budgetPh: '每月打算花多少，不设就空着', errAmount: '请填一个大于 0 的金额。',
      empty: '这个月还没有记账。也可以在今天页的快速记录里写「花了 25 午饭」。', edit: '编辑这笔', recorded: (x) => `已记一笔：${x}`,
      prevMonth: '上个月', nextMonth: '下个月', monthTitle: (y, m) => `${y} 年 ${m} 月`, total: '合计',
      fixed: '每月固定支出', fixedHint: '房租、订阅这类每个月都有的，到了那天会自动记一笔。', fixedEmpty: '还没有固定支出。', addFixed: '添加固定支出',
      newFixed: '新的固定支出', editFixed: '编辑固定支出', fname: '名称', fnamePh: '比如：房租、Spotify', fday: '每月几号', fdayOpt: (n) => `${n} 日`,
      fdayHint: '没有这一天的月份（比如 31 日），就记在那个月的最后一天。', fixedTag: (n) => `每月 ${n} 日`, fixedNote: '固定', fixedAdded: (n) => `已自动记了 ${n} 笔固定支出`,
      exportCsv: '导出表格', exported: (n) => `已导出 ${n} 笔`, csvHead: ['日期', '金额', '货币', '类别', '备注']
    },
    en: {
      title: 'Spending', sub: 'Everyday spending. Trip spending lives on each trip.',
      spent: 'Spent this month', budget: 'Monthly budget', left: 'Left', perDay: (x) => `${x} a day left`, over: (x) => `${x} over budget`, noBudget: 'No budget set',
      vsLast: (p) => (p > 0 ? `${p}% more than this time last month` : p < 0 ? `${-p}% less than this time last month` : 'About the same as last month'),
      byCat: 'By category', add: 'Add', amount: 'Amount', note: 'Note', notePh: 'e.g. lunch, subway, textbook', date: 'Date', cat: 'Category',
      cats: { food: 'Food', shop: 'Shopping', trans: 'Transport', fun: 'Fun', study: 'School', home: 'Home', health: 'Health', other: 'Other' },
      settings: 'Settings', currency: 'Currency', budgetPh: 'How much you plan to spend a month; leave empty for none', errAmount: 'Enter an amount above 0.',
      empty: 'Nothing logged this month. You can also type "spent 8 on coffee" into quick add on Today.', edit: 'Edit', recorded: (x) => `Logged ${x}`,
      prevMonth: 'Previous month', nextMonth: 'Next month', monthTitle: (y, m) => new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }), total: 'Total',
      fixed: 'Fixed monthly costs', fixedHint: 'Rent, subscriptions and the like are logged by themselves on their day each month.', fixedEmpty: 'No fixed costs yet.', addFixed: 'Add a fixed cost',
      newFixed: 'New fixed cost', editFixed: 'Edit fixed cost', fname: 'Name', fnamePh: 'e.g. Rent, Spotify', fday: 'Day of the month', fdayOpt: (n) => String(n),
      fdayHint: 'In months without that day (like the 31st), it goes on the last day.', fixedTag: (n) => `Monthly, day ${n}`, fixedNote: 'Fixed', fixedAdded: (n) => `Logged ${n} fixed cost${n > 1 ? 's' : ''}`,
      exportCsv: 'Export spreadsheet', exported: (n) => `Exported ${n} entries`, csvHead: ['Date', 'Amount', 'Currency', 'Category', 'Note']
    }
  });
  const t = LO.ns('money');
  const tc = LO.ns('common');

  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const guessCur = () => ((navigator.language || '').toLowerCase().startsWith('zh') ? 'CNY' : 'USD');
  const isMonth = (k) => typeof k === 'string' && /^\d{4}-\d{2}$/.test(k);
  // fixed: [{ id, name, amount, cat, day, last }], last = the latest month ('YYYY-MM') already logged
  const M = LO.createStore('money', 'planner:money:v1', () => ({ v: 1, cur: guessCur(), budget: 0, entries: [], fixed: [] }), (s) => ({
    v: 1,
    cur: CURS[s.cur] ? s.cur : guessCur(),
    budget: Math.max(0, +s.budget || 0),
    entries: (s.entries || []).filter((e) => e && isKey(e.date) && +e.amount > 0).map((e) => ({
      id: String(e.id || uid()), date: e.date, amount: Math.round(+e.amount * 100) / 100, cat: CATS.includes(e.cat) ? e.cat : 'other', note: typeof e.note === 'string' ? e.note.slice(0, 60) : '',
      ...(typeof e.fixed === 'string' && e.fixed ? { fixed: e.fixed } : {})
    })),
    fixed: (s.fixed || []).filter((f) => f && typeof f.name === 'string' && +f.amount > 0).map((f) => ({
      id: String(f.id || uid()), name: f.name.slice(0, 40), amount: Math.round(+f.amount * 100) / 100, cat: CATS.includes(f.cat) ? f.cat : 'home',
      day: LO.clamp(Math.round(+f.day) || 1, 1, 31), last: isMonth(f.last) ? f.last : ''
    }))
  }));

  /* ---------------- fixed monthly costs ---------------- */
  const pad = (n) => String(n).padStart(2, '0');
  const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const nextMonth = (m) => { const [y, mo] = m.split('-').map(Number); return monthKey(new Date(y, mo, 1)); };
  // the day a fixed cost falls on in a month, moved to the month's last day when it's short
  const dayIn = (m, day) => { const [y, mo] = m.split('-').map(Number); return `${m}-${pad(Math.min(day, new Date(y, mo, 0).getDate()))}`; };
  // Logs each fixed cost for every month from the one after `last` up to now, once its day
  // has come. The entry's id is made from the cost and the month, so two devices doing this
  // at the same time end up with the same entry after syncing, not two.
  function logFixed() {
    const today = LO.todayKey();
    const cur = today.slice(0, 7);
    const due = [];
    M.s.fixed.forEach((f) => {
      let m = f.last ? nextMonth(f.last) : cur;
      for (let i = 0; i < 24 && m <= cur; i++, m = nextMonth(m)) {
        const date = dayIn(m, f.day);
        if (date > today) break;
        due.push({ f, m, date });
      }
    });
    if (!due.length) return 0;
    due.forEach(({ f, m, date }) => {
      const id = `fx-${f.id}-${m}`;
      if (!M.s.entries.some((e) => e.id === id)) M.s.entries.push({ id, date, amount: f.amount, cat: f.cat, note: f.name, fixed: f.id });
      f.last = m;
    });
    M.save();
    return due.length;
  }

  const fmt = (n) => {
    const sym = CURS[M.s.cur];
    const v = Math.round(n * 100) / 100;
    return `${sym}${v % 1 ? v.toFixed(2) : v}`;
  };
  const guess = (note) => (GUESS.find(([, re]) => re.test(note)) || ['other'])[0];
  const between = (a, b) => M.s.entries.filter((e) => e.date >= a && e.date <= b);
  const sum = (list) => list.reduce((x, e) => x + e.amount, 0);

  /* ---------------- page ---------------- */
  const view = $('#view-money');
  let off = 0;
  let draftCat = '';

  function monthRange(o) {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + o, 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { d, a: LO.keyOf(d), b: LO.keyOf(last), days: last.getDate() };
  }

  function render() {
    const { d, a, b, days } = monthRange(off);
    const list = between(a, b).sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
    const total = sum(list);
    const today = LO.todayKey();
    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1><p class="sub">${esc(t('sub'))}</p></div>`
      + `<div class="year-nav"><button type="button" class="icon-btn" data-moff="-1" aria-label="${esc(t('prevMonth'))}">‹</button><b class="money-month">${esc(t('monthTitle')(d.getFullYear(), d.getMonth() + 1))}</b>`
      + `<button type="button" class="icon-btn" data-moff="1" aria-label="${esc(t('nextMonth'))}"${off >= 0 ? ' disabled' : ''}>›</button>`
      + `<button type="button" class="btn sm" data-mcsv>${esc(t('exportCsv'))}</button><button type="button" class="btn sm" data-mset>${esc(t('settings'))}</button></div></div>`;

    // budget: left this month and per remaining day (this month only)
    let budgetLine = t('noBudget');
    let pct = 0;
    if (M.s.budget) {
      const left = M.s.budget - total;
      pct = Math.min(1, total / M.s.budget);
      const daysLeft = off === 0 ? days - LO.parseKey(today).getDate() + 1 : 0;
      budgetLine = left < 0 ? t('over')(fmt(-left)) : off === 0 && daysLeft ? t('perDay')(fmt(left / daysLeft)) : `${t('left')} ${fmt(left)}`;
    }
    // compared with the same stretch of last month
    let vs = '';
    if (off === 0) {
      const p = monthRange(-1);
      const upto = LO.keyOf(new Date(p.d.getFullYear(), p.d.getMonth(), Math.min(LO.parseKey(today).getDate(), p.days)));
      const lastSum = sum(between(p.a, upto));
      if (lastSum > 0) vs = t('vsLast')(Math.round((total - lastSum) / lastSum * 100));
    }
    h += '<div class="stats">'
      + `<div class="stat">${M.s.budget ? LO.ring(pct, 46) : ''}<div><span class="stat-label">${esc(t('spent'))}</span><b class="stat-num">${esc(fmt(total))}</b>${vs ? `<span class="stat-sub">${esc(vs)}</span>` : ''}</div></div>`
      + `<div class="stat"><div><span class="stat-label">${esc(t('budget'))}</span><b class="stat-num">${M.s.budget ? esc(fmt(M.s.budget)) : '–'}</b><span class="stat-sub${M.s.budget && total > M.s.budget ? ' warn' : ''}">${esc(budgetLine)}</span></div></div>`
      + '</div>';

    h += '<div class="money-cols">';
    h += `<section class="card money-add"><h2>${esc(t('add'))}</h2><form data-madd>`
      + `<div class="row"><input class="input money-amt" name="mamt" type="number" inputmode="decimal" step="0.01" min="0" placeholder="${esc(CURS[M.s.cur])}" aria-label="${esc(t('amount'))}">`
      + `<input class="input" name="mnote" maxlength="60" autocomplete="off" placeholder="${esc(t('notePh'))}" aria-label="${esc(t('note'))}"></div>`
      + `<div class="chips">${LO.chips('mcat', CATS.map((c) => [c, esc(t('cats')[c]), 'k-m' + c]), 'radio', [draftCat])}</div>`
      + `<div class="row"><input class="input date" type="date" name="mdate" value="${off === 0 ? today : b}" aria-label="${esc(t('date'))}"><button type="submit" class="btn primary">${esc(t('add'))}</button></div>`
      + '<p class="err" data-merr></p></form></section>';

    const byCat = CATS.map((c) => [c, sum(list.filter((e) => e.cat === c))]).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]);
    const max = byCat.length ? byCat[0][1] : 1;
    h += `<section class="card"><h2>${esc(t('byCat'))}</h2>`
      + (byCat.length ? `<ul class="hours">${byCat.map(([c, v]) => `<li><span class="hn">${esc(t('cats')[c])}</span><b>${esc(fmt(v))}</b><span class="bar"><span style="width:${v / max * 100}%"></span></span></li>`).join('')}</ul>`
        + `<p class="hours-total"><span>${esc(t('total'))}</span><b>${esc(fmt(total))}</b></p>` : `<p class="hint">${esc(t('empty'))}</p>`)
      + '</section></div>';

    h += `<section class="card money-fixed"><header class="card-head"><h2>${esc(t('fixed'))}</h2><button type="button" class="btn sm" data-fnew>${LO.icon.plus}<span>${esc(t('addFixed'))}</span></button></header>`
      + (M.s.fixed.length ? `<ul class="money-list">${M.s.fixed.map((f) => `<li data-fid="${esc(f.id)}" tabindex="0" role="button" aria-label="${esc(t('editFixed'))}"><span>${esc(f.name)}<small>${esc(t('fixedTag')(f.day))} · ${esc(t('cats')[f.cat])}</small></span><b>${esc(fmt(f.amount))}</b></li>`).join('')}</ul>` : '')
      + `<p class="hint">${esc(M.s.fixed.length ? t('fixedHint') : `${t('fixedEmpty')} ${t('fixedHint')}`)}</p></section>`;

    if (list.length) {
      const groups = {};
      list.forEach((e) => { (groups[e.date] = groups[e.date] || []).push(e); });
      h += `<div class="money-days">${Object.entries(groups).map(([k, es]) => `<section class="card money-day"><header class="card-head"><h3>${esc(dayName(k))}${esc(LO.shortDate(k))} ${esc(tc('days')[LO.wd(LO.parseKey(k))])}</h3><b>${esc(fmt(sum(es)))}</b></header>`
        + `<ul class="money-list">${es.map((e) => `<li data-mid="${esc(e.id)}" tabindex="0" role="button" aria-label="${esc(t('edit'))}"><span>${esc(e.note || t('cats')[e.cat])}<small>${esc(t('cats')[e.cat])}${e.fixed ? ` · ${esc(t('fixedNote'))}` : ''}</small></span><b>${esc(fmt(e.amount))}</b></li>`).join('')}</ul></section>`).join('')}</div>`;
    }
    view.innerHTML = h;
  }

  const dayName = (k) => { const n = LO.dayDiff(LO.todayKey(), k); return n === 0 ? `${tc('today')} ` : n === -1 ? `${tc('yesterday')} ` : ''; };

  function openEntry(id) {
    const e = M.s.entries.find((x) => x.id === id);
    if (!e) return;
    LO.openForm({
      title: t('edit'),
      body: `<div class="row"><label class="fld"><span>${esc(t('amount'))}</span><input class="input sm" type="number" step="0.01" min="0" name="eamt" value="${e.amount}"></label>`
        + `<label class="fld"><span>${esc(t('date'))}</span><input class="input date" type="date" name="edate" value="${esc(e.date)}"></label></div>`
        + `<label class="fld"><span>${esc(t('note'))}</span><input class="input" name="enote" maxlength="60" value="${esc(e.note)}"></label>`
        + `<div class="fld"><span>${esc(t('cat'))}</span><div class="chips">${LO.chips('ecat', CATS.map((c) => [c, esc(t('cats')[c])]), 'radio', [e.cat])}</div></div>`,
      onSave(dlg) {
        const amount = +$('input[name="eamt"]', dlg).value;
        if (!(amount > 0)) return t('errAmount');
        const date = $('input[name="edate"]', dlg).value || e.date;
        LO.mutate(M, (s) => {
          const x = s.entries.find((y) => y.id === id);
          if (x) Object.assign(x, { amount: Math.round(amount * 100) / 100, date, note: $('input[name="enote"]', dlg).value.trim(), cat: LO.checkedVal(dlg, 'ecat') || 'other' });
        }, tc('saved'));
        return true;
      },
      onDelete: () => LO.mutate(M, (s) => { s.entries = s.entries.filter((y) => y.id !== id); }, tc('deleted'))
    });
  }

  function openFixed(id) {
    const f = id ? M.s.fixed.find((x) => x.id === id) : null;
    const v = f || { name: '', amount: '', cat: 'home', day: new Date().getDate() };
    LO.openForm({
      title: f ? t('editFixed') : t('newFixed'),
      body: `<label class="fld"><span>${esc(t('fname'))}</span><input class="input" name="fname" maxlength="40" value="${esc(v.name)}" placeholder="${esc(t('fnamePh'))}"></label>`
        + `<div class="row"><label class="fld"><span>${esc(t('amount'))}</span><input class="input sm" type="number" step="0.01" min="0" name="famt" value="${v.amount}"></label>`
        + `<label class="fld"><span>${esc(t('fday'))}</span><select class="input sm" name="fday">${LO.seq(31).map((i) => `<option value="${i + 1}"${i + 1 === v.day ? ' selected' : ''}>${esc(t('fdayOpt')(i + 1))}</option>`).join('')}</select></label></div>`
        + `<p class="hint">${esc(t('fdayHint'))}</p>`
        + `<div class="fld"><span>${esc(t('cat'))}</span><div class="chips">${LO.chips('fcat', CATS.map((c) => [c, esc(t('cats')[c])]), 'radio', [v.cat])}</div></div>`,
      onSave(dlg) {
        const name = $('input[name="fname"]', dlg).value.trim();
        const amount = +$('input[name="famt"]', dlg).value;
        if (!name) return LO.t('term.errName');
        if (!(amount > 0)) return t('errAmount');
        const fields = { name, amount: Math.round(amount * 100) / 100, day: +$('select[name="fday"]', dlg).value, cat: LO.checkedVal(dlg, 'fcat') || 'home' };
        LO.mutate(M, (s) => {
          const x = f && s.fixed.find((y) => y.id === f.id);
          if (x) Object.assign(x, fields); else s.fixed.push(Object.assign({ id: uid(), last: '' }, fields));
        }, f ? tc('saved') : tc('added'));
        const n = logFixed();
        if (n) { LO.refresh(); LO.toast(t('fixedAdded')(n), [{ label: tc('undo'), run: LO.undo }]); }
        return true;
      },
      // entries already logged stay; only the future ones stop
      onDelete: f ? () => LO.mutate(M, (s) => { s.fixed = s.fixed.filter((y) => y.id !== f.id); }, tc('deleted')) : null
    });
  }

  // All entries as CSV, with a byte-order mark so Excel reads Chinese correctly
  function exportCsv() {
    const q = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const rows = M.s.entries.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map((e) => [e.date, e.amount, M.s.cur, t('cats')[e.cat], e.note].map(q).join(','));
    const blob = new Blob(['\ufeff' + [t('csvHead').join(',')].concat(rows).join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `planner-spending-${LO.todayKey()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    LO.toast(t('exported')(rows.length));
  }

  function openSettings() {
    LO.openForm({
      title: t('settings'),
      body: `<label class="fld"><span>${esc(t('currency'))}</span><select class="input" name="scur">${Object.entries(CURS).map(([k, sym]) => `<option value="${k}"${k === M.s.cur ? ' selected' : ''}>${k} ${sym}</option>`).join('')}</select></label>`
        + `<label class="fld"><span>${esc(t('budget'))}</span><input class="input" type="number" min="0" step="1" name="sbud" value="${M.s.budget || ''}" placeholder="${esc(t('budgetPh'))}"></label>`,
      onSave(dlg) {
        LO.mutate(M, (s) => { s.cur = $('select[name="scur"]', dlg).value; s.budget = Math.max(0, +$('input[name="sbud"]', dlg).value || 0); }, tc('saved'));
        return true;
      }
    });
  }

  function add(amount, note, cat, date, msg) {
    LO.mutate(M, (s) => {
      s.entries.push({ id: uid(), date: date || LO.todayKey(), amount: Math.round(amount * 100) / 100, cat: cat || guess(note), note });
    }, msg || t('recorded')(fmt(amount)));
  }

  view.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-madd]');
    if (!f) return;
    e.preventDefault();
    const amount = +$('input[name="mamt"]', f).value;
    if (!(amount > 0)) { $('[data-merr]', f).textContent = t('errAmount'); return; }
    const note = $('input[name="mnote"]', f).value.trim();
    draftCat = '';
    add(amount, note, LO.checkedVal(f, 'mcat'), $('input[name="mdate"]', f).value);
    const i = $('input[name="mamt"]', view);
    if (i) i.focus();
  });
  view.addEventListener('change', (e) => { if (e.target.name === 'mcat') draftCat = e.target.value; });
  view.addEventListener('click', (e) => {
    const o = e.target.closest('[data-moff]');
    if (o) { off = Math.min(0, off + +o.dataset.moff); render(); return; }
    if (e.target.closest('[data-mset]')) { openSettings(); return; }
    if (e.target.closest('[data-mcsv]')) { exportCsv(); return; }
    if (e.target.closest('[data-fnew]')) { openFixed(null); return; }
    const fl = e.target.closest('[data-fid]');
    if (fl) { openFixed(fl.dataset.fid); return; }
    const li = e.target.closest('[data-mid]');
    if (li) openEntry(li.dataset.mid);
  });
  view.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-mid]')) { e.preventDefault(); openEntry(e.target.dataset.mid); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-fid]')) { e.preventDefault(); openFixed(e.target.dataset.fid); }
  });

  LO.view('money', { render });

  // fixed costs come due as days pass: check on start and whenever the app comes back
  logFixed();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && logFixed() && LO.route() === 'money') render(); });

  LO.money = {
    fmt,
    quickAdd: (amount, note, msg) => add(amount, note, '', '', msg),
    totalBetween: (a, b) => sum(between(a, b)),
    guess
  };
})();
