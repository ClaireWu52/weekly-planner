/*
 * Travel guides: one page per trip with a day-by-day itinerary, transport and
 * bookings, places to see, where to stay, food, photo spots, a packing list
 * and a budget that splits costs between travel mates.
 * Today's plans also show on the Today page (and the trip a few days before).
 *
 * This file holds the data, all the travel strings, the trip list, the itinerary
 * and the places/stay/food/photo lists. The other parts live in travel-book.js,
 * travel-money.js, travel-pack.js, travel-weather.js and travel-share.js, which
 * load after this one and plug into LO.tripKit.
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
  const PACK_GROUPS = ['docs', 'clothes', 'tech', 'wash', 'health', 'other'];
  // Sections whose "done" means the same as finishing it on the itinerary ("booked" for a stay does not).
  const SYNC_SECS = ['spots', 'food', 'photo'];
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
      packReset: '回程清点', packResetDone: '已全部改回没带',
      dragHint: '拖动排序（也可以按上下方向键）', grp: '分类', grpAuto: '自动分类',
      grps: { docs: '证件和票', clothes: '衣物', tech: '电子产品', wash: '洗漱护肤', health: '药品和健康', other: '其他' }
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
      packReset: 'Pack to go home', packResetDone: 'All unticked for the trip home',
      dragHint: 'Drag to reorder (or use the arrow keys)', grp: 'Group', grpAuto: 'Auto group',
      grps: { docs: 'Documents & tickets', clothes: 'Clothes', tech: 'Electronics', wash: 'Toiletries', health: 'Health', other: 'Other' }
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
          id: String(i.id || uid()), name: i.name.slice(0, 80), note: str(i.note).slice(0, 300), link: safeUrl(i.link), done: !!i.done,
          // packing group; empty means "guess from the name"
          ...(k === 'pack' ? { grp: PACK_GROUPS.includes(i.grp) ? i.grp : '' } : {})
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
  const dragBtn = () => `<button type="button" class="drag-handle" data-drag aria-label="${esc(t('dragHint'))}" title="${esc(t('dragHint'))}">⋮⋮</button>`;
  // Day choices for an expense: before the trip, then each trip day.

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

  // One row of the places, stay, food or photo lists (packing draws its own rows in travel-pack.js).
  function itemRowHTML(tr, i) {
    const planned = tr.plan.filter((p) => p.name === i.name).map((p) => dayNum(tr, p.day)).filter((n) => n > 0);
    return `<li class="${i.done ? 'is-done' : ''}" data-titem="${esc(i.id)}">${dragBtn()}`
      + `<label class="check"><input type="checkbox" data-tdone${i.done ? ' checked' : ''} aria-label="${esc(t('done')[sec])}"></label>`
      + `<div class="ti-body">${i.link ? `<a href="${esc(i.link)}" target="_blank" rel="noopener noreferrer"><b>${esc(i.name)}</b></a>` : `<b>${esc(i.name)}</b>`}`
      + `${planned.length ? `<span class="badge">${planned.map((n) => esc(t('inPlan')(n))).join(' ')}</span>` : ''}${i.note ? `<p>${esc(i.note)}</p>` : ''}</div>`
      + `<a class="btn sm ghost" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.name + ' ' + tr.dest)}" target="_blank" rel="noopener noreferrer">${esc(t('map'))}</a>`
      + editBtn('data-tiedit') + `<button type="button" class="icon-btn sm ghost" data-tdel aria-label="${esc(tc('delete'))}">${LO.icon.x}</button></li>`;
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
    if (sec === 'book') return h + K.bookHTML(tr);
    if (sec === 'money') return h + K.moneyHTML(tr);
    if (sec === 'pack') return h + K.packHTML(tr);
    const list = tr.sections[sec];
    h += '<section class="card trip-sec">';
    h += `<form class="trip-add" data-tadd><input class="input" name="iname" maxlength="80" placeholder="${esc(t('addPh')[sec])}" aria-label="${esc(t('addPh')[sec])}">`
      + `<input class="input" name="inote" maxlength="300" placeholder="${esc(t('itemNotePh'))}" aria-label="${esc(t('itemNotePh'))}"><input class="input" name="ilink" maxlength="400" placeholder="${esc(t('linkPh'))}" aria-label="${esc(t('linkPh'))}">`
      + `<button type="submit" class="btn primary">${LO.icon.plus}<span>${esc(t('add'))}</span></button></form>`;
    h += list.length ? `<ul class="trip-items" data-sort="sec">${list.map((i) => itemRowHTML(tr, i)).join('')}</ul>`
      : `<p class="empty-note">${esc(t('emptySec'))}</p>`;
    return `${h}</section>`;
  }

  function planHTML(tr) {
    const days = tripDays(tr);
    if (!days.length) return `<section class="card trip-sec"><p class="empty-note">${esc(t('noDates'))}</p></section>`;
    const today = LO.todayKey();
    const q = (name) => encodeURIComponent(`${name} ${tr.dest}`);
    const picks = Array.from(new Set(['spots', 'food', 'stay', 'photo'].flatMap((k) => tr.sections[k].map((i) => i.name))));
    let h = `${K.weatherNoteHTML(tr)}<datalist id="tripPicks">${picks.map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist>`;
    days.forEach(({ key, n }) => {
      const items = tr.plan.filter((p) => p.day === key).sort(byTime);
      const books = bookingLines(tr, key);
      // only plans without a time can be dragged; timed ones keep their order by time
      const loose = items.filter((p) => !p.time).length > 1;
      h += `<section class="card trip-sec trip-day${key === today ? ' is-today' : ''}"><header class="card-head"><h2>${esc(n ? t('dayLabel')(n, key) : t('offDay')(key))}`
        + `${key === today ? `<span class="badge live">${esc(tc('today'))}</span>` : ''}</h2>`
        + `${items.length > 1 ? `<a class="btn sm ghost day-route" href="${esc(routeUrl(tr, items))}" target="_blank" rel="noopener noreferrer">${esc(t('route'))}</a>` : ''}`
        + `${items.length ? `<span class="count">${items.filter((p) => p.done).length}/${items.length}</span>` : ''}</header>${K.weatherDayHTML(tr, key)}`;
      if (books.length) {
        h += `<ul class="day-books">${books.map((b) => `<li><span class="plan-time">${esc(b.time)}</span><span class="db-name">${b.icon} ${esc(b.name)}</span>`
          + `${b.conf ? `<button type="button" class="conf-chip mono" data-copy="${esc(b.conf)}" title="${esc(t('copy'))}">${esc(b.conf)}</button>` : ''}</li>`).join('')}</ul>`;
      }
      h += items.length ? `<ul class="trip-items plan-items" data-sort="plan">${items.map((p) => `<li class="${p.done ? 'is-done' : ''}" data-pitem="${esc(p.id)}">`
        + (loose ? (p.time ? '<span class="drag-gap"></span>' : dragBtn()) : '')
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

  function render() {
    const tr = openId ? T.s.trips.find((x) => x.id === openId) : null;
    if (!tr) openId = null;
    view.innerHTML = tr ? detailHTML(tr) : listHTML();
  }

  /* ---------------- drag to reorder ---------------- */
  // Rows with a drag handle can be dragged (mouse or finger) or moved with the arrow keys
  // on the handle. Only the rows shown in that list change places in the saved order.
  const rowId = (li) => li.dataset.titem || li.dataset.pitem;
  function saveOrder(ul) {
    const ids = Array.from(ul.children).map(rowId);
    LO.mutate(T, (s) => {
      const tr = curTrip(s);
      const key = ul.dataset.sort === 'plan' ? null : sec;
      const arr = key ? tr.sections[key] : tr.plan;
      const slots = [];
      arr.forEach((x, i) => { if (ids.includes(x.id)) slots.push(i); });
      const moved = ids.map((id) => arr.find((x) => x.id === id));
      slots.forEach((slot, i) => { arr[slot] = moved[i]; });
    });
  }
  view.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('[data-drag]');
    if (!h || e.button > 0) return;
    const li = h.closest('li');
    const ul = li.parentElement;
    const before = Array.from(ul.children).map(rowId).join();
    e.preventDefault();
    li.classList.add('is-dragging');
    const move = (ev) => {
      const over = Array.from(ul.children).find((x) => { const r = x.getBoundingClientRect(); return x !== li && ev.clientY >= r.top && ev.clientY <= r.bottom; });
      if (!over || !over.querySelector('[data-drag]')) return;
      const r = over.getBoundingClientRect();
      ul.insertBefore(li, ev.clientY < r.top + r.height / 2 ? over : over.nextSibling);
    };
    // listen on the document: moving the row in the page would drop a pointer capture on the handle
    const end = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      li.classList.remove('is-dragging');
      if (Array.from(ul.children).map(rowId).join() !== before) saveOrder(ul);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  });
  view.addEventListener('keydown', (e) => {
    const h = e.target.closest('[data-drag]');
    if (!h || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const li = h.closest('li');
    const ul = li.parentElement;
    const id = rowId(li);
    const sib = e.key === 'ArrowUp' ? li.previousElementSibling : li.nextElementSibling;
    if (!sib || !sib.querySelector('[data-drag]')) return;
    ul.insertBefore(li, e.key === 'ArrowUp' ? sib : sib.nextSibling);
    saveOrder(ul);
    const again = view.querySelector(`[data-titem="${id}"] [data-drag], [data-pitem="${id}"] [data-drag]`);
    if (again) again.focus();
  });

  /* ---------------- events ---------------- */
  // Bookings, money, packing and sharing add their own listeners in their files.
  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-tnew]')) { openTrip(null); return; }
    const tc0 = e.target.closest('[data-trip]');
    if (tc0) { openId = tc0.dataset.trip; sec = 'days'; render(); window.scrollTo(0, 0); return; }
    if (e.target.closest('[data-tback]')) { openId = null; render(); return; }
    if (e.target.closest('[data-tedit]')) { openTrip(openId); return; }
    const ie = e.target.closest('[data-tiedit]');
    if (ie) { openItem(ie.closest('[data-titem]').dataset.titem); return; }
    const pe = e.target.closest('[data-piedit]');
    if (pe) { openPlan(pe.closest('[data-pitem]').dataset.pitem); return; }
    const cp = e.target.closest('[data-copy]');
    if (cp) { K.copyText(cp.dataset.copy).then((ok) => { if (ok) LO.toast(t('copied')); }); return; }
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
    }
  });

  view.addEventListener('change', (e) => {
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
    const note = $('input[name="inote"]', f).value.trim();
    const link = safeUrl($('input[name="ilink"]', f).value);
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
    show(id) { openId = id; sec = 'days'; LO.go('travel'); render(); }
  };

  // What the other travel files need from here. openId and sec are read through getters
  // because they change as the user moves around.
  const K = LO.tripKit = {
    T, t, tc, view, SECTIONS, KINDS, KIND_ICON, CATS, PACK_GROUPS,
    str, num, cur, safeUrl, curTrip, tripDays, byTime, byWhen, dayNum, dateRange, editBtn, dragBtn, render,
    get openId() { return openId; },
    set openId(v) { openId = v; },
    get sec() { return sec; },
    trip: () => T.s.trips.find((x) => x.id === openId)
  };
})();
