/*
 * Click-through tests: each test gets the real app (index.html) in a fresh frame
 * whose storage lives only in memory, so the tests never see or change the data
 * saved in this browser. There is no photo store, service worker or network to
 * GitHub or the weather in the frame.
 *
 *   uiTest(name, async (app) => { … })
 *   app: { w, d, LO, $, $$, click, type, submit, go, wait, errors }
 */
(() => {
  'use strict';
  const tests = [];
  window.uiTest = (name, fn) => { tests.push({ name, fn }); };

  // what runs in the frame before any of the app's scripts
  const SHIM = `<script>(() => {
    const mem = () => { const m = new Map(); return {
      getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null), setItem: (k, v) => { m.set(String(k), String(v)); },
      removeItem: (k) => { m.delete(String(k)); }, clear: () => m.clear(), key: (i) => Array.from(m.keys())[i] || null, get length() { return m.size; }
    }; };
    Object.defineProperty(window, 'localStorage', { value: mem(), configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: mem(), configurable: true });
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.resolve() }, configurable: true });
    const realFetch = window.fetch.bind(window);
    window.fetch = (u, o) => (/^https?:/.test(String(u)) && !String(u).startsWith(location.origin) ? Promise.reject(new Error('offline in tests')) : realFetch(u, o));
    window.__errors = [];
    window.addEventListener('error', (e) => window.__errors.push(e.message));
    window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason && e.reason.message || e.reason)));
  })();<\/script>`;

  let html = null;
  async function page() {
    if (!html) {
      html = await (await fetch('../index.html', { cache: 'no-store' })).text();
      // load the app's files from the site root, and leave out fonts and the manifest
      html = html.replace(/<link[^>]+fonts\.(googleapis|gstatic)[^>]*>/g, '').replace(/<link rel="manifest"[^>]*>/, '')
        .replace(/<head>/, `<head><base href="${new URL('../', location.href).href}">${SHIM}`);
    }
    return html;
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms || 0));

  async function boot(stage) {
    const frame = document.createElement('iframe');
    frame.className = 'ui-frame';
    stage.innerHTML = '';
    stage.appendChild(frame);
    const d = frame.contentDocument;
    d.open();
    d.write(await page());
    d.close();
    const w = frame.contentWindow;
    for (let i = 0; i < 200 && !(w.LO && w.LO.route && w.LO.route()); i++) await wait(20);
    if (!w.LO || !w.LO.route()) throw new Error('the app did not start');
    const $ = (s, r) => (r || d).querySelector(s);
    const $$ = (s, r) => Array.from((r || d).querySelectorAll(s));
    const need = (s) => { const el = typeof s === 'string' ? $(s) : s; if (!el) throw new Error(`not found: ${s}`); return el; };
    return {
      w, d, LO: w.LO, $, $$, wait,
      click: async (s) => { need(s).click(); await wait(30); },
      type: (s, v) => { const el = need(s); el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); el.dispatchEvent(new w.Event('change', { bubbles: true })); },
      submit: async (s) => { need(s).requestSubmit(); await wait(30); },
      go: async (hash) => { w.location.hash = hash; await wait(60); },
      errors: () => w.__errors.slice()
    };
  }

  // [{ name, error }] in order; error is null when the test passed
  window.runUiTests = async (stage) => {
    const out = [];
    for (const { name, fn } of tests) {
      let error = null;
      try {
        const app = await boot(stage);
        await fn(app);
        const errs = app.errors();
        if (errs.length) error = `page error: ${errs[0]}`;
      } catch (e) { error = e && e.message ? e.message : String(e); }
      out.push({ name, error });
    }
    stage.innerHTML = '';
    return out;
  };
})();
