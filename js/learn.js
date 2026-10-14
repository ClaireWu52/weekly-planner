/*
 * Learning page: books (want / reading / finished, page progress, ratings,
 * yearly reading goal), courses and skills with progress, and saved
 * resources grouped by topic.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;
  const BSTATUS = ['reading', 'want', 'done'];
  const KINDS = ['course', 'skill', 'cert', 'language'];
  const CSTATUS = ['active', 'paused', 'done'];

  LO.strings('learn', {
    zh: {
      title: '学习清单',
      sBooks: '今年读完', sReading: '正在读', sCourses: '在学', sLinks: '收藏的资源', bookGoal: '年度目标（本）', books: '本',
      reading: '阅读', st: { reading: '在读', want: '想读', done: '读完' },
      bookPh: '书名', authorPh: '作者（可不填）', add: '添加',
      pageOf: (c, n) => `${c} / ${n} 页`, pagesNone: '还没填总页数', page: '读到第几页', update: '更新',
      finishedOn: (d) => `${d} 读完`, start: '开始读', finish: '读完了',
      booksEmpty: { reading: '现在没有在读的书。', want: '把想读的书先记在这里。', done: '读完的书会收在这里。' },
      courses: '课程和技能', coursePh: '比如：机器学习网课、考 AWS 认证、练小提琴音阶',
      kinds: { course: '课程', skill: '技能', cert: '证书', language: '语言' },
      cst: { active: '在学', paused: '暂停', done: '完成' },
      coursesEmpty: '在学的网课、想练的技能、要考的证书都可以放这里，记录进度。',
      links: '资源收藏', linkTitlePh: '名称', linkUrlPh: '链接', topicPh: '主题，比如：英语、AI、数学',
      linksEmpty: '把好用的网站、视频、文章收藏在这里，按主题分好。', allTopics: '全部', open: '打开',
      editBook: '编辑书', newBook: '添加书', editCourse: '编辑课程或技能', editLink: '编辑资源',
      name: '名称', author: '作者', status: '状态', totalPages: '总页数', curPage: '读到第几页', rating: '评分',
      notes: '笔记', notesPh: '印象最深的一句话、想法、收获…', finished: '读完的日期',
      kind: '类型', platform: '来源', platformPh: '比如：Coursera、学校课程、YouTube', url: '链接', progress: '进度', topic: '主题', note: '备注',
      errTitle: '请填写名称。', errUrl: '请填写链接。'
    },
    en: {
      title: 'Learning',
      sBooks: 'Finished this year', sReading: 'Reading now', sCourses: 'Learning', sLinks: 'Saved resources', bookGoal: 'Yearly goal (books)', books: 'books',
      reading: 'Books', st: { reading: 'Reading', want: 'Want to read', done: 'Finished' },
      bookPh: 'Title', authorPh: 'Author (optional)', add: 'Add',
      pageOf: (c, n) => `${c} / ${n} pages`, pagesNone: 'No page count yet', page: 'Current page', update: 'Update',
      finishedOn: (d) => `Finished ${d}`, start: 'Start reading', finish: 'Finished it',
      booksEmpty: { reading: 'Nothing on the go right now.', want: 'Keep the books you want to read here.', done: 'Finished books are kept here.' },
      courses: 'Courses and skills', coursePh: 'e.g. Machine learning course, AWS certificate, violin scales',
      kinds: { course: 'Course', skill: 'Skill', cert: 'Certificate', language: 'Language' },
      cst: { active: 'Active', paused: 'Paused', done: 'Done' },
      coursesEmpty: 'Online courses, skills you are practicing, certificates you are working toward. Track progress here.',
      links: 'Saved resources', linkTitlePh: 'Name', linkUrlPh: 'Link', topicPh: 'Topic, e.g. English, AI, math',
      linksEmpty: 'Save useful sites, videos and articles here, sorted by topic.', allTopics: 'All', open: 'Open',
      editBook: 'Edit book', newBook: 'Add book', editCourse: 'Edit course or skill', editLink: 'Edit resource',
      name: 'Name', author: 'Author', status: 'Status', totalPages: 'Total pages', curPage: 'Current page', rating: 'Rating',
      notes: 'Notes', notesPh: 'A line that stayed with you, thoughts, takeaways…', finished: 'Finished on',
      kind: 'Type', platform: 'Where', platformPh: 'e.g. Coursera, a class, YouTube', url: 'Link', progress: 'Progress', topic: 'Topic', note: 'Note',
      errTitle: 'Add a name.', errUrl: 'Add a link.'
    }
  });
  const t = LO.ns('learn');
  const tc = LO.ns('common');

  /* ---------------- data ---------------- */
  const str = (v) => (typeof v === 'string' ? v : '');
  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const normUrl = (u) => { const v = String(u || '').trim(); if (!v) return ''; return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`; };
  const safeUrl = (u) => (/^(https?:|mailto:)/i.test(u) ? u : '');
  function normalize(s) {
    const today = LO.todayKey();
    return {
      v: 1,
      bookGoal: LO.clamp(Math.round(+s.bookGoal) || 12, 1, 365),
      books: (s.books || []).filter((b) => b && typeof b.title === 'string').map((b) => ({
        id: String(b.id || uid()), title: b.title, author: str(b.author), status: BSTATUS.includes(b.status) ? b.status : 'want',
        pages: Math.max(0, Math.round(+b.pages) || 0), cur: Math.max(0, Math.round(+b.cur) || 0), rating: LO.clamp(Math.round(+b.rating) || 0, 0, 5),
        notes: str(b.notes), finished: isKey(b.finished) ? b.finished : '', created: isKey(b.created) ? b.created : today
      })),
      courses: (s.courses || []).filter((c) => c && typeof c.title === 'string').map((c) => ({
        id: String(c.id || uid()), title: c.title, kind: KINDS.includes(c.kind) ? c.kind : 'course', platform: str(c.platform),
        url: safeUrl(normUrl(c.url)), progress: LO.clamp(Math.round(+c.progress) || 0, 0, 100), status: CSTATUS.includes(c.status) ? c.status : 'active',
        notes: str(c.notes), doneAt: isKey(c.doneAt) ? c.doneAt : '', created: isKey(c.created) ? c.created : today
      })),
      links: (s.links || []).filter((l) => l && typeof l.title === 'string').map((l) => ({
        id: String(l.id || uid()), title: l.title, url: safeUrl(normUrl(l.url)), topic: str(l.topic).trim(), note: str(l.note), created: isKey(l.created) ? l.created : today
      }))
    };
  }
  const Ls = LO.createStore('learn', 'planner:learn:v1', () => ({ v: 1, bookGoal: 12, books: [], courses: [], links: [] }), normalize);

  const yearStart = () => `${new Date().getFullYear()}-01-01`;
  const booksDoneThisYear = () => Ls.s.books.filter((b) => b.status === 'done' && b.finished >= yearStart()).length;
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };

  /* ---------------- editors ---------------- */
  const stars = (n, name) => `<span class="stars" role="radiogroup" aria-label="${esc(t('rating'))}">${[1, 2, 3, 4, 5].map((i) => `<button type="button" class="star-btn${i <= n ? ' on' : ''}" data-${name}="${i}" aria-label="${i}">${LO.icon.star}</button>`).join('')}</span>`;

  function openBook(id) {
    const b = id ? Ls.s.books.find((x) => x.id === id) : null;
    const v = b || { title: '', author: '', status: 'want', pages: 0, cur: 0, rating: 0, notes: '', finished: '' };
    let rating = v.rating;
    LO.openForm({
      title: b ? t('editBook') : t('newBook'),
      body: `<label class="fld"><span>${esc(t('name'))}</span><input class="input" name="title" maxlength="100" value="${esc(v.title)}"></label>`
        + `<label class="fld"><span>${esc(t('author'))}</span><input class="input" name="author" maxlength="80" value="${esc(v.author)}"></label>`
        + `<div class="fld"><span>${esc(t('status'))}</span><div class="chips">${LO.chips('bst', BSTATUS.map((s) => [s, esc(t('st')[s])]), 'radio', [v.status])}</div></div>`
        + `<div class="form-row"><label class="fld"><span>${esc(t('curPage'))}</span><input class="input" type="number" min="0" name="cur" value="${v.cur || ''}"></label>`
        + `<label class="fld"><span>${esc(t('totalPages'))}</span><input class="input" type="number" min="0" name="pages" value="${v.pages || ''}"></label></div>`
        + `<div class="form-row"><div class="fld"><span>${esc(t('rating'))}</span><div data-rating>${stars(rating, 'rate')}</div></div>`
        + `<label class="fld"><span>${esc(t('finished'))}</span><input class="input" type="date" name="finished" value="${esc(v.finished)}"></label></div>`
        + `<label class="fld"><span>${esc(t('notes'))}</span><textarea class="input ta" name="notes" rows="3" maxlength="1000" placeholder="${esc(t('notesPh'))}">${esc(v.notes)}</textarea></label>`,
      onOpen(dlg) {
        $('[data-rating]', dlg).addEventListener('click', (e) => {
          const s = e.target.closest('[data-rate]');
          if (!s) return;
          rating = +s.dataset.rate === rating ? 0 : +s.dataset.rate;
          $('[data-rating]', dlg).innerHTML = stars(rating, 'rate');
        });
      },
      onSave(dlg) {
        const title = $('input[name="title"]', dlg).value.trim();
        if (!title) return t('errTitle');
        const status = LO.checkedVal(dlg, 'bst') || 'want';
        let finished = $('input[name="finished"]', dlg).value || '';
        if (status === 'done' && !finished) finished = LO.todayKey();
        const fields = {
          title, author: $('input[name="author"]', dlg).value.trim(), status,
          cur: Math.max(0, Math.round(+$('input[name="cur"]', dlg).value) || 0), pages: Math.max(0, Math.round(+$('input[name="pages"]', dlg).value) || 0),
          rating, finished: status === 'done' ? finished : '', notes: $('textarea[name="notes"]', dlg).value.trim()
        };
        LO.mutate(Ls, (s) => {
          if (b) Object.assign(s.books.find((x) => x.id === id), fields);
          else s.books.push(Object.assign({ id: uid(), created: LO.todayKey() }, fields));
        }, b ? tc('saved') : tc('added'));
        return true;
      },
      onDelete: b ? () => LO.mutate(Ls, (s) => { s.books = s.books.filter((x) => x.id !== id); }, tc('deleted')) : null
    });
  }

  function openCourse(id) {
    const c = Ls.s.courses.find((x) => x.id === id);
    if (!c) return;
    LO.openForm({
      title: t('editCourse'),
      body: `<label class="fld"><span>${esc(t('name'))}</span><input class="input" name="title" maxlength="100" value="${esc(c.title)}"></label>`
        + `<div class="fld"><span>${esc(t('kind'))}</span><div class="chips">${LO.chips('ck', KINDS.map((k) => [k, esc(t('kinds')[k])]), 'radio', [c.kind])}</div></div>`
        + `<div class="fld"><span>${esc(t('status'))}</span><div class="chips">${LO.chips('cs', CSTATUS.map((k) => [k, esc(t('cst')[k])]), 'radio', [c.status])}</div></div>`
        + `<label class="fld"><span>${esc(t('platform'))}</span><input class="input" name="platform" maxlength="60" value="${esc(c.platform)}" placeholder="${esc(t('platformPh'))}"></label>`
        + `<label class="fld"><span>${esc(t('url'))}</span><input class="input" name="url" maxlength="500" value="${esc(c.url)}" placeholder="https://"></label>`
        + `<div class="fld"><span>${esc(t('progress'))} <b data-pval>${c.progress}%</b></span><input type="range" min="0" max="100" step="5" name="progress" value="${c.progress}"></div>`
        + `<label class="fld"><span>${esc(t('notes'))}</span><textarea class="input ta" name="notes" rows="3" maxlength="1000">${esc(c.notes)}</textarea></label>`,
      onOpen(dlg) {
        const r = $('input[name="progress"]', dlg);
        r.addEventListener('input', () => { $('[data-pval]', dlg).textContent = `${r.value}%`; });
      },
      onSave(dlg) {
        const title = $('input[name="title"]', dlg).value.trim();
        if (!title) return t('errTitle');
        const status = LO.checkedVal(dlg, 'cs') || 'active';
        const progress = +$('input[name="progress"]', dlg).value || 0;
        LO.mutate(Ls, (s) => {
          const x = s.courses.find((y) => y.id === id);
          Object.assign(x, {
            title, kind: LO.checkedVal(dlg, 'ck') || 'course', status, platform: $('input[name="platform"]', dlg).value.trim(),
            url: safeUrl(normUrl($('input[name="url"]', dlg).value)), progress: status === 'done' ? 100 : progress,
            notes: $('textarea[name="notes"]', dlg).value.trim(), doneAt: status === 'done' ? (x.doneAt || LO.todayKey()) : ''
          });
        }, tc('saved'));
        return true;
      },
      onDelete: () => LO.mutate(Ls, (s) => { s.courses = s.courses.filter((x) => x.id !== id); }, tc('deleted'))
    });
  }

  function openLink(id) {
    const l = Ls.s.links.find((x) => x.id === id);
    if (!l) return;
    LO.openForm({
      title: t('editLink'),
      body: `<label class="fld"><span>${esc(t('name'))}</span><input class="input" name="title" maxlength="100" value="${esc(l.title)}"></label>`
        + `<label class="fld"><span>${esc(t('url'))}</span><input class="input" name="url" maxlength="500" value="${esc(l.url)}"></label>`
        + `<label class="fld"><span>${esc(t('topic'))}</span><input class="input" name="topic" maxlength="30" value="${esc(l.topic)}" list="topicList"></label>`
        + `<label class="fld"><span>${esc(t('note'))}</span><input class="input" name="note" maxlength="200" value="${esc(l.note)}"></label>`,
      onSave(dlg) {
        const title = $('input[name="title"]', dlg).value.trim();
        const url = safeUrl(normUrl($('input[name="url"]', dlg).value));
        if (!title) return t('errTitle');
        if (!url) return t('errUrl');
        LO.mutate(Ls, (s) => {
          Object.assign(s.links.find((y) => y.id === id), { title, url, topic: $('input[name="topic"]', dlg).value.trim(), note: $('input[name="note"]', dlg).value.trim() });
        }, tc('saved'));
        return true;
      },
      onDelete: () => LO.mutate(Ls, (s) => { s.links = s.links.filter((x) => x.id !== id); }, tc('deleted'))
    });
  }

  /* ---------------- page ---------------- */
  const view = $('#view-learn');
  let bookTab = 'reading';
  let topic = '';

  function bookCard(b) {
    let mid = '';
    if (b.status === 'reading') {
      const pct = b.pages ? Math.min(1, b.cur / b.pages) : 0;
      mid = `<div class="progress sm"><span style="width:${pct * 100}%"></span></div>`
        + `<div class="book-row"><span class="hint">${esc(b.pages ? t('pageOf')(b.cur, b.pages) : t('pagesNone'))}</span>`
        + `<form class="page-form" data-pageform><input class="input sm num" type="number" min="0" value="${b.cur || ''}" aria-label="${esc(t('page'))}" placeholder="${esc(t('page'))}"><button type="submit" class="btn sm">${esc(t('update'))}</button></form></div>`
        + `<button type="button" class="btn sm primary" data-bfinish>${LO.icon.check}<span>${esc(t('finish'))}</span></button>`;
    } else if (b.status === 'want') {
      mid = `<button type="button" class="btn sm" data-bstart>${esc(t('start'))}</button>`;
    } else {
      mid = `<div class="book-row">${stars(b.rating, 'brate')}<span class="hint">${esc(b.finished ? t('finishedOn')(LO.shortDate(b.finished)) : '')}</span></div>`
        + (b.notes ? `<p class="book-notes">${esc(b.notes)}</p>` : '');
    }
    return `<article class="book" data-book="${esc(b.id)}"><div class="book-spine" aria-hidden="true"></div><div class="book-body">`
      + `<h3 class="book-title" data-bedit tabindex="0">${esc(b.title)}</h3>${b.author ? `<p class="book-author">${esc(b.author)}</p>` : ''}`
      + `${mid}</div></article>`;
  }

  function courseCard(c) {
    return `<article class="course k-study${c.status === 'done' ? ' is-done' : ''}${c.status === 'paused' ? ' is-paused' : ''}" data-course="${esc(c.id)}">`
      + `<div class="course-top"><span class="tag k-study"><i class="sw"></i>${esc(t('kinds')[c.kind])}</span><span class="course-st">${esc(t('cst')[c.status])}</span></div>`
      + `<h3 class="course-title" data-cedit tabindex="0">${esc(c.title)}</h3>`
      + (c.platform || c.url ? `<p class="course-meta">${esc(c.platform)}${c.url ? ` <a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(t('open'))}</a>` : ''}</p>` : '')
      + `<input type="range" class="wish-range" min="0" max="100" step="5" value="${c.progress}" style="--p:${c.progress}%" data-cprog aria-label="${esc(t('progress'))}">`
      + `<div class="course-foot"><span class="hint" data-cpval>${c.progress}%</span></div></article>`;
  }

  function render() {
    const S = Ls.s;
    const done = booksDoneThisYear();
    const readingN = S.books.filter((b) => b.status === 'reading').length;
    const activeC = S.courses.filter((c) => c.status === 'active').length;
    const topics = [...new Set(S.links.map((l) => l.topic).filter(Boolean))].sort();
    if (topic && !topics.includes(topic)) topic = '';

    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1></div></div>`;
    h += '<div class="stats">'
      + `<div class="stat">${LO.ring(done / S.bookGoal, 46)}<div><span class="stat-label">${esc(t('sBooks'))}</span><b class="stat-num">${done}<small>/${S.bookGoal} ${esc(t('books'))}</small></b>`
      + `<label class="stat-sub goal-edit">${esc(t('bookGoal'))} <input type="number" min="1" max="365" class="input sm num" data-bookgoal value="${S.bookGoal}"></label></div></div>`
      + `<div class="stat"><div><span class="stat-label">${esc(t('sReading'))}</span><b class="stat-num">${readingN}</b></div></div>`
      + `<div class="stat"><div><span class="stat-label">${esc(t('sCourses'))}</span><b class="stat-num">${activeC}</b></div></div>`
      + `<div class="stat"><div><span class="stat-label">${esc(t('sLinks'))}</span><b class="stat-num">${S.links.length}</b></div></div>`
      + '</div>';

    // books
    const counts = {};
    BSTATUS.forEach((s) => { counts[s] = S.books.filter((b) => b.status === s).length; });
    let books = S.books.filter((b) => b.status === bookTab);
    if (bookTab === 'done') books = books.sort((a, b) => (a.finished < b.finished ? 1 : -1));
    h += `<section class="learn-sec"><div class="section-head"><h2>${esc(t('reading'))}</h2>`
      + `<div class="seg sm">${BSTATUS.map((s) => `<button type="button" data-btab="${s}" aria-selected="${s === bookTab}">${esc(t('st')[s])} ${counts[s]}</button>`).join('')}</div></div>`
      + `<form class="inline-add card" data-addbook><input class="input" name="title" maxlength="100" placeholder="${esc(t('bookPh'))}" aria-label="${esc(t('bookPh'))}">`
      + `<input class="input" name="author" maxlength="80" placeholder="${esc(t('authorPh'))}" aria-label="${esc(t('authorPh'))}"><button type="submit" class="btn primary">${LO.icon.plus}<span>${esc(t('add'))}</span></button></form>`
      + (books.length ? `<div class="book-grid">${books.map(bookCard).join('')}</div>` : `<p class="empty-note">${esc(t('booksEmpty')[bookTab])}</p>`)
      + '</section>';

    // courses
    const courses = S.courses.slice().sort((a, b) => CSTATUS.indexOf(a.status) - CSTATUS.indexOf(b.status));
    h += `<section class="learn-sec"><div class="section-head"><h2>${esc(t('courses'))}</h2></div>`
      + `<form class="inline-add card" data-addcourse><input class="input" name="title" maxlength="100" placeholder="${esc(t('coursePh'))}" aria-label="${esc(t('coursePh'))}">`
      + `<button type="submit" class="btn primary">${LO.icon.plus}<span>${esc(t('add'))}</span></button></form>`
      + (courses.length ? `<div class="course-grid">${courses.map(courseCard).join('')}</div>` : `<p class="empty-note">${esc(t('coursesEmpty'))}</p>`)
      + '</section>';

    // links
    const links = S.links.filter((l) => !topic || l.topic === topic);
    h += `<section class="learn-sec"><div class="section-head"><h2>${esc(t('links'))}</h2>`
      + (topics.length ? `<div class="seg sm"><button type="button" data-topic="" aria-selected="${!topic}">${esc(t('allTopics'))}</button>${topics.map((tp) => `<button type="button" data-topic="${esc(tp)}" aria-selected="${tp === topic}">${esc(tp)}</button>`).join('')}</div>` : '')
      + '</div>'
      + `<form class="inline-add card three" data-addlink><input class="input" name="title" maxlength="100" placeholder="${esc(t('linkTitlePh'))}" aria-label="${esc(t('linkTitlePh'))}">`
      + `<input class="input" name="url" maxlength="500" placeholder="${esc(t('linkUrlPh'))}" aria-label="${esc(t('linkUrlPh'))}">`
      + `<input class="input" name="topic" maxlength="30" list="topicList" placeholder="${esc(t('topicPh'))}" aria-label="${esc(t('topicPh'))}" value="${esc(topic)}">`
      + `<button type="submit" class="btn primary">${LO.icon.plus}<span>${esc(t('add'))}</span></button></form>`
      + `<datalist id="topicList">${topics.map((tp) => `<option value="${esc(tp)}">`).join('')}</datalist>`
      + (links.length ? `<ul class="link-list card">${links.map((l) => `<li data-link="${esc(l.id)}"><div class="link-main"><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.title)}</a>`
        + `<span class="hint">${esc(host(l.url))}${l.note ? ` — ${esc(l.note)}` : ''}</span></div>${l.topic ? `<span class="tag k-other">${esc(l.topic)}</span>` : ''}`
        + `<button type="button" class="icon-btn sm ghost" data-ledit aria-label="${esc(tc('edit'))}">…</button></li>`).join('')}</ul>`
        : `<p class="empty-note">${esc(t('linksEmpty'))}</p>`)
      + '</section>';
    view.innerHTML = h;
  }

  /* ---------------- events ---------------- */
  view.addEventListener('click', (e) => {
    const bt = e.target.closest('[data-btab]');
    if (bt) { bookTab = bt.dataset.btab; render(); return; }
    const tp = e.target.closest('[data-topic]');
    if (tp) { topic = tp.dataset.topic; render(); return; }
    const book = e.target.closest('[data-book]');
    if (book) {
      const id = book.dataset.book;
      if (e.target.closest('[data-bedit]')) { openBook(id); return; }
      if (e.target.closest('[data-bstart]')) { LO.mutate(Ls, (s) => { s.books.find((x) => x.id === id).status = 'reading'; }); bookTab = 'reading'; LO.refresh(); return; }
      if (e.target.closest('[data-bfinish]')) {
        const b = Ls.s.books.find((x) => x.id === id);
        LO.mutate(Ls, (s) => { const x = s.books.find((y) => y.id === id); x.status = 'done'; x.finished = LO.todayKey(); if (x.pages) x.cur = x.pages; }, `${t('st').done}: ${b.title}`);
        return;
      }
      const r = e.target.closest('[data-brate]');
      if (r) { const v = +r.dataset.brate; LO.mutate(Ls, (s) => { const x = s.books.find((y) => y.id === id); x.rating = x.rating === v ? 0 : v; }); }
      return;
    }
    const course = e.target.closest('[data-course]');
    if (course && e.target.closest('[data-cedit]')) { openCourse(course.dataset.course); return; }
    const link = e.target.closest('[data-link]');
    if (link && e.target.closest('[data-ledit]')) openLink(link.dataset.link);
  });
  view.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.matches('[data-bedit]')) openBook(e.target.closest('[data-book]').dataset.book);
    else if (e.target.matches('[data-cedit]')) openCourse(e.target.closest('[data-course]').dataset.course);
  });
  view.addEventListener('input', (e) => {
    if (!e.target.matches('[data-cprog]')) return;
    e.target.style.setProperty('--p', `${e.target.value}%`);
    const lab = e.target.closest('.course').querySelector('[data-cpval]');
    if (lab) lab.textContent = `${e.target.value}%`;
  });
  view.addEventListener('change', (e) => {
    if (e.target.matches('[data-cprog]')) {
      const id = e.target.closest('[data-course]').dataset.course;
      const v = +e.target.value;
      LO.mutate(Ls, (s) => {
        const c = s.courses.find((x) => x.id === id);
        c.progress = v;
        if (v >= 100) { c.status = 'done'; c.doneAt = c.doneAt || LO.todayKey(); } else if (c.status === 'done') { c.status = 'active'; c.doneAt = ''; }
      });
    } else if (e.target.matches('[data-bookgoal]')) {
      const v = LO.clamp(Math.round(+e.target.value) || 12, 1, 365);
      LO.mutate(Ls, (s) => { s.bookGoal = v; });
    }
  });
  view.addEventListener('submit', (e) => {
    const f = e.target;
    e.preventDefault();
    const val = (n) => { const el = $(`[name="${n}"]`, f); return el ? el.value.trim() : ''; };
    const today = LO.todayKey();
    if (f.matches('[data-pageform]')) {
      const id = f.closest('[data-book]').dataset.book;
      const v = Math.max(0, Math.round(+$('input', f).value) || 0);
      LO.mutate(Ls, (s) => { s.books.find((x) => x.id === id).cur = v; });
    } else if (f.matches('[data-addbook]')) {
      if (!val('title')) return;
      LO.mutate(Ls, (s) => { s.books.push({ id: uid(), title: val('title'), author: val('author'), status: bookTab, pages: 0, cur: 0, rating: 0, notes: '', finished: bookTab === 'done' ? today : '', created: today }); });
      const i = $('[data-addbook] input[name="title"]', view); if (i) i.focus();
    } else if (f.matches('[data-addcourse]')) {
      if (!val('title')) return;
      LO.mutate(Ls, (s) => { s.courses.push({ id: uid(), title: val('title'), kind: 'course', platform: '', url: '', progress: 0, status: 'active', notes: '', doneAt: '', created: today }); });
      const i = $('[data-addcourse] input', view); if (i) i.focus();
    } else if (f.matches('[data-addlink]')) {
      const url = safeUrl(normUrl(val('url')));
      if (!val('title') && !url) return;
      if (!url) { LO.toast(t('errUrl')); return; }
      LO.mutate(Ls, (s) => { s.links.push({ id: uid(), title: val('title') || host(url) || url, url, topic: val('topic'), note: '', created: today }); });
      const i = $('[data-addlink] input[name="title"]', view); if (i) i.focus();
    }
  });

  LO.view('learn', { render });

  LO.learn = {
    store: Ls,
    booksSince: (k) => Ls.s.books.filter((b) => b.status === 'done' && b.finished >= k).length,
    activity(add) {
      Ls.s.books.forEach((b) => { if (b.status === 'done' && b.finished) add(b.finished, 'books', 1); });
      Ls.s.courses.forEach((c) => { if (c.doneAt) add(c.doneAt, 'books', 1); });
    }
  };
})();
