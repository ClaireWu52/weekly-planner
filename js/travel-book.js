/*
 * Travel: transport and stays (flights, trains, hotels…) with times, confirmation
 * numbers and prices, plus the trip's events for the calendar export.
 * Plugs into travel.js through LO.tripKit.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;
  const K = LO.tripKit;
  const { T, t, tc, view, KINDS, KIND_ICON, num, safeUrl, curTrip, byWhen } = K;

  function openBooking(bid) {
    const tr = K.trip();
    const b = bid ? tr.bookings.find((x) => x.id === bid) : null;
    const kind0 = b ? b.kind : 'flight';
    const kindOpts = KINDS.map((k) => `<option value="${k}"${k === kind0 ? ' selected' : ''}>${KIND_ICON[k]} ${esc(t('kinds')[k])}</option>`).join('');
    const v = (k) => esc(b ? b[k] : '');
    const pcur0 = (b && b.pcur) || tr.money.home;
    const pcurs = Array.from(new Set([tr.money.home, tr.money.local, pcur0]));
    LO.openForm({
      title: b ? t('editBooking') : t('addBooking'),
      body: `<div class="form-row"><label class="fld"><span>${esc(t('kind'))}</span><select class="input" name="bkind">${kindOpts}</select></label>`
        + `<label class="fld"><span>${esc(t('bTitle'))}</span><input class="input" name="btitle" maxlength="80" value="${v('title')}" placeholder="${esc(t('bTitlePh')[kind0])}"></label></div>`
        + `<div class="form-row" data-route><label class="fld"><span>${esc(t('from'))}</span><input class="input" name="bfrom" maxlength="80" value="${v('from')}"></label>`
        + `<label class="fld"><span>${esc(t('to'))}</span><input class="input" name="bto" maxlength="80" value="${v('to')}"></label></div>`
        + `<div class="form-row"><label class="fld"><span data-l1>${esc(t(kind0 === 'hotel' ? 'fromHotel' : 'depart'))}</span><input class="input" type="date" name="bdate" value="${v('date') || esc(tr.start)}"></label>`
        + `<label class="fld"><span>${esc(t('time'))}</span><input class="input" type="time" name="btime" value="${v('time')}"></label></div>`
        + `<div class="form-row"><label class="fld"><span data-l2>${esc(t(kind0 === 'hotel' ? 'toHotel' : 'arrive'))}</span><input class="input" type="date" name="bend" value="${v('endDate')}"></label>`
        + `<label class="fld"><span>${esc(t('time'))}</span><input class="input" type="time" name="bendtime" value="${v('endTime')}"></label></div>`
        + `<label class="fld"><span>${esc(t('conf'))}</span><input class="input mono" name="bconf" maxlength="60" autocomplete="off" value="${v('conf')}" placeholder="${esc(t('confPh'))}"></label>`
        + `<label class="fld"><span>${esc(t('address'))}</span><input class="input" name="baddr" maxlength="200" value="${v('address')}"></label>`
        + `<label class="fld"><span>${esc(t('bNote'))}</span><input class="input" name="bnote" maxlength="300" value="${v('note')}" placeholder="${esc(t('bNotePh'))}"></label>`
        + `<div class="form-row"><label class="fld"><span>${esc(t('price'))}</span><input class="input" type="number" name="bprice" min="0" step="any" inputmode="decimal" value="${b && b.price ? b.price : ''}"></label>`
        + `<label class="fld"><span>${esc(t('curName'))}</span><select class="input" name="bpcur">${pcurs.map((c) => `<option value="${c}"${c === pcur0 ? ' selected' : ''}>${c}</option>`).join('')}</select></label></div>`
        + `<p class="hint">${esc(t('priceHint'))}</p>`
        + `<label class="fld"><span>${esc(t('linkPh'))}</span><input class="input" name="blink" maxlength="400" value="${v('link')}"></label>`,
      onOpen(dlg) {
        const sel = $('select[name="bkind"]', dlg);
        const sync = () => {
          const hotel = sel.value === 'hotel';
          $('[data-route]', dlg).hidden = hotel;
          $('[data-l1]', dlg).textContent = t(hotel ? 'fromHotel' : 'depart');
          $('[data-l2]', dlg).textContent = t(hotel ? 'toHotel' : 'arrive');
          $('input[name="btitle"]', dlg).placeholder = t('bTitlePh')[sel.value];
        };
        sel.addEventListener('change', sync);
        sync();
      },
      onSave(dlg) {
        const g = (n) => $(`[name="${n}"]`, dlg).value.trim();
        const title = g('btitle');
        if (!title) return t('errTitle');
        const kind = g('bkind');
        const date = g('bdate');
        let endDate = g('bend');
        if (date && endDate && endDate < date) endDate = date;
        const fields = {
          kind, title, date, time: g('btime'), endDate, endTime: g('bendtime'),
          from: kind === 'hotel' ? '' : g('bfrom'), to: kind === 'hotel' ? '' : g('bto'),
          conf: g('bconf'), address: g('baddr'), note: g('bnote'), link: safeUrl(g('blink')),
          price: num(g('bprice')), pcur: g('bpcur')
        };
        LO.mutate(T, (s) => {
          const x = curTrip(s);
          let y = b && x.bookings.find((z) => z.id === bid);
          if (y) Object.assign(y, fields);
          else { y = Object.assign({ id: uid() }, fields); x.bookings.push(y); }
          K.syncBookingExpense(x, y);
        }, b ? tc('saved') : tc('added'));
        return true;
      },
      onDelete: b ? () => LO.mutate(T, (s) => {
        const x = curTrip(s);
        x.bookings = x.bookings.filter((y) => y.id !== bid);
        x.expenses = x.expenses.filter((e) => e.bid !== bid);
      }, tc('deleted')) : null
    });
  }

  function bookHTML(tr) {
    const list = tr.bookings.slice().sort(byWhen);
    let h = `<div class="row trip-actions"><button type="button" class="btn primary" data-badd>${LO.icon.plus}<span>${esc(t('addBooking'))}</span></button></div>`;
    if (!list.length) return `${h}<p class="empty-note big">${esc(t('noBookings'))}</p>`;
    const when = (d, tm) => [d && `${LO.shortDate(d)} ${LO.t('common.days')[LO.wd(LO.parseKey(d))]}`, tm].filter(Boolean).join(' ');
    h += '<div class="book-list">';
    list.forEach((b) => {
      const hotel = b.kind === 'hotel';
      const a = when(b.date, b.time);
      const z = when(b.endDate && b.endDate !== b.date ? b.endDate : '', b.endTime);
      h += `<section class="card booking"><header class="bk-head"><span class="bk-kind">${KIND_ICON[b.kind]} ${esc(t('kinds')[b.kind])}</span>`
        + `<button type="button" class="link-btn" data-bedit="${esc(b.id)}">${esc(tc('edit'))}</button></header>`
        + `<h3 class="bk-title">${b.link ? `<a href="${esc(b.link)}" target="_blank" rel="noopener noreferrer">${esc(b.title)}</a>` : esc(b.title)}</h3>`
        + (b.from || b.to ? `<p class="bk-route">${esc(b.from)}${b.from && b.to ? ' → ' : ''}${esc(b.to)}</p>` : '')
        + (a || z ? `<p class="bk-when">${a ? `<span><small>${esc(t(hotel ? 'checkIn' : 'depart'))}</small> ${esc(a)}</span>` : ''}${z ? `<span><small>${esc(t(hotel ? 'checkOut' : 'arrive'))}</small> ${esc(z)}</span>` : ''}</p>` : '')
        + (b.conf ? `<div class="bk-conf"><small>${esc(t('conf'))}</small><b class="mono">${esc(b.conf)}</b><button type="button" class="btn sm" data-copy="${esc(b.conf)}">${esc(t('copy'))}</button></div>` : '')
        + (b.address ? `<p class="bk-addr">${esc(b.address)} <a class="link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}" target="_blank" rel="noopener noreferrer">${esc(t('map'))}</a></p>` : '')
        + (b.note ? `<p class="bk-note">${esc(b.note)}</p>` : '')
        + (b.price ? `<p class="bk-note">${esc(K.fmtMoney(b.price, b.pcur || tr.money.home))}</p>` : '')
        + '</section>';
    });
    return `${h}</div>`;
  }


// Trips and bookings from today on, for the calendar export. Times are minutes after midnight, or null for all-day.
LO.travel.calendarItems = () => {
    const today = LO.todayKey();
    const mins = (v) => (v ? +v.slice(0, 2) * 60 + +v.slice(3) : null);
    const out = [];
    T.s.trips.filter((tr) => tr.start && (tr.end || tr.start) >= today).forEach((tr) => {
      out.push({ uid: `trip-${tr.id}`, title: `📍 ${tr.dest}`, date: tr.start, endDate: tr.end || tr.start, time: null, desc: tr.note });
      tr.bookings.filter((b) => b.date && (b.endDate || b.date) >= today).forEach((b) => {
        const desc = [b.conf && `${t('conf')}${t('colon')}${b.conf}`, b.note].filter(Boolean).join('\n');
        const loc = b.address || b.from;
        if (b.kind === 'hotel') {
          if (b.date >= today) out.push({ uid: `bk-${b.id}-in`, title: `${KIND_ICON.hotel} ${t('checkIn')} ${b.title}`, date: b.date, time: mins(b.time), location: loc, desc, alarm: '-PT1H' });
          if (b.endDate && b.endDate !== b.date) out.push({ uid: `bk-${b.id}-out`, title: `${KIND_ICON.hotel} ${t('checkOut')} ${b.title}`, date: b.endDate, time: mins(b.endTime), location: loc, desc, alarm: '-PT1H' });
          return;
        }
        const route = b.from || b.to ? ` ${[b.from, b.to].filter(Boolean).join(' → ')}` : '';
        out.push({
          uid: `bk-${b.id}`, title: `${KIND_ICON[b.kind]} ${b.title}${route}`, date: b.date, time: mins(b.time),
          endDate: b.endDate || b.date, endTime: mins(b.endTime), location: loc, desc, alarm: b.kind === 'flight' ? '-PT3H' : '-PT1H'
        });
      });
    });
    return out;
  };

  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-badd]')) { openBooking(null); return; }
    const be = e.target.closest('[data-bedit]');
    if (be) openBooking(be.dataset.bedit);
  });

  Object.assign(K, { bookHTML });
})();
