/*
 * Travel: the packing list, grouped (documents, clothes, electronics…), with
 * ready-made lists by trip type, copying from another trip, dragging to reorder,
 * and unticking everything to pack for the trip home.
 * Plugs into travel.js through LO.tripKit.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;
  const K = LO.tripKit;
  const { T, t, tc, view, PACK_GROUPS, curTrip, editBtn, dragBtn } = K;
  const PACK_KITS = ['beach', 'city', 'cold', 'hike', 'flight', 'work'];
  // Guess an item's group from its name, in Chinese or English. First match wins
  // (clothes before toiletries, so 换洗衣物 is clothes even though it has 洗).
  const GUESS = [
    ['docs', /护照|身份证|签证|行程单|证件|名片|驾照|机票|车票|门票|交通卡|入境|passport|\bid\b|visa|itinerary|business card|licen|ticket|transit card|arrival card/i],
    ['tech', /充电|插头|转换|相机|电脑|耳机|手机|数据线|头灯|自拍|charger|power bank|adapter|camera|laptop|headphone|phone|cable|headlamp/i],
    ['health', /药|急救|防蚊|驱蚊|暖宝宝|口罩|创可贴|medicine|first aid|bug spray|face mask|hand warmer|plaster/i],
    ['clothes', /衣|裤|裙|鞋|帽|围巾|手套|袜|外套|泳|墨镜|正装|穿搭|羽绒|swim|shirt|trouser|pants|\bdress|shoe|boot|\bhat|scarf|glove|sock|jacket|thermal|outfit|sandal|sunglass|clothes|layer/i],
    ['wash', /洗|牙|防晒|保湿|润唇|护肤|毛巾|沙滩巾|晒后|化妆|toiletr|sunscreen|moistur|lip balm|towel|tooth|shampoo|after-sun|makeup/i]
  ];
  const guess = (name) => (GUESS.find(([, re]) => re.test(name)) || ['other'])[0];
  const grpOf = (i) => i.grp || guess(i.name);

  function rowHTML(i) {
    return `<li class="${i.done ? 'is-done' : ''}" data-titem="${esc(i.id)}">${dragBtn()}`
      + `<label class="check"><input type="checkbox" data-tdone${i.done ? ' checked' : ''} aria-label="${esc(t('done').pack)}"></label>`
      + `<div class="ti-body"><b>${esc(i.name)}</b>${i.note ? `<p>${esc(i.note)}</p>` : ''}</div>`
      + editBtn('data-kiedit') + `<button type="button" class="icon-btn sm ghost" data-tdel aria-label="${esc(tc('delete'))}">${LO.icon.x}</button></li>`;
  }

  const grpOpts = (sel, auto) => (auto ? `<option value="">${esc(t('grpAuto'))}</option>` : '')
    + PACK_GROUPS.map((g) => `<option value="${g}"${g === sel ? ' selected' : ''}>${esc(t('grps')[g])}</option>`).join('');

  function packHTML(tr) {
    const list = tr.sections.pack;
    const others = T.s.trips.filter((x) => x.id !== tr.id && x.sections.pack.length);
    let h = '<section class="card trip-sec">'
      + `<div class="row pack-tools"><select class="input" data-packkit aria-label="${esc(t('kitPick'))}"><option value="">${esc(t('kitPick'))}</option>`
      + `${PACK_KITS.map((k) => `<option value="${k}">${esc(t('kits')[k])}</option>`).join('')}</select>`
      + (others.length ? `<select class="input" data-packcopy aria-label="${esc(t('copyFrom'))}"><option value="">${esc(t('copyFrom'))}</option>${others.map((x) => `<option value="${esc(x.id)}">${esc(x.dest)}${x.start ? ` · ${esc(LO.shortDate(x.start))}` : ''}</option>`).join('')}</select>` : '')
      + (list.some((i) => i.done) ? `<button type="button" class="btn" data-packreset>${esc(t('packReset'))}</button>` : '')
      + '</div>'
      + `<form class="trip-add" data-kadd><input class="input" name="kname" maxlength="80" placeholder="${esc(t('addPh').pack)}" aria-label="${esc(t('addPh').pack)}">`
      + `<select class="input pack-grp-in" name="kgrp" aria-label="${esc(t('grp'))}">${grpOpts('', true)}</select>`
      + `<button type="submit" class="btn primary">${LO.icon.plus}<span>${esc(t('add'))}</span></button></form>`;
    if (!list.length) return `${h}<p class="empty-note">${esc(t('emptySec'))}</p></section>`;
    PACK_GROUPS.forEach((g) => {
      const items = list.filter((i) => grpOf(i) === g);
      if (!items.length) return;
      h += `<h3 class="pack-grp">${esc(t('grps')[g])}<span class="count">${items.filter((i) => i.done).length}/${items.length}</span></h3>`
        + `<ul class="trip-items" data-sort="sec">${items.map(rowHTML).join('')}</ul>`;
    });
    return `${h}</section>`;
  }

  function openPackItem(iid) {
    const it = K.trip().sections.pack.find((x) => x.id === iid);
    if (!it) return;
    LO.openForm({
      title: t('editItem'),
      body: `<label class="fld"><span>${esc(t('name'))}</span><input class="input" name="kname" maxlength="80" value="${esc(it.name)}" placeholder="${esc(t('addPh').pack)}"></label>`
        + `<label class="fld"><span>${esc(t('grp'))}</span><select class="input" name="kgrp">${grpOpts(grpOf(it), false)}</select></label>`,
      onSave(dlg) {
        const name = $('input[name="kname"]', dlg).value.trim();
        if (!name) return t('errTitle');
        LO.mutate(T, (s) => {
          Object.assign(curTrip(s).sections.pack.find((i) => i.id === iid), { name, grp: $('select[name="kgrp"]', dlg).value });
        }, tc('saved'));
        return true;
      },
      onDelete: () => LO.mutate(T, (s) => { const x = curTrip(s); x.sections.pack = x.sections.pack.filter((i) => i.id !== iid); }, tc('deleted'))
    });
  }

  // Add items to the packing list, skipping names already on it.
  function addPack(items) {
    let n = 0;
    LO.mutate(T, (s) => {
      const list = curTrip(s).sections.pack;
      const have = new Set(list.map((i) => i.name));
      items.forEach(({ name, grp }) => {
        if (have.has(name)) return;
        have.add(name);
        list.push({ id: uid(), name, note: '', link: '', done: false, grp: grp || guess(name) });
        n++;
      });
    });
    LO.toast(t('packAdded')(n));
  }

  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-packreset]')) {
      LO.mutate(T, (s) => { curTrip(s).sections.pack.forEach((i) => { i.done = false; }); }, t('packResetDone'));
      return;
    }
    const ke = e.target.closest('[data-kiedit]');
    if (ke) openPackItem(ke.closest('[data-titem]').dataset.titem);
  });

  view.addEventListener('change', (e) => {
    if (e.target.matches('[data-packkit]')) {
      if (e.target.value) addPack((t('kitItems')[e.target.value] || []).map((name) => ({ name })));
      return;
    }
    if (e.target.matches('[data-packcopy]')) {
      const src = T.s.trips.find((x) => x.id === e.target.value);
      if (src) addPack(src.sections.pack.map((i) => ({ name: i.name, grp: grpOf(i) })));
    }
  });

  view.addEventListener('submit', (e) => {
    const f = e.target;
    if (!f.matches('[data-kadd]')) return;
    e.preventDefault();
    const name = $('input[name="kname"]', f).value.trim();
    if (!name) return;
    const grp = $('select[name="kgrp"]', f).value || guess(name);
    LO.mutate(T, (s) => { curTrip(s).sections.pack.push({ id: uid(), name, note: '', link: '', done: false, grp }); });
    const i = $('[data-kadd] input[name="kname"]', view);
    if (i) i.focus();
  });

  Object.assign(K, { packHTML, packGuess: guess });
})();
