/*
 * Tests for js/travel-calc.js: run them by opening tests/index.html, or with
 * `node tests/run.js` from the project folder.
 */
(() => {
  'use strict';
  const { dayDiff, toHome, freezeRates, settleUp, dailyBudget, packGuess, planShift, renamePeople, reorder } = window.LO.tripCalc;

  // A trip with just what the calculations read; override any part.
  const trip = (o = {}) => Object.assign({
    start: '2026-11-03', end: '2026-11-06', people: ['Me'],
    money: { home: 'USD', local: 'JPY', rate: 0.0067, budget: 0 }, expenses: []
  }, o);
  const exp = (o) => Object.assign({ day: '', amount: 0, cur: 'USD', rate: 0, rateTo: '', paidBy: 'Me', split: [] }, o);

  /* ---------------- dates ---------------- */
  test('dayDiff counts days across months, leap days and clock changes', () => {
    eq(dayDiff('2026-11-03', '2026-11-03'), 0);
    eq(dayDiff('2026-10-30', '2026-11-02'), 3);
    eq(dayDiff('2028-02-28', '2028-03-01'), 2, 'leap year');
    eq(dayDiff('2026-03-08', '2026-03-09'), 1, 'US clocks go forward');
    eq(dayDiff('2026-11-06', '2026-11-03'), -3);
  });

  /* ---------------- currency ---------------- */
  test('toHome: home currency counts as is', () => {
    eq(toHome(trip(), exp({ amount: 600, cur: 'USD' })), 600);
  });

  test('toHome: local currency uses the trip rate', () => {
    near(toHome(trip(), exp({ amount: 1500, cur: 'JPY' })), 10.05);
  });

  test('toHome: local currency without a rate is not counted', () => {
    eq(toHome(trip({ money: { home: 'USD', local: 'JPY', rate: 0 } }), exp({ amount: 1500, cur: 'JPY' })), null);
  });

  test('toHome: an old currency uses its frozen rate, but only for the same home currency', () => {
    const e = exp({ amount: 1500, cur: 'JPY', rate: 0.0067, rateTo: 'USD' });
    near(toHome(trip({ money: { home: 'USD', local: 'KRW', rate: 0.00072 } }), e), 10.05);
    eq(toHome(trip({ money: { home: 'EUR', local: 'KRW', rate: 0.0006 } }), e), null);
  });

  test('freezeRates: switching the local currency keeps old spending in the totals', () => {
    const tr = trip({ expenses: [exp({ amount: 1500, cur: 'JPY' })] });
    const next = { home: 'USD', local: 'KRW', rate: 0.00072 };
    freezeRates(tr, next);
    tr.money = next;
    near(toHome(tr, tr.expenses[0]), 10.05);
  });

  test('freezeRates: making the old local currency home converts the old home spending', () => {
    // 1 JPY = 0.005 USD, so 1 USD = 200 JPY
    const tr = trip({ money: { home: 'USD', local: 'JPY', rate: 0.005 }, expenses: [exp({ amount: 10, cur: 'USD' }), exp({ amount: 1000, cur: 'JPY' })] });
    const next = { home: 'JPY', local: 'JPY', rate: 0 };
    freezeRates(tr, next);
    tr.money = next;
    near(toHome(tr, tr.expenses[0]), 2000, 'USD spending in yen');
    near(toHome(tr, tr.expenses[1]), 1000, 'yen spending stays as is');
  });

  test('freezeRates: an unrelated new home currency leaves old spending uncounted', () => {
    const tr = trip({ expenses: [exp({ amount: 10, cur: 'USD' })] });
    const next = { home: 'EUR', local: 'JPY', rate: 0.006 };
    freezeRates(tr, next);
    tr.money = next;
    eq(toHome(tr, tr.expenses[0]), null);
  });

  test('freezeRates: spending that had no rate stays without one', () => {
    const tr = trip({ money: { home: 'USD', local: 'JPY', rate: 0 }, expenses: [exp({ amount: 1500, cur: 'JPY' })] });
    freezeRates(tr, { home: 'USD', local: 'KRW', rate: 0.00072 });
    eq(tr.expenses[0].rate, 0);
  });

  /* ---------------- settling up ---------------- */
  test('settleUp: one person paid for two', () => {
    const tr = trip({ people: ['Me', 'Alex'], expenses: [exp({ amount: 100, paidBy: 'Me', split: ['Me', 'Alex'] })] });
    const moves = settleUp(tr);
    eq(moves.length, 1);
    eq(moves[0].slice(0, 2), ['Alex', 'Me']);
    near(moves[0][2], 50);
  });

  test('settleUp: three people, mixed payers, everyone ends up even', () => {
    const people = ['A', 'B', 'C'];
    const tr = trip({
      people,
      expenses: [
        exp({ amount: 90, paidBy: 'A', split: people }),
        exp({ amount: 30, paidBy: 'B', split: ['B', 'C'] }),
        exp({ amount: 3000, cur: 'JPY', paidBy: 'C', split: people })
      ]
    });
    const moves = settleUp(tr);
    // replay the moves on top of what each person paid minus their share
    const bal = { A: 90 - 30 - 6.7, B: 30 - 30 - 15 - 6.7, C: 20.1 - 30 - 15 - 6.7 };
    moves.forEach(([from, to, m]) => { bal[from] += m; bal[to] -= m; });
    Object.entries(bal).forEach(([p, v]) => near(v, 0, `${p} is even`));
    ok(moves.length <= 2, 'at most people − 1 moves');
  });

  test('settleUp: an empty split means everyone', () => {
    const tr = trip({ people: ['Me', 'Alex'], expenses: [exp({ amount: 40, paidBy: 'Alex', split: [] })] });
    eq(settleUp(tr).map(([a, b]) => [a, b]), [['Me', 'Alex']]);
    near(settleUp(tr)[0][2], 20);
  });

  test('settleUp: spending without a rate is left out', () => {
    const tr = trip({ people: ['Me', 'Alex'], money: { home: 'USD', local: 'JPY', rate: 0 }, expenses: [exp({ amount: 1500, cur: 'JPY', paidBy: 'Me', split: ['Me', 'Alex'] })] });
    eq(settleUp(tr), []);
  });

  test('settleUp: already even gives no moves', () => {
    const tr = trip({ people: ['Me', 'Alex'], expenses: [exp({ amount: 50, paidBy: 'Me', split: ['Me', 'Alex'] }), exp({ amount: 50, paidBy: 'Alex', split: ['Me', 'Alex'] })] });
    eq(settleUp(tr), []);
  });

  /* ---------------- daily budget ---------------- */
  const budgetTrip = (o) => trip(Object.assign({ start: '2026-11-02', end: '2026-11-05', money: { home: 'USD', local: 'USD', rate: 0, budget: 1000 } }, o));

  test('dailyBudget: before the trip, the rest is spread over every day', () => {
    const d = dailyBudget(budgetTrip(), 200, '2026-10-30');
    eq(d.n, 4);
    near(d.perDay, 200);
    eq(d.todayLeft, null);
  });

  test("dailyBudget: during the trip, today's spending comes out of today's share", () => {
    const tr = budgetTrip({ expenses: [exp({ amount: 400, day: '' }), exp({ amount: 100, day: '2026-11-02' }), exp({ amount: 30, day: '2026-11-03' })] });
    const d = dailyBudget(tr, 530, '2026-11-03');
    eq(d.n, 3);
    near(d.perDay, 166.67);
    near(d.todayLeft, 136.67);
  });

  test('dailyBudget: today can go over its share', () => {
    const tr = budgetTrip({ expenses: [exp({ amount: 300, day: '2026-11-05' })] });
    const d = dailyBudget(tr, 300, '2026-11-05');
    near(d.perDay, 1000);
    near(d.todayLeft, 700);
    const tr2 = budgetTrip({ expenses: [exp({ amount: 800, day: '2026-11-02' }), exp({ amount: 150, day: '2026-11-04' })] });
    near(dailyBudget(tr2, 950, '2026-11-04').todayLeft, -50, 'over by 50');
  });

  test('dailyBudget: nothing to show without a budget, over budget, or after the trip', () => {
    eq(dailyBudget(budgetTrip({ money: { home: 'USD', local: 'USD', rate: 0, budget: 0 } }), 0, '2026-11-03'), null);
    eq(dailyBudget(budgetTrip(), 1000, '2026-11-03'), null);
    eq(dailyBudget(budgetTrip(), 10, '2026-11-06'), null);
    eq(dailyBudget(budgetTrip({ start: '' }), 10, '2026-11-03'), null);
  });

  test('dailyBudget: a trip with no end date is one day', () => {
    eq(dailyBudget(budgetTrip({ end: '' }), 100, '2026-11-01').n, 1);
  });

  /* ---------------- packing groups ---------------- */
  test('packGuess: the packing templates land in sensible groups (Chinese and English)', () => {
    const cases = [
      ['护照或身份证', 'Passport or ID', 'docs'], ['签证和行程单', 'Visa and itinerary', 'docs'], ['交通卡或交通 App', 'Transit card or app', 'docs'],
      ['手机充电器', 'Phone charger', 'tech'], ['充电宝', 'Power bank', 'tech'], ['转换插头', 'Plug adapter', 'tech'], ['降噪耳机', 'Noise-cancelling headphones', 'tech'],
      ['常用药', 'Medicine', 'health'], ['急救包', 'First aid kit', 'health'], ['防蚊液', 'Bug spray', 'health'],
      ['换洗衣物', 'Clothes', 'clothes'], ['泳衣', 'Swimsuit', 'clothes'], ['遮阳帽', 'Sun hat', 'clothes'], ['登山鞋', 'Hiking boots', 'clothes'], ['羽绒服', 'Down jacket', 'clothes'],
      ['洗漱用品', 'Toiletries', 'wash'], ['防晒霜', 'Sunscreen', 'wash'], ['润唇膏', 'Lip balm', 'wash'], ['沙滩巾', 'Beach towel', 'wash'],
      ['雨伞', 'Umbrella', 'other'], ['颈枕', 'Neck pillow', 'other'], ['眼罩和耳塞', 'Eye mask and earplugs', 'other']
    ];
    cases.forEach(([zh, en, grp]) => { eq(packGuess(zh), grp, zh); eq(packGuess(en), grp, en); });
  });

  test('packGuess: short English words only match whole words', () => {
    eq(packGuess('What to read'), 'other', '"hat" inside "What"');
    eq(packGuess('Address book'), 'other', '"dress" inside "Address"');
    eq(packGuess('Earplugs'), 'other');
    eq(packGuess('ID card'), 'docs');
  });

  /* ---------------- moving dates ---------------- */
  test('planShift: moving the whole trip moves the itinerary', () => {
    eq(planShift({ start: '2026-11-03', end: '2026-11-06' }, { start: '2026-11-10', end: '2026-11-13' }), 7);
    eq(planShift({ start: '2026-11-03', end: '2026-11-06' }, { start: '2026-11-01', end: '2026-11-05' }), -2);
  });

  test('planShift: a one-day trip with no end date moves with its start', () => {
    eq(planShift({ start: '2026-10-01', end: '' }, { start: '2026-12-01', end: '' }), 61);
    eq(planShift({ start: '2026-10-01', end: '' }, { start: '2026-10-01', end: '2026-10-03' }), 0, 'only the end added');
  });

  test('planShift: changing one end, or a trip without dates, moves nothing', () => {
    eq(planShift({ start: '2026-11-03', end: '2026-11-06' }, { start: '2026-11-02', end: '2026-11-06' }), 0, 'only the start');
    eq(planShift({ start: '2026-11-03', end: '2026-11-06' }, { start: '2026-11-03', end: '2026-11-08' }), 0, 'only the end');
    eq(planShift({ start: '', end: '' }, { start: '2026-11-03', end: '2026-11-06' }), 0, 'no dates before');
  });

  /* ---------------- travel mates ---------------- */
  test('renamePeople: renaming someone keeps what they paid and shared', () => {
    eq(renamePeople(['我', '小王'], ['我', 'Alex']), { 我: '我', 小王: 'Alex' });
    eq(renamePeople(['A', 'B', 'C'], ['A', 'Bea', 'Cal']), { A: 'A', B: 'Bea', C: 'Cal' }, 'two renames, in order');
  });

  test('renamePeople: reordering, adding or removing people is not a rename', () => {
    eq(renamePeople(['我', '小王'], ['小王', '我']), { 我: '我', 小王: '小王' }, 'reordered');
    eq(renamePeople(['我'], ['我', '小王']), { 我: '我' }, 'someone added');
    eq(renamePeople(['我', '小王', 'Alex'], ['我', 'Alex']), { 我: '我', Alex: 'Alex' }, 'someone removed');
  });

  /* ---------------- reordering ---------------- */
  const ids = (arr) => arr.map((x) => x.id).join('');

  test('reorder: only the listed items swap places', () => {
    // a packing list where a, c, e are one group and b, d another
    const arr = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
    reorder(arr, ['e', 'a', 'c']);
    eq(ids(arr), 'ebadc');
  });

  test('reorder: an unknown id leaves the list alone', () => {
    const arr = ['a', 'b', 'c'].map((id) => ({ id }));
    reorder(arr, ['c', 'x']);
    eq(ids(arr), 'abc');
  });
})();
