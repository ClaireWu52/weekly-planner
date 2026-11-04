/*
 * Everyday spending (Life → 记账): what you spend day to day, by category,
 * against a monthly budget, with how much is left per day. Trip spending stays
 * on each trip. Today's quick add can also log spending here ("花了 25 午饭").
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
      prevMonth: '上个月', nextMonth: '下个月', monthTitle: (y, m) => `${y} 年 ${m} 月`, total: '合计'
    },
    en: {
      title: 'Spending', sub: 'Everyday spending. Trip spending lives on each trip.',
      spent: 'Spent this month', budget: 'Monthly budget', left: 'Left', perDay: (x) => `${x} a day left`, over: (x) => `${x} over budget`, noBudget: 'No budget set',
      vsLast: (p) => (p > 0 ? `${p}% more than this time last month` : p < 0 ? `${-p}% less than this time last month` : 'About the same as last month'),
      byCat: 'By category', add: 'Add', amount: 'Amount', note: 'Note', notePh: 'e.g. lunch, subway, textbook', date: 'Date', cat: 'Category',
      cats: { food: 'Food', shop: 'Shopping', trans: 'Transport', fun: 'Fun', study: 'School', home: 'Home', health: 'Health', other: 'Other' },
      settings: 'Settings', currency: 'Currency', budgetPh: 'How much you plan to spend a month; leave empty for none', errAmount: 'Enter an amount above 0.',
      empty: 'Nothing logged this month. You can also type "spent 8 on coffee" into quick add on Today.', edit: 'Edit', recorded: (x) => `Logged ${x}`,
      prevMonth: 'Previous month', nextMonth: 'Next month', monthTitle: (y, m) => new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }), total: 'Total'
    }
  });
  const t = LO.ns('money');
  const tc = LO.ns('common');

  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const guessCur = () => ((navigator.language || '').toLowerCase().startsWith('zh') ? 'CNY' : 'USD');
  const M = LO.createStore('money', 'planner:money:v1', () => ({ v: 1, cur: guessCur(), budget: 0, entries: [] }), (s) => ({
    v: 1,
    cur: CURS[s.cur] ? s.cur : guessCur(),
    budget: Math.max(0, +s.budget || 0),
    entries: (s.entries || []).filter((e) => e && isKey(e.date) && +e.amount > 0).map((e) => ({
      id: String(e.id || uid()), date: e.date, amount: Math.round(+e.amount * 100) / 100, cat: CATS.includes(e.cat) ? e.cat : 'other', note: typeof e.note === 'string' ? e.note.slice(0, 60) : ''
    }))
  }));

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
      + `<button type="button" class="btn sm" data-mset>${esc(t('settings'))}</button></div></div>`;

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

    if (list.length) {
      const groups = {};
      list.forEach((e) => { (groups[e.date] = groups[e.date] || []).push(e); });
      h += `<div class="money-days">${Object.entries(groups).map(([k, es]) => `<section class="card money-day"><header class="card-head"><h3>${esc(dayName(k))}${esc(LO.shortDate(k))} ${esc(tc('days')[LO.wd(LO.parseKey(k))])}</h3><b>${esc(fmt(sum(es)))}</b></header>`
        + `<ul class="money-list">${es.map((e) => `<li data-mid="${esc(e.id)}" tabindex="0" role="button" aria-label="${esc(t('edit'))}"><span>${esc(e.note || t('cats')[e.cat])}<small>${esc(t('cats')[e.cat])}</small></span><b>${esc(fmt(e.amount))}</b></li>`).join('')}</ul></section>`).join('')}</div>`;
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
    const li = e.target.closest('[data-mid]');
    if (li) openEntry(li.dataset.mid);
  });
  view.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-mid]')) { e.preventDefault(); openEntry(e.target.dataset.mid); }
  });

  LO.view('money', { render });

  LO.money = {
    fmt,
    quickAdd: (amount, note, msg) => add(amount, note, '', '', msg),
    totalBetween: (a, b) => sum(between(a, b)),
    guess
  };
})();
