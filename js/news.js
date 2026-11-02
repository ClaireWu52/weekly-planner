/*
 * Today's news: headlines fetched twice a day by GitHub Actions
 * (scripts/fetch_news.py) into js/news-data.js.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc } = LO;
  const CATS = ['tech', 'ai', 'business', 'finance'];

  LO.strings('news', {
    zh: {
      title: '今日新闻', sub: '科技、AI、商业和财经的头条，每天自动更新两次。',
      cats: { tech: '科技', ai: 'AI', business: '商业', finance: '财经' },
      updated: (s) => `更新于 ${s}`, stale: '新闻已经超过一天没有更新了，可以到 GitHub 仓库的 Actions 页面看看自动更新有没有出错。',
      empty: '还没有新闻数据。网站部署到 GitHub Pages 之后，每天会自动抓取两次；第一次可以在仓库的 Actions 页面手动运行一次 “Deploy site”。',
      localNote: '直接在电脑上双击打开时，看到的是上一次部署时的新闻，这是正常的。',
      none: '这个分类暂时没有新的头条。', sources: '来源', minAgo: (n) => `${n} 分钟前`, hrAgo: (n) => `${n} 小时前`, dayAgo: (n) => `${n} 天前`,
      more: '查看全部新闻'
    },
    en: {
      title: "Today's news", sub: 'Headlines in tech, AI, business and finance, refreshed twice a day.',
      cats: { tech: 'Tech', ai: 'AI', business: 'Business', finance: 'Finance' },
      updated: (s) => `Updated ${s}`, stale: "The news hasn't refreshed in over a day. Check the Actions tab of the GitHub repo for errors.",
      empty: 'No news yet. Once the site is deployed with GitHub Pages it refreshes twice a day; for the first time, run "Deploy site" from the Actions tab.',
      localNote: 'When opened straight from your computer, you see the news from the last deploy. That is expected.',
      none: 'No fresh headlines in this category right now.', sources: 'Sources', minAgo: (n) => `${n} min ago`, hrAgo: (n) => `${n} h ago`, dayAgo: (n) => `${n} d ago`,
      more: 'All news'
    }
  });
  const t = LO.ns('news');

  const data = () => window.NEWS_DATA || { updated: null, categories: {}, sources: [] };
  function ago(iso) {
    if (!iso) return '';
    const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    if (mins < 60) return t('minAgo')(mins);
    if (mins < 60 * 36) return t('hrAgo')(Math.round(mins / 60));
    return t('dayAgo')(Math.round(mins / 1440));
  }
  function stamp(iso) {
    const d = new Date(iso);
    return LO.lang() === 'zh'
      ? `${d.getMonth() + 1}月${d.getDate()}日 ${LO.fmtMin(d.getHours() * 60 + d.getMinutes())}`
      : `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}, ${LO.fmtMin(d.getHours() * 60 + d.getMinutes())}`;
  }
  const safe = (u) => (/^https?:\/\//i.test(u || '') ? u : '#');
  const itemHTML = (x, compact) => `<li class="news-item"><a href="${esc(safe(x.link))}" target="_blank" rel="noopener noreferrer">${esc(x.title)}</a>`
    + `<div class="news-meta"><span class="news-src">${esc(x.source)}</span>${x.published ? `<span>${esc(ago(x.published))}</span>` : ''}</div>`
    + (x.summary && !compact ? `<p>${esc(x.summary)}</p>` : '') + '</li>';

  const view = $('#view-news');
  let cat = 'tech';

  function render() {
    const d = data();
    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1><p class="sub">${esc(d.updated ? t('updated')(stamp(d.updated)) : t('sub'))}</p></div></div>`;
    if (!d.updated) {
      view.innerHTML = `${h}<p class="empty-note big">${esc(t('empty'))}</p><p class="hint">${esc(t('localNote'))}</p>`;
      return;
    }
    if (Date.now() - Date.parse(d.updated) > 36 * 3600 * 1000) h += `<p class="note-warn">${esc(t('stale'))}</p>`;
    h += `<div class="seg news-tabs">${CATS.map((c) => `<button type="button" data-ncat="${c}" aria-selected="${c === cat}">${esc(t('cats')[c])} ${(d.categories[c] || []).length}</button>`).join('')}</div>`;
    const list = d.categories[cat] || [];
    h += list.length ? `<ul class="news-list card">${list.map((x) => itemHTML(x, false)).join('')}</ul>` : `<p class="empty-note">${esc(t('none'))}</p>`;
    h += `<p class="hint news-sources">${esc(t('sources'))}：${esc((d.sources || []).join('、'))}</p>`;
    view.innerHTML = h;
  }

  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ncat]');
    if (b) { cat = b.dataset.ncat; render(); }
  });

  LO.view('news', { render });

  LO.news = {
    top(n) {
      const d = data();
      if (!d.updated) return [];
      const out = [];
      const seen = new Set();
      for (let i = 0; out.length < n && i < 15; i++) {
        CATS.forEach((c) => {
          const x = (d.categories[c] || [])[i];
          if (x && out.length < n && !seen.has(x.link)) { seen.add(x.link); out.push(Object.assign({ cat: c }, x)); }
        });
      }
      return out;
    },
    itemHTML,
    catLabel: (c) => t('cats')[c]
  };
})();
