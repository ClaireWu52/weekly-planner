/*
 * Schedule, print view: the paper and layout settings, the page preview
 * scaled to fit, and printing. Plugs into planner.js through LO.plannerKit.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const K = LO.plannerKit;
  const { $, $$, esc, t, L, seq, clamp, CATS, PAPER, PAGE_PAD, curKey, curMonday, week, weekEvents, weekTodos, gridHTML, legendHTML, titleText, rangeLabel, hourSelect, persist } = K;
  const printForm = $('#printForm');
  const printRoot = $('#printRoot');
  const pageFrame = $('#pageFrame');
  const previewArea = $('#previewArea');

  function pageSize() {
    const [lg, sh] = PAPER[K.state.print.paper] || PAPER.letter;
    // shave a few px so rounding never spills onto a second sheet
    return K.state.print.orient === 'portrait' ? [sh - 2, lg - 6] : [lg - 2, sh - 6];
  }

  function printDays() {
    const d = seq(7).filter((i) => K.state.print.days[i]);
    return d.length ? d : seq(7);
  }
  function printEvents(days) {
    const P = K.state.print;
    return weekEvents(curKey()).filter((e) => P.cats[e.cat] && (P.showOnce || e.rec) && days.includes(e.day));
  }

  function renderPrint() {
    const P = K.state.print;
    const mon = curMonday();
    const w = week(curKey());
    const days = printDays();
    const evs = printEvents(days);
    const sMin = clamp(P.start, 0, 23) * 60;
    const eMin = clamp(Math.max(P.end, P.start + 1), 1, 24) * 60;
    const [W, H] = pageSize();
    const portrait = P.orient === 'portrait';
    const usableH = H - 2 * PAGE_PAD - 54 - 26 - 22 - (P.showSide && portrait ? 204 : 0);
    const pxPerHour = usableH / ((eMin - sMin) / 60);

    let h = `<div class="page ${portrait ? 'portrait' : 'landscape'}${P.mono ? ' mono' : ''}" style="width:${W}px;height:${H}px">`;
    h += `<header class="p-head"><h1>${esc(titleText())}</h1><div class="p-range">${esc(rangeLabel(mon, true))}</div></header>`;
    h += '<div class="p-main"><div class="p-grid">';
    h += gridHTML({
      monday: mon, days, sMin, eMin, events: evs, pxPerHour,
      interactive: false, showTime: !!P.showTime, showPlace: !!P.showPlace,
      halfLines: pxPerHour >= 34, print: true, todayKey: null, nowMin: null
    });
    h += '</div>';
    if (P.showSide) {
      const todos = weekTodos(mon).map((td) => `<li class="${td.done ? 'done' : ''}">${esc(td.title)}</li>`).join('');
      h += '<aside class="p-side">'
        + `<div class="p-sec"><h4>${esc(t('todoTitle'))}</h4><ul class="p-todos">${todos}</ul><div class="ruled"></div></div>`
        + `<div class="p-sec"><h4>${esc(t('notesTitle'))}</h4>${w.notes ? `<p class="p-notes">${esc(w.notes)}</p>` : ''}<div class="ruled"></div></div>`
        + '</aside>';
    }
    h += `</div><footer class="p-foot">${legendHTML(evs)}</footer></div>`;
    printRoot.innerHTML = h;
    $('#pageStyle').textContent = `@page { size: ${P.paper === 'a4' ? 'A4' : 'letter'} ${P.orient}; margin: 0; }`;
    fitPreview();
  }

  function fitPreview() {
    const page = $('.page', printRoot);
    if (!page) return;
    const [W, H] = pageSize();
    const avail = previewArea.clientWidth;
    if (avail <= 0) return;
    const s = Math.min(1, avail / W);
    pageFrame.style.width = `${W * s}px`;
    pageFrame.style.height = `${H * s}px`;
    page.style.transform = `scale(${s})`;
  }
  if ('ResizeObserver' in window) new ResizeObserver(fitPreview).observe(previewArea);
  else window.addEventListener('resize', fitPreview);

  function renderPrintForm() {
    const P = K.state.print;
    const chip = (name, val, label, checked, type, extra) =>
      `<label class="chip${extra ? ' ' + extra : ''}"><input type="${type}" name="${name}" value="${val}"${checked ? ' checked' : ''}><span>${label}</span></label>`;
    const check = (k) => `<label class="check"><input type="checkbox" id="p_${k}"${P[k] ? ' checked' : ''}>${esc(t('p.' + k))}</label>`;
    let h = '';
    h += `<div class="fld"><span>${esc(t('p.paper'))}</span><div class="chips">`
      + chip('paper', 'letter', 'Letter', P.paper === 'letter', 'radio') + chip('paper', 'a4', 'A4', P.paper === 'a4', 'radio') + '</div></div>';
    h += `<div class="fld"><span>${esc(t('p.orient'))}</span><div class="chips">`
      + chip('orient', 'landscape', esc(t('p.landscape')), P.orient === 'landscape', 'radio')
      + chip('orient', 'portrait', esc(t('p.portrait')), P.orient === 'portrait', 'radio') + '</div></div>';
    h += `<div class="fld"><span>${esc(t('p.days'))}</span><div class="chips">`
      + seq(7).map((d) => chip('pday', d, L().days[d], P.days[d], 'checkbox')).join('')
      + `</div><div class="quick"><button type="button" class="btn sm" data-q="all">${esc(t('p.all'))}</button>`
      + `<button type="button" class="btn sm" data-q="weekdays">${esc(t('p.weekdays'))}</button></div></div>`;
    h += `<div class="fld"><span>${esc(t('p.cats'))}</span><div class="chips">`
      + CATS.map((c) => chip('pcat', c, `<i class="sw"></i>${esc(t('cats.' + c))}`, P.cats[c], 'checkbox', 'cat-' + c)).join('') + '</div></div>';
    h += `<div class="fld"><span>${esc(t('p.range'))}</span><div class="row">${hourSelect('pStart', 0, 23, P.start)}<span>${esc(t('to'))}</span>`
      + `${hourSelect('pEnd', 1, 24, P.end)}<button type="button" class="btn sm" data-q="fit">${esc(t('p.auto'))}</button></div></div>`;
    h += `<div class="fld"><span>${esc(t('p.content'))}</span>${['showTime', 'showPlace', 'showOnce', 'showSide', 'mono'].map(check).join('')}</div>`;
    h += `<div class="actions"><button type="button" class="btn primary block" data-q="print">${esc(t('p.print'))}</button>`
      + `<p class="tip">${esc(t('p.tip'))}</p></div>`;
    printForm.innerHTML = h;
  }

  function readPrintForm() {
    const P = K.state.print;
    const radio = (n) => { const el = $(`input[name="${n}"]:checked`, printForm); return el ? el.value : null; };
    P.paper = radio('paper') || 'letter';
    P.orient = radio('orient') || 'landscape';
    P.days = $$('input[name="pday"]', printForm).map((i) => (i.checked ? 1 : 0));
    $$('input[name="pcat"]', printForm).forEach((i) => { P.cats[i.value] = i.checked ? 1 : 0; });
    P.start = +$('#pStart').value;
    P.end = +$('#pEnd').value;
    if (P.end <= P.start) { P.end = Math.min(24, P.start + 1); $('#pEnd').value = String(P.end); }
    ['showTime', 'showPlace', 'showOnce', 'showSide', 'mono'].forEach((k) => { P[k] = $(`#p_${k}`).checked ? 1 : 0; });
    persist();
    renderPrint();
  }

  printForm.addEventListener('change', readPrintForm);
  printForm.addEventListener('submit', (e) => e.preventDefault());
  printForm.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]');
    if (!q) return;
    const P = K.state.print;
    if (q.dataset.q === 'all') P.days = [1, 1, 1, 1, 1, 1, 1];
    else if (q.dataset.q === 'weekdays') P.days = [1, 1, 1, 1, 1, 0, 0];
    else if (q.dataset.q === 'fit') {
      const evs = printEvents(printDays());
      if (evs.length) {
        P.start = Math.floor(Math.min(...evs.map((x) => x.start)) / 60);
        P.end = Math.ceil(Math.max(...evs.map((x) => x.end)) / 60);
      }
    } else if (q.dataset.q === 'print') { doPrint(); return; }
    persist();
    renderPrintForm();
    renderPrint();
  });

  function doPrint() {
    renderPrint();
    window.print();
  }
  window.addEventListener('beforeprint', renderPrint);

  Object.assign(K, { renderPrint, renderPrintForm, fitPreview });
})();
