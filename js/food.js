/*
 * What to eat: a spinning wheel over your usual food options, with an
 * optional list of favourite places per option and a short history.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;

  LO.strings('food', {
    zh: {
      title: '今天吃什么', sub: '把常吃的放进转盘，选择困难就交给它。',
      spin: '转一下', result: (x) => `就吃${x}吧`, place: (p) => `去 ${p}`, again: '再转一次', eat: '就吃这个', eaten: '记下来了，吃好',
      options: '转盘里的选项', addPh: '加一个选项，比如：越南粉', avoid: '避开最近两次吃过的',
      history: '最近吃的', noHistory: '还没有记录。', tooFew: '至少要有两个开着的选项才能转。',
      edit: '编辑选项', name: '名称', places: '常去的店（每行一个，可不填）', placesPh: 'Sushi O\nPanera Bread', on: '放进转盘',
      errName: '请填写名称。', placesN: (n) => `${n} 家店`,
      seed: ['三明治', '轻食沙拉', '面食', '中餐', '韩餐', '日料', '意大利菜', '墨西哥菜']
    },
    en: {
      title: 'What to eat', sub: 'Put your usual options on the wheel and let it decide.',
      spin: 'Spin', result: (x) => `${x} it is`, place: (p) => `Go to ${p}`, again: 'Spin again', eat: "Let's eat this", eaten: 'Saved. Enjoy.',
      options: 'Options on the wheel', addPh: 'Add an option, e.g. Pho', avoid: 'Skip the last two picks',
      history: 'Recently eaten', noHistory: 'Nothing yet.', tooFew: 'You need at least two options switched on.',
      edit: 'Edit option', name: 'Name', places: 'Favourite places (one per line, optional)', placesPh: 'Sushi O\nPanera Bread', on: 'On the wheel',
      errName: 'Add a name.', placesN: (n) => `${n} places`,
      seed: ['Sandwich', 'Salad bowl', 'Noodles', 'Chinese', 'Korean', 'Japanese', 'Italian', 'Mexican']
    }
  });
  const t = LO.ns('food');
  const tc = LO.ns('common');

  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const F = LO.createStore('food', 'planner:food:v1',
    () => ({ v: 1, options: t('seed').map((name) => ({ id: uid(), name, places: [], on: true })), history: [], avoid: false }),
    (s) => ({
      v: 1,
      avoid: !!s.avoid,
      options: (s.options || []).filter((o) => o && typeof o.name === 'string' && o.name.trim()).slice(0, 40).map((o) => ({
        id: String(o.id || uid()), name: o.name.trim().slice(0, 30), on: o.on !== false,
        places: (Array.isArray(o.places) ? o.places : []).filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim().slice(0, 50)).slice(0, 20)
      })),
      history: (s.history || []).filter((h) => h && isKey(h.date) && typeof h.option === 'string').slice(-30)
        .map((h) => ({ date: h.date, option: h.option, place: typeof h.place === 'string' ? h.place : '' }))
    }));

  const COLORS = ['class', 'work', 'meeting', 'health', 'life', 'other', 'study'];
  let rotation = 0;
  let spinning = false;
  let result = null; // { option, place }

  function wheelSVG(opts) {
    const n = opts.length;
    const cx = 160;
    const r = 150;
    if (n < 2) return `<svg viewBox="0 0 320 320" class="wheel"><circle cx="${cx}" cy="${cx}" r="${r}" class="wheel-empty"/></svg>`;
    const seg = 360 / n;
    const pt = (deg, rad) => { const a = (deg - 90) * Math.PI / 180; return [cx + rad * Math.cos(a), cx + rad * Math.sin(a)]; };
    const fs = n > 10 ? 11 : n > 7 ? 12.5 : 14;
    let g = '';
    opts.forEach((o, i) => {
      const a0 = i * seg;
      const a1 = a0 + seg;
      const [x0, y0] = pt(a0, r);
      const [x1, y1] = pt(a1, r);
      const large = seg > 180 ? 1 : 0;
      const mid = a0 + seg / 2;
      const [tx, ty] = pt(mid, r * 0.62);
      const label = o.name.length > 6 ? o.name.slice(0, 6) + '…' : o.name;
      g += `<path d="M${cx},${cx} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z" class="slice c-${COLORS[i % COLORS.length]}"/>`
        + `<text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" transform="rotate(${mid} ${tx.toFixed(2)} ${ty.toFixed(2)})" font-size="${fs}" class="slice-label">${esc(label)}</text>`;
    });
    return `<svg viewBox="0 0 320 320" class="wheel" aria-hidden="true"><g class="wheel-rot" style="transform:rotate(${rotation}deg)">${g}</g><circle cx="${cx}" cy="${cx}" r="34" class="wheel-hub"/></svg>`;
  }

  function spin() {
    if (spinning) return;
    const opts = F.s.options.filter((o) => o.on);
    if (opts.length < 2) { LO.toast(t('tooFew')); return; }
    const recent = F.s.avoid ? F.s.history.slice(-2).map((h) => h.option) : [];
    let pool = opts.map((o, i) => i).filter((i) => !recent.includes(opts[i].name));
    if (!pool.length) pool = opts.map((o, i) => i);
    const win = pool[Math.floor(Math.random() * pool.length)];
    const seg = 360 / opts.length;
    const center = win * seg + seg / 2;
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const base = rotation - (rotation % 360);
    rotation = base + 360 * 5 + (360 - center) + jitter;
    const o = opts[win];
    const pending = { option: o.name, place: o.places.length ? o.places[Math.floor(Math.random() * o.places.length)] : '' };
    const g = $('.wheel-rot', view);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    result = null;
    if (!g || reduce) { result = pending; render(); return; }
    spinning = true;
    $('[data-spin]', view).disabled = true;
    $('.food-result', view).innerHTML = '';
    g.style.transition = 'transform 3.4s cubic-bezier(.15,.75,.12,1)';
    requestAnimationFrame(() => { g.style.transform = `rotate(${rotation}deg)`; });
    const done = () => { spinning = false; result = pending; render(); };
    g.addEventListener('transitionend', done, { once: true });
    setTimeout(() => { if (spinning) done(); }, 3800);
  }

  function openEditor(id) {
    const o = F.s.options.find((x) => x.id === id);
    if (!o) return;
    LO.openForm({
      title: t('edit'),
      body: `<label class="fld"><span>${esc(t('name'))}</span><input class="input" name="fname" maxlength="30" value="${esc(o.name)}"></label>`
        + `<label class="fld"><span>${esc(t('places'))}</span><textarea class="input ta" name="fplaces" rows="4" placeholder="${esc(t('placesPh'))}">${esc(o.places.join('\n'))}</textarea></label>`
        + `<label class="check"><input type="checkbox" name="fon"${o.on ? ' checked' : ''}>${esc(t('on'))}</label>`,
      onSave(dlg) {
        const name = $('input[name="fname"]', dlg).value.trim();
        if (!name) return t('errName');
        const places = $('textarea[name="fplaces"]', dlg).value.split('\n').map((x) => x.trim()).filter(Boolean);
        LO.mutate(F, (s) => { Object.assign(s.options.find((x) => x.id === id), { name, places, on: $('input[name="fon"]', dlg).checked }); }, tc('saved'));
        return true;
      },
      onDelete: () => LO.mutate(F, (s) => { s.options = s.options.filter((x) => x.id !== id); }, tc('deleted'))
    });
  }

  const view = $('#view-food');

  function render() {
    const opts = F.s.options.filter((o) => o.on);
    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1><p class="sub">${esc(t('sub'))}</p></div></div>`;
    h += '<div class="food-grid">';
    h += `<section class="card wheel-card"><div class="wheel-wrap"><span class="wheel-pointer" aria-hidden="true"></span>${wheelSVG(opts)}`
      + `<button type="button" class="wheel-btn" data-spin${spinning ? ' disabled' : ''}>${esc(t('spin'))}</button></div>`
      + `<div class="food-result" aria-live="polite">${result ? `<p class="fr-main">${esc(t('result')(result.option))}</p>${result.place ? `<p class="fr-place">${esc(t('place')(result.place))}</p>` : ''}`
        + `<div class="row"><button type="button" class="btn primary" data-eat>${esc(t('eat'))}</button><button type="button" class="btn" data-spin>${esc(t('again'))}</button></div>` : ''}</div>`
      + `${opts.length < 2 ? `<p class="empty-note">${esc(t('tooFew'))}</p>` : ''}</section>`;
    h += `<div class="food-side"><section class="card"><header class="card-head"><h2>${esc(t('options'))}<span class="count">${opts.length}/${F.s.options.length}</span></h2></header>`
      + `<ul class="food-opts">${F.s.options.map((o) => `<li data-opt="${esc(o.id)}"><label class="check"><input type="checkbox" data-optoggle${o.on ? ' checked' : ''}><span>${esc(o.name)}</span></label>`
        + `${o.places.length ? `<span class="hint">${esc(t('placesN')(o.places.length))}</span>` : ''}<button type="button" class="icon-btn sm ghost" data-optedit aria-label="${esc(t('edit'))}">✎</button></li>`).join('')}</ul>`
      + `<form class="quick-add" data-optadd><input maxlength="30" autocomplete="off" placeholder="${esc(t('addPh'))}" aria-label="${esc(t('addPh'))}"><button type="submit" class="icon-btn" aria-label="${esc(tc('add'))}">${LO.icon.plus}</button></form>`
      + `<label class="check avoid"><input type="checkbox" data-avoid${F.s.avoid ? ' checked' : ''}>${esc(t('avoid'))}</label></section>`;
    const hist = F.s.history.slice().reverse().slice(0, 8);
    h += `<section class="card"><header class="card-head"><h2>${esc(t('history'))}</h2></header>`
      + (hist.length ? `<ul class="log-list">${hist.map((x) => `<li><span class="log-date">${LO.shortDate(x.date)}</span><span class="log-main"><b>${esc(x.option)}</b>${x.place ? ` <span class="hint">${esc(x.place)}</span>` : ''}</span></li>`).join('')}</ul>`
        : `<p class="empty-note">${esc(t('noHistory'))}</p>`)
      + '</section></div></div>';
    view.innerHTML = h;
  }

  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-spin]')) { spin(); return; }
    if (e.target.closest('[data-eat]') && result) {
      const r = result;
      result = null;
      LO.mutate(F, (s) => { s.history.push({ date: LO.todayKey(), option: r.option, place: r.place }); s.history = s.history.slice(-30); }, t('eaten'));
      return;
    }
    const ed = e.target.closest('[data-optedit]');
    if (ed) openEditor(ed.closest('[data-opt]').dataset.opt);
  });
  view.addEventListener('change', (e) => {
    if (e.target.matches('[data-optoggle]')) {
      const id = e.target.closest('[data-opt]').dataset.opt;
      LO.mutate(F, (s) => { const o = s.options.find((x) => x.id === id); o.on = !o.on; });
    } else if (e.target.matches('[data-avoid]')) {
      LO.mutate(F, (s) => { s.avoid = !s.avoid; });
    }
  });
  view.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-optadd]')) return;
    e.preventDefault();
    const name = $('input', e.target).value.trim();
    if (!name) return;
    LO.mutate(F, (s) => { s.options.push({ id: uid(), name, places: [], on: true }); });
    const i = $('[data-optadd] input', view);
    if (i) i.focus();
  });

  LO.view('food', { render });
})();
