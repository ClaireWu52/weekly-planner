/*
 * Travel guides: one page per trip with a day-by-day itinerary, places to see,
 * where to stay, food, photo spots and a packing list, plus quick links to
 * maps and guides. Today's itinerary also shows on the Today page.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;
  const SECTIONS = ['spots', 'stay', 'food', 'photo', 'pack'];
  const TABS = ['days'].concat(SECTIONS);
  const MAX_DAYS = 60;

  LO.strings('travel', {
    zh: {
      title: '旅游攻略', sub: '每个目的地一页：打卡景点、住宿、美食、出片攻略和行李清单。',
      newTrip: '新建行程', editTrip: '编辑行程', dest: '目的地', destPh: '比如：京都', start: '出发', end: '回来', note: '备注', notePh: '同行的人、预算、交通…',
      sections: { days: '每日行程', spots: '打卡景点', stay: '住宿', food: '美食和餐厅', photo: '出片攻略', pack: '行李清单' },
      addPh: { spots: '景点名称', stay: '酒店或民宿', food: '餐厅或必吃的东西', photo: '机位、穿搭或最佳时间', pack: '要带的东西' },
      itemNotePh: '备注（可不填）', linkPh: '链接（可不填）', add: '添加', back: '全部行程',
      countdown: (n) => (n > 0 ? `还有 ${n} 天` : n === 0 ? '就是今天' : '已经结束'), during: '正在旅行中',
      done: { spots: '去过了', stay: '订好了', food: '吃过了', photo: '拍到了', pack: '带了' },
      progress: (a, b) => `${a}/${b}`, empty: '还没有行程。写下一个想去的地方吧。', emptySec: '这里还空着。',
      map: '地图', xhs: '小红书搜攻略', google: 'Google 搜攻略', errDest: '请填写目的地。', past: '去过的地方',
      packSeed: ['护照或身份证', '手机充电器', '充电宝', '转换插头', '常用药', '换洗衣物', '洗漱用品', '雨伞', '相机'],
      dayLabel: (n, k) => `第 ${n} 天 · ${LO.shortDate(k)} ${LO.t('common.days')[LO.wd(LO.parseKey(k))]}`,
      offDay: (k) => `${LO.shortDate(k)} ${LO.t('common.days')[LO.wd(LO.parseKey(k))]}（不在行程日期内）`,
      planPh: '去哪里、做什么', planNotePh: '备注（可不填）', time: '时间',
      noDates: '先点「编辑」填好出发和回来的日期，就能按天安排行程。', emptyDay: '这一天还没有安排。',
      planDone: '完成', inPlan: (n) => `第 ${n} 天`, planCount: (n) => `行程 ${n}`,
      todayCard: (d, n) => `${d} · 第 ${n} 天`, todayEmpty: '今天还没有安排，去攻略里加一些吧。', openTrip: '打开攻略'
    },
    en: {
      title: 'Travel', sub: 'One page per trip: places to see, where to stay, food, photo spots and a packing list.',
      newTrip: 'New trip', editTrip: 'Edit trip', dest: 'Destination', destPh: 'e.g. Kyoto', start: 'From', end: 'To', note: 'Notes', notePh: 'Who is coming, budget, getting there…',
      sections: { days: 'Itinerary', spots: 'Places', stay: 'Stay', food: 'Food', photo: 'Photo spots', pack: 'Packing' },
      addPh: { spots: 'Place to see', stay: 'Hotel or rental', food: 'Restaurant or dish', photo: 'Spot, outfit or best time', pack: 'Thing to bring' },
      itemNotePh: 'Note (optional)', linkPh: 'Link (optional)', add: 'Add', back: 'All trips',
      countdown: (n) => (n > 0 ? `${n} days to go` : n === 0 ? 'Today' : 'Done'), during: 'On the trip',
      done: { spots: 'Visited', stay: 'Booked', food: 'Tried', photo: 'Got it', pack: 'Packed' },
      progress: (a, b) => `${a}/${b}`, empty: 'No trips yet. Write down a place you want to go.', emptySec: 'Nothing here yet.',
      map: 'Map', xhs: 'Search Xiaohongshu', google: 'Search Google', errDest: 'Add a destination.', past: 'Past trips',
      packSeed: ['Passport or ID', 'Phone charger', 'Power bank', 'Plug adapter', 'Medicine', 'Clothes', 'Toiletries', 'Umbrella', 'Camera'],
      dayLabel: (n, k) => `Day ${n} · ${LO.t('common.days')[LO.wd(LO.parseKey(k))]} ${LO.shortDate(k)}`,
      offDay: (k) => `${LO.t('common.days')[LO.wd(LO.parseKey(k))]} ${LO.shortDate(k)} (outside the trip dates)`,
      planPh: 'Where to go, what to do', planNotePh: 'Note (optional)', time: 'Time',
      noDates: 'Tap Edit and set the trip dates to plan it day by day.', emptyDay: 'Nothing planned for this day yet.',
      planDone: 'Done', inPlan: (n) => `Day ${n}`, planCount: (n) => `Itinerary ${n}`,
      todayCard: (d, n) => `${d} · Day ${n}`, todayEmpty: 'Nothing planned for today yet. Add some in the trip guide.', openTrip: 'Open trip'
    }
  });
  const t = LO.ns('travel');
  const tc = LO.ns('common');

  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const str = (v) => (typeof v === 'string' ? v : '');
  const safeUrl = (u) => { const v = str(u).trim(); if (!v) return ''; const full = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`; return /^https?:/i.test(full) ? full : ''; };
  const T = LO.createStore('travel', 'planner:travel:v1', () => ({ v: 1, trips: [] }), (s) => ({
    v: 1,
    trips: (s.trips || []).filter((x) => x && typeof x.dest === 'string').map((x) => {
      const secs = {};
      SECTIONS.forEach((k) => {
        secs[k] = ((x.sections || {})[k] || []).filter((i) => i && typeof i.name === 'string').map((i) => ({
          id: String(i.id || uid()), name: i.name.slice(0, 80), note: str(i.note).slice(0, 300), link: safeUrl(i.link), done: !!i.done
        }));
      });
      const plan = (x.plan || []).filter((i) => i && typeof i.name === 'string' && isKey(i.day)).map((i) => ({
        id: String(i.id || uid()), day: i.day, time: /^\d{2}:\d{2}$/.test(i.time) ? i.time : '', name: i.name.slice(0, 80),
        note: str(i.note).slice(0, 300), link: safeUrl(i.link), done: !!i.done
      }));
      return { id: String(x.id || uid()), dest: x.dest.slice(0, 40), start: isKey(x.start) ? x.start : '', end: isKey(x.end) ? x.end : '', note: str(x.note), sections: secs, plan };
    })
  }));

  const view = $('#view-travel');
  let openId = null;
  let sec = 'spots';

  function status(tr) {
    const today = LO.todayKey();
    if (tr.start && tr.end && tr.start <= today && today <= tr.end) return t('during');
    if (!tr.start) return '';
    return t('countdown')(LO.dayDiff(today, tr.start));
  }
  const dateRange = (tr) => (tr.start ? `${LO.shortDate(tr.start)}${tr.end ? ` – ${LO.shortDate(tr.end)}` : ''}` : '');
  const isPast = (tr) => tr.end && tr.end < LO.todayKey();

  // Trip days in order: every date from start to end, plus any other date that still has plans.
  function tripDays(tr) {
    const keys = [];
    if (tr.start) {
      const last = tr.end || tr.start;
      for (let d = LO.parseKey(tr.start), i = 0; LO.keyOf(d) <= last && i < MAX_DAYS; d = LO.addDays(d, 1), i++) keys.push(LO.keyOf(d));
    }
    const extra = tr.plan.map((p) => p.day).filter((k) => !keys.includes(k));
    return keys.concat(Array.from(new Set(extra)).sort()).map((k) => ({ key: k, n: keys.indexOf(k) + 1 }));
  }
  const byTime = (a, b) => (a.time || '99:99') < (b.time || '99:99') ? -1 : (a.time || '99:99') > (b.time || '99:99') ? 1 : 0;
  const dayNum = (tr, key) => (tr.start ? LO.dayDiff(tr.start, key) + 1 : 0);

  function openTrip(id) {
    const tr = id ? T.s.trips.find((x) => x.id === id) : null;
    LO.openForm({
      title: tr ? t('editTrip') : t('newTrip'),
      body: `<label class="fld"><span>${esc(t('dest'))}</span><input class="input" name="tdest" maxlength="40" value="${esc(tr ? tr.dest : '')}" placeholder="${esc(t('destPh'))}"></label>`
        + `<div class="form-row"><label class="fld"><span>${esc(t('start'))}</span><input class="input" type="date" name="tstart" value="${esc(tr ? tr.start : '')}"></label>`
        + `<label class="fld"><span>${esc(t('end'))}</span><input class="input" type="date" name="tend" value="${esc(tr ? tr.end : '')}"></label></div>`
        + `<label class="fld"><span>${esc(t('note'))}</span><textarea class="input ta" name="tnote" rows="3" maxlength="600" placeholder="${esc(t('notePh'))}">${esc(tr ? tr.note : '')}</textarea></label>`,
      onSave(dlg) {
        const dest = $('input[name="tdest"]', dlg).value.trim();
        if (!dest) return t('errDest');
        const start = $('input[name="tstart"]', dlg).value || '';
        let end = $('input[name="tend"]', dlg).value || '';
        if (start && end && end < start) end = start;
        const fields = { dest, start, end, note: $('textarea[name="tnote"]', dlg).value.trim() };
        let newId = null;
        LO.mutate(T, (s) => {
          if (tr) Object.assign(s.trips.find((x) => x.id === id), fields);
          else {
            newId = uid();
            const sections = {};
            SECTIONS.forEach((k) => { sections[k] = []; });
            sections.pack = t('packSeed').map((name) => ({ id: uid(), name, note: '', link: '', done: false }));
            s.trips.push(Object.assign({ id: newId, sections, plan: [] }, fields));
          }
        }, tr ? tc('saved') : tc('added'));
        if (newId) { openId = newId; sec = 'days'; render(); }
        return true;
      },
      onDelete: tr ? () => { openId = null; LO.mutate(T, (s) => { s.trips = s.trips.filter((x) => x.id !== id); }, tc('deleted')); } : null
    });
  }

  function listHTML() {
    const trips = T.s.trips.slice().sort((a, b) => (a.start || '9999') < (b.start || '9999') ? -1 : 1);
    const upcoming = trips.filter((x) => !isPast(x));
    const past = trips.filter(isPast).reverse();
    const card = (tr) => {
      const total = SECTIONS.reduce((a, k) => a + tr.sections[k].length, 0);
      const done = SECTIONS.reduce((a, k) => a + tr.sections[k].filter((i) => i.done).length, 0);
      return `<button type="button" class="trip" data-trip="${esc(tr.id)}"><span class="trip-dest">${esc(tr.dest)}</span>`
        + `<span class="trip-dates">${esc(dateRange(tr))}</span>${status(tr) && !isPast(tr) ? `<span class="badge">${esc(status(tr))}</span>` : ''}`
        + `<span class="trip-counts">${tr.plan.length ? `${esc(t('planCount')(tr.plan.length))}　` : ''}${SECTIONS.filter((k) => k !== 'pack' && tr.sections[k].length).map((k) => `${esc(t('sections')[k])} ${tr.sections[k].length}`).join('　')}</span>`
        + `${total ? `<span class="progress sm"><span style="width:${done / total * 100}%"></span></span>` : ''}</button>`;
    };
    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1><p class="sub">${esc(t('sub'))}</p></div>`
      + `<button type="button" class="btn primary" data-tnew>${LO.icon.plus}<span>${esc(t('newTrip'))}</span></button></div>`;
    if (!trips.length) return `${h}<p class="empty-note big">${esc(t('empty'))}</p>`;
    h += `<div class="trip-grid">${upcoming.map(card).join('')}</div>`;
    if (past.length) h += `<div class="section-head"><h2>${esc(t('past'))}<span class="count">${past.length}</span></h2></div><div class="trip-grid past">${past.map(card).join('')}</div>`;
    return h;
  }

  function detailHTML(tr) {
    const q = encodeURIComponent(tr.dest);
    let h = `<button type="button" class="link-btn back" data-tback>‹ ${esc(t('back'))}</button>`
      + `<div class="view-head"><div><h1>${esc(tr.dest)}</h1><p class="sub">${esc([dateRange(tr), status(tr)].filter(Boolean).join('，'))}</p></div>`
      + `<button type="button" class="btn" data-tedit>${esc(tc('edit'))}</button></div>`;
    if (tr.note) h += `<p class="trip-note">${esc(tr.note)}</p>`;
    h += `<div class="row trip-links"><a class="btn sm" href="https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(tr.dest + ' 攻略')}" target="_blank" rel="noopener noreferrer">${esc(t('xhs'))}</a>`
      + `<a class="btn sm" href="https://www.google.com/search?q=${encodeURIComponent(tr.dest + ' travel guide')}" target="_blank" rel="noopener noreferrer">${esc(t('google'))}</a>`
      + `<a class="btn sm" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener noreferrer">${esc(t('map'))}</a></div>`;
    h += `<div class="seg trip-tabs">${TABS.map((k) => {
      const list = k === 'days' ? tr.plan : tr.sections[k];
      return `<button type="button" data-tsec="${k}" aria-selected="${k === sec}">${esc(t('sections')[k])}${list.length ? ` ${esc(t('progress')(list.filter((i) => i.done).length, list.length))}` : ''}</button>`;
    }).join('')}</div>`;
    if (sec === 'days') return h + planHTML(tr);
    const list = tr.sections[sec];
    const planned = (name) => tr.plan.filter((p) => p.name === name).map((p) => dayNum(tr, p.day)).filter((n) => n > 0);
    h += `<section class="card trip-sec"><form class="trip-add" data-tadd><input class="input" name="iname" maxlength="80" placeholder="${esc(t('addPh')[sec])}" aria-label="${esc(t('addPh')[sec])}">`
      + (sec === 'pack' ? '' : `<input class="input" name="inote" maxlength="300" placeholder="${esc(t('itemNotePh'))}" aria-label="${esc(t('itemNotePh'))}"><input class="input" name="ilink" maxlength="400" placeholder="${esc(t('linkPh'))}" aria-label="${esc(t('linkPh'))}">`)
      + `<button type="submit" class="btn primary">${LO.icon.plus}<span>${esc(t('add'))}</span></button></form>`;
    h += list.length ? `<ul class="trip-items">${list.map((i) => `<li class="${i.done ? 'is-done' : ''}" data-titem="${esc(i.id)}">`
      + `<label class="check"><input type="checkbox" data-tdone${i.done ? ' checked' : ''} aria-label="${esc(t('done')[sec])}"></label>`
      + `<div class="ti-body">${i.link ? `<a href="${esc(i.link)}" target="_blank" rel="noopener noreferrer"><b>${esc(i.name)}</b></a>` : `<b>${esc(i.name)}</b>`}${planned(i.name).length ? `<span class="badge">${planned(i.name).map((n) => esc(t('inPlan')(n))).join(' ')}</span>` : ''}${i.note ? `<p>${esc(i.note)}</p>` : ''}</div>`
      + (sec === 'pack' ? '' : `<a class="btn sm ghost" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.name + ' ' + tr.dest)}" target="_blank" rel="noopener noreferrer">${esc(t('map'))}</a>`)
      + `<button type="button" class="icon-btn sm ghost" data-tdel aria-label="${esc(tc('delete'))}">${LO.icon.x}</button></li>`).join('')}</ul>`
      : `<p class="empty-note">${esc(t('emptySec'))}</p>`;
    return `${h}</section>`;
  }

  function planHTML(tr) {
    const days = tripDays(tr);
    if (!days.length) return `<section class="card trip-sec"><p class="empty-note">${esc(t('noDates'))}</p></section>`;
    const today = LO.todayKey();
    const q = (name) => encodeURIComponent(`${name} ${tr.dest}`);
    const picks = Array.from(new Set(['spots', 'food', 'stay', 'photo'].flatMap((k) => tr.sections[k].map((i) => i.name))));
    let h = `<datalist id="tripPicks">${picks.map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist>`;
    days.forEach(({ key, n }) => {
      const items = tr.plan.filter((p) => p.day === key).sort(byTime);
      h += `<section class="card trip-sec trip-day${key === today ? ' is-today' : ''}"><header class="card-head"><h2>${esc(n ? t('dayLabel')(n, key) : t('offDay')(key))}`
        + `${key === today ? `<span class="badge live">${esc(tc('today'))}</span>` : ''}</h2>${items.length ? `<span class="count">${items.filter((p) => p.done).length}/${items.length}</span>` : ''}</header>`;
      h += items.length ? `<ul class="trip-items plan-items">${items.map((p) => `<li class="${p.done ? 'is-done' : ''}" data-pitem="${esc(p.id)}">`
        + `<label class="check"><input type="checkbox" data-pdone${p.done ? ' checked' : ''} aria-label="${esc(t('planDone'))}"></label>`
        + `<span class="plan-time">${esc(p.time)}</span>`
        + `<div class="ti-body">${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer"><b>${esc(p.name)}</b></a>` : `<b>${esc(p.name)}</b>`}${p.note ? `<p>${esc(p.note)}</p>` : ''}</div>`
        + `<a class="btn sm ghost" href="https://www.google.com/maps/search/?api=1&query=${q(p.name)}" target="_blank" rel="noopener noreferrer">${esc(t('map'))}</a>`
        + `<button type="button" class="icon-btn sm ghost" data-pdel aria-label="${esc(tc('delete'))}">${LO.icon.x}</button></li>`).join('')}</ul>`
        : `<p class="empty-note">${esc(t('emptyDay'))}</p>`;
      if (n) {
        h += `<form class="trip-add plan-add" data-padd="${key}"><input class="input plan-time-in" type="time" name="ptime" aria-label="${esc(t('time'))}">`
          + `<input class="input" name="pname" maxlength="80" list="tripPicks" placeholder="${esc(t('planPh'))}" aria-label="${esc(t('planPh'))}">`
          + `<input class="input" name="pnote" maxlength="300" placeholder="${esc(t('planNotePh'))}" aria-label="${esc(t('planNotePh'))}">`
          + `<button type="submit" class="btn primary">${LO.icon.plus}<span>${esc(t('add'))}</span></button></form>`;
      }
      h += '</section>';
    });
    return h;
  }

  function render() {
    const tr = openId ? T.s.trips.find((x) => x.id === openId) : null;
    if (!tr) openId = null;
    view.innerHTML = tr ? detailHTML(tr) : listHTML();
  }

  const curTrip = (s) => s.trips.find((x) => x.id === openId);
  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-tnew]')) { openTrip(null); return; }
    const tc0 = e.target.closest('[data-trip]');
    if (tc0) { openId = tc0.dataset.trip; sec = 'days'; render(); window.scrollTo(0, 0); return; }
    if (e.target.closest('[data-tback]')) { openId = null; render(); return; }
    if (e.target.closest('[data-tedit]')) { openTrip(openId); return; }
    const sb = e.target.closest('[data-tsec]');
    if (sb) { sec = sb.dataset.tsec; render(); return; }
    const del = e.target.closest('[data-tdel]');
    if (del) {
      const iid = del.closest('[data-titem]').dataset.titem;
      LO.mutate(T, (s) => { const tr = curTrip(s); tr.sections[sec] = tr.sections[sec].filter((i) => i.id !== iid); }, tc('deleted'));
      return;
    }
    const pdel = e.target.closest('[data-pdel]');
    if (pdel) {
      const pid = pdel.closest('[data-pitem]').dataset.pitem;
      LO.mutate(T, (s) => { const tr = curTrip(s); tr.plan = tr.plan.filter((p) => p.id !== pid); }, tc('deleted'));
    }
  });
  view.addEventListener('change', (e) => {
    if (e.target.matches('[data-pdone]')) {
      const pid = e.target.closest('[data-pitem]').dataset.pitem;
      LO.mutate(T, (s) => { const p = curTrip(s).plan.find((x) => x.id === pid); p.done = !p.done; });
      return;
    }
    if (!e.target.matches('[data-tdone]')) return;
    const iid = e.target.closest('[data-titem]').dataset.titem;
    LO.mutate(T, (s) => { const it = curTrip(s).sections[sec].find((i) => i.id === iid); it.done = !it.done; });
  });
  view.addEventListener('submit', (e) => {
    if (e.target.matches('[data-padd]')) {
      e.preventDefault();
      const f = e.target;
      const day = f.dataset.padd;
      const name = $('input[name="pname"]', f).value.trim();
      if (!name) return;
      const time = $('input[name="ptime"]', f).value || '';
      let note = $('input[name="pnote"]', f).value.trim();
      let link = '';
      LO.mutate(T, (s) => {
        const tr = curTrip(s);
        // picked from places, food, stay or photo spots: bring its note and link along
        const src = ['spots', 'food', 'stay', 'photo'].map((k) => tr.sections[k].find((i) => i.name === name)).find(Boolean);
        if (src) { link = src.link; if (!note) note = src.note; }
        tr.plan.push({ id: uid(), day, time, name, note, link, done: false });
      });
      const i = $(`[data-padd="${day}"] input[name="pname"]`, view);
      if (i) i.focus();
      return;
    }
    if (!e.target.matches('[data-tadd]')) return;
    e.preventDefault();
    const f = e.target;
    const name = $('input[name="iname"]', f).value.trim();
    if (!name) return;
    const note = f.querySelector('input[name="inote"]') ? $('input[name="inote"]', f).value.trim() : '';
    const link = f.querySelector('input[name="ilink"]') ? safeUrl($('input[name="ilink"]', f).value) : '';
    LO.mutate(T, (s) => { curTrip(s).sections[sec].push({ id: uid(), name, note, link, done: false }); });
    const i = $('[data-tadd] input[name="iname"]', view);
    if (i) i.focus();
  });

  LO.view('travel', { render, onShow() { /* keep the open trip when coming back */ } });

  LO.travel = {
    // The trip happening today (if any) with today's plans, for the Today page.
    today() {
      const k = LO.todayKey();
      const tr = T.s.trips.find((x) => x.start && x.start <= k && k <= (x.end || x.start));
      if (!tr) return null;
      return { id: tr.id, dest: tr.dest, n: dayNum(tr, k), items: tr.plan.filter((p) => p.day === k).sort(byTime) };
    },
    show(id) { openId = id; sec = 'days'; LO.go('travel'); render(); }
  };
})();
