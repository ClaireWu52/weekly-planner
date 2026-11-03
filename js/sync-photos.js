/*
 * Wardrobe photos in sync. They go to a second private gist of their own, one
 * encrypted file per photo named "ward-<item id>-<fingerprint>.enc", so the data
 * gist stays small (it is read in full on every sync) and only new or changed
 * photos are sent. Uses the same token, password and encryption as sync.js,
 * through LO.syncKit, and runs after each successful data sync.
 *
 * LO.photoPlan has no page or storage behind it, so tests can run it on its own.
 */
(() => {
  'use strict';
  const LO = window.LO;

  /*
   * What to send and fetch, given fingerprints by item id:
   *   needed  item ids whose wardrobe item has a photo
   *   local   { id: fingerprint } photos on this device
   *   remote  { id: { hash, name } } photos in the gist
   *   last    { id: fingerprint } the version this device last sent or fetched
   * A photo changed here since the last sync is sent; one changed only in the
   * cloud is fetched. Cloud files for items that no longer have a photo go.
   */
  function photoPlan(needed, local, remote, last) {
    const plan = { upload: [], download: [], remove: [] };
    needed.forEach((id) => {
      const l = local[id];
      const r = remote[id];
      if (l && !r) plan.upload.push(id);
      else if (!l && r) plan.download.push(id);
      else if (l && r && l !== r.hash) (l === last[id] ? plan.download : plan.upload).push(id);
    });
    Object.entries(remote).forEach(([id, r]) => {
      if (!needed.includes(id)) plan.remove.push(r.name);
      else if (plan.upload.includes(id)) plan.remove.push(r.name); // replaced by the new version
    });
    return plan;
  }
  LO.photoPlan = photoPlan;

  const DESC = 'My Planner photos (encrypted)';
  const NAME = /^ward-(.+)-([0-9a-f]{12})\.enc$/;
  const nameOf = (id, hash) => `ward-${id}-${hash}.enc`;
  const BATCH = 6; // photos per upload request, to keep each one well under GitHub's limits
  const lastKey = 'planner:sync-photos';

  async function fingerprint(dataUrl) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl));
    return Array.from(new Uint8Array(d).slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // The photo gist's file list from the gist listing, which has names and links
  // but not contents (asking for the gist itself would download every photo).
  async function findGist(K) {
    for (let page = 1; page <= 5; page++) {
      const list = await K.gh(`/gists?per_page=100&page=${page}`);
      if (!list || !list.length) return null;
      const g = list.find((x) => (K.cfg.photoGistId ? x.id === K.cfg.photoGistId : x.description === DESC));
      if (g) return g;
      if (list.length < 100) return null;
    }
    return null;
  }

  let busy = false;
  async function syncPhotos() {
    const K = LO.syncKit;
    const W = LO.store('wardrobe');
    if (!K || !W || !K.photosOn() || busy) return;
    busy = true;
    try {
      const files = await LO.files.all().catch(() => ({}));
      const local = {};
      const data = {};
      for (const [k, v] of Object.entries(files)) {
        if (!k.startsWith('ward:') || typeof v !== 'string') continue;
        const id = k.slice(5);
        local[id] = await fingerprint(v);
        data[id] = v;
      }
      const needed = W.s.items.filter((it) => it.img).map((it) => it.img.slice(5));
      const g = await findGist(K);
      const remote = {};
      const raw = {};
      if (g) {
        Object.values(g.files || {}).forEach((f) => {
          const m = NAME.exec(f.filename);
          if (m) { remote[m[1]] = { hash: m[2], name: f.filename }; raw[m[1]] = f.raw_url; }
        });
      }
      const last = LO.readJSON(lastKey) || {};
      const plan = photoPlan(needed, local, remote, last);
      if (!plan.upload.length && !plan.download.length && !plan.remove.length) return;

      // Send new and changed photos a few per request. Each photo's old version is removed
      // in the request that sends the new one; files for deleted clothes go with the first.
      let gistId = g ? g.id : '';
      const batches = [];
      for (let i = 0; i < plan.upload.length; i += BATCH) batches.push(plan.upload.slice(i, i + BATCH));
      if (!batches.length) batches.push([]);
      for (let b = 0; b < batches.length; b++) {
        const ids = batches[b];
        const files = {};
        for (const id of ids) {
          files[nameOf(id, local[id])] = { content: await K.encrypt(data[id]) };
          if (remote[id]) files[remote[id].name] = null;
        }
        if (b === 0) Object.entries(remote).forEach(([id, r]) => { if (!needed.includes(id)) files[r.name] = null; });
        if (!Object.keys(files).length) continue;
        if (gistId) await K.gh(`/gists/${gistId}`, { method: 'PATCH', body: JSON.stringify({ files }) });
        else {
          const made = await K.gh('/gists', { method: 'POST', body: JSON.stringify({ description: DESC, public: false, files }) });
          gistId = made.id;
          K.cfg.photoGistId = gistId;
          K.saveCfg();
        }
        ids.forEach((id) => { last[id] = local[id]; });
        localStorage.setItem(lastKey, JSON.stringify(last));
      }

      // fetch photos this device is missing or that changed elsewhere
      let got = 0;
      for (const id of plan.download) {
        let text;
        try { text = await (await fetch(raw[id])).text(); } catch (_) { continue; }
        const img = await K.decrypt(text);
        if (typeof img !== 'string' || !img.startsWith('data:image/')) continue;
        await LO.files.put(`ward:${id}`, img);
        last[id] = remote[id].hash;
        got++;
      }
      Object.keys(last).forEach((id) => { if (!needed.includes(id)) delete last[id]; });
      localStorage.setItem(lastKey, JSON.stringify(last));
      if (got && LO.wardrobe) LO.wardrobe.reloadPhotos();
    } catch (e) {
      K.fail(e);
    } finally {
      busy = false;
    }
  }

  LO.syncPhotos = syncPhotos;
})();
