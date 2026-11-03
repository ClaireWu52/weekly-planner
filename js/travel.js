/*
 * Travel guides: one page per trip with a day-by-day itinerary, transport and
 * bookings, places to see, where to stay, food, photo spots, a packing list
 * (with templates) and a budget that splits costs between travel mates.
 * Today's plans also show on the Today page (and the trip a few days before),
 * each day shows the weather forecast, and a trip can be shared as text or copied.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc, uid } = LO;
  const SECTIONS = ['spots', 'stay', 'food', 'photo', 'pack'];
  const TABS = ['days', 'book'].concat(SECTIONS, ['money']);
  const KINDS = ['flight', 'train', 'bus', 'car', 'hotel', 'other'];
  const KIND_ICON = { flight: '✈️', train: '🚄', bus: '🚌', car: '🚗', hotel: '🏨', other: '📌' };
  const CATS = ['food', 'transport', 'stay', 'tickets', 'shopping', 'other'];
  // Sections whose "done" means the same as finishing it on the itinerary ("booked" for a stay does not).
  const SYNC_SECS = ['spots', 'food', 'photo'];
  const BOOK_CAT = { flight: 'transport', train: 'transport', bus: 'transport', car: 'transport', hotel: 'stay', other: 'other' };
  const PACK_KITS = ['beach', 'city', 'cold', 'hike', 'flight', 'work'];
  const CURRENCIES = ['USD', 'CNY', 'JPY', 'KRW', 'HKD', 'TWD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'THB', 'MYR', 'VND', 'IDR', 'PHP', 'MXN', 'CHF', 'NZD', 'MOP'];
  const RATE_API = 'https://open.er-api.com/v6/latest/';
  const WX_GEO = 'https://geocoding-api.open-meteo.com/v1/search';
  const WX_API = 'https://api.open-meteo.com/v1/forecast';
  const WX_KEY = 'planner:travel:wx';
  const WX_DAYS = 16;
  const WX_FRESH = 3 * 3600e3;
  // Open-Meteo weather codes, grouped
  const WX_KINDS = [[[0], 'clear', '☀️'], [[1, 2], 'cloudy', '🌤️'], [[3], 'overcast', '☁️'], [[45, 48], 'fog', '🌫️'],
    [[51, 53, 55, 56, 57], 'drizzle', '🌦️'], [[61, 63, 65, 66, 67, 80, 81, 82], 'rain', '🌧️'], [[71, 73, 75, 77, 85, 86], 'snow', '🌨️'], [[95, 96, 99], 'storm', '⛈️']];
  const MAX_DAYS = 60;
  const SOON_DAYS = 7;

  LO.strings('travel', {
    zh: {
      title: '旅游攻略', sub: '每个目的地一页：每日行程、交通预订、景点、住宿、美食、行李和花费。',
      newTrip: '新建行程', editTrip: '编辑行程', dest: '目的地', destPh: '比如：京都', start: '出发', end: '回来', note: '备注', notePh: '预算、交通、注意事项…',
      people: '同行的人', peoplePh: '用逗号分开，第一个是你自己，比如：我, 小王', me: '我',
      sections: { days: '每日行程', book: '交通预订', spots: '景点', stay: '住宿', food: '美食', photo: '出片', pack: '行李', money: '花费' },
      addPh: { spots: '景点名称', stay: '酒店或民宿', food: '餐厅或必吃的东西', photo: '机位、穿搭或最佳时间', pack: '要带的东西' },
      itemNotePh: '备注（可不填）', linkPh: '链接（可不填）', add: '添加', back: '全部行程',
      countdown: (n) => (n > 0 ? `还有 ${n} 天` : n === 0 ? '就是今天' : '已经结束'), during: '正在旅行中',
      done: { spots: '去过了', stay: '订好了', food: '吃过了', photo: '拍到了', pack: '带了' },
      progress: (a, b) => `${a}/${b}`, empty: '还没有行程。写下一个想去的地方吧。', emptySec: '这里还空着。',
      map: '地图', xhs: '小红书搜攻略', google: 'Google 搜攻略', errDest: '请填写目的地。', past: '去过的地方',
      packSeed: ['护照或身份证', '手机充电器', '充电宝', '转换插头', '常用药', '换洗衣物', '洗漱用品', '雨伞', '相机'],
      dayLabel: (n, k) => `第 ${n} 天 · ${LO.shortDate(k)} ${LO.t('common.days')[LO.wd(LO.parseKey(k))]}`,
      offDay: (k) => `${LO.shortDate(k)} ${LO.t('common.days')[LO.wd(LO.parseKey(k))]}（不在行程日期内）`,
      planPh: '去哪里、做什么', planNotePh: '备注（可不填）', time: '时间',
      noDates: '先点「编辑」填好出发和回来的日期，就能按天安排行程。', emptyDay: '这一天还没有安排。',
      planDone: '完成', inPlan: (n) => `第 ${n} 天`, planCount: (n) => `行程 ${n}`,
      todayCard: (d, n) => `${d} · 第 ${n} 天`, todayEmpty: '今天还没有安排，去攻略里加一些吧。', openTrip: '打开攻略',
      // bookings
      kinds: { flight: '航班', train: '火车', bus: '大巴', car: '租车', hotel: '住宿', other: '其他' },
      addBooking: '添加交通或预订', editBooking: '编辑预订', kind: '类型', bTitle: '名称',
      bTitlePh: { flight: '比如：UA 875', train: '比如：新干线 Nozomi 21', bus: '班次或公司', car: '租车公司', hotel: '酒店名称', other: '名称' },
      from: '出发地', to: '目的地', fromHotel: '入住', toHotel: '退房', depart: '出发', arrive: '到达',
      date: '日期', conf: '确认号 / 订单号', confPh: '机场或前台要报的号码', address: '地址', bNote: '备注', bNotePh: '座位、行李额度、航站楼…',
      copy: '复制', copied: '已复制', noBookings: '机票、火车票、酒店的确认号和时间都放在这里，到了机场一打开就能找到。',
      checkIn: '入住', checkOut: '退房', errTitle: '请填写名称。',
      // packing
      kitPick: '按类型添加…', kits: { beach: '海边', city: '城市', cold: '寒冷天气', hike: '徒步户外', flight: '长途飞行', work: '出差' },
      kitItems: {
        beach: ['泳衣', '防晒霜', '墨镜', '遮阳帽', '拖鞋', '沙滩巾', '防水手机袋', '晒后修复'],
        city: ['舒服的步行鞋', '小背包', '交通卡或交通 App', '拍照穿搭', '折叠伞', '充电宝'],
        cold: ['羽绒服', '保暖内衣', '帽子', '围巾', '手套', '暖宝宝', '润唇膏', '保湿霜', '防滑鞋'],
        hike: ['登山鞋', '速干衣', '头灯', '水壶', '能量零食', '急救包', '防蚊液', '雨衣'],
        flight: ['颈枕', '眼罩和耳塞', '降噪耳机', '飞机上穿的外套', '签证和行程单', '笔（填入境卡）'],
        work: ['正装', '电脑和充电器', '名片', '会议资料']
      },
      copyFrom: '从其他行程复制…', packAdded: (n) => (n ? `已添加 ${n} 件` : '都已经在清单里了'),
      // money
      budget: '预算', spent: '已花', left: '还剩', over: '超出', noBudget: '未设置预算',
      moneySet: '预算和汇率', homeCur: '记账用的货币', localCur: '当地货币', rate: (l, h) => `1 ${l} = ? ${h}`,
      getRate: '自动获取汇率', rateOk: (d) => `已更新汇率（${d}）`, rateFail: '获取汇率失败，可以手动填写。', rateAt: (d) => `汇率更新于 ${d}`,
      expName: '买了什么', amount: '金额', cats: { transport: '交通', stay: '住宿', food: '餐饮', tickets: '门票', shopping: '购物', other: '其他' },
      paidBy: '谁付的', splitWith: '谁一起分', noExp: '还没有记账。', byCat: '按类别', settle: '怎么结清',
      owes: (a, b, m) => `${a} 给 ${b} ${m}`, even: '大家已经两清了。', noRate: '汇率未设置，这笔没算进总数',
      errAmount: '请填写金额。', errRate: '请填写汇率。', needRate: '先在「预算和汇率」里填好汇率，当地货币的花费才能算进总数。',
      // sharing
      share: '分享', shareTitle: '分享这个行程', shareHint: '复制下面的文字，发给一起旅行的朋友。',
      shareConf: '包含确认号和地址', shareSys: '用系统分享', with: '同行', daysN: (n) => `${n} 天`,
      shareBook: '交通和预订', sharePlan: '每日行程', shareStay: '住宿', shareFood: '想吃的', shareSpots: '想去的',
      // punctuation and editing
      list: (a) => a.join('、'), colon: '：', paren: (s) => `（${s}）`, sep: '，',
      beforeTrip: '出发前', editItem: '编辑', editPlan: '编辑行程安排', editExp: '编辑花费', day: '哪一天', name: '名称',
      wx: { clear: '晴', cloudy: '多云', overcast: '阴', fog: '雾', drizzle: '小雨', rain: '雨', snow: '雪', storm: '雷雨' }, wxRain: (p) => `降水 ${p}%`, wxSrc: '天气来自 Open-Meteo', wxMiss: (d) => `查不到「${d}」的天气。在目的地后面加上英文名试试，比如「首尔 Seoul」。`,
      dupTrip: '复制这个行程', dupHint: '复制景点、每日行程、行李清单和预算，不复制预订和花费。', copySuffix: ' 副本',
      shiftHint: '出发和回来的日期一起改时，每日行程会跟着整体挪过去。',
      soonCard: (d, n) => `${d} · 还有 ${n} 天出发`, soonPack: (a, b) => `行李还有 ${a} 件没带（共 ${b} 件）`, soonPacked: '行李都带齐了', soonNoBook: '还没有添加交通和住宿。',
      route: '路线', perDay: (m, n) => `每天约 ${m}（${n} 天）`, todayLeft: (m) => `今天还能花 ${m}`, todayOver: (m) => `今天超了 ${m}`,
      price: '价格（可不填）', curName: '币种', priceHint: '填了价格会自动记进「花费」，算在出发前。', fromBooking: '来自预订',
      packReset: '回程清点', packResetDone: '已全部改回没带'
    },
    en: {
      title: 'Travel', sub: 'One page per trip: itinerary, bookings, places, stay, food, packing and spending.',
      newTrip: 'New trip', editTrip: 'Edit trip', dest: 'Destination', destPh: 'e.g. Kyoto', start: 'From', end: 'To', note: 'Notes', notePh: 'Budget, getting there, things to remember…',
      people: 'Travelling with', peoplePh: 'Comma separated, you first, e.g. Me, Alex', me: 'Me',
      sections: { days: 'Itinerary', book: 'Bookings', spots: 'Places', stay: 'Stay', food: 'Food', photo: 'Photos', pack: 'Packing', money: 'Money' },
      addPh: { spots: 'Place to see', stay: 'Hotel or rental', food: 'Restaurant or dish', photo: 'Spot, outfit or best time', pack: 'Thing to bring' },
      itemNotePh: 'Note (optional)', linkPh: 'Link (optional)', add: 'Add', back: 'All trips',
      countdown: (n) => (n > 0 ? `${n} days to go` : n === 0 ? 'Today' : 'Done'), during: 'On the trip',
      done: { spots: 'Visited', stay: 'Booked', food: 'Tried', photo: 'Got it', pack: 'Packed' },
      progress: (a, b) => `${a}/${b}`, empty: 'No trips yet. Write down a place you want to go.', emptySec: 'Nothing here yet.',
      map: 'Map', xhs: 'Search Xiaohongshu', google: 'Search Google', errDest: 'Add a destination.', past: 'Past trips',
      packSeed: ['Passport or ID', 'Phone charger', 'Power bank', 'Plug adapter', 'Medicine', 'Clothes', 'Toiletries', 'Umbrella', 'Camera'],
      dayLabel: (n, k) => `Day ${n} · ${LO.t('common.days')[LO.wd(LO.parseKey(k))]} ${LO.shortDate(k)}`,
      offDay: (k) => `${LO.t('common.days')[LO.wd(LO.parseKey(k))]} ${LO.shortDate(k)} (outside the trip dates)`,
      planPh: 'Where to go, what to do', planNotePh: 'Note (optional)', time: 'Time',
      noDates: 'Tap Edit and set the trip dates to plan it day by day.', emptyDay: 'Nothing planned for this day yet.',
      planDone: 'Done', inPlan: (n) => `Day ${n}`, planCount: (n) => `Itinerary ${n}`,
      todayCard: (d, n) => `${d} · Day ${n}`, todayEmpty: 'Nothing planned for today yet. Add some in the trip guide.', openTrip: 'Open trip',
      kinds: { flight: 'Flight', train: 'Train', bus: 'Bus', car: 'Car rental', hotel: 'Stay', other: 'Other' },
      addBooking: 'Add transport or booking', editBooking: 'Edit booking', kind: 'Type', bTitle: 'Name',
      bTitlePh: { flight: 'e.g. UA 875', train: 'e.g. Shinkansen Nozomi 21', bus: 'Route or company', car: 'Rental company', hotel: 'Hotel name', other: 'Name' },
      from: 'From', to: 'To', fromHotel: 'Check-in', toHotel: 'Check-out', depart: 'Departs', arrive: 'Arrives',
      date: 'Date', conf: 'Confirmation no.', confPh: 'The code the desk will ask for', address: 'Address', bNote: 'Notes', bNotePh: 'Seat, baggage, terminal…',
      copy: 'Copy', copied: 'Copied', noBookings: 'Keep flight, train and hotel times and confirmation numbers here so they are one tap away at the airport.',
      checkIn: 'Check-in', checkOut: 'Check-out', errTitle: 'Add a name.',
      kitPick: 'Add by trip type…', kits: { beach: 'Beach', city: 'City', cold: 'Cold weather', hike: 'Hiking', flight: 'Long flight', work: 'Work trip' },
      kitItems: {
        beach: ['Swimsuit', 'Sunscreen', 'Sunglasses', 'Sun hat', 'Sandals', 'Beach towel', 'Waterproof phone pouch', 'After-sun'],
        city: ['Comfy walking shoes', 'Day bag', 'Transit card or app', 'Photo outfits', 'Compact umbrella', 'Power bank'],
        cold: ['Down jacket', 'Thermals', 'Hat', 'Scarf', 'Gloves', 'Hand warmers', 'Lip balm', 'Moisturiser', 'Non-slip shoes'],
        hike: ['Hiking boots', 'Quick-dry clothes', 'Headlamp', 'Water bottle', 'Snacks', 'First aid kit', 'Bug spray', 'Rain jacket'],
        flight: ['Neck pillow', 'Eye mask and earplugs', 'Noise-cancelling headphones', 'Warm layer for the plane', 'Visa and itinerary', 'Pen for arrival card'],
        work: ['Smart outfit', 'Laptop and charger', 'Business cards', 'Meeting notes']
      },
      copyFrom: 'Copy from another trip…', packAdded: (n) => (n ? `Added ${n}` : 'Already on the list'),
      budget: 'Budget', spent: 'Spent', left: 'Left', over: 'Over', noBudget: 'No budget set',
      moneySet: 'Budget & rate', homeCur: 'Currency to count in', localCur: 'Local currency', rate: (l, h) => `1 ${l} = ? ${h}`,
      getRate: 'Get current rate', rateOk: (d) => `Rate updated (${d})`, rateFail: "Couldn't get the rate. You can type it in.", rateAt: (d) => `Rate from ${d}`,
      expName: 'What for', amount: 'Amount', cats: { transport: 'Transport', stay: 'Stay', food: 'Food', tickets: 'Tickets', shopping: 'Shopping', other: 'Other' },
      paidBy: 'Paid by', splitWith: 'Split with', noExp: 'No spending logged yet.', byCat: 'By category', settle: 'Settle up',
      owes: (a, b, m) => `${a} pays ${b} ${m}`, even: 'Everyone is square.', noRate: 'No rate set, not counted in totals',
      errAmount: 'Add an amount.', errRate: 'Add the rate.', needRate: 'Set the rate under Budget & rate so local spending counts in the totals.',
      share: 'Share', shareTitle: 'Share this trip', shareHint: 'Copy the text below and send it to your travel mates.',
      shareConf: 'Include confirmation numbers and addresses', shareSys: 'Share…', with: 'With', daysN: (n) => `${n} days`,
      shareBook: 'Transport and bookings', sharePlan: 'Itinerary', shareStay: 'Stay', shareFood: 'Food to try', shareSpots: 'Places to see',
      list: (a) => a.join(', '), colon: ': ', paren: (s) => ` (${s})`, sep: ' · ',
      beforeTrip: 'Before the trip', editItem: 'Edit', editPlan: 'Edit plan', editExp: 'Edit expense', day: 'Day', name: 'Name',
      wx: { clear: 'Clear', cloudy: 'Partly cloudy', overcast: 'Overcast', fog: 'Fog', drizzle: 'Drizzle', rain: 'Rain', snow: 'Snow', storm: 'Thunderstorm' }, wxRain: (p) => `${p}% rain`, wxSrc: 'Weather by Open-Meteo', wxMiss: (d) => `Couldn't find the weather for "${d}". Try adding the English name, e.g. "首尔 Seoul".`,
      dupTrip: 'Copy this trip', dupHint: 'Copies places, itinerary, packing list and budget, but not bookings or spending.', copySuffix: ' (copy)',
      shiftHint: 'Changing both dates moves the itinerary along with the trip.',
      soonCard: (d, n) => `${d} · ${n === 1 ? 'Tomorrow' : `in ${n} days`}`, soonPack: (a, b) => `${a} of ${b} things still to pack`, soonPacked: 'All packed', soonNoBook: 'No transport or stays added yet.',
      route: 'Route', perDay: (m, n) => `About ${m} a day (${n} days)`, todayLeft: (m) => `${m} left for today`, todayOver: (m) => `${m} over today`,
      price: 'Price (optional)', curName: 'Currency', priceHint: 'A price is added to Money as spending before the trip.', fromBooking: 'From bookings',
      packReset: 'Pack to go home', packResetDone: 'All unticked for the trip home'
    }
  });
  const t = LO.ns('travel');
  const tc = LO.ns('common');

  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const isTime = (v) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
  const str = (v) => (typeof v === 'string' ? v : '');
  const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const cur = (v, d) => (typeof v === 'string' && /^[A-Z]{3}$/.test(v) ? v : d);
  const safeUrl = (u) => { const v = str(u).trim(); if (!v) return ''; const full = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`; return /^https?:/i.test(full) ? full : ''; };
  const parsePeople = (s) => Array.from(new Set(String(s).split(/[,，、]/).map((x) => x.trim().slice(0, 20)).filter(Boolean))).slice(0, 12);

  const T = LO.createStore('travel', 'planner:travel:v1', () => ({ v: 1, trips: [] }), (s) => ({
    v: 1,
    trips: (s.trips || []).filter((x) => x && typeof x.dest === 'string').map((x) => {
      const secs = {};
      SECTIONS.forEach((k) => {
        secs[k] = ((x.sections || {})[k] || []).filter((i) => i && typeof i.name === 'string').map((i) => ({
          id: String(i.id || uid()), name: i.name.slice(0, 80), note: str(i.note).slice(0, 300), link: safeUrl(i.link), done: !!i.done
        }));
      });
      const plan = (x.plan || []).filter((i) => i && typeof i.name === 'string' && isKey(i.day)).map((i) => ({
        id: String(i.id || uid()), day: i.day, time: isTime(i.time) ? i.time : '', name: i.name.slice(0, 80),
        note: str(i.note).slice(0, 300), link: safeUrl(i.link), done: !!i.done
      }));
      const people = Array.isArray(x.people) ? x.people.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim().slice(0, 20)) : [];
      if (!people.length) people.push(t('me'));
      const bookings = (x.bookings || []).filter((b) => b && typeof b.title === 'string').map((b) => ({
        id: String(b.id || uid()), kind: KINDS.includes(b.kind) ? b.kind : 'other', title: b.title.slice(0, 80),
        date: isKey(b.date) ? b.date : '', time: isTime(b.time) ? b.time : '', endDate: isKey(b.endDate) ? b.endDate : '', endTime: isTime(b.endTime) ? b.endTime : '',
        from: str(b.from).slice(0, 80), to: str(b.to).slice(0, 80), conf: str(b.conf).slice(0, 60), address: str(b.address).slice(0, 200),
        note: str(b.note).slice(0, 300), link: safeUrl(b.link), price: num(b.price), pcur: cur(b.pcur, '')
      }));
      const m = x.money || {};
      const money = { home: cur(m.home, 'USD'), local: cur(m.local, cur(m.home, 'USD')), rate: num(m.rate), rateAt: str(m.rateAt), budget: num(m.budget) };
      const expenses = (x.expenses || []).filter((e) => e && typeof e.name === 'string' && num(e.amount) > 0).map((e) => ({
        id: String(e.id || uid()), day: isKey(e.day) ? e.day : '', name: e.name.slice(0, 80), amount: num(e.amount), cur: cur(e.cur, money.home),
        rate: num(e.rate), rateTo: cur(e.rateTo, ''), bid: str(e.bid),
        cat: CATS.includes(e.cat) ? e.cat : 'other', paidBy: people.includes(e.paidBy) ? e.paidBy : people[0],
        split: Array.isArray(e.split) ? e.split.filter((p) => people.includes(p)) : people.slice()
      }));
      return {
        id: String(x.id || uid()), dest: x.dest.slice(0, 40), start: isKey(x.start) ? x.start : '', end: isKey(x.end) ? x.end : '', note: str(x.note),
        people, sections: secs, plan, bookings, money, expenses
      };
    })
  }));

  const view = $('#view-travel');
  let openId = null;
  let sec = 'days';

  function status(tr) {
    const today = LO.todayKey();
    if (tr.start && tr.end && tr.start <= today && today <= tr.end) return t('during');
    if (!tr.start) return '';
    return t('countdown')(LO.dayDiff(today, tr.start));
  }
  const dateRange = (tr) => (tr.start ? `${LO.shortDate(tr.start)}${tr.end ? ` – ${LO.shortDate(tr.end)}` : ''}` : '');
  const isPast = (tr) => tr.end && tr.end < LO.todayKey();
  const curTrip = (s) => s.trips.find((x) => x.id === openId);

  // Trip days in order: every date from start to end, plus any other date that still has plans.
  function tripDays(tr) {
    const keys = [];
    if (tr.start) {
      const last = tr.end || tr.start;
      for (let d = LO.parseKey(tr.start), i = 0; LO.keyOf(d) <= last && i < MAX_DAYS; d = LO.addDays(d, 1), i++) keys.push(LO.keyOf(d));
    }
    const extra = tr.plan.map((p) => p.day).filter((k) => !keys.includes(k));
    return keys.concat(Array.from(new Set(extra)).sort()).map((k) => ({ key: k, n: keys.indexOf(k) + 1 }));
  }
  const byTime = (a, b) => (a.time || '99:99') < (b.time || '99:99') ? -1 : (a.time || '99:99') > (b.time || '99:99') ? 1 : 0;
  const byWhen = (a, b) => `${a.date || '9999'}${a.time || '99:99'}` < `${b.date || '9999'}${b.time || '99:99'}` ? -1 : 1;
  const dayNum = (tr, key) => (tr.start ? LO.dayDiff(tr.start, key) + 1 : 0);
  const editBtn = (attr) => `<button type="button" class="icon-btn sm ghost" ${attr} aria-label="${esc(t('editItem'))}">${LO.icon.edit}</button>`;
  // Day choices for an expense: before the trip, then each trip day.
  const expDayOpts = (days, sel) => `<option value=""${sel ? '' : ' selected'}>${esc(t('beforeTrip'))}</option>`
    + days.map((d) => `<option value="${d.key}"${d.key === sel ? ' selected' : ''}>${esc(t('inPlan')(d.n))} · ${esc(LO.shortDate(d.key))}</option>`).join('');

  // Bookings that happen on a given day, as short lines for the itinerary and the Today page.
  function bookingLines(tr, key) {
    const out = [];
    tr.bookings.forEach((b) => {
      const route = b.from || b.to ? ` ${[b.from, b.to].filter(Boolean).join(' → ')}` : '';
      if (b.date === key) out.push({ time: b.time, icon: KIND_ICON[b.kind], name: `${b.kind === 'hotel' ? t('checkIn') + ' ' : ''}${b.title}${b.kind === 'hotel' ? '' : route}`, conf: b.conf });
      if (b.endDate === key && b.endDate !== b.date) out.push({ time: b.endTime, icon: KIND_ICON[b.kind], name: `${b.kind === 'hotel' ? t('checkOut') : t('arrive')} ${b.title}`, conf: '' });
    });
    return out.sort(byTime);
  }

  /* ---------------- weather ---------------- */
  // Forecasts are cached per destination in this browser only; they are refetched after a few hours.
  const wxCache = (() => { try { return LO.readJSON(WX_KEY) || {}; } catch (_) { return {}; } })();
  const wxBusy = new Set();
  const wxFailed = {};
  const wxSave = () => { try { localStorage.setItem(WX_KEY, JSON.stringify(wxCache)); } catch (_) { /* ignore */ } };

  // Does the trip have any day inside the forecast window?
  function wxWanted(tr) {
    if (!tr.start) return false;
    const today = LO.todayKey();
    const last = LO.keyOf(LO.addDays(LO.parseKey(today), WX_DAYS - 1));
    return (tr.end || tr.start) >= today && tr.start <= last;
  }

  // The geocoder only matches names in the language asked for, and knows fewer Chinese names,
  // so try the whole name and then each word (e.g. "首尔 Seoul"), in Chinese and in English.
  async function geocode(dest) {
    const words = dest.split(/[\s,，、·()（）/]+/).filter(Boolean);
    const names = Array.from(new Set([dest].concat(words.length > 1 ? words : [])));
    for (const name of names) {
      for (const language of ['zh', 'en']) {
        const d = await (await fetch(`${WX_GEO}?${new URLSearchParams({ name, count: '1', language })}`)).json();
        const hit = d && d.results && d.results[0];
        if (hit) return { lat: hit.latitude, lon: hit.longitude };
      }
    }
    return null;
  }

  async function loadWeather(tr) {
    const dest = tr.dest.trim();
    const c = wxCache[dest];
    if (wxBusy.has(dest) || (c && Date.now() - c.at < WX_FRESH) || Date.now() - (wxFailed[dest] || 0) < 5 * 60e3) return;
    wxBusy.add(dest);
    try {
      let geo = c && c.lat != null ? { lat: c.lat, lon: c.lon } : null;
      if (!geo) {
        geo = await geocode(dest);
        if (!geo) {
          wxCache[dest] = { at: Date.now(), days: {}, miss: true };
          wxSave();
          if (openId === tr.id && sec === 'days') render();
          return;
        }
      }
      const r = await fetch(`${WX_API}?${new URLSearchParams({
        latitude: geo.lat, longitude: geo.lon, timezone: 'auto', forecast_days: String(WX_DAYS),
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
      })}`);
      const d = (await r.json()).daily;
      if (!d || !Array.isArray(d.time)) throw new Error('no forecast');
      const days = {};
      d.time.forEach((k, i) => { days[k] = { c: d.weather_code[i], hi: d.temperature_2m_max[i], lo: d.temperature_2m_min[i], p: d.precipitation_probability_max[i] }; });
      wxCache[dest] = { lat: geo.lat, lon: geo.lon, at: Date.now(), days };
      wxSave();
      if (openId === tr.id && sec === 'days') render();
    } catch (_) {
      // offline or the service is down: keep what we had and try again in a few minutes
      wxFailed[dest] = Date.now();
    } finally { wxBusy.delete(dest); }
  }

  function wxHTML(tr, key) {
    const c = wxCache[tr.dest.trim()];
    const w = c && c.days && c.days[key];
    if (!w || w.hi == null) return '';
    const kind = WX_KINDS.find(([codes]) => codes.includes(w.c)) || [[], 'cloudy', '🌤️'];
    const rain = w.p != null && w.p >= 20 ? ` · 💧${esc(t('wxRain')(w.p))}` : '';
    return `<p class="day-wx" title="${esc(t('wxSrc'))}">${kind[2]} ${esc(t('wx')[kind[1]])} ${Math.round(w.hi)}° / ${Math.round(w.lo)}°${rain}</p>`;
  }

  /* ---------------- money ---------------- */
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

  /* ---------------- dialogs ---------------- */
  function openTrip(id) {
    const tr = id ? T.s.trips.find((x) => x.id === id) : null;
    LO.openForm({
      title: tr ? t('editTrip') : t('newTrip'),
      body: `<label class="fld"><span>${esc(t('dest'))}</span><input class="input" name="tdest" maxlength="40" value="${esc(tr ? tr.dest : '')}" placeholder="${esc(t('destPh'))}"></label>`
        + `<div class="form-row"><label class="fld"><span>${esc(t('start'))}</span><input class="input" type="date" name="tstart" value="${esc(tr ? tr.start : '')}"></label>`
        + `<label class="fld"><span>${esc(t('end'))}</span><input class="input" type="date" name="tend" value="${esc(tr ? tr.end : '')}"></label></div>`
        + `<label class="fld"><span>${esc(t('people'))}</span><input class="input" name="tpeople" maxlength="200" value="${esc(tr ? tr.people.join(', ') : t('me'))}" placeholder="${esc(t('peoplePh'))}"></label>`
        + `<label class="fld"><span>${esc(t('note'))}</span><textarea class="input ta" name="tnote" rows="3" maxlength="600" placeholder="${esc(t('notePh'))}">${esc(tr ? tr.note : '')}</textarea></label>`
        + (tr && tr.plan.length ? `<p class="hint">${esc(t('shiftHint'))}</p>` : '')
        + (tr ? `<button type="button" class="btn sm" data-tdup>${esc(t('dupTrip'))}</button><p class="hint">${esc(t('dupHint'))}</p>` : ''),
      onOpen(dlg) {
        const b = $('[data-tdup]', dlg);
        if (b) b.addEventListener('click', () => { LO.closeForm(); duplicateTrip(id); });
      },
      onSave(dlg) {
        const dest = $('input[name="tdest"]', dlg).value.trim();
        if (!dest) return t('errDest');
        const start = $('input[name="tstart"]', dlg).value || '';
        let end = $('input[name="tend"]', dlg).value || '';
        if (start && end && end < start) end = start;
        const people = parsePeople($('input[name="tpeople"]', dlg).value);
        if (!people.length) people.push(t('me'));
        const fields = { dest, start, end, people, note: $('textarea[name="tnote"]', dlg).value.trim() };
        let newId = null;
        LO.mutate(T, (s) => {
          if (tr) {
            const x = s.trips.find((y) => y.id === id);
            // moving the trip (both ends change) moves the itinerary with it;
            // changing only the start just makes the trip longer or shorter
            if (x.start && start && start !== x.start && end !== x.end) {
              const shift = LO.dayDiff(x.start, start);
              x.plan.forEach((p) => { p.day = LO.keyOf(LO.addDays(LO.parseKey(p.day), shift)); });
            }
            Object.assign(x, fields);
            // keep spending consistent with the new list of people
            x.expenses.forEach((e) => {
              if (!people.includes(e.paidBy)) e.paidBy = people[0];
              e.split = e.split.filter((p) => people.includes(p));
            });
          } else {
            newId = uid();
            const sections = {};
            SECTIONS.forEach((k) => { sections[k] = []; });
            sections.pack = t('packSeed').map((name) => ({ id: uid(), name, note: '', link: '', done: false }));
            s.trips.push(Object.assign({ id: newId, sections, plan: [], bookings: [], expenses: [], money: { home: 'USD', local: 'USD', rate: 0, rateAt: '', budget: 0 } }, fields));
          }
        }, tr ? tc('saved') : tc('added'));
        if (newId) { openId = newId; sec = 'days'; render(); }
        return true;
      },
      onDelete: tr ? () => { openId = null; LO.mutate(T, (s) => { s.trips = s.trips.filter((x) => x.id !== id); }, tc('deleted')); } : null
    });
  }

  // A fresh copy of a trip to go again or start from: same places, plans, packing and budget,
  // nothing ticked, and no bookings or spending.
  function duplicateTrip(id) {
    const src = T.s.trips.find((x) => x.id === id);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    Object.assign(copy, { id: uid(), dest: `${src.dest}${t('copySuffix')}`.slice(0, 40), bookings: [], expenses: [] });
    SECTIONS.forEach((k) => copy.sections[k].forEach((i) => { i.id = uid(); i.done = false; }));
    copy.plan.forEach((p) => { p.id = uid(); p.done = false; });
    LO.mutate(T, (s) => { s.trips.push(copy); }, tc('added'));
    openId = copy.id;
    sec = 'days';
    render();
    window.scrollTo(0, 0);
  }

  function openBooking(bid) {
    const tr = T.s.trips.find((x) => x.id === openId);
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
          syncBookingExpense(x, y);
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

  function openMoney() {
    const tr = T.s.trips.find((x) => x.id === openId);
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

  // A place, stay, food, photo spot or packing item in the open section.
  function openItem(iid) {
    const tr = T.s.trips.find((x) => x.id === openId);
    const k = sec;
    const it = tr.sections[k].find((x) => x.id === iid);
    if (!it) return;
    const full = k !== 'pack';
    LO.openForm({
      title: t('editItem'),
      body: `<label class="fld"><span>${esc(t('name'))}</span><input class="input" name="iname" maxlength="80" value="${esc(it.name)}" placeholder="${esc(t('addPh')[k])}"></label>`
        + (full ? `<label class="fld"><span>${esc(t('note'))}</span><input class="input" name="inote" maxlength="300" value="${esc(it.note)}" placeholder="${esc(t('itemNotePh'))}"></label>`
          + `<label class="fld"><span>${esc(t('linkPh'))}</span><input class="input" name="ilink" maxlength="400" value="${esc(it.link)}"></label>` : ''),
      onSave(dlg) {
        const name = $('input[name="iname"]', dlg).value.trim();
        if (!name) return t('errTitle');
        LO.mutate(T, (s) => {
          const x = curTrip(s);
          const y = x.sections[k].find((i) => i.id === iid);
          // plans picked from this item follow the new name
          if (full && name !== y.name) x.plan.forEach((p) => { if (p.name === y.name) p.name = name; });
          y.name = name;
          if (full) { y.note = $('input[name="inote"]', dlg).value.trim(); y.link = safeUrl($('input[name="ilink"]', dlg).value); }
        }, tc('saved'));
        return true;
      },
      onDelete: () => LO.mutate(T, (s) => { const x = curTrip(s); x.sections[k] = x.sections[k].filter((i) => i.id !== iid); }, tc('deleted'))
    });
  }

  // One itinerary entry, including moving it to another day.
  function openPlan(pid) {
    const tr = T.s.trips.find((x) => x.id === openId);
    const p = tr.plan.find((x) => x.id === pid);
    if (!p) return;
    const dayOpts = tripDays(tr).map(({ key, n }) => `<option value="${key}"${key === p.day ? ' selected' : ''}>${esc(n ? t('dayLabel')(n, key) : t('offDay')(key))}</option>`).join('');
    LO.openForm({
      title: t('editPlan'),
      body: `<div class="form-row"><label class="fld"><span>${esc(t('day'))}</span><select class="input" name="pday">${dayOpts}</select></label>`
        + `<label class="fld"><span>${esc(t('time'))}</span><input class="input" type="time" name="ptime" value="${esc(p.time)}"></label></div>`
        + `<label class="fld"><span>${esc(t('name'))}</span><input class="input" name="pname" maxlength="80" list="tripPicks" value="${esc(p.name)}" placeholder="${esc(t('planPh'))}"></label>`
        + `<label class="fld"><span>${esc(t('note'))}</span><input class="input" name="pnote" maxlength="300" value="${esc(p.note)}" placeholder="${esc(t('planNotePh'))}"></label>`
        + `<label class="fld"><span>${esc(t('linkPh'))}</span><input class="input" name="plink" maxlength="400" value="${esc(p.link)}"></label>`,
      onSave(dlg) {
        const g = (n) => $(`[name="${n}"]`, dlg).value.trim();
        const name = g('pname');
        if (!name) return t('errTitle');
        LO.mutate(T, (s) => {
          Object.assign(curTrip(s).plan.find((x) => x.id === pid), { day: g('pday'), time: g('ptime'), name, note: g('pnote'), link: safeUrl(g('plink')) });
        }, tc('saved'));
        return true;
      },
      onDelete: () => LO.mutate(T, (s) => { const x = curTrip(s); x.plan = x.plan.filter((y) => y.id !== pid); }, tc('deleted'))
    });
  }

  function openExpense(eid) {
    const tr = T.s.trips.find((x) => x.id === openId);
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

  /* ---------------- sharing ---------------- */
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
    const tr = T.s.trips.find((x) => x.id === openId);
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

  /* ---------------- rendering ---------------- */
  function listHTML() {
    const trips = T.s.trips.slice().sort((a, b) => (a.start || '9999') < (b.start || '9999') ? -1 : 1);
    const upcoming = trips.filter((x) => !isPast(x));
    const past = trips.filter(isPast).reverse();
    const card = (tr) => {
      const total = SECTIONS.reduce((a, k) => a + tr.sections[k].length, 0);
      const done = SECTIONS.reduce((a, k) => a + tr.sections[k].filter((i) => i.done).length, 0);
      return `<button type="button" class="trip" data-trip="${esc(tr.id)}"><span class="trip-dest">${esc(tr.dest)}</span>`
        + `<span class="trip-dates">${esc(dateRange(tr))}</span>${status(tr) && !isPast(tr) ? `<span class="badge">${esc(status(tr))}</span>` : ''}`
        + `<span class="trip-counts">${tr.plan.length ? `${esc(t('planCount')(tr.plan.length))}　` : ''}${SECTIONS.filter((k) => k !== 'pack' && tr.sections[k].length).map((k) => `${esc(t('sections')[k])} ${tr.sections[k].length}`).join('　')}</span>`
        + `${total ? `<span class="progress sm"><span style="width:${done / total * 100}%"></span></span>` : ''}</button>`;
    };
    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1><p class="sub">${esc(t('sub'))}</p></div>`
      + `<button type="button" class="btn primary" data-tnew>${LO.icon.plus}<span>${esc(t('newTrip'))}</span></button></div>`;
    if (!trips.length) return `${h}<p class="empty-note big">${esc(t('empty'))}</p>`;
    h += `<div class="trip-grid">${upcoming.map(card).join('')}</div>`;
    if (past.length) h += `<div class="section-head"><h2>${esc(t('past'))}<span class="count">${past.length}</span></h2></div><div class="trip-grid past">${past.map(card).join('')}</div>`;
    return h;
  }

  function tabCount(tr, k) {
    if (k === 'days') return tr.plan.length ? ` ${t('progress')(tr.plan.filter((i) => i.done).length, tr.plan.length)}` : '';
    if (k === 'book') return tr.bookings.length ? ` ${tr.bookings.length}` : '';
    if (k === 'money') return '';
    const list = tr.sections[k];
    return list.length ? ` ${t('progress')(list.filter((i) => i.done).length, list.length)}` : '';
  }

  function detailHTML(tr) {
    const q = encodeURIComponent(tr.dest);
    let h = `<button type="button" class="link-btn back" data-tback>‹ ${esc(t('back'))}</button>`
      + `<div class="view-head"><div><h1>${esc(tr.dest)}</h1><p class="sub">${esc([dateRange(tr), status(tr), tr.people.length > 1 ? t('list')(tr.people) : ''].filter(Boolean).join(t('sep')))}</p></div>`
      + `<div class="row"><button type="button" class="btn" data-tshare>${esc(t('share'))}</button><button type="button" class="btn" data-tedit>${esc(tc('edit'))}</button></div></div>`;
    if (tr.note) h += `<p class="trip-note">${esc(tr.note)}</p>`;
    h += `<div class="row trip-links"><a class="btn sm" href="https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(tr.dest + ' 攻略')}" target="_blank" rel="noopener noreferrer">${esc(t('xhs'))}</a>`
      + `<a class="btn sm" href="https://www.google.com/search?q=${encodeURIComponent(tr.dest + ' travel guide')}" target="_blank" rel="noopener noreferrer">${esc(t('google'))}</a>`
      + `<a class="btn sm" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener noreferrer">${esc(t('map'))}</a></div>`;
    h += `<div class="seg trip-tabs">${TABS.map((k) => `<button type="button" data-tsec="${k}" aria-selected="${k === sec}">${esc(t('sections')[k])}${esc(tabCount(tr, k))}</button>`).join('')}</div>`;
    if (sec === 'days') return h + planHTML(tr);
    if (sec === 'book') return h + bookHTML(tr);
    if (sec === 'money') return h + moneyHTML(tr);
    const list = tr.sections[sec];
    const planned = (name) => tr.plan.filter((p) => p.name === name).map((p) => dayNum(tr, p.day)).filter((n) => n > 0);
    h += '<section class="card trip-sec">';
    if (sec === 'pack') h += packToolsHTML(tr);
    h += `<form class="trip-add" data-tadd><input class="input" name="iname" maxlength="80" placeholder="${esc(t('addPh')[sec])}" aria-label="${esc(t('addPh')[sec])}">`
      + (sec === 'pack' ? '' : `<input class="input" name="inote" maxlength="300" placeholder="${esc(t('itemNotePh'))}" aria-label="${esc(t('itemNotePh'))}"><input class="input" name="ilink" maxlength="400" placeholder="${esc(t('linkPh'))}" aria-label="${esc(t('linkPh'))}">`)
      + `<button type="submit" class="btn primary">${LO.icon.plus}<span>${esc(t('add'))}</span></button></form>`;
    h += list.length ? `<ul class="trip-items">${list.map((i) => `<li class="${i.done ? 'is-done' : ''}" data-titem="${esc(i.id)}">`
      + `<label class="check"><input type="checkbox" data-tdone${i.done ? ' checked' : ''} aria-label="${esc(t('done')[sec])}"></label>`
      + `<div class="ti-body">${i.link ? `<a href="${esc(i.link)}" target="_blank" rel="noopener noreferrer"><b>${esc(i.name)}</b></a>` : `<b>${esc(i.name)}</b>`}`
      + `${planned(i.name).length ? `<span class="badge">${planned(i.name).map((n) => esc(t('inPlan')(n))).join(' ')}</span>` : ''}${i.note ? `<p>${esc(i.note)}</p>` : ''}</div>`
      + (sec === 'pack' ? '' : `<a class="btn sm ghost" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.name + ' ' + tr.dest)}" target="_blank" rel="noopener noreferrer">${esc(t('map'))}</a>`)
      + editBtn('data-tiedit') + `<button type="button" class="icon-btn sm ghost" data-tdel aria-label="${esc(tc('delete'))}">${LO.icon.x}</button></li>`).join('')}</ul>`
      : `<p class="empty-note">${esc(t('emptySec'))}</p>`;
    return `${h}</section>`;
  }

  function packToolsHTML(tr) {
    const others = T.s.trips.filter((x) => x.id !== tr.id && x.sections.pack.length);
    return `<div class="row pack-tools"><select class="input" data-packkit aria-label="${esc(t('kitPick'))}"><option value="">${esc(t('kitPick'))}</option>`
      + `${PACK_KITS.map((k) => `<option value="${k}">${esc(t('kits')[k])}</option>`).join('')}</select>`
      + (others.length ? `<select class="input" data-packcopy aria-label="${esc(t('copyFrom'))}"><option value="">${esc(t('copyFrom'))}</option>${others.map((x) => `<option value="${esc(x.id)}">${esc(x.dest)}${x.start ? ` · ${esc(LO.shortDate(x.start))}` : ''}</option>`).join('')}</select>` : '')
      + (tr.sections.pack.some((i) => i.done) ? `<button type="button" class="btn" data-packreset>${esc(t('packReset'))}</button>` : '')
      + '</div>';
  }

  function planHTML(tr) {
    const days = tripDays(tr);
    if (!days.length) return `<section class="card trip-sec"><p class="empty-note">${esc(t('noDates'))}</p></section>`;
    const today = LO.todayKey();
    const q = (name) => encodeURIComponent(`${name} ${tr.dest}`);
    let h0 = '';
    if (wxWanted(tr)) {
      loadWeather(tr);
      const c = wxCache[tr.dest.trim()];
      if (c && c.miss) h0 = `<p class="hint">${esc(t('wxMiss')(tr.dest))}</p>`;
    }
    const picks = Array.from(new Set(['spots', 'food', 'stay', 'photo'].flatMap((k) => tr.sections[k].map((i) => i.name))));
    let h = `${h0}<datalist id="tripPicks">${picks.map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist>`;
    days.forEach(({ key, n }) => {
      const items = tr.plan.filter((p) => p.day === key).sort(byTime);
      const books = bookingLines(tr, key);
      h += `<section class="card trip-sec trip-day${key === today ? ' is-today' : ''}"><header class="card-head"><h2>${esc(n ? t('dayLabel')(n, key) : t('offDay')(key))}`
        + `${key === today ? `<span class="badge live">${esc(tc('today'))}</span>` : ''}</h2>`
        + `${items.length > 1 ? `<a class="btn sm ghost day-route" href="${esc(routeUrl(tr, items))}" target="_blank" rel="noopener noreferrer">${esc(t('route'))}</a>` : ''}`
        + `${items.length ? `<span class="count">${items.filter((p) => p.done).length}/${items.length}</span>` : ''}</header>${wxHTML(tr, key)}`;
      if (books.length) {
        h += `<ul class="day-books">${books.map((b) => `<li><span class="plan-time">${esc(b.time)}</span><span class="db-name">${b.icon} ${esc(b.name)}</span>`
          + `${b.conf ? `<button type="button" class="conf-chip mono" data-copy="${esc(b.conf)}" title="${esc(t('copy'))}">${esc(b.conf)}</button>` : ''}</li>`).join('')}</ul>`;
      }
      h += items.length ? `<ul class="trip-items plan-items">${items.map((p) => `<li class="${p.done ? 'is-done' : ''}" data-pitem="${esc(p.id)}">`
        + `<label class="check"><input type="checkbox" data-pdone${p.done ? ' checked' : ''} aria-label="${esc(t('planDone'))}"></label>`
        + `<span class="plan-time">${esc(p.time)}</span>`
        + `<div class="ti-body">${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer"><b>${esc(p.name)}</b></a>` : `<b>${esc(p.name)}</b>`}${p.note ? `<p>${esc(p.note)}</p>` : ''}</div>`
        + `<a class="btn sm ghost" href="https://www.google.com/maps/search/?api=1&query=${q(p.name)}" target="_blank" rel="noopener noreferrer">${esc(t('map'))}</a>`
        + editBtn('data-piedit') + `<button type="button" class="icon-btn sm ghost" data-pdel aria-label="${esc(tc('delete'))}">${LO.icon.x}</button></li>`).join('')}</ul>`
        : (books.length ? '' : `<p class="empty-note">${esc(t('emptyDay'))}</p>`);
      if (n) {
        h += `<form class="trip-add plan-add" data-padd="${key}"><input class="input plan-time-in" type="time" name="ptime" aria-label="${esc(t('time'))}">`
          + `<input class="input" name="pname" maxlength="80" list="tripPicks" placeholder="${esc(t('planPh'))}" aria-label="${esc(t('planPh'))}">`
          + `<input class="input" name="pnote" maxlength="300" placeholder="${esc(t('planNotePh'))}" aria-label="${esc(t('planNotePh'))}">`
          + `<button type="submit" class="btn primary">${LO.icon.plus}<span>${esc(t('add'))}</span></button></form>`;
      }
      h += '</section>';
    });
    return h;
  }

  // Google Maps directions through the day's plans in order (Maps takes at most 9 stops between start and end).
  function routeUrl(tr, items) {
    const stops = items.slice(0, 11).map((p) => `${p.name} ${tr.dest}`);
    const u = new URLSearchParams({ api: '1', origin: stops[0], destination: stops[stops.length - 1] });
    if (stops.length > 2) u.set('waypoints', stops.slice(1, -1).join('|'));
    return `https://www.google.com/maps/dir/?${u}`;
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
        + (b.price ? `<p class="bk-note">${esc(fmtMoney(b.price, b.pcur || tr.money.home))}</p>` : '')
        + '</section>';
    });
    return `${h}</div>`;
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

  function render() {
    const tr = openId ? T.s.trips.find((x) => x.id === openId) : null;
    if (!tr) openId = null;
    view.innerHTML = tr ? detailHTML(tr) : listHTML();
  }

  /* ---------------- events ---------------- */
  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-tnew]')) { openTrip(null); return; }
    const tc0 = e.target.closest('[data-trip]');
    if (tc0) { openId = tc0.dataset.trip; sec = 'days'; render(); window.scrollTo(0, 0); return; }
    if (e.target.closest('[data-tback]')) { openId = null; render(); return; }
    if (e.target.closest('[data-tedit]')) { openTrip(openId); return; }
    if (e.target.closest('[data-tshare]')) { openShare(); return; }
    if (e.target.closest('[data-badd]')) { openBooking(null); return; }
    const be = e.target.closest('[data-bedit]');
    if (be) { openBooking(be.dataset.bedit); return; }
    if (e.target.closest('[data-mset]')) { openMoney(); return; }
    if (e.target.closest('[data-packreset]')) {
      LO.mutate(T, (s) => { curTrip(s).sections.pack.forEach((i) => { i.done = false; }); }, t('packResetDone'));
      return;
    }
    const ie = e.target.closest('[data-tiedit]');
    if (ie) { openItem(ie.closest('[data-titem]').dataset.titem); return; }
    const pe = e.target.closest('[data-piedit]');
    if (pe) { openPlan(pe.closest('[data-pitem]').dataset.pitem); return; }
    const ee = e.target.closest('[data-eedit]');
    if (ee) { openExpense(ee.closest('[data-eitem]').dataset.eitem); return; }
    const cp = e.target.closest('[data-copy]');
    if (cp) { copyText(cp.dataset.copy).then((ok) => { if (ok) LO.toast(t('copied')); }); return; }
    const sb = e.target.closest('[data-tsec]');
    if (sb) { sec = sb.dataset.tsec; render(); return; }
    const del = e.target.closest('[data-tdel]');
    if (del) {
      const iid = del.closest('[data-titem]').dataset.titem;
      LO.mutate(T, (s) => { const tr = curTrip(s); tr.sections[sec] = tr.sections[sec].filter((i) => i.id !== iid); }, tc('deleted'));
      return;
    }
    const pdel = e.target.closest('[data-pdel]');
    if (pdel) {
      const pid = pdel.closest('[data-pitem]').dataset.pitem;
      LO.mutate(T, (s) => { const tr = curTrip(s); tr.plan = tr.plan.filter((p) => p.id !== pid); }, tc('deleted'));
      return;
    }
    const edel = e.target.closest('[data-edel]');
    if (edel) {
      const eid = edel.closest('[data-eitem]').dataset.eitem;
      LO.mutate(T, (s) => removeExpense(curTrip(s), eid), tc('deleted'));
    }
  });

  // Add names to the packing list, skipping ones already on it.
  function addPack(names) {
    let n = 0;
    LO.mutate(T, (s) => {
      const list = curTrip(s).sections.pack;
      const have = new Set(list.map((i) => i.name));
      names.forEach((name) => { if (!have.has(name)) { have.add(name); list.push({ id: uid(), name, note: '', link: '', done: false }); n++; } });
    });
    LO.toast(t('packAdded')(n));
  }

  view.addEventListener('change', (e) => {
    if (e.target.matches('[data-packkit]')) {
      if (e.target.value) addPack(t('kitItems')[e.target.value] || []);
      return;
    }
    if (e.target.matches('[data-packcopy]')) {
      const src = T.s.trips.find((x) => x.id === e.target.value);
      if (src) addPack(src.sections.pack.map((i) => i.name));
      return;
    }
    if (e.target.matches('[data-pdone]')) {
      const pid = e.target.closest('[data-pitem]').dataset.pitem;
      LO.mutate(T, (s) => {
        const tr = curTrip(s);
        const p = tr.plan.find((x) => x.id === pid);
        p.done = !p.done;
        // the same place stays done while any plan for it is done
        const any = tr.plan.some((x) => x.name === p.name && x.done);
        SYNC_SECS.forEach((k) => tr.sections[k].forEach((i) => { if (i.name === p.name) i.done = any; }));
      });
      return;
    }
    if (!e.target.matches('[data-tdone]')) return;
    const iid = e.target.closest('[data-titem]').dataset.titem;
    LO.mutate(T, (s) => {
      const tr = curTrip(s);
      const it = tr.sections[sec].find((i) => i.id === iid);
      it.done = !it.done;
      if (SYNC_SECS.includes(sec)) tr.plan.forEach((p) => { if (p.name === it.name) p.done = it.done; });
    });
  });

  view.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.matches('[data-eadd]')) {
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
      return;
    }
    if (f.matches('[data-padd]')) {
      e.preventDefault();
      const day = f.dataset.padd;
      const name = $('input[name="pname"]', f).value.trim();
      if (!name) return;
      const time = $('input[name="ptime"]', f).value || '';
      let note = $('input[name="pnote"]', f).value.trim();
      let link = '';
      LO.mutate(T, (s) => {
        const tr = curTrip(s);
        // picked from places, food, stay or photo spots: bring its note and link along
        const src = ['spots', 'food', 'stay', 'photo'].map((k) => tr.sections[k].find((i) => i.name === name)).find(Boolean);
        if (src) { link = src.link; if (!note) note = src.note; }
        tr.plan.push({ id: uid(), day, time, name, note, link, done: false });
      });
      const i = $(`[data-padd="${day}"] input[name="pname"]`, view);
      if (i) i.focus();
      return;
    }
    if (!f.matches('[data-tadd]')) return;
    e.preventDefault();
    const name = $('input[name="iname"]', f).value.trim();
    if (!name) return;
    const note = f.querySelector('input[name="inote"]') ? $('input[name="inote"]', f).value.trim() : '';
    const link = f.querySelector('input[name="ilink"]') ? safeUrl($('input[name="ilink"]', f).value) : '';
    LO.mutate(T, (s) => { curTrip(s).sections[sec].push({ id: uid(), name, note, link, done: false }); });
    const i = $('[data-tadd] input[name="iname"]', view);
    if (i) i.focus();
  });

  LO.view('travel', { render, onShow() { /* keep the open trip when coming back */ } });

  LO.travel = {
    // The trip happening today (if any) with today's plans and bookings, for the Today page.
    today() {
      const k = LO.todayKey();
      const tr = T.s.trips.find((x) => x.start && x.start <= k && k <= (x.end || x.start));
      if (!tr) return null;
      const books = bookingLines(tr, k).map((b) => ({ time: b.time, name: `${b.icon} ${b.name}`, note: b.conf, done: false }));
      return { id: tr.id, dest: tr.dest, n: dayNum(tr, k), items: books.concat(tr.plan.filter((p) => p.day === k)).sort(byTime) };
    },
    // The next trip starting within a week, with its first bookings and how much is still unpacked.
    soon() {
      const k = LO.todayKey();
      const tr = T.s.trips.filter((x) => x.start > k && LO.dayDiff(k, x.start) <= SOON_DAYS).sort((a, b) => (a.start < b.start ? -1 : 1))[0];
      if (!tr) return null;
      const items = tr.bookings.filter((b) => b.date >= k).sort(byWhen).slice(0, 3).map((b) => ({
        time: LO.shortDate(b.date), name: `${KIND_ICON[b.kind]} ${b.time ? b.time + ' ' : ''}${b.title}`, note: b.conf
      }));
      const pack = tr.sections.pack;
      return { id: tr.id, dest: tr.dest, n: LO.dayDiff(k, tr.start), items, packLeft: pack.filter((i) => !i.done).length, packTotal: pack.length };
    },
    show(id) { openId = id; sec = 'days'; LO.go('travel'); render(); },
    // Trips and bookings from today on, for the calendar export. Times are minutes after midnight, or null for all-day.
    calendarItems() {
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
    }
  };
})();
