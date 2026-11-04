/*
 * Sync between devices through a private GitHub Gist.
 * Everything is encrypted in the browser (AES-GCM, key from the sync password
 * via PBKDF2) before upload, so the gist only holds ciphertext.
 * Each section syncs on its own, combining the changes made on each device
 * (sync-merge.js), so edits on the phone and the computer are both kept.
 * Wardrobe photos sync separately (sync-photos.js), into a second gist, when
 * that's switched on.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc } = LO;
  const CFG_KEY = 'planner:sync';
  const META_KEY = 'planner:sync-meta';
  const BASE_KEY = 'planner:sync-base';
  const PLANNER_KEY = 'weekly-planner:v2';
  const DESC = 'My Planner sync (encrypted)';
  const FILE = 'my-planner-sync.json';
  const API = 'https://api.github.com';
  const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=My%20Planner%20sync';

  LO.strings('sync', {
    zh: {
      title: '同步设置', intro: '用你的 GitHub 账号保存一份加密的数据。手机和电脑填同一个令牌和同一个同步密码，就会自动保持一致。',
      step1: '第 1 步：生成一个只能读写 Gist 的令牌', step1Btn: '打开 GitHub 生成令牌',
      step1Hint: '打开的页面已经勾好了 gist 权限。Expiration 可以选 No expiration，拉到最下面点 Generate token，复制以 ghp_ 开头的那串字符。',
      step2: '第 2 步：填进来', token: 'GitHub 令牌', tokenPh: 'ghp_ 开头的一串字符', pass: '同步密码', passPh: '自己设一个，至少 6 位',
      passHint: '数据会先用这个密码加密再上传，GitHub 上看不到内容。每台设备都要填同一个密码；忘了密码就解不开，只能关掉同步重新开始。',
      second: '在第二台设备上开启时，会以云端的数据为准。如果这台设备上有想保留的内容，先在 ⋯ 菜单里导出备份。',
      photosOn: '同步衣橱照片', photos: '照片会单独加密，放在另一个私密 Gist 里，只上传新加或换过的照片。照片多的话，第一次同步会慢一些，也会用掉一些手机流量。',
      on: '开启同步', save: '保存', off: '关闭同步', confirmOff: '确认关闭', now: '立即同步',
      st: { off: '未开启', syncing: '同步中…', ok: (s) => `已同步 ${s}`, error: (m) => `出错：${m}` },
      errToken: '请填写令牌。', errPass: '同步密码至少 6 位。', errAuth: '令牌无效，或者没有勾选 gist 权限。',
      errDecrypt: '同步密码不对，解不开云端的数据。', errNet: '连不上 GitHub，会稍后自动重试。', errCrypto: '这个浏览器不支持加密，需要用 https 打开网站。',
      enabled: '同步已开启', disabled: '同步已关闭，云端的数据还保留着', uploaded: '已把这台设备的数据上传', pulled: '已更新为最新的同步数据',
      justNow: '刚刚', minAgo: (n) => `${n} 分钟前`, menuOff: '未开启'
    },
    en: {
      title: 'Sync settings', intro: 'Keeps an encrypted copy of your data in your GitHub account. Use the same token and the same sync password on your phone and computer and they stay in step.',
      step1: 'Step 1: create a token that can only read and write gists', step1Btn: 'Open GitHub to create a token',
      step1Hint: 'The page opens with the gist permission already ticked. Pick "No expiration" if you like, scroll down, click Generate token and copy the code starting with ghp_.',
      step2: 'Step 2: paste it here', token: 'GitHub token', tokenPh: 'Starts with ghp_', pass: 'Sync password', passPh: 'Choose one, at least 6 characters',
      passHint: 'Your data is encrypted with this password before upload, so GitHub cannot read it. Use the same password on every device. If you forget it, the data cannot be decrypted; turn sync off and start again.',
      second: 'When you turn sync on for a second device, the cloud copy wins. Export a backup from the ⋯ menu first if this device has anything you want to keep.',
      photosOn: 'Sync wardrobe photos', photos: 'Photos are encrypted and kept in a second private gist; only new or changed photos are sent. With many photos the first sync takes a while and uses some mobile data.',
      on: 'Turn on sync', save: 'Save', off: 'Turn off sync', confirmOff: 'Confirm', now: 'Sync now',
      st: { off: 'Off', syncing: 'Syncing…', ok: (s) => `Synced ${s}`, error: (m) => `Error: ${m}` },
      errToken: 'Add the token.', errPass: 'Use at least 6 characters.', errAuth: 'The token is invalid or missing the gist permission.',
      errDecrypt: 'Wrong sync password: the cloud data could not be decrypted.', errNet: "Couldn't reach GitHub. Will retry soon.", errCrypto: 'This browser cannot encrypt here. Open the site over https.',
      enabled: 'Sync is on', disabled: 'Sync is off. The cloud copy is kept.', uploaded: "Uploaded this device's data", pulled: 'Updated to the latest synced data',
      justNow: 'just now', minAgo: (n) => `${n} min ago`, menuOff: 'Off'
    }
  });
  const t = LO.ns('sync');

  /* ---------------- config and per-section change times ---------------- */
  let cfg = LO.readJSON(CFG_KEY) || {};
  let meta = LO.readJSON(META_KEY) || { stamps: {} };
  if (!meta.stamps) meta.stamps = {};
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (_) { /* ignore */ } };
  const saveMeta = () => { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (_) { /* ignore */ } };
  const enabled = () => !!(cfg.token && cfg.pass && cfg.on);
  // the sections as this device and the cloud last agreed on them
  const readBase = () => LO.readJSON(BASE_KEY);
  const saveBase = (p) => { try { localStorage.setItem(BASE_KEY, JSON.stringify(p)); } catch (_) { clearBase(); } };
  const clearBase = () => { try { localStorage.removeItem(BASE_KEY); } catch (_) { /* ignore */ } };
  const { merge3, same, pickSection } = LO.syncMerge;

  let status = 'off';
  let statusMsg = '';
  function setStatus(s, msg) {
    status = s;
    statusMsg = msg || '';
    const el = $('#syncVal');
    if (el) el.textContent = statusText(true);
    const d = $('[data-syncstatus]');
    if (d) d.textContent = statusText(false);
  }
  function statusText(short) {
    if (!enabled()) return short ? t('menuOff') : t('st').off;
    if (status === 'syncing') return t('st').syncing;
    if (status === 'error') return t('st').error(statusMsg);
    if (cfg.lastSync) {
      const mins = Math.round((Date.now() - cfg.lastSync) / 60000);
      return t('st').ok(mins < 1 ? t('justNow') : t('minAgo')(mins));
    }
    return t('st').off;
  }

  /* ---------------- crypto ---------------- */
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const keyCache = new Map();
  async function keyFor(pass, saltB64) {
    const id = `${pass}|${saltB64}`;
    if (keyCache.has(id)) return keyCache.get(id);
    const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(saltB64), iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    keyCache.set(id, key);
    return key;
  }
  async function encrypt(obj) {
    if (!cfg.salt) { cfg.salt = b64(crypto.getRandomValues(new Uint8Array(16))); saveCfg(); }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await keyFor(cfg.pass, cfg.salt);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj))));
    return JSON.stringify({ format: 'my-planner-sync', v: 1, salt: cfg.salt, iv: b64(iv), data: b64(ct) });
  }
  async function decrypt(text) {
    const box = JSON.parse(text);
    if (!box || box.format !== 'my-planner-sync') throw new SyncError('decrypt');
    const key = await keyFor(cfg.pass, box.salt);
    try {
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.data));
      return JSON.parse(dec.decode(pt));
    } catch (_) { throw new SyncError('decrypt'); }
  }

  /* ---------------- GitHub ---------------- */
  class SyncError extends Error { constructor(kind) { super(kind); this.kind = kind; } }
  async function gh(path, opts) {
    let r;
    try {
      r = await fetch(API + path, Object.assign({}, opts, {
        headers: Object.assign({ Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
          opts && opts.body ? { 'Content-Type': 'application/json' } : {})
      }));
    } catch (_) { throw new SyncError('net'); }
    if (r.status === 401 || r.status === 403) throw new SyncError('auth');
    if (r.status === 404) return null;
    if (!r.ok) throw new SyncError('net');
    return r.status === 204 ? {} : r.json();
  }
  async function findGist() {
    for (let page = 1; page <= 5; page++) {
      const list = await gh(`/gists?per_page=100&page=${page}`);
      if (!list || !list.length) return null;
      const g = list.find((x) => x.description === DESC && x.files && x.files[FILE]);
      if (g) return g.id;
      if (list.length < 100) return null;
    }
    return null;
  }
  // The sync file and the gist version it came from; rev reads an earlier version.
  async function readGist(rev) {
    const g = await gh(`/gists/${cfg.gistId}${rev ? `/${rev}` : ''}`);
    if (!g || !g.files || !g.files[FILE]) return null;
    const f = g.files[FILE];
    const version = rev || (g.history && g.history[0] ? g.history[0].version : '');
    if (!f.truncated) return { text: f.content, version };
    try { return { text: await (await fetch(f.raw_url)).text(), version }; } catch (_) { throw new SyncError('net'); }
  }
  // Saves the sync file; returns the gist versions just before and after this save.
  async function writeGist(content) {
    if (cfg.gistId) {
      const r = await gh(`/gists/${cfg.gistId}`, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content } } }) });
      const h = (r && r.history) || [];
      if (r) return { before: h[1] ? h[1].version : '', after: h[0] ? h[0].version : '' };
    }
    const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: DESC, public: false, files: { [FILE]: { content } } }) });
    cfg.gistId = g.id;
    saveCfg();
    return { before: '', after: '' };
  }

  /* ---------------- bundle ---------------- */
  const parts = () => [{ name: 'planner', key: PLANNER_KEY }].concat(LO.storeList());
  function flushAll() {
    LO.storeList().forEach(({ name }) => LO.store(name).saveNow());
    if (LO.planner && LO.planner.flush) LO.planner.flush();
  }
  function localBundle() {
    flushAll();
    const out = { app: 'weekly-planner', v: 4, stamps: Object.assign({}, meta.stamps), parts: {} };
    parts().forEach(({ name, key }) => { out.parts[name] = LO.readJSON(key); });
    return out;
  }

  /* ---------------- sync cycle ---------------- */
  let busy = false;
  let again = false;
  let pushTimer = null;
  const typing = () => {
    const a = document.activeElement;
    return (a && /^(input|textarea|select)$/i.test(a.tagName)) || Array.from(document.querySelectorAll('dialog')).some((d) => d.open);
  };
  function fail(err) {
    const kind = err && err.kind;
    const msg = kind === 'auth' ? t('errAuth') : kind === 'decrypt' ? t('errDecrypt') : kind === 'crypto' ? t('errCrypto') : t('errNet');
    setStatus('error', msg);
    return msg;
  }

  /*
   * One round: read the cloud copy, combine it with this device's section by section,
   * upload the result if the cloud is missing anything, and load it here if this
   * device is. Sections are combined against the copy both sides last agreed on
   * (the base, kept on this device), so changes made on each side are all kept.
   * Without a base, a device that just turned sync on takes the cloud copy of each
   * section (cfg.join), as the settings dialog promises; right after importing a
   * backup the more recently changed copy wins whole, which is the import.
   * If another device saved between reading and saving here, its version is
   * fetched from the gist's history, combined in too, and saved again.
   * When this device would change but someone is typing, only the upload happens;
   * the base stays put, so the next round brings the rest here.
   */
  async function exchange(opts) {
    const mayApply = !!(opts && opts.force) || !typing();
    const bundle = localBundle();
    const startStamps = JSON.stringify(meta.stamps);
    if (!cfg.gistId) cfg.gistId = await findGist();
    let read = cfg.gistId ? await readGist() : null;
    if (!read) {
      // nothing in the cloud yet: claim every section with the current time and upload
      const now = Date.now();
      parts().forEach(({ name }) => { if (!bundle.stamps[name]) bundle.stamps[name] = meta.stamps[name] = now; });
      saveMeta();
      await writeGist(await encrypt(bundle));
      saveBase(bundle.parts);
      if (opts && opts.announce) LO.toast(t('uploaded'));
      return 'same';
    }
    const remote = await decrypt(read.text);
    let rparts = remote.parts || {};
    const rs = remote.stamps || {};
    const base = readBase();
    const out = { app: 'weekly-planner', v: 4, stamps: {}, parts: {} };
    let upload = false;
    parts().forEach(({ name }) => {
      const L = bundle.parts[name];
      const R = rparts[name];
      const ls = bundle.stamps[name] || 0;
      const M = pickSection(base ? base[name] : undefined, L, R, ls, rs[name], !!cfg.join);
      out.parts[name] = M;
      out.stamps[name] = Math.max(ls, rs[name] || 0);
      if (!same(M, R)) upload = true;
    });
    for (let tries = 0; upload && tries < 3; tries++) {
      const written = JSON.parse(JSON.stringify(out.parts));
      const { before, after } = await writeGist(await encrypt(out));
      if (!before || !read.version || before === read.version) break;
      // another device saved in between, and this save covered it: bring its changes back
      const theirs = await readGist(before);
      if (!theirs) break;
      const other = await decrypt(theirs.text);
      const oparts = other.parts || {};
      parts().forEach(({ name }) => {
        if (oparts[name] == null) return;
        out.parts[name] = merge3(rparts[name] == null ? undefined : rparts[name], out.parts[name], oparts[name], true);
        out.stamps[name] = Math.max(out.stamps[name], (other.stamps || {})[name] || 0);
      });
      // the next save goes on top of this one
      rparts = written;
      read = { version: after };
    }
    const changedHere = parts().map(({ name }) => name).filter((name) => !same(out.parts[name], bundle.parts[name]));
    if (!changedHere.length) {
      saveBase(out.parts);
      return 'same';
    }
    // something was edited here while the cloud copy loaded: leave it for the next round
    flushAll();
    if (!mayApply || JSON.stringify(meta.stamps) !== startStamps) return 'later';
    saveBase(out.parts);
    LO.frozen = true;
    changedHere.forEach((name) => {
      const { key } = parts().find((p) => p.name === name);
      localStorage.setItem(key, JSON.stringify(out.parts[name]));
    });
    Object.assign(meta.stamps, out.stamps);
    saveMeta();
    return 'reload';
  }

  async function run(opts) {
    if (!enabled()) return;
    if (busy) { again = true; return; }
    busy = true;
    again = false;
    setStatus('syncing');
    let result;
    try {
      result = await exchange(opts);
      // joined once the cloud copy has been taken here (not when the round was left for later)
      if (cfg.join && result !== 'later') delete cfg.join;
      cfg.lastSync = Date.now();
      saveCfg();
      setStatus('ok');
    } catch (e) { fail(e); return; } finally { busy = false; }
    if (result === 'reload') {
      sessionStorage.setItem('planner:synced', '1');
      window.location.reload();
      return;
    }
    // edits made during this round go up next
    if (again) { schedulePush(); return; }
    // photos sync once the wardrobe here is current
    if (result === 'same' && LO.syncPhotos) LO.syncPhotos();
  }
  const push = () => run();
  function schedulePush() {
    if (!enabled()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 2500);
  }
  function pull(opts) {
    if (!(opts && opts.force) && typing()) return Promise.resolve();
    return run(opts);
  }

  LO.onChange = (name) => {
    meta.stamps[name] = Date.now();
    saveMeta();
    schedulePush();
  };

  /* ---------------- settings dialog ---------------- */
  function open() {
    const on = enabled();
    LO.openForm({
      title: t('title'),
      saveLabel: on ? t('save') : t('on'),
      deleteLabel: on ? t('off') : null,
      confirmDeleteLabel: t('confirmOff'),
      body: `<p class="hint sync-intro">${esc(t('intro'))}</p>`
        + `<div class="fld"><span>${esc(t('step1'))}</span><a class="btn sm" href="${TOKEN_URL}" target="_blank" rel="noopener noreferrer">${esc(t('step1Btn'))}</a><p class="hint">${esc(t('step1Hint'))}</p></div>`
        + `<div class="fld"><span>${esc(t('step2'))}</span></div>`
        + `<label class="fld"><span>${esc(t('token'))}</span><input class="input" type="password" name="stoken" autocomplete="off" value="${esc(cfg.token || '')}" placeholder="${esc(t('tokenPh'))}"></label>`
        + `<label class="fld"><span>${esc(t('pass'))}</span><input class="input" type="password" name="spass" autocomplete="new-password" value="${esc(cfg.pass || '')}" placeholder="${esc(t('passPh'))}"></label>`
        + `<p class="hint">${esc(t('passHint'))}</p><p class="hint">${esc(t('second'))}</p>`
        + `<div class="fld"><label class="check"><input type="checkbox" name="sphotos"${cfg.photos === false ? '' : ' checked'}>${esc(t('photosOn'))}</label><p class="hint">${esc(t('photos'))}</p></div>`
        + `<div class="row sync-row"><span class="sync-status" data-syncstatus>${esc(statusText(false))}</span>${on ? `<button type="button" class="btn sm" data-syncnow>${esc(t('now'))}</button>` : ''}</div>`,
      onOpen(dlg) {
        const b = $('[data-syncnow]', dlg);
        if (b) b.addEventListener('click', () => pull({ force: true, announce: true }));
      },
      onSave(dlg) {
        const token = $('input[name="stoken"]', dlg).value.trim();
        const pass = $('input[name="spass"]', dlg).value;
        if (!token) return t('errToken');
        if (pass.length < 6) return t('errPass');
        if (!window.crypto || !crypto.subtle) return t('errCrypto');
        // A new token with the same password (say the old one expired) is the same sync:
        // keep the gist and the base so edits made meanwhile are combined as usual.
        // Anything else is joining a sync, and the cloud copy wins.
        const tokenOnly = !!cfg.token && pass === cfg.pass && token !== cfg.token;
        if (tokenOnly) cfg = Object.assign({}, cfg, { token });
        else if (token !== cfg.token || pass !== cfg.pass) { cfg = { token, pass, on: true, join: true }; clearBase(); }
        cfg.on = true;
        cfg.photos = $('input[name="sphotos"]', dlg).checked;
        saveCfg();
        const err = $('#formErr');
        err.textContent = '';
        pull({ force: true, announce: true }).then(() => {
          if (status === 'error') { err.textContent = statusMsg; return; }
          LO.closeForm();
          LO.toast(t('enabled'));
          LO.refresh();
        });
        return false;
      },
      onDelete: on ? () => {
        cfg = { token: '', pass: '', on: false };
        saveCfg();
        clearBase();
        setStatus('off');
        LO.toast(t('disabled'));
        LO.refresh();
      } : null
    });
  }

  function start() {
    setStatus(enabled() ? 'ok' : 'off');
    if (sessionStorage.getItem('planner:synced')) {
      sessionStorage.removeItem('planner:synced');
      LO.toast(t('pulled'));
    }
    if (!enabled()) return;
    pull({ force: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') pull();
      else if (pushTimer) { clearTimeout(pushTimer); push(); }
    });
    setInterval(() => { if (document.visibilityState === 'visible') pull(); }, 5 * 60 * 1000);
  }

  // After importing a backup, mark every section as just changed and forget the base,
  // so the import wins over the cloud copy instead of being combined with it.
  function touchAll() {
    const now = Date.now();
    parts().forEach(({ name }) => { meta.stamps[name] = now; });
    saveMeta();
    clearBase();
    // the import wins, even on a device that was about to take the cloud copy
    if (cfg.join) { delete cfg.join; saveCfg(); }
  }

  const photosOn = () => enabled() && cfg.photos !== false;
  // for sync-photos.js: the same GitHub access and encryption
  LO.syncKit = { gh, encrypt, decrypt, fail, saveCfg, photosOn, get cfg() { return cfg; } };

  LO.sync = { open, start, pull, push, touchAll, photosOn, on: enabled, status: () => status, label: () => statusText(true) };
})();
