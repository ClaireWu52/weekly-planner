/*
 * Share to the planner: once it's installed (Android, desktop Chrome/Edge), it
 * shows up in the system share sheet. A shared page or text opens here and can
 * be saved as a to-do, a saved link on the Learning page, or a place on a trip.
 * The manifest's share_target sends it as ?share_title=…&share_text=…&share_url=…
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;

  LO.strings('share', {
    zh: {
      title: '存到计划本', name: '名称', link: '链接', where: '存到哪里', save: '保存',
      to: { todo: '待办', link: '学习页的收藏', trip: '旅行' }, trip: '哪个行程', sec: '放进', saved: '已保存', errName: '请填写名称。'
    },
    en: {
      title: 'Save to My Planner', name: 'Name', link: 'Link', where: 'Save as', save: 'Save',
      to: { todo: 'To-do', link: 'Saved link (Learning)', trip: 'Trip' }, trip: 'Which trip', sec: 'Section', saved: 'Saved', errName: 'Add a name.'
    }
  });
  const t = LO.ns('share');

  function read() {
    const q = new URLSearchParams(window.location.search);
    if (!q.has('share_title') && !q.has('share_text') && !q.has('share_url')) return null;
    let text = (q.get('share_text') || '').trim();
    let url = (q.get('share_url') || '').trim();
    // many apps put the link inside the text
    const m = /https?:\/\/\S+/.exec(text);
    if (!url && m) url = m[0];
    if (m) text = text.replace(m[0], '').trim();
    const title = (q.get('share_title') || '').trim() || text || url;
    return { title: title.slice(0, 80), url: /^https?:\/\//i.test(url) ? url : '' };
  }

  function open(data) {
    const tv = LO.store('travel');
    const trips = tv ? tv.s.trips.slice().sort((a, b) => ((b.start || '') < (a.start || '') ? -1 : 1)) : [];
    const sects = ['spots', 'food', 'stay', 'photo'];
    const dests = trips.map((x) => [x.id, esc(x.dest)]);
    const targets = ['todo', 'link'].concat(trips.length ? ['trip'] : []);
    LO.openForm({
      title: t('title'),
      saveLabel: t('save'),
      body: `<label class="fld"><span>${esc(t('name'))}</span><input class="input" name="shname" maxlength="80" value="${esc(data.title)}"></label>`
        + (data.url ? `<label class="fld"><span>${esc(t('link'))}</span><input class="input" name="shurl" value="${esc(data.url)}"></label>` : '')
        + `<div class="fld"><span>${esc(t('where'))}</span><div class="chips">${LO.chips('shto', targets.map((x) => [x, esc(t('to')[x])]), 'radio', [data.url ? 'link' : 'todo'])}</div></div>`
        + (trips.length ? `<div class="row" data-shtrip hidden><label class="fld"><span>${esc(t('trip'))}</span><select class="input" name="shtrip">${dests.map(([id, d]) => `<option value="${esc(id)}">${d}</option>`).join('')}</select></label>`
          + `<label class="fld"><span>${esc(t('sec'))}</span><select class="input" name="shsec">${sects.map((s) => `<option value="${s}">${esc(LO.t('travel.sections.' + s))}</option>`).join('')}</select></label></div>` : ''),
      onOpen(dlg) {
        const row = $('[data-shtrip]', dlg);
        if (row) dlg.addEventListener('change', (e) => { if (e.target.name === 'shto') row.hidden = e.target.value !== 'trip'; });
      },
      onSave(dlg) {
        const name = $('input[name="shname"]', dlg).value.trim();
        if (!name) return t('errName');
        const u = $('input[name="shurl"]', dlg);
        const url = u && /^https?:\/\//i.test(u.value.trim()) ? u.value.trim() : '';
        const to = LO.checkedVal(dlg, 'shto') || 'todo';
        const today = LO.todayKey();
        if (to === 'todo') LO.tasks.addTodo({ title: name, notes: url });
        else if (to === 'link') LO.mutate(LO.learn.store, (s) => { s.links.unshift({ id: uid(), title: name, url, topic: '', note: '', created: today }); });
        else {
          const id = $('select[name="shtrip"]', dlg).value;
          const sec = $('select[name="shsec"]', dlg).value;
          LO.mutate(tv, (s) => { const tr = s.trips.find((x) => x.id === id); if (tr) tr.sections[sec].push({ id: uid(), name, note: '', link: url, done: false }); });
        }
        LO.toast(t('saved'), [{ label: LO.t('common.undo'), run: LO.undo }]);
        return true;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const data = read();
    if (!data) return;
    // drop the shared text from the address so a reload doesn't ask again
    window.history.replaceState(null, '', window.location.pathname + (window.location.hash || '#/today'));
    setTimeout(() => open(data), 0);
  });
})();
