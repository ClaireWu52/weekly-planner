/*
 * Service worker: lets the planner open without a network.
 * Site files are fetched from the network first, always asking the server
 * whether they changed (GitHub Pages lets browsers keep files for 10 minutes,
 * which would hide updates), and fall back to the cached copy when offline.
 * Google Fonts are served from cache and refreshed in the background.
 * Anything else (GitHub sync, news links) is left to the browser.
 */
const CACHE = 'planner-v2';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'favicon.svg',
  'icons/icon-192.png',
  'css/style.css',
  'css/app.css',
  'js/core.js',
  'js/default-schedule.js',
  'js/schedule-calc.js',
  'js/planner.js',
  'js/planner-print.js',
  'js/planner-edit.js',
  'js/quick-date.js',
  'js/task-calc.js',
  'js/tasks.js',
  'js/health.js',
  'js/health-workout.js',
  'js/plan.js',
  'js/learn.js',
  'js/records.js',
  'js/wishes.js',
  'js/news-data.js',
  'js/news.js',
  'js/food.js',
  'js/wardrobe.js',
  'js/travel-calc.js',
  'js/travel.js',
  'js/travel-book.js',
  'js/travel-money.js',
  'js/travel-pack.js',
  'js/travel-weather.js',
  'js/travel-share.js',
  'js/review.js',
  'js/ics-parse.js',
  'js/calendar.js',
  'js/sync-merge.js',
  'js/sync.js',
  'js/sync-photos.js',
  'js/today.js'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  // 'reload' skips the browser's own cache, which GitHub Pages lets keep files for 10 minutes
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
    );
    return;
  }

  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(CACHE).then((c) => c.match(req).then((hit) => {
        const fresh = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || fresh;
      }))
    );
  }
});
