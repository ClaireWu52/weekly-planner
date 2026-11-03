/*
 * Travel: share a trip as text (bookings, itinerary, stay, places and food),
 * and copying text to the clipboard.
 * Plugs into travel.js through LO.tripKit.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc } = LO;
  const K = LO.tripKit;
  const { t, view, KIND_ICON, tripDays, byTime, byWhen, dateRange } = K;

  function shareText(tr, withConf) {
    const lines = [];
    const nDays = tr.start ? LO.dayDiff(tr.start, tr.end || tr.start) + 1 : 0;
    lines.push(`📍 ${tr.dest}${tr.start ? ` · ${dateRange(tr)}${nDays ? t('paren')(t('daysN')(nDays)) : ''}` : ''}`);
    if (tr.people.length > 1) lines.push(`${t('with')}${t('colon')}${t('list')(tr.people)}`);
    if (tr.note) lines.push(tr.note);
    const books = tr.bookings.slice().sort(byWhen);
    if (books.length) {
      lines.push('', `🧳 ${t('shareBook')}`);
      books.forEach((b) => {
        const when = [b.date && LO.shortDate(b.date), b.time].filter(Boolean).join(' ');
        const until = b.endDate || b.endTime ? ` – ${[b.endDate && b.endDate !== b.date ? LO.shortDate(b.endDate) : '', b.endTime].filter(Boolean).join(' ')}` : '';
        const route = b.from || b.to ? ` ${[b.from, b.to].filter(Boolean).join(' → ')}` : '';
        lines.push(`${KIND_ICON[b.kind]} ${when}${until} ${b.title}${route}`.replace(/\s+/g, ' ').trim());
        if (withConf && b.conf) lines.push(`   ${t('conf')}${t('colon')}${b.conf}`);
        if (withConf && b.address) lines.push(`   ${t('address')}${t('colon')}${b.address}`);
      });
    }
    const days = tripDays(tr).filter((d) => d.n);
    if (days.some((d) => tr.plan.some((p) => p.day === d.key))) {
      lines.push('', `📅 ${t('sharePlan')}`);
      days.forEach(({ key, n }) => {
        const items = tr.plan.filter((p) => p.day === key).sort(byTime);
        if (!items.length) return;
        lines.push(t('dayLabel')(n, key));
        items.forEach((p) => lines.push(`   ${p.time ? p.time + ' ' : '· '}${p.name}${p.note ? ` — ${p.note}` : ''}`));
      });
    }
    [['stay', 'shareStay', '🏨'], ['spots', 'shareSpots', '📸'], ['food', 'shareFood', '🍜']].forEach(([k, label, icon]) => {
      const list = tr.sections[k];
      if (!list.length) return;
      lines.push('', `${icon} ${t(label)}`);
      list.forEach((i) => lines.push(`   · ${i.name}${i.note ? ` — ${i.note}` : ''}`));
    });
    return lines.join('\n');
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (__) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  function openShare() {
    const tr = K.trip();
    const canShare = typeof navigator.share === 'function';
    LO.openForm({
      title: t('shareTitle'),
      saveLabel: t('copy'),
      body: `<p class="hint">${esc(t('shareHint'))}</p>`
        + `<label class="share-opt"><input type="checkbox" name="sconf"><span>${esc(t('shareConf'))}</span></label>`
        + `<textarea class="input ta share-text" name="stext" rows="14" readonly>${esc(shareText(tr, false))}</textarea>`
        + (canShare ? `<button type="button" class="btn sm" data-sysshare>${esc(t('shareSys'))}</button>` : ''),
      onOpen(dlg) {
        const box = $('textarea[name="stext"]', dlg);
        $('input[name="sconf"]', dlg).addEventListener('change', (e) => { box.value = shareText(tr, e.target.checked); });
        const sb = $('[data-sysshare]', dlg);
        if (sb) sb.addEventListener('click', () => { navigator.share({ title: tr.dest, text: box.value }).catch(() => {}); });
      },
      onSave(dlg) {
        copyText($('textarea[name="stext"]', dlg).value).then((ok) => { if (ok) LO.toast(t('copied')); });
        return true;
      }
    });
  }

  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-tshare]')) openShare();
  });

  Object.assign(K, { copyText });
})();
