/*
 * Wishes page: every wish is tied to a goal. Progress is either set by hand
 * or counted automatically from tasks, workouts and focus sessions.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;
  const WCATS = ['experience', 'learn', 'thing', 'travel', 'health', 'other'];
  const CAT_CLASS = { experience: 'k-club', learn: 'k-study', thing: 'k-other', travel: 'k-life', health: 'k-health', other: 'k-work' };
  const METRICS = ['manual', 'todos', 'dailies', 'workouts', 'workoutMin', 'focus', 'books', 'records'];

  LO.strings('wishes', {
    zh: {
      title: '心愿清单', intro: '给每个心愿绑一个目标。目标达成，就去兑现它。',
      addPh: '比如：去听一场演唱会', add: '添加',
      all: '全部',
      cats: { experience: '体验', learn: '学习', thing: '想要的东西', travel: '旅行', health: '健康', other: '其他' },
      newWish: '新建心愿', editWish: '编辑心愿', wish: '心愿', goal: '解锁条件', goalPh: '比如：这学期每周运动三次',
      metric: '进度怎么算', target: '目标数量', since: '从哪天开始算', progress: '当前进度', due: '希望实现的日期', dueNone: '可不填',
      metrics: { manual: '自己调进度', todos: '完成待办', dailies: '每日任务打卡', workouts: '运动次数', workoutMin: '运动分钟', focus: '专注次数', books: '读完的书', records: '成长记录' },
      units: { todos: '个待办', dailies: '次打卡', workouts: '次运动', workoutMin: '分钟运动', focus: '次专注', books: '本书', records: '条记录' },
      goalAuto: (m, n) => `完成 ${n} ${{ todos: '个待办', dailies: '次每日任务打卡', workouts: '次运动', workoutMin: '分钟运动', focus: '次专注', books: '本书', records: '条成长记录' }[m]}`,
      ready: '可以兑现了', redeem: '兑现', redeemed: '心愿实现了', notYet: '目标还没达成',
      achieved: '已经实现的心愿', achievedOn: (d) => `${d} 实现`, reflection: '实现的感受', reflectionPh: '这个心愿实现的时候感觉怎么样？',
      done: '已经实现', empty: '还没有心愿。写下第一个，它会提醒你为什么坚持。', achievedEmpty: '实现的心愿会收在这里。',
      errTitle: '请写下心愿。', errTarget: '目标数量要大于 0。', autoHint: '会自动统计开始日期之后的记录。'
    },
    en: {
      title: 'Wishes', intro: 'Tie every wish to a goal. Reach the goal, then make the wish happen.',
      addPh: 'e.g. See a live concert', add: 'Add',
      all: 'All',
      cats: { experience: 'Experience', learn: 'Learning', thing: 'Something to get', travel: 'Travel', health: 'Health', other: 'Other' },
      newWish: 'New wish', editWish: 'Edit wish', wish: 'Wish', goal: 'Unlock condition', goalPh: 'e.g. Work out three times a week all semester',
      metric: 'How progress counts', target: 'Target', since: 'Count from', progress: 'Progress', due: 'Hoping for', dueNone: 'Optional',
      metrics: { manual: 'Set it myself', todos: 'To-dos finished', dailies: 'Daily check-ins', workouts: 'Workouts', workoutMin: 'Workout minutes', focus: 'Focus sessions', books: 'Books finished', records: 'Growth log entries' },
      units: { todos: 'to-dos', dailies: 'check-ins', workouts: 'workouts', workoutMin: 'workout min', focus: 'focus sessions', books: 'books', records: 'entries' },
      goalAuto: (m, n) => `Finish ${n} ${{ todos: 'to-dos', dailies: 'daily check-ins', workouts: 'workouts', workoutMin: 'minutes of exercise', focus: 'focus sessions', books: 'books', records: 'growth log entries' }[m]}`,
      ready: 'Ready to redeem', redeem: 'Redeem', redeemed: 'Wish come true', notYet: 'Goal not reached yet',
      achieved: 'Wishes that came true', achievedOn: (d) => `Came true ${d}`, reflection: 'How it felt', reflectionPh: 'How did it feel when this came true?',
      done: 'Came true', empty: 'No wishes yet. Write one down; it reminds you why you keep going.', achievedEmpty: 'Wishes that come true are kept here.',
      errTitle: 'Write the wish.', errTarget: 'Target must be above 0.', autoHint: 'Counts everything logged from the start date on.'
    }
  });
  const t = LO.ns('wishes');
  const tc = LO.ns('common');

  /* ---------------- data ---------------- */
  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const defaults = () => ({ v: 1, wishes: [] });
  function normalize(s) {
    const today = LO.todayKey();
    return {
      v: 1,
      wishes: (s.wishes || []).filter((w) => w && typeof w.title === 'string').map((w) => ({
        id: String(w.id || uid()), title: w.title, cat: WCATS.includes(w.cat) ? w.cat : 'other',
        goal: typeof w.goal === 'string' ? w.goal : '', metric: METRICS.includes(w.metric) ? w.metric : 'manual',
        target: Math.max(1, Math.round(+w.target) || 10), since: isKey(w.since) ? w.since : today,
        progress: LO.clamp(Math.round(+w.progress) || 0, 0, 100), due: isKey(w.due) ? w.due : '',
        doneAt: isKey(w.doneAt) ? w.doneAt : '', reflection: typeof w.reflection === 'string' ? w.reflection : '',
        created: isKey(w.created) ? w.created : today
      }))
    };
  }
  const W = LO.createStore('wishes', 'planner:wishes:v1', defaults, normalize);

  function metricValue(m, since) {
    if (m === 'todos') return LO.tasks ? LO.tasks.todosDoneSince(since) : 0;
    if (m === 'dailies') return LO.tasks ? LO.tasks.dailyChecksSince(since) : 0;
    if (m === 'workouts') return LO.health ? LO.health.workoutsSince(since) : 0;
    if (m === 'workoutMin') return LO.health ? LO.health.workoutMinSince(since) : 0;
    if (m === 'focus') return LO.focus ? LO.focus.sessionsSince(since) : 0;
    if (m === 'books') return LO.learn ? LO.learn.booksSince(since) : 0;
    if (m === 'records') return LO.records ? LO.records.since(since) : 0;
    return 0;
  }
  function progressOf(w) {
    if (w.metric === 'manual') return { pct: w.progress / 100, label: `${w.progress}%`, ready: w.progress >= 100 };
    const cur = metricValue(w.metric, w.since);
    return { pct: Math.min(1, cur / w.target), label: `${Math.min(cur, w.target)} / ${w.target} ${t('units')[w.metric]}`, ready: cur >= w.target };
  }
  const goalText = (w) => w.goal || (w.metric !== 'manual' ? t('goalAuto')(w.metric, w.target) : '');

  /* ---------------- celebration ---------------- */
  function celebrate(anchor) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = anchor ? anchor.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const colors = ['var(--class-bar)', 'var(--work-bar)', 'var(--meeting-bar)', 'var(--health-bar)', 'var(--other-bar)', 'var(--life-bar)'];
    for (let i = 0; i < 28; i++) {
      const s = document.createElement('i');
      s.className = 'confetti';
      const ang = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 110;
      s.style.left = `${cx}px`;
      s.style.top = `${cy}px`;
      s.style.background = colors[i % colors.length];
      s.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
      s.style.setProperty('--dy', `${Math.sin(ang) * dist - 40}px`);
      s.style.setProperty('--rot', `${Math.random() * 540 - 270}deg`);
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1100);
    }
  }

  /* ---------------- editor ---------------- */
  function openEditor(id, presetTitle) {
    const w = id ? W.s.wishes.find((x) => x.id === id) : null;
    const isNew = !w;
    const v = w || { title: presetTitle || '', cat: 'experience', goal: '', metric: 'manual', target: 10, since: LO.todayKey(), progress: 0, due: '', doneAt: '', reflection: '' };
    const body = `<label class="fld"><span>${esc(t('wish'))}</span><input class="input" name="title" maxlength="80" value="${esc(v.title)}" autocomplete="off"></label>`
      + `<div class="fld"><span>${esc(tc('category'))}</span><div class="chips">${LO.chips('wcat', WCATS.map((c) => [c, `<i class="sw"></i>${esc(t('cats')[c])}`, CAT_CLASS[c]]), 'radio', [v.cat])}</div></div>`
      + `<label class="fld"><span>${esc(t('goal'))}</span><input class="input" name="goal" maxlength="120" value="${esc(v.goal)}" placeholder="${esc(t('goalPh'))}"></label>`
      + `<div class="fld"><span>${esc(t('metric'))}</span><div class="chips">${LO.chips('metric', METRICS.map((m) => [m, esc(t('metrics')[m])]), 'radio', [v.metric])}</div></div>`
      + `<div class="fld" data-only="auto"><div class="form-row"><label class="fld"><span>${esc(t('target'))}</span><input class="input" type="number" min="1" max="100000" name="target" value="${v.target}"></label>`
      + `<label class="fld"><span>${esc(t('since'))}</span><input class="input" type="date" name="since" value="${esc(v.since)}"></label></div><p class="hint">${esc(t('autoHint'))}</p></div>`
      + `<div class="fld" data-only="manual"><span>${esc(t('progress'))} <b data-pval>${v.progress}%</b></span><input type="range" min="0" max="100" step="5" name="progress" value="${v.progress}"></div>`
      + `<label class="fld"><span>${esc(t('due'))}</span><input class="input" type="date" name="due" value="${esc(v.due)}"></label>`
      + (w && w.doneAt
        ? `<label class="check"><input type="checkbox" name="isdone" checked>${esc(t('done'))} ${LO.shortDate(w.doneAt)}</label>`
          + `<label class="fld"><span>${esc(t('reflection'))}</span><textarea class="input ta" rows="3" name="reflection" maxlength="600" placeholder="${esc(t('reflectionPh'))}">${esc(v.reflection)}</textarea></label>`
        : '');
    LO.openForm({
      title: isNew ? t('newWish') : t('editWish'),
      body,
      onOpen(dlg) {
        const sync = () => {
          const m = LO.checkedVal(dlg, 'metric');
          dlg.querySelector('[data-only="auto"]').hidden = m === 'manual';
          dlg.querySelector('[data-only="manual"]').hidden = m !== 'manual';
        };
        sync();
        dlg.querySelectorAll('input[name="metric"]').forEach((i) => i.addEventListener('change', sync));
        const r = $('input[name="progress"]', dlg);
        r.addEventListener('input', () => { $('[data-pval]', dlg).textContent = `${r.value}%`; });
      },
      onSave(dlg) {
        const title = $('input[name="title"]', dlg).value.trim();
        if (!title) return t('errTitle');
        const metric = LO.checkedVal(dlg, 'metric') || 'manual';
        const target = Math.round(+$('input[name="target"]', dlg).value);
        if (metric !== 'manual' && !(target > 0)) return t('errTarget');
        const fields = {
          title, cat: LO.checkedVal(dlg, 'wcat') || 'other', goal: $('input[name="goal"]', dlg).value.trim(),
          metric, target: target > 0 ? target : 10, since: $('input[name="since"]', dlg).value || LO.todayKey(),
          progress: +$('input[name="progress"]', dlg).value || 0, due: $('input[name="due"]', dlg).value || ''
        };
        const doneBox = $('input[name="isdone"]', dlg);
        if (doneBox) {
          fields.reflection = $('textarea[name="reflection"]', dlg).value.trim();
          if (!doneBox.checked) fields.doneAt = '';
        }
        LO.mutate(W, (s) => {
          if (isNew) s.wishes.push(Object.assign({ id: uid(), doneAt: '', reflection: '', created: LO.todayKey() }, fields));
          else Object.assign(s.wishes.find((x) => x.id === id), fields);
        }, isNew ? tc('added') : tc('saved'));
        return true;
      },
      onDelete: isNew ? null : () => LO.mutate(W, (s) => { s.wishes = s.wishes.filter((x) => x.id !== id); }, tc('deleted'))
    });
  }

  function redeem(id, anchor) {
    const w = W.s.wishes.find((x) => x.id === id);
    if (!w) return;
    celebrate(anchor);
    LO.mutate(W, (s) => {
      const y = s.wishes.find((x) => x.id === id);
      y.doneAt = LO.todayKey();
      if (y.metric === 'manual') y.progress = 100;
    }, `${t('redeemed')}: ${w.title}`);
  }

  /* ---------------- page ---------------- */
  const view = $('#view-wishes');
  let filter = 'all';

  function card(w) {
    const p = progressOf(w);
    const due = w.due ? LO.dueInfo(w.due) : null;
    const goal = goalText(w);
    return `<article class="wish ${CAT_CLASS[w.cat]}${p.ready ? ' is-ready' : ''}" data-wish="${esc(w.id)}">`
      + `<div class="wish-top"><span class="tag ${CAT_CLASS[w.cat]}"><i class="sw"></i>${esc(t('cats')[w.cat])}</span>${due ? `<span class="due ${due.cls}">${esc(due.text)}</span>` : ''}</div>`
      + `<h3 class="wish-title" data-wedit tabindex="0">${esc(w.title)}</h3>`
      + (goal ? `<p class="wish-goal"><span>${esc(t('goal'))}</span>${esc(goal)}</p>` : '')
      + (w.metric === 'manual'
        ? `<input type="range" class="wish-range" min="0" max="100" step="5" value="${w.progress}" style="--p:${w.progress}%" data-wprog aria-label="${esc(t('progress'))}">`
        : `<div class="progress"><span style="width:${p.pct * 100}%"></span></div>`)
      + `<div class="wish-foot"><span class="wish-label">${p.ready ? `<b>${esc(t('ready'))}</b>` : esc(p.label)}</span>`
      + `<button type="button" class="btn sm${p.ready ? ' primary' : ''}" data-redeem${p.ready || w.metric === 'manual' ? '' : ' disabled'} title="${esc(p.ready ? '' : t('notYet'))}">${esc(t('redeem'))}</button></div>`
      + '</article>';
  }

  function render() {
    const open = W.s.wishes.filter((w) => !w.doneAt);
    const done = W.s.wishes.filter((w) => w.doneAt).sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));
    const shown = (filter === 'all' ? open : open.filter((w) => w.cat === filter))
      .map((w) => ({ w, p: progressOf(w) })).sort((a, b) => (b.p.ready - a.p.ready) || (b.p.pct - a.p.pct)).map((x) => x.w);
    const counts = {};
    open.forEach((w) => { counts[w.cat] = (counts[w.cat] || 0) + 1; });

    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1><p class="sub">${esc(t('intro'))}</p></div></div>`;
    h += `<form class="wish-add card" data-wadd><input class="input" maxlength="80" placeholder="${esc(t('addPh'))}" aria-label="${esc(t('addPh'))}"><button type="submit" class="btn primary">${LO.icon.plus}<span>${esc(t('add'))}</span></button></form>`;
    if (open.length) {
      h += `<div class="seg sm wish-filter" role="tablist"><button type="button" role="tab" data-wf="all" aria-selected="${filter === 'all'}">${esc(t('all'))} ${open.length}</button>`
        + WCATS.filter((c) => counts[c]).map((c) => `<button type="button" role="tab" data-wf="${c}" aria-selected="${filter === c}">${esc(t('cats')[c])} ${counts[c]}</button>`).join('')
        + '</div>';
    }
    h += shown.length ? `<div class="wish-grid">${shown.map(card).join('')}</div>` : `<p class="empty-note big">${esc(t('empty'))}</p>`;
    h += `<section class="achieved"><h2>${esc(t('achieved'))}<span class="count">${done.length}</span></h2>`;
    h += done.length
      ? `<ul class="achieved-list">${done.map((w) => `<li data-wish="${esc(w.id)}"><span class="ach-date">${LO.shortDate(w.doneAt)}</span><div><b data-wedit tabindex="0">${esc(w.title)}</b>`
        + `${w.reflection ? `<p>${esc(w.reflection)}</p>` : ''}</div><span class="tag ${CAT_CLASS[w.cat]}"><i class="sw"></i>${esc(t('cats')[w.cat])}</span></li>`).join('')}</ul>`
      : `<p class="empty-note">${esc(t('achievedEmpty'))}</p>`;
    h += '</section>';
    view.innerHTML = h;
  }

  view.addEventListener('submit', (e) => {
    if (!e.target.closest('[data-wadd]')) return;
    e.preventDefault();
    const input = $('[data-wadd] input', view);
    openEditor(null, input.value.trim());
    input.value = '';
  });
  view.addEventListener('click', (e) => {
    const f = e.target.closest('[data-wf]');
    if (f) { filter = f.dataset.wf; render(); return; }
    const box = e.target.closest('[data-wish]');
    if (!box) return;
    if (e.target.closest('[data-redeem]')) { redeem(box.dataset.wish, e.target.closest('[data-redeem]')); return; }
    if (e.target.closest('[data-wedit]')) openEditor(box.dataset.wish);
  });
  view.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[data-wedit]')) openEditor(e.target.closest('[data-wish]').dataset.wish);
  });
  view.addEventListener('input', (e) => {
    if (!e.target.matches('[data-wprog]')) return;
    e.target.style.setProperty('--p', `${e.target.value}%`);
    const label = e.target.closest('.wish').querySelector('.wish-label');
    if (label) label.textContent = `${e.target.value}%`;
  });
  view.addEventListener('change', (e) => {
    if (!e.target.matches('[data-wprog]')) return;
    const id = e.target.closest('[data-wish]').dataset.wish;
    const v = +e.target.value;
    LO.mutate(W, (s) => { s.wishes.find((x) => x.id === id).progress = v; });
  });

  LO.view('wishes', { render });

  LO.wishes = {
    store: W,
    progressOf,
    goalText,
    catClass: (c) => CAT_CLASS[c],
    top(n) {
      return W.s.wishes.filter((w) => !w.doneAt).map((w) => ({ w, p: progressOf(w) }))
        .sort((a, b) => (b.p.ready - a.p.ready) || (b.p.pct - a.p.pct)).slice(0, n);
    }
  };
})();
