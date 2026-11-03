/*
 * Travel calculations with no page or storage behind them, so tests can run them
 * on their own (see tests/): currency conversion, settling up, the daily budget,
 * packing groups, moving a trip's dates and reordering lists.
 * Loads before travel.js; exposed as LO.tripCalc.
 */
(() => {
  'use strict';
  const LO = window.LO;

  // Days from one YYYY-MM-DD key to another.
  const dayDiff = (a, b) => {
    const [y1, m1, d1] = a.split('-').map(Number);
    const [y2, m2, d2] = b.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
  };

  // Value of an expense in the home currency, or null when no rate is set for it.
  // Expenses in a currency the trip no longer uses keep the rate they were frozen at.
  function toHome(tr, e) {
    if (e.cur === tr.money.home) return e.amount;
    if (e.cur === tr.money.local && tr.money.rate > 0) return e.amount * tr.money.rate;
    if (e.rate > 0 && e.rateTo === tr.money.home) return e.amount * e.rate;
    return null;
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
  // Returns [from, to, amount in the home currency] moves.
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

  // What the rest of the budget allows per day, or null when there is nothing to show
  // (no budget or dates, over budget, or the trip is over). Before the trip it is spread
  // over every day; during it, what is left after other days' spending is spread over
  // today and the days still ahead, and todayLeft is what today can still take.
  function dailyBudget(tr, spent, today) {
    const m = tr.money;
    if (!m.budget || !tr.start || spent >= m.budget) return null;
    const end = tr.end || tr.start;
    if (today > end) return null;
    if (today < tr.start) {
      const n = dayDiff(tr.start, end) + 1;
      return { n, perDay: (m.budget - spent) / n, todayLeft: null };
    }
    const n = dayDiff(today, end) + 1;
    const spentToday = tr.expenses.filter((e) => e.day === today).reduce((a, e) => a + (toHome(tr, e) || 0), 0);
    const perDay = (m.budget - (spent - spentToday)) / n;
    return { n, perDay, todayLeft: perDay - spentToday };
  }

  // Guess a packing item's group from its name, in Chinese or English. First match wins
  // (clothes before toiletries, so 换洗衣物 is clothes even though it has 洗).
  const GUESS = [
    ['docs', /护照|身份证|签证|行程单|证件|名片|驾照|机票|车票|门票|交通卡|入境|passport|\bid\b|visa|itinerary|business card|licen|ticket|transit card|arrival card/i],
    ['tech', /充电|插头|转换|相机|电脑|耳机|手机|数据线|头灯|自拍|charger|power bank|adapter|camera|laptop|headphone|phone|cable|headlamp/i],
    ['health', /药|急救|防蚊|驱蚊|暖宝宝|口罩|创可贴|medicine|first aid|bug spray|face mask|hand warmer|plaster/i],
    ['clothes', /衣|裤|裙|鞋|帽|围巾|手套|袜|外套|泳|墨镜|正装|穿搭|羽绒|swim|shirt|trouser|pants|\bdress|shoe|boot|\bhat|scarf|glove|sock|jacket|thermal|outfit|sandal|sunglass|clothes|layer/i],
    ['wash', /洗|牙|防晒|保湿|润唇|护肤|毛巾|沙滩巾|晒后|化妆|toiletr|sunscreen|moistur|lip balm|towel|tooth|shampoo|after-sun|makeup/i]
  ];
  const packGuess = (name) => (GUESS.find(([, re]) => re.test(name)) || ['other'])[0];

  // Days to move the itinerary by when a trip's dates change: moving the trip (both
  // ends change) moves the itinerary with it; changing only the start just makes the
  // trip longer or shorter, so nothing moves. A trip with no end date is one day long.
  function planShift(old, next) {
    if (!old.start || !next.start || next.start === old.start) return 0;
    if ((next.end || next.start) === (old.end || old.start)) return 0;
    return dayDiff(old.start, next.start);
  }

  // When the list of travel mates is edited, who in the old list is who in the new one.
  // Names in both lists stay; if as many names went as came, they are renames, in order
  // ("我, 小王" → "我, Alex" means 小王 is now Alex). Anyone else gone maps to nobody.
  function renamePeople(before, after) {
    const gone = before.filter((p) => !after.includes(p));
    const added = after.filter((p) => !before.includes(p));
    const map = {};
    before.forEach((p) => { if (after.includes(p)) map[p] = p; });
    if (gone.length === added.length) gone.forEach((p, i) => { map[p] = added[i]; });
    return map;
  }

  // Put the items with these ids into this order, using only the places they already
  // hold in the list; everything else stays where it is. Changes arr in place.
  function reorder(arr, ids) {
    const slots = [];
    arr.forEach((x, i) => { if (ids.includes(x.id)) slots.push(i); });
    const moved = ids.map((id) => arr.find((x) => x.id === id)).filter(Boolean);
    if (moved.length !== slots.length) return arr;
    slots.forEach((slot, i) => { arr[slot] = moved[i]; });
    return arr;
  }

  LO.tripCalc = { dayDiff, toHome, freezeRates, settleUp, dailyBudget, packGuess, planShift, renamePeople, reorder };
})();
