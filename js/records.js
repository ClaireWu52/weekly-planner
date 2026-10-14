/*
 * Growth log page: things worth remembering, plus a heatmap of daily
 * activity collected from every page (to-dos, dailies, workouts, focus,
 * books and growth log entries).
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;
  const TCATS = ['study', 'work', 'club', 'health', 'life', 'other'];
  const SOURCES = ['all', 'records', 'tasks', 'workouts', 'focus', 'books'];
  const WEEKS = 53;

  LO.strings('records', {
    zh: {
      title: '成长记录',
      addPh: '记下一件值得记住的事：做完的项目、拿到的成绩、第一次做成的事…', add: '记录',
      date: '日期', tags: '标签', tagsPh: '用逗号隔开，比如：数学, 社团', note: '细节', notePh: '当时发生了什么，学到了什么',
      editRecord: '编辑记录', newRecord: '新的记录', what: '发生了什么',
      sTotal: '成长记录', sWeek: '本周新增', sStreak: '连续活跃', sBest: '最长连续', sActive: '今年活跃天数', dayUnit: '天', recUnit: '条',
      heat: '活跃热力图', heatSub: '最近一年，每格是一天。完成待办、打卡、运动、专注、读完书、写记录都会点亮它。',
      src: { all: '全部', records: '成长记录', tasks: '任务', workouts: '运动', focus: '专注', books: '学习' },
      parts: { records: '成长记录', todos: '待办', dailies: '每日打卡', workouts: '运动', focus: '专注', books: '读完或学完' },
      less: '少', more: '多', nothing: '没有记录',
      breakdown: '分类构成', tagCloud: '标签', monthly: '每月记录（近 12 个月）', list: '全部记录',
      empty: '还没有成长记录。做完一个项目、考了个好成绩、第一次上台，都值得记下来。',
      filtered: (x) => `筛选：${x}`, clear: '清除筛选', errTitle: '请写下发生了什么。',
      monthHead: (y, m) => `${y}年${m}月`
    },
    en: {
      title: 'Growth log',
      addPh: 'Write down something worth remembering: a finished project, a good grade, a first time…', add: 'Log it',
      date: 'Date', tags: 'Tags', tagsPh: 'Comma separated, e.g. math, club', note: 'Details', notePh: 'What happened, what you learned',
      editRecord: 'Edit entry', newRecord: 'New entry', what: 'What happened',
      sTotal: 'Log entries', sWeek: 'New this week', sStreak: 'Active streak', sBest: 'Longest streak', sActive: 'Active days this year', dayUnit: 'days', recUnit: '',
      heat: 'Activity heatmap', heatSub: 'The past year, one square per day. Finished to-dos, check-ins, workouts, focus sessions, books and log entries all light it up.',
      src: { all: 'All', records: 'Log', tasks: 'Tasks', workouts: 'Exercise', focus: 'Focus', books: 'Learning' },
      parts: { records: 'log entries', todos: 'to-dos', dailies: 'check-ins', workouts: 'workouts', focus: 'focus sessions', books: 'books or courses finished' },
      less: 'Less', more: 'More', nothing: 'Nothing logged',
      breakdown: 'By category', tagCloud: 'Tags', monthly: 'Entries per month (last 12)', list: 'All entries',
      empty: 'No entries yet. A finished project, a good grade, a first time on stage: all worth writing down.',
      filtered: (x) => `Filter: ${x}`, clear: 'Clear filter', errTitle: 'Write what happened.',
      monthHead: (y, m) => `${new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' })} ${y}`
    }
  });
  const t = LO.ns('records');
  const tc = LO.ns('common');

  /* ---------------- data ---------------- */
  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const cleanTags = (v) => [...new Set((Array.isArray(v) ? v : String(v || '').split(/[,，、;；]/)).map((x) => String(x).trim()).filter(Boolean))].slice(0, 12);
  function normalize(s) {
    return {
      v: 1,
      records: (s.records || []).filter((r) => r && typeof r.title === 'string' && isKey(r.date)).map((r) => ({
        id: String(r.id || uid()), date: r.date, title: r.title, cat: TCATS.includes(r.cat) ? r.cat : 'other',
        tags: cleanTags(r.tags), note: typeof r.note === 'string' ? r.note : ''
      }))
    };
  }
  const R = LO.createStore('records', 'planner:records:v1', () => ({ v: 1, records: [] }), normalize);

  /* ---------------- activity across the app ---------------- */
  function activityMap() {
    const map = {};
    const add = (k, kind, n) => {
      if (!isKey(k)) return;
      const d = map[k] || (map[k] = { records: 0, todos: 0, dailies: 0, workouts: 0, focus: 0, books: 0 });
      d[kind] += n;
    };
    R.s.records.forEach((r) => add(r.date, 'records', 1));
    [LO.tasks, LO.health, LO.focus, LO.learn].forEach((m) => { if (m && m.activity) m.activity(add); });
    return map;
  }
  const pick = (d, src) => {
    if (!d) return 0;
    if (src === 'all') return d.records + d.todos + d.dailies + d.workouts + d.focus + d.books;
    if (src === 'tasks') return d.todos + d.dailies;
    return d[src] || 0;
  };
  function streaks(map) {
    const today = new Date();
    let cur = 0;
    for (let i = 0; i < 1000; i++) {
      const v = pick(map[LO.keyOf(LO.addDays(today, -i))], 'all');
      if (v > 0) cur++;
      else if (i === 0) continue;
      else break;
    }
    let best = 0;
    let run = 0;
    for (let i = 365; i >= 0; i--) {
      if (pick(map[LO.keyOf(LO.addDays(today, -i))], 'all') > 0) { run++; best = Math.max(best, run); } else run = 0;
    }
    const y = `${today.getFullYear()}-`;
    const active = Object.keys(map).filter((k) => k.startsWith(y) && k <= LO.todayKey() && pick(map[k], 'all') > 0).length;
    return { cur, best: Math.max(best, cur), active };
  }

  /* ---------------- editor ---------------- */
  function openEditor(id, preset) {
    const r = id ? R.s.records.find((x) => x.id === id) : null;
    const v = r || { title: preset || '', date: LO.todayKey(), cat: 'study', tags: [], note: '' };
    LO.openForm({
      title: r ? t('editRecord') : t('newRecord'),
      body: `<label class="fld"><span>${esc(t('what'))}</span><input class="input" name="title" maxlength="120" value="${esc(v.title)}"></label>`
        + `<div class="form-row"><label class="fld"><span>${esc(t('date'))}</span><input class="input" type="date" name="date" value="${esc(v.date)}" max="${LO.todayKey()}"></label>`
        + `<label class="fld"><span>${esc(t('tags'))}</span><input class="input" name="tags" maxlength="120" value="${esc(v.tags.join(', '))}" placeholder="${esc(t('tagsPh'))}"></label></div>`
        + `<div class="fld"><span>${esc(tc('category'))}</span><div class="chips">${LO.chips('cat', TCATS.map((c) => [c, `<i class="sw"></i>${esc(tc('cats.' + c))}`, 'k-' + c]), 'radio', [v.cat])}</div></div>`
        + `<label class="fld"><span>${esc(t('note'))}</span><textarea class="input ta" name="note" rows="3" maxlength="1000" placeholder="${esc(t('notePh'))}">${esc(v.note)}</textarea></label>`,
      onSave(dlg) {
        const title = $('input[name="title"]', dlg).value.trim();
        if (!title) return t('errTitle');
        const fields = {
          title, date: $('input[name="date"]', dlg).value || LO.todayKey(), cat: LO.checkedVal(dlg, 'cat') || 'other',
          tags: cleanTags($('input[name="tags"]', dlg).value), note: $('textarea[name="note"]', dlg).value.trim()
        };
        LO.mutate(R, (s) => {
          if (r) Object.assign(s.records.find((x) => x.id === id), fields);
          else s.records.push(Object.assign({ id: uid() }, fields));
        }, r ? tc('saved') : tc('added'));
        return true;
      },
      onDelete: r ? () => LO.mutate(R, (s) => { s.records = s.records.filter((x) => x.id !== id); }, tc('deleted')) : null
    });
  }

  /* ---------------- page ---------------- */
  const view = $('#view-records');
  let src = 'all';
  let filter = null; // { type: 'cat'|'tag', value }

  function heatmapHTML(map) {
    const today = new Date();
    const start = LO.addDays(LO.mondayOf(today), -(WEEKS - 1) * 7);
    const th = src === 'all' ? [1, 3, 6, 10] : [1, 2, 3, 5];
    const parts = t('parts');
    let months = '';
    let lastM = -1;
    let cells = '';
    for (let w = 0; w < WEEKS; w++) {
      const mon = LO.addDays(start, w * 7);
      const m = mon.getMonth();
      months += `<span>${m !== lastM ? esc(LO.lang() === 'zh' ? `${m + 1}月` : mon.toLocaleString('en-US', { month: 'short' })) : ''}</span>`;
      lastM = m;
      for (let d = 0; d < 7; d++) {
        const date = LO.addDays(mon, d);
        const k = LO.keyOf(date);
        if (date > today) { cells += '<i class="hc future"></i>'; continue; }
        const rec = map[k];
        const v = pick(rec, src);
        const lvl = th.filter((x) => v >= x).length;
        let tip = `${LO.shortDate(k)}: `;
        if (!v) tip += t('nothing');
        else if (src === 'all') tip += Object.keys(parts).filter((p) => rec[p]).map((p) => `${parts[p]} ${rec[p]}`).join(LO.lang() === 'zh' ? '，' : ', ');
        else tip += String(v);
        cells += `<i class="hc l${lvl}${k === LO.todayKey() ? ' is-today' : ''}" title="${esc(tip)}"></i>`;
      }
    }
    const dayLabels = tc('daysShort').map((x, i) => `<span>${i % 2 === 0 ? esc(x) : ''}</span>`).join('');
    return `<div class="heat-wrap"><div class="heat"><div class="heat-days">${dayLabels}</div><div><div class="heat-months">${months}</div><div class="heat-grid">${cells}</div></div></div></div>`
      + `<div class="heat-legend"><span>${esc(t('less'))}</span>${[0, 1, 2, 3, 4].map((l) => `<i class="hc l${l}"></i>`).join('')}<span>${esc(t('more'))}</span></div>`;
  }

  function donutHTML(list) {
    const counts = TCATS.map((c) => [c, list.filter((r) => r.cat === c).length]).filter(([, n]) => n > 0);
    const total = list.length;
    if (!total) return `<p class="empty-note">${esc(t('nothing'))}</p>`;
    let acc = 0;
    const segs = counts.map(([c, n]) => {
      const pct = n / total * 100;
      const seg = `<circle class="k-${c}" cx="21" cy="21" r="15.915" fill="none" stroke-width="6" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${25 - acc}"/>`;
      acc += pct;
      return seg;
    }).join('');
    return `<div class="donut-wrap"><svg viewBox="0 0 42 42" class="donut" aria-hidden="true"><circle cx="21" cy="21" r="15.915" fill="none" stroke-width="6" class="donut-bg"/>${segs}`
      + `<text x="21" y="21" class="donut-num">${total}</text></svg>`
      + `<ul class="donut-legend">${counts.map(([c, n]) => `<li><button type="button" class="link-btn k-${c}" data-fcat="${c}"><i class="sw"></i>${esc(tc('cats.' + c))}</button><span>${n} (${Math.round(n / total * 100)}%)</span></li>`).join('')}</ul></div>`;
  }

  function tagCloudHTML(list) {
    const counts = {};
    list.forEach((r) => r.tags.forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 30);
    if (!entries.length) return `<p class="hint">${esc(t('tagsPh'))}</p>`;
    const max = entries[0][1];
    return `<div class="cloud">${entries.map(([g, n]) => `<button type="button" class="cloud-tag${filter && filter.type === 'tag' && filter.value === g ? ' on' : ''}" data-ftag="${esc(g)}" style="font-size:${13 + (n / max) * 9}px">${esc(g)}<small>×${n}</small></button>`).join('')}</div>`;
  }

  function monthlyHTML(list) {
    const now = new Date();
    const vals = LO.seq(12).map((i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const n = list.filter((r) => r.date.startsWith(prefix)).length;
      return { v: n, label: String(d.getMonth() + 1), title: `${prefix}: ${n}`, cls: 'c-sleep' };
    });
    return LO.bars(vals, { height: 90 });
  }

  function render() {
    const map = activityMap();
    const st = streaks(map);
    const all = R.s.records.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const mon = LO.keyOf(LO.mondayOf(new Date()));
    const week = all.filter((r) => r.date >= mon).length;
    let list = all;
    if (filter && filter.type === 'cat') list = all.filter((r) => r.cat === filter.value);
    if (filter && filter.type === 'tag') list = all.filter((r) => r.tags.includes(filter.value));

    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1></div></div>`;
    h += `<form class="inline-add card" data-radd><input class="input" maxlength="120" placeholder="${esc(t('addPh'))}" aria-label="${esc(t('addPh'))}"><button type="submit" class="btn primary">${LO.icon.plus}<span>${esc(t('add'))}</span></button></form>`;
    h += '<div class="stats">'
      + `<div class="stat"><div><span class="stat-label">${esc(t('sTotal'))}</span><b class="stat-num">${all.length}</b><span class="stat-sub">${esc(t('sWeek'))} ${week}</span></div></div>`
      + `<div class="stat"><div><span class="stat-label">${esc(t('sStreak'))}</span><b class="stat-num">${st.cur}<small> ${esc(t('dayUnit'))}</small></b></div></div>`
      + `<div class="stat"><div><span class="stat-label">${esc(t('sBest'))}</span><b class="stat-num">${st.best}<small> ${esc(t('dayUnit'))}</small></b></div></div>`
      + `<div class="stat"><div><span class="stat-label">${esc(t('sActive'))}</span><b class="stat-num">${st.active}<small> ${esc(t('dayUnit'))}</small></b></div></div>`
      + '</div>';
    h += `<section class="card heat-card"><header class="card-head"><div><h2>${esc(t('heat'))}</h2><p class="hint">${esc(t('heatSub'))}</p></div>`
      + `<div class="seg sm">${SOURCES.map((s) => `<button type="button" data-src="${s}" aria-selected="${s === src}">${esc(t('src')[s])}</button>`).join('')}</div></header>`
      + heatmapHTML(map) + '</section>';
    h += '<div class="rec-grid">'
      + `<section class="card"><header class="card-head"><h2>${esc(t('breakdown'))}</h2></header>${donutHTML(all)}</section>`
      + `<section class="card"><header class="card-head"><h2>${esc(t('tagCloud'))}</h2></header>${tagCloudHTML(all)}</section>`
      + `<section class="card"><header class="card-head"><h2>${esc(t('monthly'))}</h2></header>${monthlyHTML(all)}</section>`
      + '</div>';
    h += `<div class="section-head"><h2>${esc(t('list'))}<span class="count">${list.length}</span></h2>`
      + (filter ? `<button type="button" class="btn sm" data-fclear>${esc(t('filtered')(filter.type === 'cat' ? tc('cats.' + filter.value) : filter.value))} ×</button>` : '')
      + '</div>';
    if (!list.length) h += `<p class="empty-note big">${esc(t('empty'))}</p>`;
    else {
      let lastMonth = '';
      h += '<div class="rec-list">';
      list.forEach((r) => {
        const m = r.date.slice(0, 7);
        if (m !== lastMonth) {
          if (lastMonth) h += '</ul>';
          h += `<h3 class="rec-month">${esc(t('monthHead')(+m.slice(0, 4), +m.slice(5, 7)))}</h3><ul class="rec-items">`;
          lastMonth = m;
        }
        h += `<li class="rec k-${r.cat}" data-rec="${esc(r.id)}"><span class="rec-date">${LO.shortDate(r.date)}</span>`
          + `<div class="rec-body"><b class="rec-title" data-redit tabindex="0">${esc(r.title)}</b>${r.note ? `<p>${esc(r.note)}</p>` : ''}`
          + `<div class="task-meta"><span class="tag k-${r.cat}"><i class="sw"></i>${esc(tc('cats.' + r.cat))}</span>${r.tags.map((g) => `<button type="button" class="mini-tag" data-ftag="${esc(g)}">#${esc(g)}</button>`).join('')}</div></div></li>`;
      });
      h += '</ul></div>';
    }
    view.innerHTML = h;
    const hw = $('.heat-wrap', view);
    if (hw) hw.scrollLeft = hw.scrollWidth;
  }

  view.addEventListener('click', (e) => {
    const s = e.target.closest('[data-src]');
    if (s) { src = s.dataset.src; render(); return; }
    const fc = e.target.closest('[data-fcat]');
    if (fc) { filter = { type: 'cat', value: fc.dataset.fcat }; render(); return; }
    const ft = e.target.closest('[data-ftag]');
    if (ft) {
      const g = ft.dataset.ftag;
      filter = filter && filter.type === 'tag' && filter.value === g ? null : { type: 'tag', value: g };
      render();
      return;
    }
    if (e.target.closest('[data-fclear]')) { filter = null; render(); return; }
    const ed = e.target.closest('[data-redit]');
    if (ed) openEditor(ed.closest('[data-rec]').dataset.rec);
  });
  view.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-redit]')) openEditor(e.target.closest('[data-rec]').dataset.rec); });
  view.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-radd]')) return;
    e.preventDefault();
    const input = $('input', e.target);
    openEditor(null, input.value.trim());
    input.value = '';
  });

  LO.view('records', { render });

  LO.records = {
    store: R,
    since: (k) => R.s.records.filter((r) => r.date >= k).length,
    streak: () => streaks(activityMap()).cur
  };
})();
