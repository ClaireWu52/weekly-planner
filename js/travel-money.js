/*
 * Travel: budget, exchange rate, spending (with who paid and how it splits),
 * totals by category, settling up, and the expense that mirrors a booking's price.
 * Plugs into travel.js through LO.tripKit.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;
  const K = LO.tripKit;
  const { T, t, tc, view, CATS, num, curTrip, tripDays, editBtn } = K;
  const CURRENCIES = ['USD', 'CNY', 'JPY', 'KRW', 'HKD', 'TWD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'THB', 'MYR', 'VND', 'IDR', 'PHP', 'MXN', 'CHF', 'NZD', 'MOP'];
  const RATE_API = 'https://open.er-api.com/v6/latest/';
  const BOOK_CAT = { flight: 'transport', train: 'transport', bus: 'transport', car: 'transport', hotel: 'stay', other: 'other' };

  // Day choices for an expense: before the trip, then each trip day.
  const expDayOpts = (days, sel) => `<option value=""${sel ? '' : ' selected'}>${esc(t('beforeTrip'))}</option>`
    + days.map((d) => `<option value="${d.key}"${d.key === sel ? ' selected' : ''}>${esc(t('inPlan')(d.n))} · ${esc(LO.shortDate(d.key))}</option>`).join('');

  function fmtMoney(n, code) {
    try {
      return new Intl.NumberFormat(LO.lang() === 'zh' ? 'zh-CN' : 'en-US', { style: 'currency', currency: code, maximumFractionDigits: Math.abs(n) >= 1000 || n % 1 === 0 ? 0 : 2 }).format(n);
    } catch (_) { return `${LO.round1(n)} ${code}`; }
  }
  // Value of an expense in the home currency, or null when no rate is set for it.
  // Expenses in a currency the trip no longer uses keep the rate they were frozen at.
  function toHome(tr, e) {
    if (e.cur === tr.money.home) return e.amount;
    if (e.cur === tr.money.local && tr.money.rate > 0) return e.amount * tr.money.rate;
    if (e.rate > 0 && e.rateTo === tr.money.home) return e.amount * e.rate;
    return null;
  }

  // Deleting a booking's expense also clears the booking's price, so it is not added back on the next edit.
  function removeExpense(tr, eid) {
    const e = tr.expenses.find((x) => x.id === eid);
    const bk = e && e.bid && tr.bookings.find((z) => z.id === e.bid);
    if (bk) bk.price = 0;
    tr.expenses = tr.expenses.filter((x) => x.id !== eid);
  }
  // Before the currencies change, pin each expense that would lose its rate to what it is worth now.
  function freezeRates(tr, next) {
    const oldHome = tr.money.home;
    // one unit of the old home currency in the new one
    const homeToNew = next.home === oldHome ? 1 : next.home === tr.money.local && tr.money.rate > 0 ? 1 / tr.money.rate : 0;
    tr.expenses.forEach((e) => {
      if (e.cur === next.home || (e.cur === next.local && next.rate > 0)) return;
      const v = toHome(tr, e);
      if (v == null || !homeToNew) return;
      e.rate = v / e.amount * homeToNew;
      e.rateTo = next.home;
    });
  }
  // Who pays whom so everyone ends up even (greedy: biggest debtor pays biggest creditor).
  function settleUp(tr) {
    const bal = Object.fromEntries(tr.people.map((p) => [p, 0]));
    tr.expenses.forEach((e) => {
      const v = toHome(tr, e);
      const split = e.split.length ? e.split : tr.people;
      if (v == null || !(e.paidBy in bal)) return;
      bal[e.paidBy] += v;
      split.forEach((p) => { if (p in bal) bal[p] -= v / split.length; });
    });
    const debt = Object.entries(bal).filter(([, v]) => v < -0.005).map(([p, v]) => [p, -v]).sort((a, b) => b[1] - a[1]);
    const cred = Object.entries(bal).filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1]);
    const out = [];
    let i = 0;
    let j = 0;
    while (i < debt.length && j < cred.length) {
      const m = Math.min(debt[i][1], cred[j][1]);
      if (m > 0.005) out.push([debt[i][0], cred[j][0], m]);
      debt[i][1] -= m;
      cred[j][1] -= m;
      if (debt[i][1] <= 0.005) i++;
      if (cred[j][1] <= 0.005) j++;
    }
    return out;
  }

  function openMoney() {
    const tr = K.trip();
    const m = tr.money;
    const opts = (sel) => Array.from(new Set(CURRENCIES.concat([sel]))).map((c) => `<option value="${c}"${c === sel ? ' selected' : ''}>${c}</option>`).join('');
    let fetchedAt = '';
    LO.openForm({
      title: t('moneySet'),
      body: `<div class="form-row"><label class="fld"><span>${esc(t('homeCur'))}</span><select class="input" name="mhome">${opts(m.home)}</select></label>`
        + `<label class="fld"><span>${esc(t('localCur'))}</span><select class="input" name="mlocal">${opts(m.local)}</select></label></div>`
        + `<div class="fld" data-ratefld><span data-ratelabel>${esc(t('rate')(m.local, m.home))}</span><div class="row"><input class="input rate-in" type="number" name="mrate" min="0" step="any" inputmode="decimal" value="${m.rate || ''}">`
        + `<button type="button" class="btn sm" data-getrate>${esc(t('getRate'))}</button></div><p class="hint" data-rateat>${m.rateAt ? esc(t('rateAt')(LO.shortDate(m.rateAt))) : ''}</p></div>`
        + `<label class="fld"><span data-budgetlabel>${esc(t('budget'))} (${esc(m.home)})</span><input class="input" type="number" name="mbudget" min="0" step="any" inputmode="decimal" value="${m.budget || ''}"></label>`,
      onOpen(dlg) {
        const home = $('select[name="mhome"]', dlg);
        const local = $('select[name="mlocal"]', dlg);
        const sync = () => {
          $('[data-ratelabel]', dlg).textContent = t('rate')(local.value, home.value);
          $('[data-budgetlabel]', dlg).textContent = `${t('budget')} (${home.value})`;
          $('[data-ratefld]', dlg).hidden = local.value === home.value;
        };
        home.addEventListener('change', sync);
        local.addEventListener('change', sync);
        sync();
        $('[data-getrate]', dlg).addEventListener('click', async () => {
          const note = $('[data-rateat]', dlg);
          try {
            const r = await fetch(RATE_API + encodeURIComponent(local.value));
            const d = await r.json();
            const rate = d && d.rates && d.rates[home.value];
            if (!rate) throw new Error('no rate');
            $('input[name="mrate"]', dlg).value = String(Math.round(rate * 1e6) / 1e6);
            fetchedAt = LO.todayKey();
            note.textContent = t('rateOk')(LO.shortDate(fetchedAt));
          } catch (_) { note.textContent = t('rateFail'); }
        });
      },
      onSave(dlg) {
        const home = $('select[name="mhome"]', dlg).value;
        const local = $('select[name="mlocal"]', dlg).value;
        const rate = num($('input[name="mrate"]', dlg).value);
        if (local !== home && !(rate > 0)) return t('errRate');
        const rateAt = fetchedAt || (rate === m.rate ? m.rateAt : '');
        LO.mutate(T, (s) => {
          const x = curTrip(s);
          const next = { home, local, rate: local === home ? 0 : rate, rateAt: local === home ? '' : rateAt, budget: num($('input[name="mbudget"]', dlg).value) };
          if (home !== m.home || local !== m.local) freezeRates(x, next);
          x.money = next;
        }, tc('saved'));
        return true;
      }
    });
  }

  function openExpense(eid) {
    const tr = K.trip();
    const e = tr.expenses.find((x) => x.id === eid);
    if (!e) return;
    const days = tripDays(tr).filter((d) => d.n);
    const multi = tr.people.length > 1;
    const curs = Array.from(new Set([tr.money.local, tr.money.home, e.cur]));
    LO.openForm({
      title: t('editExp'),
      body: `<label class="fld"><span>${esc(t('expName'))}</span><input class="input" name="ename" maxlength="80" value="${esc(e.name)}"></label>`
        + `<div class="form-row"><label class="fld"><span>${esc(t('amount'))}</span><input class="input" type="number" name="eamt" min="0" step="any" inputmode="decimal" value="${e.amount}"></label>`
        + `<label class="fld"><span>${esc(t('localCur'))}</span><select class="input" name="ecur">${curs.map((c) => `<option value="${c}"${c === e.cur ? ' selected' : ''}>${c}</option>`).join('')}</select></label></div>`
        + `<div class="form-row"><label class="fld"><span>${esc(tc('category'))}</span><select class="input" name="ecat">${CATS.map((c) => `<option value="${c}"${c === e.cat ? ' selected' : ''}>${esc(t('cats')[c])}</option>`).join('')}</select></label>`
        + (days.length ? `<label class="fld"><span>${esc(t('date'))}</span><select class="input" name="eday">${expDayOpts(days, e.day)}</select></label>` : '') + '</div>'
        + (multi ? `<label class="fld"><span>${esc(t('paidBy'))}</span><select class="input" name="epaid">${tr.people.map((p) => `<option value="${esc(p)}"${p === e.paidBy ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></label>`
          + `<div class="fld"><span>${esc(t('splitWith'))}</span><div class="exp-split">${LO.chips('esplit', tr.people.map((p) => [p, esc(p)]), 'checkbox', e.split.length ? e.split : tr.people)}</div></div>` : ''),
      onSave(dlg) {
        const g = (n) => { const el = dlg.querySelector(`[name="${n}"]`); return el ? el.value.trim() : ''; };
        const name = g('ename');
        if (!name) return t('errTitle');
        const amount = num(g('eamt'));
        if (!(amount > 0)) return t('errAmount');
        const split = multi ? LO.checkedVals(dlg, 'esplit') : [];
        LO.mutate(T, (s) => {
          const x = curTrip(s);
          const y = x.expenses.find((z) => z.id === eid);
          const ecur = g('ecur');
          // a frozen rate only holds for the currency it was frozen with
          if (ecur !== y.cur) { y.rate = 0; y.rateTo = ''; }
          Object.assign(y, { name, amount, cur: ecur, cat: g('ecat') || 'other', day: days.length ? g('eday') : y.day, paidBy: g('epaid') || y.paidBy, split: split.length ? split : x.people.slice() });
          // the booking shows the same price
          const bk = y.bid && x.bookings.find((z) => z.id === y.bid);
          if (bk) { bk.price = amount; bk.pcur = ecur; }
        }, tc('saved'));
        return true;
      },
      onDelete: () => LO.mutate(T, (s) => removeExpense(curTrip(s), eid), tc('deleted'))
    });
  }

  // What the rest of the budget allows per day: before the trip, spread over every day;
  // during it, what is left after other days' spending, over today and the days still ahead.
  function dailyHTML(tr, spent) {
    const m = tr.money;
    if (!m.budget || !tr.start || spent >= m.budget) return '';
    const today = LO.todayKey();
    const end = tr.end || tr.start;
    if (today > end) return '';
    if (today < tr.start) {
      const n = LO.dayDiff(tr.start, end) + 1;
      return `<span class="stat-sub">${esc(t('perDay')(fmtMoney((m.budget - spent) / n, m.home), n))}</span>`;
    }
    const n = LO.dayDiff(today, end) + 1;
    const spentToday = tr.expenses.filter((e) => e.day === today).reduce((a, e) => a + (toHome(tr, e) || 0), 0);
    const perDay = (m.budget - (spent - spentToday)) / n;
    const todayLeft = perDay - spentToday;
    return `<span class="stat-daily"><span class="stat-sub">${esc(t('perDay')(fmtMoney(perDay, m.home), n))}</span>`
      + `<span class="stat-sub${todayLeft < 0 ? ' warn' : ''}">${esc(todayLeft < 0 ? t('todayOver')(fmtMoney(-todayLeft, m.home)) : t('todayLeft')(fmtMoney(todayLeft, m.home)))}</span></span>`;
  }

  function moneyHTML(tr) {
    const m = tr.money;
    const vals = tr.expenses.map((e) => toHome(tr, e));
    const spent = vals.reduce((a, v) => a + (v || 0), 0);
    const missing = vals.some((v) => v == null);
    const pct = m.budget ? Math.min(1, spent / m.budget) : 0;
    const leftAmt = m.budget - spent;
    let h = '<div class="stats trip-stats">'
      + `<button type="button" class="stat" data-mset><span class="stat-label">${esc(t('budget'))}</span><span class="stat-num">${m.budget ? esc(fmtMoney(m.budget, m.home)) : '—'}</span>`
      + `<span class="stat-sub">${esc(m.local !== m.home && m.rate ? `1 ${m.local} = ${m.rate} ${m.home}` : t('moneySet'))}</span></button>`
      + `<div class="stat"><span class="stat-label">${esc(t('spent'))}</span><span class="stat-num">${esc(fmtMoney(spent, m.home))}</span>`
      + `${m.budget ? `<span class="progress sm${leftAmt < 0 ? ' over' : ''}"><span style="width:${pct * 100}%"></span></span>` : `<span class="stat-sub">${esc(t('noBudget'))}</span>`}</div>`
      + `<div class="stat"><span class="stat-label">${esc(leftAmt < 0 ? t('over') : t('left'))}</span><span class="stat-num${leftAmt < 0 ? ' warn' : ''}">${m.budget ? esc(fmtMoney(Math.abs(leftAmt), m.home)) : '—'}</span>`
      + `${dailyHTML(tr, spent)}</div>`
      + '</div>';
    if (missing) h += `<p class="empty-note">${esc(t('needRate'))}</p>`;

    // add form
    const days = tripDays(tr).filter((d) => d.n);
    const today = LO.todayKey();
    const day0 = days.some((d) => d.key === today) ? today : (days[0] ? days[0].key : '');
    const curs = Array.from(new Set([m.local, m.home]));
    h += `<section class="card trip-sec"><form class="trip-add exp-add" data-eadd>`
      + `<input class="input" name="ename" maxlength="80" placeholder="${esc(t('expName'))}" aria-label="${esc(t('expName'))}">`
      + `<input class="input exp-amt" type="number" name="eamt" min="0" step="any" inputmode="decimal" placeholder="${esc(t('amount'))}" aria-label="${esc(t('amount'))}">`
      + `<select class="input" name="ecur" aria-label="${esc(t('localCur'))}">${curs.map((c) => `<option value="${c}">${c}</option>`).join('')}</select>`
      + `<select class="input" name="ecat" aria-label="${esc(tc('category'))}">${CATS.map((c) => `<option value="${c}">${esc(t('cats')[c])}</option>`).join('')}</select>`
      + (days.length ? `<select class="input" name="eday" aria-label="${esc(t('date'))}">${expDayOpts(days, day0)}</select>` : '')
      + (tr.people.length > 1 ? `<select class="input" name="epaid" aria-label="${esc(t('paidBy'))}">${tr.people.map((p) => `<option value="${esc(p)}">${esc(t('paidBy'))}${esc(t('colon'))}${esc(p)}</option>`).join('')}</select>` : '')
      + `<button type="submit" class="btn primary">${LO.icon.plus}<span>${esc(t('add'))}</span></button>`
      + (tr.people.length > 1 ? `<div class="exp-split"><span class="hint">${esc(t('splitWith'))}</span>${LO.chips('esplit', tr.people.map((p) => [p, esc(p)]), 'checkbox', tr.people)}</div>` : '')
      + '</form>';

    // list, newest day first
    if (!tr.expenses.length) h += `<p class="empty-note">${esc(t('noExp'))}</p>`;
    else {
      const list = tr.expenses.slice().reverse().sort((a, b) => (a.day || '') < (b.day || '') ? 1 : (a.day || '') > (b.day || '') ? -1 : 0);
      h += `<ul class="trip-items exp-items">${list.map((e) => {
        const v = toHome(tr, e);
        const when = e.day ? LO.shortDate(e.day) : days.length ? t('beforeTrip') : '';
        const sub = [t('cats')[e.cat], when, e.bid ? t('fromBooking') : '', tr.people.length > 1 ? `${e.paidBy} → ${t('list')(e.split.length ? e.split : tr.people)}` : ''].filter(Boolean).join(' · ');
        return `<li data-eitem="${esc(e.id)}"><div class="ti-body"><b>${esc(e.name)}</b><p>${esc(sub)}</p></div>`
          + `<div class="exp-amts"><b>${esc(fmtMoney(e.amount, e.cur))}</b>${e.cur !== m.home ? `<small>${v == null ? esc(t('noRate')) : `≈ ${esc(fmtMoney(v, m.home))}`}</small>` : ''}</div>`
          + editBtn('data-eedit') + `<button type="button" class="icon-btn sm ghost" data-edel aria-label="${esc(tc('delete'))}">${LO.icon.x}</button></li>`;
      }).join('')}</ul>`;
    }
    h += '</section>';

    // by category and settle up
    if (tr.expenses.length) {
      const byCat = CATS.map((c) => [c, tr.expenses.filter((e) => e.cat === c).reduce((a, e) => a + (toHome(tr, e) || 0), 0)]).filter(([, v]) => v > 0);
      if (byCat.length) {
        h += `<section class="card trip-sec"><header class="card-head"><h2>${esc(t('byCat'))}</h2></header><ul class="cat-bars">${byCat.map(([c, v]) => `<li><span>${esc(t('cats')[c])}</span>`
          + `<span class="progress sm"><span style="width:${spent ? v / spent * 100 : 0}%"></span></span><b>${esc(fmtMoney(v, m.home))}</b></li>`).join('')}</ul></section>`;
      }
      if (tr.people.length > 1) {
        const moves = settleUp(tr);
        h += `<section class="card trip-sec"><header class="card-head"><h2>${esc(t('settle'))}</h2></header>`
          + (moves.length ? `<ul class="settle">${moves.map(([a, b, v]) => `<li>${esc(t('owes')(a, b, fmtMoney(v, m.home)))}</li>`).join('')}</ul>` : `<p class="empty-note">${esc(t('even'))}</p>`)
          + '</section>';
      }
    }
    return h;
  }

  // Keep the expense made from a booking's price in step with the booking.
  // Who paid, the split and the day stay as the user set them on the expense.
  function syncBookingExpense(tr, b) {
    const e = tr.expenses.find((x) => x.bid === b.id);
    if (!(b.price > 0)) { if (e) tr.expenses = tr.expenses.filter((x) => x !== e); return; }
    const fields = { name: b.title, amount: b.price, cur: b.pcur || tr.money.home, cat: BOOK_CAT[b.kind] };
    if (e) {
      if (fields.cur !== e.cur) { e.rate = 0; e.rateTo = ''; }
      Object.assign(e, fields);
    } else {
      tr.expenses.push(Object.assign({ id: uid(), bid: b.id, day: '', rate: 0, rateTo: '', paidBy: tr.people[0], split: tr.people.slice() }, fields));
    }
  }

  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-mset]')) { openMoney(); return; }
    const ee = e.target.closest('[data-eedit]');
    if (ee) { openExpense(ee.closest('[data-eitem]').dataset.eitem); return; }
    const edel = e.target.closest('[data-edel]');
    if (edel) {
      const eid = edel.closest('[data-eitem]').dataset.eitem;
      LO.mutate(T, (s) => removeExpense(curTrip(s), eid), tc('deleted'));
    }
  });

  view.addEventListener('submit', (e) => {
    const f = e.target;
    if (!f.matches('[data-eadd]')) return;
    e.preventDefault();
    const name = $('input[name="ename"]', f).value.trim();
    const amount = num($('input[name="eamt"]', f).value);
    if (!name) { $('input[name="ename"]', f).focus(); return; }
    if (!(amount > 0)) { LO.toast(t('errAmount')); return; }
    const g = (n) => { const el = f.querySelector(`[name="${n}"]`); return el ? el.value : ''; };
    const split = f.querySelector('input[name="esplit"]') ? LO.checkedVals(f, 'esplit') : [];
    LO.mutate(T, (s) => {
      const tr = curTrip(s);
      tr.expenses.push({ id: uid(), name, amount, cur: g('ecur'), cat: g('ecat') || 'other', day: g('eday'), paidBy: g('epaid') || tr.people[0], split: split.length ? split : tr.people.slice() });
    }, tc('added'));
    const i = $('[data-eadd] input[name="ename"]', view);
    if (i) i.focus();
  });

  Object.assign(K, { moneyHTML, fmtMoney, syncBookingExpense });
})();
