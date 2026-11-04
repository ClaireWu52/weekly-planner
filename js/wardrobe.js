/*
 * Wardrobe: photos of your clothes (compressed and kept in IndexedDB on this
 * device), sorted by category and season, saved outfits and a random outfit.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, $$, esc, uid } = LO;
  const CATS = ['top', 'bottom', 'dress', 'outer', 'shoes', 'bag', 'acc'];
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

  LO.strings('wardrobe', {
    zh: {
      title: '电子衣橱', sub: '拍下每件衣服，按类别和季节整理，没灵感时随机搭一套。',
      add: '添加衣服', cats: { top: '上衣', bottom: '下装', dress: '裙装', outer: '外套', shoes: '鞋子', bag: '包', acc: '配饰' },
      all: '全部', allSeasons: '全部季节', seasons: { spring: '春', summer: '夏', autumn: '秋', winter: '冬' },
      name: '名称', namePh: '比如：白色衬衫', category: '类别', season: '适合季节', color: '颜色', colorPh: '比如：白色',
      tags: '标签', tagsPh: '场合或风格，用逗号隔开：通勤, 约会', note: '备注', photo: '照片', changePhoto: '换一张照片',
      newItem: '添加衣服', editItem: '编辑单品', wear: '今天穿了', worn: (n) => `穿过 ${n} 次`, last: (d) => `上次 ${d}`, never: '还没穿过',
      woreToast: '记下来了',
      outfits: '我的搭配', newOutfit: '新建搭配', editOutfit: '编辑搭配', outfitName: '搭配名称', outfitNamePh: '比如：周一上课',
      pick: '选这套里的单品', noOutfits: '还没有搭配。', random: '随机搭一套', randomHint: (s) => `按当前季节（${s}）随机组一套：上衣加下装（或一件裙装）加鞋，天冷再加外套。`,
      saveOutfit: '存成搭配', again: '换一套', wearAll: '今天就穿这套', notEnough: '衣服还不够搭一套，至少要有上衣和下装，或者一件裙装。',
      empty: '衣橱还是空的。点“添加衣服”拍下第一件吧。', storage: '照片只存在这台设备的浏览器里。换设备前记得在右上角“导出全部数据”。', storageSynced: '照片会加密同步到你的 GitHub，其他设备开了同步也能看到。',
      count: (n) => `${n} 件`, unworn: '很久没穿的', errName: '请填写名称。', errPhoto: '这张照片读不出来，换一张试试。', errPick: '至少选一件。',
      loading: '照片加载中…', randomName: (d) => `随机搭配 ${d}`
    },
    en: {
      title: 'Wardrobe', sub: 'Photograph each piece, sort by category and season, and get a random outfit when you are out of ideas.',
      add: 'Add clothes', cats: { top: 'Tops', bottom: 'Bottoms', dress: 'Dresses', outer: 'Outerwear', shoes: 'Shoes', bag: 'Bags', acc: 'Accessories' },
      all: 'All', allSeasons: 'All seasons', seasons: { spring: 'Spring', summer: 'Summer', autumn: 'Fall', winter: 'Winter' },
      name: 'Name', namePh: 'e.g. White shirt', category: 'Category', season: 'Seasons', color: 'Color', colorPh: 'e.g. White',
      tags: 'Tags', tagsPh: 'Occasion or style, comma separated', note: 'Notes', photo: 'Photo', changePhoto: 'Change photo',
      newItem: 'Add clothes', editItem: 'Edit item', wear: 'Wore it today', worn: (n) => `Worn ${n}×`, last: (d) => `Last ${d}`, never: 'Not worn yet',
      woreToast: 'Saved',
      outfits: 'Outfits', newOutfit: 'New outfit', editOutfit: 'Edit outfit', outfitName: 'Outfit name', outfitNamePh: 'e.g. Monday classes',
      pick: 'Pick the pieces', noOutfits: 'No outfits yet.', random: 'Random outfit', randomHint: (s) => `Builds one for this season (${s}): top and bottom (or a dress) plus shoes, and outerwear when it is cold.`,
      saveOutfit: 'Save as outfit', again: 'Another one', wearAll: 'Wear this today', notEnough: 'Not enough clothes yet: you need a top and a bottom, or a dress.',
      empty: 'Your wardrobe is empty. Tap "Add clothes" to photograph the first piece.', storage: 'Photos are stored only in this browser. Use "Export all data" before switching devices.', storageSynced: 'Photos are encrypted and synced to your GitHub, so your other devices with sync on see them too.',
      count: (n) => `${n} items`, unworn: 'Not worn in a while', errName: 'Add a name.', errPhoto: "Couldn't read that photo. Try another.", errPick: 'Pick at least one item.',
      loading: 'Loading photos…', randomName: (d) => `Random outfit ${d}`
    }
  });
  const t = LO.ns('wardrobe');
  const tc = LO.ns('common');

  /* ---------------- data ---------------- */
  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const str = (v) => (typeof v === 'string' ? v : '');
  const cleanTags = (v) => [...new Set((Array.isArray(v) ? v : String(v || '').split(/[,，、;；]/)).map((x) => String(x).trim()).filter(Boolean))].slice(0, 10);
  const W = LO.createStore('wardrobe', 'planner:wardrobe:v1', () => ({ v: 1, items: [], outfits: [] }), (s) => ({
    v: 1,
    items: (s.items || []).filter((x) => x && typeof x.name === 'string').map((x) => ({
      id: String(x.id || uid()), name: x.name.slice(0, 40), cat: CATS.includes(x.cat) ? x.cat : 'top', color: str(x.color).slice(0, 20),
      seasons: (Array.isArray(x.seasons) ? x.seasons : []).filter((y) => SEASONS.includes(y)), tags: cleanTags(x.tags), note: str(x.note),
      img: str(x.img), worn: Math.max(0, Math.round(+x.worn) || 0), lastWorn: isKey(x.lastWorn) ? x.lastWorn : '', created: isKey(x.created) ? x.created : LO.todayKey()
    })),
    outfits: (s.outfits || []).filter((o) => o && typeof o.name === 'string').map((o) => ({
      id: String(o.id || uid()), name: o.name.slice(0, 40), items: (Array.isArray(o.items) ? o.items : []).map(String), note: str(o.note)
    }))
  }));

  /* ---------------- photos ---------------- */
  const cache = new Map();
  let loaded = false;
  const loadPhotos = () => LO.files.all().then((all) => {
    Object.entries(all).forEach(([k, v]) => { if (k.startsWith('ward:')) cache.set(k, v); });
  }).catch(() => {}).finally(() => { loaded = true; if (LO.route() === 'wardrobe') render(); else if (LO.route() === 'today') LO.refresh(); });
  loadPhotos();
  // sync-photos.js calls this after fetching photos from another device
  LO.wardrobe = { reloadPhotos: loadPhotos };

  function resize(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('decode'));
        img.onload = () => {
          const max = 720;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.78));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function pickPhoto() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', async () => {
        const f = input.files && input.files[0];
        if (!f) { resolve(null); return; }
        try { resolve(await resize(f)); } catch (_) { LO.toast(t('errPhoto')); resolve(null); }
      });
      input.click();
    });
  }
  const imgFor = (it) => cache.get(it.img) || '';
  const thumb = (it, cls) => {
    const src = imgFor(it);
    return src ? `<img class="${cls || ''}" src="${src}" alt="${esc(it.name)}" loading="lazy">` : `<span class="${cls || ''} ph">${esc(t('cats')[it.cat])}</span>`;
  };

  /* ---------------- seasons ---------------- */
  const seasonNow = () => { const m = new Date().getMonth(); return m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn'; };
  const fits = (it, s) => !it.seasons.length || it.seasons.includes(s);

  /* ---------------- editors ---------------- */
  function openItem(id, newImg) {
    const it = id ? W.s.items.find((x) => x.id === id) : null;
    const v = it || { name: '', cat: 'top', color: '', seasons: [], tags: [], note: '', worn: 0, lastWorn: '' };
    let img = newImg || (it ? imgFor(it) : '');
    let changed = !!newImg;
    LO.openForm({
      title: it ? t('editItem') : t('newItem'),
      body: `<div class="ward-edit-photo">${img ? `<img src="${img}" alt="">` : ''}<button type="button" class="btn sm" data-chphoto>${esc(t('changePhoto'))}</button></div>`
        + `<label class="fld"><span>${esc(t('name'))}</span><input class="input" name="wname" maxlength="40" value="${esc(v.name)}" placeholder="${esc(t('namePh'))}"></label>`
        + `<div class="fld"><span>${esc(t('category'))}</span><div class="chips">${LO.chips('wcat', CATS.map((c) => [c, esc(t('cats')[c])]), 'radio', [v.cat])}</div></div>`
        + `<div class="fld"><span>${esc(t('season'))}</span><div class="chips">${LO.chips('wseason', SEASONS.map((c) => [c, esc(t('seasons')[c])]), 'checkbox', v.seasons)}</div></div>`
        + `<div class="form-row"><label class="fld"><span>${esc(t('color'))}</span><input class="input" name="wcolor" maxlength="20" value="${esc(v.color)}" placeholder="${esc(t('colorPh'))}"></label>`
        + `<label class="fld"><span>${esc(t('tags'))}</span><input class="input" name="wtags" maxlength="80" value="${esc(v.tags.join(', '))}" placeholder="${esc(t('tagsPh'))}"></label></div>`
        + `<label class="fld"><span>${esc(t('note'))}</span><input class="input" name="wnote" maxlength="200" value="${esc(v.note)}"></label>`
        + (it ? `<div class="row ward-wear"><button type="button" class="btn sm" data-wearone>${esc(t('wear'))}</button><span class="hint">${esc(it.worn ? t('worn')(it.worn) : t('never'))}${it.lastWorn ? `，${esc(t('last')(LO.shortDate(it.lastWorn)))}` : ''}</span></div>` : ''),
      onOpen(dlg) {
        $('[data-chphoto]', dlg).addEventListener('click', async () => {
          const data = await pickPhoto();
          if (!data) return;
          img = data;
          changed = true;
          const box = $('.ward-edit-photo', dlg);
          const old = $('img', box);
          if (old) old.src = data; else box.insertAdjacentHTML('afterbegin', `<img src="${data}" alt="">`);
        });
        const wb = $('[data-wearone]', dlg);
        if (wb) wb.addEventListener('click', () => { wear([id]); LO.closeForm(); });
      },
      onSave(dlg) {
        const name = $('input[name="wname"]', dlg).value.trim();
        if (!name) return t('errName');
        const fields = {
          name, cat: LO.checkedVal(dlg, 'wcat') || 'top', seasons: LO.checkedVals(dlg, 'wseason'),
          color: $('input[name="wcolor"]', dlg).value.trim(), tags: cleanTags($('input[name="wtags"]', dlg).value), note: $('input[name="wnote"]', dlg).value.trim()
        };
        const itemId = it ? it.id : uid();
        const key = `ward:${itemId}`;
        if (changed && img) {
          cache.set(key, img);
          LO.files.put(key, img).catch(() => LO.toast(tc('saveFailed')));
          fields.img = key;
        }
        LO.mutate(W, (s) => {
          if (it) Object.assign(s.items.find((x) => x.id === itemId), fields);
          else s.items.push(Object.assign({ id: itemId, img: '', worn: 0, lastWorn: '', created: LO.todayKey() }, fields));
        }, it ? tc('saved') : tc('added'));
        return true;
      },
      onDelete: it ? () => {
        if (it.img) { cache.delete(it.img); LO.files.del(it.img).catch(() => {}); }
        LO.mutate(W, (s) => {
          s.items = s.items.filter((x) => x.id !== it.id);
          s.outfits.forEach((o) => { o.items = o.items.filter((x) => x !== it.id); });
        }, tc('deleted'));
      } : null
    });
  }

  function openOutfit(id, preset) {
    const o = id ? W.s.outfits.find((x) => x.id === id) : null;
    const sel = new Set(o ? o.items : preset || []);
    LO.openForm({
      title: o ? t('editOutfit') : t('newOutfit'),
      body: `<label class="fld"><span>${esc(t('outfitName'))}</span><input class="input" name="oname" maxlength="40" value="${esc(o ? o.name : '')}" placeholder="${esc(t('outfitNamePh'))}"></label>`
        + `<div class="fld"><span>${esc(t('pick'))}</span><div class="pick-grid">${W.s.items.map((it) => `<label class="pick-item"><input type="checkbox" name="oitem" value="${esc(it.id)}"${sel.has(it.id) ? ' checked' : ''}>${thumb(it, 'pick-img')}<span>${esc(it.name)}</span></label>`).join('')}</div></div>`
        + `<label class="fld"><span>${esc(t('note'))}</span><input class="input" name="onote" maxlength="200" value="${esc(o ? o.note : '')}"></label>`,
      onSave(dlg) {
        const items = LO.checkedVals(dlg, 'oitem');
        if (!items.length) return t('errPick');
        const name = $('input[name="oname"]', dlg).value.trim() || t('randomName')(LO.shortDate(LO.todayKey()));
        LO.mutate(W, (s) => {
          if (o) Object.assign(s.outfits.find((x) => x.id === id), { name, items, note: $('input[name="onote"]', dlg).value.trim() });
          else s.outfits.push({ id: uid(), name, items, note: $('input[name="onote"]', dlg).value.trim() });
        }, o ? tc('saved') : tc('added'));
        return true;
      },
      onDelete: o ? () => LO.mutate(W, (s) => { s.outfits = s.outfits.filter((x) => x.id !== id); }, tc('deleted')) : null
    });
  }

  function wear(ids) {
    const today = LO.todayKey();
    LO.mutate(W, (s) => { s.items.forEach((x) => { if (ids.includes(x.id)) { x.worn++; x.lastWorn = today; } }); }, t('woreToast'));
  }

  // seasons: which seasons' clothes fit (this season by default); cold adds outerwear.
  // Clothes worn in the last three days are left out when there's anything else.
  function randomOutfit(o) {
    const opts = o || {};
    const s = seasonNow();
    const seasons = opts.seasons || [s];
    const fresh = (x) => !x.lastWorn || LO.dayDiff(x.lastWorn, LO.todayKey()) > 3;
    const pool = (c) => {
      const all = W.s.items.filter((x) => x.cat === c && seasons.some((y) => fits(x, y)));
      return opts.seasons && all.some(fresh) ? all.filter(fresh) : all;
    };
    const any = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const tops = pool('top');
    const bottoms = pool('bottom');
    const dresses = pool('dress');
    const canSet = tops.length && bottoms.length;
    if (!canSet && !dresses.length) return null;
    const out = [];
    if (dresses.length && (!canSet || Math.random() < 0.35)) out.push(any(dresses));
    else { out.push(any(tops)); out.push(any(bottoms)); }
    if (pool('shoes').length) out.push(any(pool('shoes')));
    const cold = opts.cold != null ? opts.cold : s === 'winter' || s === 'autumn' || Math.random() < 0.2;
    if (cold && pool('outer').length) out.push(any(pool('outer')));
    if (pool('bag').length && Math.random() < 0.5) out.push(any(pool('bag')));
    if (pool('acc').length && Math.random() < 0.4) out.push(any(pool('acc')));
    return out.map((x) => x.id);
  }

  /* ---------------- page ---------------- */
  const view = $('#view-wardrobe');
  let fCat = 'all';
  let fSeason = 'all';
  let suggestion = null;

  function render() {
    const items = W.s.items.filter((x) => (fCat === 'all' || x.cat === fCat) && (fSeason === 'all' || fits(x, fSeason)));
    const counts = {};
    W.s.items.forEach((x) => { counts[x.cat] = (counts[x.cat] || 0) + 1; });
    const byId = new Map(W.s.items.map((x) => [x.id, x]));
    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1><p class="sub">${esc(t('sub'))}</p></div>`
      + `<button type="button" class="btn primary" data-wadd>${LO.icon.plus}<span>${esc(t('add'))}</span></button></div>`;
    h += `<div class="ward-filters"><div class="seg sm">${['all'].concat(CATS.filter((c) => counts[c])).map((c) => `<button type="button" data-wcat="${c}" aria-selected="${fCat === c}">${esc(c === 'all' ? t('all') : t('cats')[c])}${c === 'all' ? ` ${W.s.items.length}` : ` ${counts[c]}`}</button>`).join('')}</div>`
      + `<div class="seg sm">${['all'].concat(SEASONS).map((c) => `<button type="button" data-wseason="${c}" aria-selected="${fSeason === c}">${esc(c === 'all' ? t('allSeasons') : t('seasons')[c])}</button>`).join('')}</div></div>`;
    if (!W.s.items.length) h += `<p class="empty-note big">${esc(t('empty'))}</p>`;
    else if (!loaded) h += `<p class="hint">${esc(t('loading'))}</p>`;
    h += `<div class="ward-grid">${items.map((it) => `<button type="button" class="ward-item" data-witem="${esc(it.id)}">${thumb(it, 'ward-img')}`
      + `<span class="ward-name">${esc(it.name)}</span><span class="ward-meta">${esc([t('cats')[it.cat], it.color, it.worn ? t('worn')(it.worn) : ''].filter(Boolean).join(LO.lang() === 'zh' ? '，' : ', '))}</span></button>`).join('')}</div>`;

    // random + outfits
    h += `<div class="section-head"><div><h2>${esc(t('random'))}</h2><p class="hint">${esc(t('randomHint')(t('seasons')[seasonNow()]))}</p></div>`
      + `<button type="button" class="btn" data-wrand>${esc(suggestion ? t('again') : t('random'))}</button></div>`;
    if (suggestion) {
      const list = suggestion.map((id) => byId.get(id)).filter(Boolean);
      h += `<section class="card outfit-suggest"><div class="outfit-row">${list.map((it) => `<div class="of-piece">${thumb(it, 'of-img')}<span>${esc(it.name)}</span></div>`).join('')}</div>`
        + `<div class="row"><button type="button" class="btn primary" data-wwearall>${esc(t('wearAll'))}</button><button type="button" class="btn" data-wsave>${esc(t('saveOutfit'))}</button></div></section>`;
    }
    h += `<div class="section-head"><h2>${esc(t('outfits'))}<span class="count">${W.s.outfits.length}</span></h2>`
      + `<button type="button" class="btn sm" data-onew${W.s.items.length ? '' : ' disabled'}>${LO.icon.plus}<span>${esc(t('newOutfit'))}</span></button></div>`;
    h += W.s.outfits.length
      ? `<div class="outfit-grid">${W.s.outfits.map((o) => {
        const its = o.items.map((id) => byId.get(id)).filter(Boolean);
        return `<button type="button" class="outfit" data-outfit="${esc(o.id)}"><span class="of-collage">${its.slice(0, 4).map((it) => thumb(it, 'of-thumb')).join('')}</span>`
          + `<span class="ward-name">${esc(o.name)}</span><span class="ward-meta">${esc(t('count')(its.length))}</span></button>`;
      }).join('')}</div>`
      : `<p class="empty-note">${esc(t('noOutfits'))}</p>`;
    const unworn = W.s.items.filter((x) => !x.lastWorn || LO.dayDiff(x.lastWorn, LO.todayKey()) > 60).slice(0, 6);
    if (W.s.items.length >= 4 && unworn.length) {
      h += `<div class="section-head"><h2>${esc(t('unworn'))}</h2></div><div class="unworn-row">${unworn.map((it) => `<button type="button" class="unworn" data-witem="${esc(it.id)}">${thumb(it, 'of-thumb')}<span>${esc(it.name)}</span></button>`).join('')}</div>`;
    }
    h += `<p class="hint ward-storage">${esc(LO.sync && LO.sync.photosOn() ? t('storageSynced') : t('storage'))}</p>`;
    view.innerHTML = h;
  }

  view.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-wcat],[data-wseason]');
    if (b) { if (b.dataset.wcat) fCat = b.dataset.wcat; if (b.dataset.wseason) fSeason = b.dataset.wseason; render(); return; }
    if (e.target.closest('[data-wadd]')) {
      const data = await pickPhoto();
      if (data) openItem(null, data);
      return;
    }
    const it = e.target.closest('[data-witem]');
    if (it) { openItem(it.dataset.witem); return; }
    const of = e.target.closest('[data-outfit]');
    if (of) { openOutfit(of.dataset.outfit); return; }
    if (e.target.closest('[data-onew]')) { openOutfit(null); return; }
    if (e.target.closest('[data-wrand]')) {
      suggestion = randomOutfit();
      if (!suggestion) LO.toast(t('notEnough'));
      render();
      return;
    }
    if (e.target.closest('[data-wwearall]') && suggestion) { wear(suggestion); return; }
    if (e.target.closest('[data-wsave]') && suggestion) openOutfit(null, suggestion);
  });

  LO.view('wardrobe', { render });

  /* ---------------- Today: weather and what to wear ---------------- */
  LO.strings('outfitToday', {
    zh: {
      title: '今天穿什么', setCity: '设置所在城市', setHint: '填上城市，就能按今天的天气推荐穿搭。', change: '换城市',
      cold: '有点凉，记得加件外套。', hot: '很热，穿轻薄一点。', wet: '可能下雨，带把伞。', again: '换一套', wear: '就穿这套',
      noClothes: '衣橱里的衣服多一些，这里就能帮你搭。', addClothes: '去添加衣服', unworn: (n, d) => `「${n}」已经 ${d} 天没穿了`, unwornNew: (n) => `「${n}」还没穿过`
    },
    en: {
      title: 'What to wear', setCity: 'Set your city', setHint: "Add your city to get outfit ideas for today's weather.", change: 'Change city',
      cold: "It's cool out. Bring a jacket.", hot: "It's hot. Dress light.", wet: 'Rain likely. Take an umbrella.', again: 'Another', wear: 'Wear this',
      noClothes: 'Add a few more clothes and outfit ideas show up here.', addClothes: 'Add clothes', unworn: (n, d) => `You haven't worn "${n}" in ${d} days`, unwornNew: (n) => `You haven't worn "${n}" yet`
    }
  });
  const ot = LO.ns('outfitToday');
  let todayPick = null;
  let todayPickDay = '';

  // the seasons that fit a day's high, and whether it calls for outerwear
  const seasonsFor = (wx) => (wx.hi >= 26 ? ['summer'] : wx.hi >= 18 ? ['spring', 'autumn'] : wx.hi >= 8 ? ['autumn', 'spring', 'winter'] : ['winter']);

  function todayHTML() {
    const HW = LO.homeWeather;
    if (!HW) return '';
    const head = (link) => `<header class="card-head"><h2>${esc(ot('title'))}</h2>${link}</header>`;
    if (!HW.city()) {
      return `<section class="card o11 outfit-today">${head('')}<p class="hint">${esc(ot('setHint'))}</p><button type="button" class="btn sm" data-wcity>${esc(ot('setCity'))}</button></section>`;
    }
    const wx = HW.today();
    const link = `<button type="button" class="link link-btn" data-wcity>${esc(ot('change'))}</button>`;
    let h = `<section class="card o11 outfit-today">${head(link)}`;
    if (!wx) return `${h}<p class="hint">${esc(HW.missed() ? HW.notFound() : LO.t('wardrobe.loading'))}</p></section>`;
    const tips = [wx.lo < 14 ? ot('cold') : '', wx.hi >= 30 ? ot('hot') : '', wx.wet ? ot('wet') : ''].filter(Boolean);
    h += `<p class="outfit-wx">${esc(wx.line)}</p>${tips.length ? `<p class="hint">${esc(tips.join(' '))}</p>` : ''}`;
    const today = LO.todayKey();
    if (todayPickDay !== today || !todayPick || !todayPick.every((id) => W.s.items.some((x) => x.id === id))) {
      todayPick = randomOutfit({ seasons: seasonsFor(wx), cold: wx.lo < 14 });
      todayPickDay = today;
    }
    if (!todayPick) {
      h += `<p class="hint">${esc(ot('noClothes'))} <a class="link" href="#/life/wardrobe">${esc(ot('addClothes'))}</a></p>`;
    } else {
      const byId = new Map(W.s.items.map((x) => [x.id, x]));
      const worn = todayPick.every((id) => byId.get(id).lastWorn === today);
      h += `<div class="outfit-row">${todayPick.map((id) => byId.get(id)).map((it) => `<span class="outfit-piece">${thumb(it, 'of-thumb')}<small>${esc(it.name)}</small></span>`).join('')}</div>`
        + `<div class="row"><button type="button" class="btn sm" data-wtoday="again">${esc(ot('again'))}</button><button type="button" class="btn sm primary" data-wtoday="wear"${worn ? ' disabled' : ''}>${esc(worn ? t('woreToast') : ot('wear'))}</button></div>`;
    }
    // one piece that's been sitting in the closet
    const old = W.s.items.filter((x) => x.lastWorn ? LO.dayDiff(x.lastWorn, today) >= 90 : LO.dayDiff(x.created, today) >= 30)
      .sort((a, b) => (a.lastWorn || a.created) < (b.lastWorn || b.created) ? -1 : 1)[0];
    if (old) h += `<p class="hint outfit-old">👕 ${esc(old.lastWorn ? ot('unworn')(old.name, LO.dayDiff(old.lastWorn, today)) : ot('unwornNew')(old.name))}</p>`;
    return `${h}</section>`;
  }

  const todayView = $('#view-today');
  if (todayView) todayView.addEventListener('click', (e) => {
    if (e.target.closest('[data-wcity]')) { LO.homeWeather.openCity(); return; }
    const b = e.target.closest('[data-wtoday]');
    if (!b) return;
    if (b.dataset.wtoday === 'again') { todayPick = null; LO.refresh(); }
    else if (todayPick) wear(todayPick);
  });
  LO.wardrobe.todayHTML = todayHTML;
})();
