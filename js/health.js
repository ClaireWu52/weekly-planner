/*
 * Health pages, three tabs under one nav button:
 *   health  (Exercise): log workouts, this week's summary, workout plan (health-workout.js)
 *   rest    (Daily rhythm): sleep, water, Health dailies
 *   calm    (Unwind): mood and a one-minute breathing exercise
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, $$, esc, uid } = LO;
  const WTYPES = ['run', 'walk', 'gym', 'yoga', 'swim', 'bike', 'ball', 'dance', 'stretch', 'other'];

  LO.strings('health', {
    zh: {
      title: '健康',
      sWorkout: '本周运动', sWater: '今天喝水', sSleep: '昨晚睡眠', sMood: '今天心情', notLogged: '还没记录',
      avg7: (h) => `近 7 天平均 ${h} 小时`, ofGoal: (g) => `目标 ${g}`,
      wTitle: '运动记录', date: '日期', types: '做了什么', minutes: '时长（分钟）', level: '强度',
      levels: ['轻松', '适中', '高强度'], note: '感受', notePh: '状态怎么样，下次想调整什么…', log: '记录',
      logged: '已记录运动', weekGoal: '每周目标（分钟）', recent: '最近的记录',
      noWorkouts: '还没有运动记录。散步 15 分钟也值得记下来。', last30: '近 30 天（分钟）',
      activeDays: (n) => `本周活跃 ${n} 天`, errMin: '请填写时长。', errTypes: '至少选一项运动。',
      wt: { run: '跑步', walk: '散步', gym: '力量训练', yoga: '瑜伽', swim: '游泳', bike: '骑车', ball: '球类', dance: '舞蹈', stretch: '拉伸', other: '其他' },
      waterTitle: '喝水', cupsLine: (n, g) => `${n} / ${g} 杯`, waterGoal: '每天目标（杯）', cupNote: '一杯约 250 毫升', last7: '近 7 天',
      sleepTitle: '睡眠', wakeDate: '起床那天', bed: '入睡', wake: '起床', quality: '睡得怎么样',
      qualities: ['不太好', '一般', '很好'], saveSleep: '记录', sleepLogged: '已记录睡眠', sleepGoal: '目标（小时）',
      last14: '近 14 天（小时）', hoursLine: (h) => `${h} 小时`,
      moodTitle: '心情', moods: ['很差', '不太好', '一般', '不错', '很好'], moodNotePh: '想记一句今天的事吗？', last5w: '近 5 周',
      checkTitle: '每日任务 · 健康类', checkHint: '和任务页的每日任务是同一份，在这里打勾那边也会勾上。', checkEmpty: '“健康”分类的每日任务会出现在这里。', openTasks: '在任务页管理',
      breathTitle: '呼吸放松', breathSub: '跟着圆圈呼吸一分钟：吸气 4 秒，屏息 4 秒，呼气 6 秒。',
      start: '开始', stop: '停止', inhale: '吸气', hold: '屏息', exhale: '呼气', breathDone: '做完了。慢慢回到手上的事。',
      routines: '训练组', routineHint: '点一个训练组，下面会自动填好动作、时长和强度，再按今天实际改。', newRoutine: '新建训练组', editRoutine: '编辑训练组',
      routineName: '训练组名称', routineNamePh: '比如：下肢力量', routineMin: '默认时长（分钟）', clearRoutine: '清空',
      exercises: '做了哪些动作', exName: '动作', sets: '组', reps: '次数或时长', weight: '重量', addEx: '添加动作', exPh: '比如：深蹲',
      repsPh: '8 或 30秒', weightPh: '60kg', errRoutine: '请填写训练组名称。',
      summary: '本周总结', sumLine: (n, m, d) => `${n} 次运动，共 ${m} 分钟，活跃 ${d} 天`, vsLast: (x) => (x >= 0 ? `比上周多 ${x} 分钟` : `比上周少 ${-x} 分钟`),
      byType: '按类型', topEx: '做得最多的动作', exTimes: (n, st) => `${n} 次${st ? `，共 ${st} 组` : ''}`, noEx: '这周还没有记录具体动作。', last4: '近 4 周（分钟）',
      planTitle: '运动计划', thisWk: '本周', nextWk: '下周', rest: '休息', addToSchedule: '加到课表', planHint: '只会加到那一周的课表，不影响其他周。',
      planAdded: '这周的计划已经加过课表了，再加会重复。', planEmpty: '先给几天选好训练组。',
      seedEx: ['深蹲', '硬拉', '卧推', '俯卧撑', '引体向上', '哑铃划船', '肩推', '弓步蹲', '臀桥', '平板支撑', '卷腹', '跑步', '快走', '骑车', '跳绳', '椭圆机', '拉伸', '瑜伽流'],
      seedRoutines: [
        ['下肢力量', ['gym'], 50, 2, [['深蹲', 4, '8', ''], ['硬拉', 3, '6', ''], ['弓步蹲', 3, '10', ''], ['臀桥', 3, '12', ''], ['平板支撑', 3, '45秒', '']]],
        ['上肢力量', ['gym'], 45, 2, [['卧推', 4, '8', ''], ['哑铃划船', 4, '10', ''], ['肩推', 3, '10', ''], ['引体向上', 3, '5', ''], ['卷腹', 3, '15', '']]],
        ['有氧 30 分钟', ['run'], 30, 2, [['跑步', 1, '30分钟', '']]],
        ['拉伸放松', ['stretch', 'yoga'], 20, 1, [['拉伸', 1, '15分钟', ''], ['瑜伽流', 1, '5分钟', '']]]
      ]
    },
    en: {
      title: 'Health',
      sWorkout: 'Exercise this week', sWater: 'Water today', sSleep: 'Sleep last night', sMood: 'Mood today', notLogged: 'Not logged',
      avg7: (h) => `7-day average ${h} h`, ofGoal: (g) => `Goal ${g}`,
      wTitle: 'Workouts', date: 'Date', types: 'What you did', minutes: 'Minutes', level: 'Intensity',
      levels: ['Easy', 'Moderate', 'Hard'], note: 'How it felt', notePh: 'Energy, what to change next time…', log: 'Log it',
      logged: 'Workout logged', weekGoal: 'Weekly goal (min)', recent: 'Recent',
      noWorkouts: 'No workouts yet. A 15-minute walk counts.', last30: 'Last 30 days (min)',
      activeDays: (n) => `${n} active days this week`, errMin: 'Add the minutes.', errTypes: 'Pick at least one activity.',
      wt: { run: 'Run', walk: 'Walk', gym: 'Strength', yoga: 'Yoga', swim: 'Swim', bike: 'Bike', ball: 'Ball sports', dance: 'Dance', stretch: 'Stretch', other: 'Other' },
      waterTitle: 'Water', cupsLine: (n, g) => `${n} / ${g} cups`, waterGoal: 'Daily goal (cups)', cupNote: 'One cup is about 250 ml', last7: 'Last 7 days',
      sleepTitle: 'Sleep', wakeDate: 'Morning of', bed: 'Asleep', wake: 'Woke up', quality: 'How was it',
      qualities: ['Poor', 'Okay', 'Great'], saveSleep: 'Log it', sleepLogged: 'Sleep logged', sleepGoal: 'Goal (hours)',
      last14: 'Last 14 days (hours)', hoursLine: (h) => `${h} h`,
      moodTitle: 'Mood', moods: ['Awful', 'Low', 'Okay', 'Good', 'Great'], moodNotePh: 'A line about today?', last5w: 'Last 5 weeks',
      checkTitle: 'Dailies · Health', checkHint: 'These are your Health dailies from Tasks. Checking one here checks it there too.', checkEmpty: 'Dailies in the Health category show up here.', openTasks: 'Manage on Tasks',
      breathTitle: 'Breathe', breathSub: 'Follow the circle for a minute: in for 4, hold for 4, out for 6.',
      start: 'Start', stop: 'Stop', inhale: 'Breathe in', hold: 'Hold', exhale: 'Breathe out', breathDone: 'Done. Ease back into your day.',
      routines: 'Workout groups', routineHint: 'Tap a group to fill in exercises, length and intensity, then adjust to what you actually did.', newRoutine: 'New group', editRoutine: 'Edit group',
      routineName: 'Group name', routineNamePh: 'e.g. Lower body', routineMin: 'Default length (min)', clearRoutine: 'Clear',
      exercises: 'Exercises', exName: 'Exercise', sets: 'Sets', reps: 'Reps or time', weight: 'Weight', addEx: 'Add exercise', exPh: 'e.g. Squat',
      repsPh: '8 or 30s', weightPh: '60kg', errRoutine: 'Name the group.',
      summary: 'This week', sumLine: (n, m, d) => `${n} workouts, ${m} min, ${d} active days`, vsLast: (x) => (x >= 0 ? `${x} min more than last week` : `${-x} min less than last week`),
      byType: 'By type', topEx: 'Most done exercises', exTimes: (n, st) => `${n}×${st ? `, ${st} sets` : ''}`, noEx: 'No exercises logged this week.', last4: 'Last 4 weeks (min)',
      planTitle: 'Workout plan', thisWk: 'This week', nextWk: 'Next week', rest: 'Rest', addToSchedule: 'Add to schedule', planHint: 'Adds to that week only.',
      planAdded: 'This plan is already on the schedule; adding again will duplicate it.', planEmpty: 'Pick a group for some days first.',
      seedEx: ['Squat', 'Deadlift', 'Bench press', 'Push-up', 'Pull-up', 'Dumbbell row', 'Shoulder press', 'Lunge', 'Glute bridge', 'Plank', 'Crunch', 'Run', 'Brisk walk', 'Bike', 'Jump rope', 'Elliptical', 'Stretching', 'Yoga flow'],
      seedRoutines: [
        ['Lower body', ['gym'], 50, 2, [['Squat', 4, '8', ''], ['Deadlift', 3, '6', ''], ['Lunge', 3, '10', ''], ['Glute bridge', 3, '12', ''], ['Plank', 3, '45s', '']]],
        ['Upper body', ['gym'], 45, 2, [['Bench press', 4, '8', ''], ['Dumbbell row', 4, '10', ''], ['Shoulder press', 3, '10', ''], ['Pull-up', 3, '5', ''], ['Crunch', 3, '15', '']]],
        ['Cardio 30', ['run'], 30, 2, [['Run', 1, '30min', '']]],
        ['Stretch', ['stretch', 'yoga'], 20, 1, [['Stretching', 1, '15min', ''], ['Yoga flow', 1, '5min', '']]]
      ]
    }
  });
  const t = LO.ns('health');
  const tc = LO.ns('common');

  /* ---------------- data ---------------- */
  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const isTime = (v) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
  const str = (v) => (typeof v === 'string' ? v : '');
  const normItems = (arr) => (Array.isArray(arr) ? arr : []).filter((x) => x && typeof x.name === 'string' && x.name.trim()).slice(0, 30)
    .map((x) => ({ name: x.name.trim().slice(0, 40), sets: LO.clamp(Math.round(+x.sets) || 0, 0, 99), reps: str(x.reps).slice(0, 20), weight: str(x.weight).slice(0, 20) }));
  const seedRoutines = () => t('seedRoutines').map(([name, types, min, level, items]) => ({
    id: uid(), name, types, min, level, items: items.map(([n, st, r, w]) => ({ name: n, sets: st, reps: r, weight: w }))
  }));
  const defaults = () => ({ v: 1, water: { goal: 8, days: {} }, workouts: [], workoutGoal: 150, sleep: { goal: 8, days: {} }, mood: { days: {} },
    exercises: t('seedEx').slice(), routines: seedRoutines(), plan: {} });
  function normalize(s) {
    const out = {
      v: 1,
      water: { goal: LO.clamp(+((s.water || {}).goal) || 8, 1, 30), days: {} },
      workouts: [],
      workoutGoal: LO.clamp(+s.workoutGoal || 150, 10, 2000),
      sleep: { goal: LO.clamp(+((s.sleep || {}).goal) || 8, 4, 12), days: {} },
      mood: { days: {} },
      exercises: Array.isArray(s.exercises) ? [...new Set(s.exercises.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim().slice(0, 40)))].slice(0, 200) : t('seedEx').slice(),
      routines: (Array.isArray(s.routines) ? s.routines : seedRoutines()).filter((r) => r && typeof r.name === 'string' && r.name.trim()).map((r) => ({
        id: String(r.id || uid()), name: r.name.trim().slice(0, 40),
        types: (Array.isArray(r.types) ? r.types : []).filter((x) => WTYPES.includes(x)),
        min: LO.clamp(Math.round(+r.min) || 30, 5, 600), level: [1, 2, 3].includes(r.level) ? r.level : 2, items: normItems(r.items)
      })),
      plan: {}
    };
    Object.entries(s.plan || {}).forEach(([k, wk]) => {
      if (!isKey(k) || !wk || typeof wk !== 'object') return;
      const o = {};
      LO.seq(7).forEach((d) => { const x = wk[d]; if (x && typeof x.r === 'string') o[d] = { r: x.r, time: isTime(x.time) ? x.time : '18:00' }; });
      if (wk.added) o.added = true;
      out.plan[k] = o;
    });
    Object.entries((s.water || {}).days || {}).forEach(([k, v]) => { if (isKey(k) && +v > 0) out.water.days[k] = Math.min(+v, 40); });
    (s.workouts || []).forEach((w) => {
      if (!w || !isKey(w.date) || !(+w.min > 0)) return;
      const types = (Array.isArray(w.types) ? w.types : []).filter((x) => WTYPES.includes(x));
      out.workouts.push({ id: String(w.id || uid()), date: w.date, types: types.length ? types : ['other'], min: Math.min(+w.min, 1440), level: [1, 2, 3].includes(w.level) ? w.level : 2, note: str(w.note), routine: str(w.routine).slice(0, 40), items: normItems(w.items) });
    });
    Object.entries((s.sleep || {}).days || {}).forEach(([k, v]) => {
      if (isKey(k) && v && isTime(v.bed) && isTime(v.wake)) out.sleep.days[k] = { bed: v.bed, wake: v.wake, q: [1, 2, 3].includes(v.q) ? v.q : 2 };
    });
    Object.entries((s.mood || {}).days || {}).forEach(([k, v]) => {
      if (isKey(k) && v && [1, 2, 3, 4, 5].includes(v.v)) out.mood.days[k] = { v: v.v, note: typeof v.note === 'string' ? v.note : '' };
    });
    return out;
  }
  const H = LO.createStore('health', 'planner:health:v1', defaults, normalize);

  /* ---------------- derived ---------------- */
  const sleepHours = (r) => {
    if (!r) return null;
    let m = LO.toMin(r.wake) - LO.toMin(r.bed);
    if (m <= 0) m += 1440;
    return LO.round1(m / 60);
  };
  const itemText = (x) => `${x.name}${x.sets ? ` ${x.sets}×${x.reps || '?'}` : x.reps ? ` ${x.reps}` : ''}${x.weight ? ` ${x.weight}` : ''}`;
  function weekRange(offset) {
    const mon = LO.addDays(LO.mondayOf(new Date()), offset * 7);
    return { mon, a: LO.keyOf(mon), b: LO.keyOf(LO.addDays(mon, 6)) };
  }
  function weekStats(offset) {
    const { a, b } = weekRange(offset);
    const ws = H.s.workouts.filter((w) => w.date >= a && w.date <= b);
    const byType = {};
    const ex = {};
    ws.forEach((w) => {
      w.types.forEach((x) => { byType[x] = (byType[x] || 0) + w.min / w.types.length; });
      w.items.forEach((it) => { const e = ex[it.name] || (ex[it.name] = { n: 0, sets: 0 }); e.n++; e.sets += it.sets || 0; });
    });
    return { n: ws.length, min: ws.reduce((x, w) => x + w.min, 0), days: new Set(ws.map((w) => w.date)).size, byType, ex };
  }
  const minutesOn = (key) => H.s.workouts.filter((w) => w.date === key).reduce((a, w) => a + w.min, 0);
  function weekMinutes() {
    const mon = LO.keyOf(LO.mondayOf(new Date()));
    const today = LO.todayKey();
    return H.s.workouts.filter((w) => w.date >= mon && w.date <= today).reduce((a, w) => a + w.min, 0);
  }
  function activeDaysThisWeek() {
    const mon = LO.keyOf(LO.mondayOf(new Date()));
    return new Set(H.s.workouts.filter((w) => w.date >= mon).map((w) => w.date)).size;
  }
  function sleepAvg7() {
    const vals = LO.seq(7).map((i) => sleepHours(H.s.sleep.days[LO.keyOf(LO.addDays(new Date(), -i))])).filter((x) => x != null);
    return vals.length ? LO.round1(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }

  function face(v, size) {
    const mouths = { 1: 'M10.5 23 Q16 16.5 21.5 23', 2: 'M11 22 Q16 19 21 22', 3: 'M11 21.2 L21 21.2', 4: 'M11 19.5 Q16 24 21 19.5', 5: 'M10 18.5 Q16 27 22 18.5' };
    return `<svg viewBox="0 0 32 32" class="face m${v}" width="${size}" height="${size}" aria-hidden="true"><circle cx="16" cy="16" r="14" class="face-bg"/><circle cx="11.5" cy="13" r="1.7" class="face-eye"/><circle cx="20.5" cy="13" r="1.7" class="face-eye"/><path d="${mouths[v]}" class="face-mouth"/></svg>`;
  }

  /* ---------------- actions ---------------- */
  function addWater(delta) {
    LO.mutate(H, (s) => {
      const k = LO.todayKey();
      const n = LO.clamp((s.water.days[k] || 0) + delta, 0, 40);
      if (n) s.water.days[k] = n; else delete s.water.days[k];
    });
  }
  function setWater(n) {
    LO.mutate(H, (s) => {
      const k = LO.todayKey();
      if (n) s.water.days[k] = n; else delete s.water.days[k];
    });
  }
  // a line read by LO.quickLog on Today: water, mood, sleep or a workout, for today
  function quickRecord(r, msg) {
    LO.mutate(H, (s) => {
      const k = LO.todayKey();
      if (r.kind === 'water') s.water.days[k] = LO.clamp((s.water.days[k] || 0) + r.n, 0, 40);
      else if (r.kind === 'mood') s.mood.days[k] = { v: r.v, note: (s.mood.days[k] || {}).note || '' };
      else if (r.kind === 'sleep') s.sleep.days[k] = { bed: r.bed, wake: r.wake, q: 2 };
      else if (r.kind === 'workout') s.workouts.push({ id: LO.uid(), date: k, types: [WTYPES.includes(r.type) ? r.type : 'other'], min: r.min, level: 2, note: '', routine: '', items: [] });
    }, msg);
  }
  function setMood(v) {
    LO.mutate(H, (s) => {
      const k = LO.todayKey();
      const cur = s.mood.days[k];
      if (cur && cur.v === v) delete s.mood.days[k];
      else s.mood.days[k] = { v, note: cur ? cur.note : '' };
    });
  }

  /* ---------------- breathing ---------------- */
  const PHASES = [['inhale', 4], ['hold', 4], ['exhale', 6]];
  const breath = { running: false, phase: 0, left: 0, cycles: 0, timer: null };
  function breathTick() {
    if (!breath.running) return;
    breath.left--;
    if (breath.left <= 0) {
      breath.phase = (breath.phase + 1) % PHASES.length;
      if (breath.phase === 0) breath.cycles++;
      if (breath.cycles >= 4) { stopBreath(true); return; }
      breath.left = PHASES[breath.phase][1];
    }
    paintBreath();
  }
  function startBreath() {
    breath.running = true; breath.phase = 0; breath.left = PHASES[0][1]; breath.cycles = 0;
    clearInterval(breath.timer);
    breath.timer = setInterval(breathTick, 1000);
    paintBreath();
  }
  function stopBreath(finished) {
    breath.running = false;
    clearInterval(breath.timer);
    paintBreath(finished);
  }
  function paintBreath(finished) {
    const box = $('#breathBox');
    if (!box) return;
    const circle = $('.breath-circle', box);
    const label = $('.breath-label', box);
    const btn = $('[data-breath]', box);
    if (!breath.running) {
      circle.className = 'breath-circle';
      circle.style.transitionDuration = '600ms';
      label.textContent = finished ? t('breathDone') : '';
      btn.textContent = t('start');
      return;
    }
    const [name, secs] = PHASES[breath.phase];
    circle.className = `breath-circle is-${name}`;
    if (breath.left === secs) circle.style.transitionDuration = `${secs}s`;
    label.textContent = `${t(name)} ${breath.left}`;
    btn.textContent = t('stop');
  }

  /* ---------------- page ---------------- */
  const VIEWS = { health: $('#view-health'), rest: $('#view-rest'), calm: $('#view-calm') };
  const TAB_OF = { 'hw-workout': 'health', 'hw-water': 'rest', 'hw-sleep': 'rest', 'hw-mood': 'calm' };
  let part = 'health';
  let view = VIEWS.health;
  const sdraft = { date: '', bed: '23:30', wake: '07:30', q: 2 };

  function render(which) {
    if (which) { part = which; view = VIEWS[which]; }
    const now = new Date();
    const today = LO.todayKey();
    if (!sdraft.date) sdraft.date = today;
    const S = H.s;
    const wk = weekMinutes();
    const cups = S.water.days[today] || 0;
    const lastSleep = sleepHours(S.sleep.days[today]);
    const avg = sleepAvg7();
    const mood = S.mood.days[today];

    let h = `<div class="view-head"><div><h1>${esc(t('title'))}</h1><p class="sub">${esc(LO.dateLine(now))}</p></div></div>`;

    h += '<div class="stats">'
      + `<button type="button" class="stat" data-scroll="hw-workout">${LO.ring(wk / S.workoutGoal, 46)}<div><span class="stat-label">${esc(t('sWorkout'))}</span><b class="stat-num">${wk}<small>/${S.workoutGoal} ${esc(tc('min'))}</small></b><span class="stat-sub">${esc(t('activeDays')(activeDaysThisWeek()))}</span></div></button>`
      + `<button type="button" class="stat" data-scroll="hw-water">${LO.ring(cups / S.water.goal, 46)}<div><span class="stat-label">${esc(t('sWater'))}</span><b class="stat-num">${cups}<small>/${S.water.goal} ${esc(tc('cups'))}</small></b></div></button>`
      + `<button type="button" class="stat" data-scroll="hw-sleep"><div><span class="stat-label">${esc(t('sSleep'))}</span><b class="stat-num">${lastSleep != null ? `${lastSleep}<small> ${esc(tc('hours'))}</small>` : `<small>${esc(t('notLogged'))}</small>`}</b><span class="stat-sub">${avg != null ? esc(t('avg7')(avg)) : esc(t('ofGoal')(S.sleep.goal + ' ' + tc('hours')))}</span></div></button>`
      + `<button type="button" class="stat" data-scroll="hw-mood">${mood ? face(mood.v, 40) : ''}<div><span class="stat-label">${esc(t('sMood'))}</span><b class="stat-num">${mood ? esc(t('moods')[mood.v - 1]) : `<small>${esc(t('notLogged'))}</small>`}</b></div></button>`
      + '</div>';

    const cols = {
      health: [kit.workoutCard(), kit.summaryCard() + kit.planCard()],
      rest: [sleepCard(), waterCard(cups) + checkCard()],
      calm: [moodCard(mood), breathCard()]
    }[part];
    h += `<div class="health-grid"><div class="hcol">${cols[0]}</div><div class="hcol">${cols[1]}</div></div>`;
    view.innerHTML = h;
    paintBreath();
  }


  function sleepCard() {
    const S = H.s;
    const rec = S.sleep.days[sdraft.date];
    const bed = rec ? rec.bed : sdraft.bed;
    const wake = rec ? rec.wake : sdraft.wake;
    const q = rec ? rec.q : sdraft.q;
    let h = `<section class="card hcard" id="hw-sleep"><header class="card-head"><h2>${esc(t('sleepTitle'))}</h2>`
      + `<label class="mini-field">${esc(t('sleepGoal'))}<input type="number" min="4" max="12" step="0.5" class="input sm num" data-goal="sleep" value="${S.sleep.goal}"></label></header>`;
    h += '<form class="sform" data-form="sleep"><div class="form-row three">'
      + `<label class="fld"><span>${esc(t('wakeDate'))}</span><input type="date" class="input" name="sdate" value="${esc(sdraft.date)}" max="${LO.todayKey()}"></label>`
      + `<label class="fld"><span>${esc(t('bed'))}</span><input type="time" class="input" name="sbed" value="${esc(bed)}"></label>`
      + `<label class="fld"><span>${esc(t('wake'))}</span><input type="time" class="input" name="swake" value="${esc(wake)}"></label></div>`
      + `<div class="fld"><span>${esc(t('quality'))}</span><div class="chips">${LO.chips('sq', [1, 2, 3].map((x) => [x, esc(t('qualities')[x - 1])]), 'radio', [q])}</div></div>`
      + `<div class="row"><button type="submit" class="btn primary">${esc(t('saveSleep'))}</button><span class="calc" data-sleepcalc>${esc(t('hoursLine')(sleepHours({ bed, wake })))}</span></div></form>`;
    const days = LO.seq(14).map((i) => LO.addDays(new Date(), i - 13));
    h += `<h3 class="sub-head">${esc(t('last14'))}</h3>`
      + LO.bars(days.map((d, i) => {
        const k = LO.keyOf(d);
        const hrs = sleepHours(S.sleep.days[k]) || 0;
        return { v: hrs, label: i % 2 === 1 ? LO.shortDate(k) : '', title: `${LO.shortDate(k)}: ${hrs} ${tc('hours')}`, cls: hrs && hrs < S.sleep.goal - 1 ? 'c-low' : 'c-sleep' };
      }), { height: 80, goal: S.sleep.goal });
    return `${h}</section>`;
  }

  function waterCard(cups) {
    const S = H.s;
    const g = S.water.goal;
    const total = Math.max(g, cups);
    let glasses = '';
    for (let i = 1; i <= total; i++) {
      glasses += `<button type="button" class="glass${i <= cups ? ' full' : ''}${i > g ? ' extra' : ''}" data-cup="${i}" aria-label="${i}"><span></span></button>`;
    }
    const days = LO.seq(7).map((i) => LO.addDays(new Date(), i - 6));
    return `<section class="card hcard" id="hw-water"><header class="card-head"><h2>${esc(t('waterTitle'))}</h2>`
      + `<label class="mini-field">${esc(t('waterGoal'))}<input type="number" min="1" max="30" class="input sm num" data-goal="water" value="${g}"></label></header>`
      + `<div class="water-row"><button type="button" class="icon-btn lg" data-water="-1" aria-label="-1">${LO.icon.minus}</button>`
      + `<div class="water-count"><b>${cups}</b><span>/ ${g} ${esc(tc('cups'))}</span></div>`
      + `<button type="button" class="btn primary" data-water="1">${LO.icon.plus}<span>1 ${esc(tc('cups'))}</span></button></div>`
      + `<div class="glasses">${glasses}</div><p class="hint">${esc(t('cupNote'))}</p>`
      + `<h3 class="sub-head">${esc(t('last7'))}</h3>`
      + LO.bars(days.map((d) => {
        const k = LO.keyOf(d);
        const n = S.water.days[k] || 0;
        return { v: n, label: tc('daysShort')[LO.wd(d)], title: `${LO.shortDate(k)}: ${n}`, cls: 'c-water' };
      }), { height: 60, goal: g })
      + '</section>';
  }

  function moodCard(mood) {
    const S = H.s;
    const today = LO.todayKey();
    const faces = [1, 2, 3, 4, 5].map((v) => `<button type="button" class="mood-btn${mood && mood.v === v ? ' on' : ''}" data-mood="${v}" aria-pressed="${!!(mood && mood.v === v)}" aria-label="${esc(t('moods')[v - 1])}">${face(v, 38)}<span>${esc(t('moods')[v - 1])}</span></button>`).join('');
    const start = LO.addDays(LO.mondayOf(new Date()), -28);
    let cells = '';
    for (let i = 0; i < 35; i++) {
      const d = LO.addDays(start, i);
      const k = LO.keyOf(d);
      const m = S.mood.days[k];
      const future = k > today;
      cells += `<i class="mcell${m ? ' m' + m.v : ''}${future ? ' future' : ''}${k === today ? ' is-today' : ''}" title="${LO.shortDate(k)}${m ? ': ' + esc(t('moods')[m.v - 1]) : ''}"></i>`;
    }
    return `<section class="card hcard" id="hw-mood"><header class="card-head"><h2>${esc(t('moodTitle'))}</h2></header>`
      + `<div class="moods">${faces}</div>`
      + `<textarea class="input ta" rows="2" maxlength="300" data-moodnote placeholder="${esc(t('moodNotePh'))}"${mood ? '' : ' disabled'}>${esc(mood ? mood.note : '')}</textarea>`
      + `<h3 class="sub-head">${esc(t('last5w'))}</h3><div class="mood-cal"><div class="mcal-head">${tc('daysShort').map((x) => `<span>${esc(x)}</span>`).join('')}</div><div class="mcal">${cells}</div></div>`
      + '</section>';
  }

  function checkCard() {
    const list = LO.tasks ? LO.tasks.dueDailiesBy('health') : [];
    return `<section class="card hcard"><header class="card-head"><h2>${esc(t('checkTitle'))}</h2><a class="link" href="#/tasks">${esc(t('openTasks'))}</a></header>`
      + (list.length ? `<p class="hint check-hint">${esc(t('checkHint'))}</p><ul class="tlist compact">${list.map((d) => LO.tasks.dailyRow(d, true)).join('')}</ul>` : `<p class="empty-note">${esc(t('checkEmpty'))}</p>`)
      + '</section>';
  }

  function breathCard() {
    return `<section class="card hcard"><header class="card-head"><h2>${esc(t('breathTitle'))}</h2></header>`
      + `<p class="hint">${esc(t('breathSub'))}</p>`
      + `<div class="breath" id="breathBox"><div class="breath-stage"><div class="breath-circle"></div></div><p class="breath-label" aria-live="polite"></p>`
      + `<button type="button" class="btn" data-breath>${esc(t('start'))}</button></div></section>`;
  }

  /* ---------------- shared with health-workout.js ---------------- */
  // The Exercise tab's cards and forms live in health-workout.js and fill in the
  // three card functions below.
  const kit = LO.healthKit = {
    H, t, tc, WTYPES, VIEWS, normItems, itemText, weekRange, weekStats, minutesOn, weekMinutes,
    render: () => render(),
    workoutCard: () => '', summaryCard: () => '', planCard: () => ''
  };

  /* ---------------- events ---------------- */
  const on = (type, fn) => Object.values(VIEWS).forEach((v) => v.addEventListener(type, fn));
  if (LO.tasks) Object.values(VIEWS).forEach((v) => LO.tasks.attach(v));

  on('click', (e) => {
    const sc = e.target.closest('[data-scroll]');
    if (sc) {
      const id = sc.dataset.scroll;
      const go = () => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      // another tab: scroll once the router has shown it (its listener runs first)
      if (TAB_OF[id] !== part) { window.addEventListener('hashchange', go, { once: true }); LO.go(TAB_OF[id]); } else go();
      return;
    }
    const w = e.target.closest('[data-water]');
    if (w) { addWater(+w.dataset.water); return; }
    const cup = e.target.closest('[data-cup]');
    if (cup) {
      const n = +cup.dataset.cup;
      const cur = H.s.water.days[LO.todayKey()] || 0;
      setWater(n === cur ? n - 1 : n);
      return;
    }
    const m = e.target.closest('[data-mood]');
    if (m) { setMood(+m.dataset.mood); return; }
    if (e.target.closest('[data-breath]')) { if (breath.running) stopBreath(false); else startBreath(); }
  });

  on('input', (e) => {
    const el = e.target;
    if (el.matches('[data-moodnote]')) {
      const k = LO.todayKey();
      if (H.s.mood.days[k]) { H.s.mood.days[k].note = el.value; H.save(); }
    } else if (el.name === 'sbed' || el.name === 'swake') {
      const f = el.closest('form');
      const calc = $('[data-sleepcalc]', f);
      if (calc) calc.textContent = t('hoursLine')(sleepHours({ bed: $('input[name="sbed"]', f).value || '00:00', wake: $('input[name="swake"]', f).value || '00:00' }));
    }
  });

  on('change', (e) => {
    const el = e.target;
    if (el.name === 'sdate') { sdraft.date = el.value || LO.todayKey(); render(); }
    else if (el.name === 'sbed') sdraft.bed = el.value;
    else if (el.name === 'swake') sdraft.wake = el.value;
    else if (el.name === 'sq') sdraft.q = +el.value;
    else if (el.dataset.goal) {
      const v = +el.value;
      LO.mutate(H, (s) => {
        if (el.dataset.goal === 'workout') s.workoutGoal = LO.clamp(Math.round(v) || 150, 10, 2000);
        else if (el.dataset.goal === 'water') s.water.goal = LO.clamp(Math.round(v) || 8, 1, 30);
        else s.sleep.goal = LO.clamp(v || 8, 4, 12);
      });
    }
  });

  // the workout form is handled in health-workout.js
  on('submit', (e) => {
    const f = e.target.closest('[data-form="sleep"]');
    if (!f) return;
    e.preventDefault();
    const date = $('input[name="sdate"]', f).value || LO.todayKey();
    const bed = $('input[name="sbed"]', f).value;
    const wake = $('input[name="swake"]', f).value;
    if (!bed || !wake) return;
    const q = +(LO.checkedVal(f, 'sq') || 2);
    sdraft.bed = bed; sdraft.wake = wake; sdraft.q = q;
    LO.mutate(H, (s) => { s.sleep.days[date] = { bed, wake, q }; }, t('sleepLogged'));
  });

  Object.keys(VIEWS).forEach((k) => LO.view(k, { render: () => render(k) }));

  /* ---------------- API ---------------- */
  LO.health = {
    store: H,
    face,
    addWater,
    setMood,
    quickRecord,
    sleepHours: (k) => sleepHours(H.s.sleep.days[k]),
    weekMinutes,
    waterToday: () => H.s.water.days[LO.todayKey()] || 0,
    moodToday: () => H.s.mood.days[LO.todayKey()] || null,
    workoutsSince: (k) => H.s.workouts.filter((w) => w.date >= k).length,
    metOn(kind, key) {
      const S = H.s;
      if (kind === 'workout') return S.workouts.some((w) => w.date === key);
      if (kind === 'water') return (S.water.days[key] || 0) >= S.water.goal;
      if (kind === 'sleep') return !!S.sleep.days[key];
      if (kind === 'mood') return !!S.mood.days[key];
      return false;
    },
    weekStats,
    sleepAvg(keys) { const v = keys.map((k) => sleepHours(H.s.sleep.days[k])).filter((x) => x != null); return v.length ? LO.round1(v.reduce((a, b) => a + b, 0) / v.length) : null; },
    activity(add) { H.s.workouts.forEach((w) => add(w.date, 'workouts', 1)); },
    workoutMinSince: (k) => H.s.workouts.filter((w) => w.date >= k).reduce((a, w) => a + w.min, 0)
  };
})();
