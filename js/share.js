/*
 * Share to the planner: once it's installed (Android, desktop Chrome/Edge), it
 * shows up in the system share sheet. A shared page or text opens here and can
 * be saved as a to-do or a saved link on the Learning page. (Trips moved to
 * their own app, travel-planner, so places can't be shared into a trip from here.)
 * The manifest's share_target sends it as ?share_title=…&share_text=…&share_url=…
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;

  LO.strings('share', {
    zh: {
      title: '存到计划本', name: '名称', link: '链接', where: '存到哪里', save: '保存',
      to: { todo: '待办', link: '学习页的收藏' }, saved: '已保存', errName: '请填写名称。'
    },
    en: {
      title: 'Save to My Planner', name: 'Name', link: 'Link', where: 'Save as', save: 'Save',
      to: { todo: 'To-do', link: 'Saved link (Learning)' }, saved: 'Saved', errName: 'Add a name.'
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
    const targets = ['todo', 'link'];
    LO.openForm({
      title: t('title'),
      saveLabel: t('save'),
      body: `<label class="fld"><span>${esc(t('name'))}</span><input class="input" name="shname" maxlength="80" value="${esc(data.title)}"></label>`
        + (data.url ? `<label class="fld"><span>${esc(t('link'))}</span><input class="input" name="shurl" value="${esc(data.url)}"></label>` : '')
        + `<div class="fld"><span>${esc(t('where'))}</span><div class="chips">${LO.chips('shto', targets.map((x) => [x, esc(t('to')[x])]), 'radio', [data.url ? 'link' : 'todo'])}</div></div>`,
      onSave(dlg) {
        const name = $('input[name="shname"]', dlg).value.trim();
        if (!name) return t('errName');
        const u = $('input[name="shurl"]', dlg);
        const url = u && /^https?:\/\//i.test(u.value.trim()) ? u.value.trim() : '';
        const to = LO.checkedVal(dlg, 'shto') || 'todo';
        const today = LO.todayKey();
        if (to === 'todo') LO.tasks.addTodo({ title: name, notes: url });
        else LO.mutate(LO.learn.store, (s) => { s.links.unshift({ id: uid(), title: name, url, topic: '', note: '', created: today }); });
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
