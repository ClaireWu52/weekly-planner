/*
 * Health page: workouts, water, sleep, mood, health check-ins and a
 * one-minute breathing exercise.
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
      checkTitle: '健康打卡', checkEmpty: '“健康”分类的每日任务会出现在这里。', openTasks: '去任务页添加',
      breathTitle: '呼吸放松', breathSub: '跟着圆圈呼吸一分钟：吸气 4 秒，屏息 4 秒，呼气 6 秒。',
      start: '开始', stop: '停止', inhale: '吸气', hold: '屏息', exhale: '呼气', breathDone: '做完了。慢慢回到手上的事。'
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
      checkTitle: 'Health check-ins', checkEmpty: 'Dailies in the Health category show up here.', openTasks: 'Add on Tasks',
      breathTitle: 'Breathe', breathSub: 'Follow the circle for a minute: in for 4, hold for 4, out for 6.',
      start: 'Start', stop: 'Stop', inhale: 'Breathe in', hold: 'Hold', exhale: 'Breathe out', breathDone: 'Done. Ease back into your day.'
    }
  });
  const t = LO.ns('health');
  const tc = LO.ns('common');

  /* ---------------- data ---------------- */
  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const isTime = (v) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
  const defaults = () => ({ v: 1, water: { goal: 8, days: {} }, workouts: [], workoutGoal: 150, sleep: { goal: 8, days: {} }, mood: { days: {} } });
  function normalize(s) {
    const out = {
      v: 1,
      water: { goal: LO.clamp(+((s.water || {}).goal) || 8, 1, 30), days: {} },
      workouts: [],
      workoutGoal: LO.clamp(+s.workoutGoal || 150, 10, 2000),
      sleep: { goal: LO.clamp(+((s.sleep || {}).goal) || 8, 4, 12), days: {} },
      mood: { days: {} }
    };
    Object.entries((s.water || {}).days || {}).forEach(([k, v]) => { if (isKey(k) && +v > 0) out.water.days[k] = Math.min(+v, 40); });
    (s.workouts || []).forEach((w) => {
      if (!w || !isKey(w.date) || !(+w.min > 0)) return;
      const types = (Array.isArray(w.types) ? w.types : []).filter((x) => WTYPES.includes(x));
      out.workouts.push({ id: String(w.id || uid()), date: w.date, types: types.length ? types : ['other'], min: Math.min(+w.min, 1440), level: [1, 2, 3].includes(w.level) ? w.level : 2, note: typeof w.note === 'string' ? w.note : '' });
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
  const view = $('#view-health');
  const draft = { date: '', types: [], min: '', level: 2, note: '' };
  const sdraft = { date: '', bed: '23:30', wake: '07:30', q: 2 };

  function render() {
    const now = new Date();
    const today = LO.todayKey();
    if (!draft.date) draft.date = today;
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

    h += '<div class="health-grid"><div class="hcol">';
    h += workoutCard();
    h += sleepCard();
    h += '</div><div class="hcol">';
    h += waterCard(cups);
    h += moodCard(mood);
    h += checkCard();
    h += breathCard();
    h += '</div></div>';
    view.innerHTML = h;
    paintBreath();
  }

  function workoutCard() {
    const S = H.s;
    const wk = weekMinutes();
    let h = `<section class="card hcard" id="hw-workout"><header class="card-head"><h2>${esc(t('wTitle'))}</h2>`
      + `<label class="mini-field">${esc(t('weekGoal'))}<input type="number" min="10" max="2000" step="10" class="input sm num" data-goal="workout" value="${S.workoutGoal}"></label></header>`;
    h += `<div class="progress"><span style="width:${LO.clamp(wk / S.workoutGoal, 0, 1) * 100}%"></span></div>`
      + `<p class="progress-label">${wk} / ${S.workoutGoal} ${esc(tc('min'))}</p>`;
    h += '<form class="wform" data-form="workout">'
      + `<div class="fld"><span>${esc(t('types'))}</span><div class="chips">${LO.chips('wtype', WTYPES.map((x) => [x, esc(t('wt.' + x))]), 'checkbox', draft.types)}</div></div>`
      + '<div class="form-row">'
      + `<label class="fld"><span>${esc(t('date'))}</span><input type="date" class="input" name="wdate" value="${esc(draft.date)}" max="${LO.todayKey()}"></label>`
      + `<label class="fld"><span>${esc(t('minutes'))}</span><input type="number" class="input" name="wmin" min="1" max="1440" inputmode="numeric" value="${esc(draft.min)}"></label>`
      + '</div>'
      + `<div class="quick">${[15, 30, 45, 60, 90].map((m) => `<button type="button" class="btn sm" data-qmin="${m}">${m}</button>`).join('')}</div>`
      + `<div class="fld"><span>${esc(t('level'))}</span><div class="chips">${LO.chips('wlevel', [1, 2, 3].map((l) => [l, esc(t('levels')[l - 1])]), 'radio', [draft.level])}</div></div>`
      + `<label class="fld"><span>${esc(t('note'))}</span><input class="input" name="wnote" maxlength="200" value="${esc(draft.note)}" placeholder="${esc(t('notePh'))}"></label>`
      + `<p class="err" data-err="workout"></p><button type="submit" class="btn primary">${esc(t('log'))}</button></form>`;

    const days = LO.seq(30).map((i) => LO.addDays(new Date(), i - 29));
    h += `<h3 class="sub-head">${esc(t('last30'))}</h3>`
      + LO.bars(days.map((d, i) => {
        const k = LO.keyOf(d);
        const m = minutesOn(k);
        return { v: m, label: i % 7 === 1 || i === 29 ? LO.shortDate(k) : '', title: `${LO.shortDate(k)}: ${m} ${tc('min')}`, cls: 'c-work' };
      }), { height: 80 });

    const list = S.workouts.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 8);
    h += `<h3 class="sub-head">${esc(t('recent'))}</h3>`;
    if (!list.length) h += `<p class="empty-note">${esc(t('noWorkouts'))}</p>`;
    else {
      h += `<ul class="log-list">${list.map((w) => `<li><span class="log-date">${LO.shortDate(w.date)}</span>`
        + `<span class="log-main"><b>${esc(w.types.map((x) => t('wt.' + x)).join('、'))}</b> ${w.min} ${esc(tc('min'))}<span class="lvl l${w.level}">${esc(t('levels')[w.level - 1])}</span>`
        + `${w.note ? `<span class="log-note">${esc(w.note)}</span>` : ''}</span>`
        + `<button type="button" class="icon-btn sm ghost" data-delw="${esc(w.id)}" aria-label="${esc(tc('delete'))}">${LO.icon.x}</button></li>`).join('')}</ul>`;
    }
    return `${h}</section>`;
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
      + (list.length ? `<ul class="tlist compact">${list.map((d) => LO.tasks.dailyRow(d, true)).join('')}</ul>` : `<p class="empty-note">${esc(t('checkEmpty'))}</p>`)
      + '</section>';
  }

  function breathCard() {
    return `<section class="card hcard"><header class="card-head"><h2>${esc(t('breathTitle'))}</h2></header>`
      + `<p class="hint">${esc(t('breathSub'))}</p>`
      + `<div class="breath" id="breathBox"><div class="breath-stage"><div class="breath-circle"></div></div><p class="breath-label" aria-live="polite"></p>`
      + `<button type="button" class="btn" data-breath>${esc(t('start'))}</button></div></section>`;
  }

  /* ---------------- events ---------------- */
  if (LO.tasks) LO.tasks.attach(view);

  view.addEventListener('click', (e) => {
    const sc = e.target.closest('[data-scroll]');
    if (sc) { const el = document.getElementById(sc.dataset.scroll); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
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
    const q = e.target.closest('[data-qmin]');
    if (q) { draft.min = q.dataset.qmin; const i = $('input[name="wmin"]', view); if (i) i.value = draft.min; return; }
    const del = e.target.closest('[data-delw]');
    if (del) { const id = del.dataset.delw; LO.mutate(H, (s) => { s.workouts = s.workouts.filter((x) => x.id !== id); }, tc('deleted')); return; }
    if (e.target.closest('[data-breath]')) { if (breath.running) stopBreath(false); else startBreath(); }
  });

  view.addEventListener('input', (e) => {
    const el = e.target;
    if (el.name === 'wnote') draft.note = el.value;
    else if (el.name === 'wmin') draft.min = el.value;
    else if (el.matches('[data-moodnote]')) {
      const k = LO.todayKey();
      if (H.s.mood.days[k]) { H.s.mood.days[k].note = el.value; H.save(); }
    } else if (el.name === 'sbed' || el.name === 'swake') {
      const f = el.closest('form');
      const calc = $('[data-sleepcalc]', f);
      if (calc) calc.textContent = t('hoursLine')(sleepHours({ bed: $('input[name="sbed"]', f).value || '00:00', wake: $('input[name="swake"]', f).value || '00:00' }));
    }
  });

  view.addEventListener('change', (e) => {
    const el = e.target;
    if (el.name === 'wtype') draft.types = LO.checkedVals(view, 'wtype');
    else if (el.name === 'wlevel') draft.level = +el.value;
    else if (el.name === 'wdate') draft.date = el.value || LO.todayKey();
    else if (el.name === 'sdate') { sdraft.date = el.value || LO.todayKey(); render(); }
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

  view.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form]');
    if (!f) return;
    e.preventDefault();
    if (f.dataset.form === 'workout') {
      const types = LO.checkedVals(f, 'wtype');
      const min = Math.round(+$('input[name="wmin"]', f).value);
      const err = $('[data-err="workout"]', f);
      if (!types.length) { err.textContent = t('errTypes'); return; }
      if (!(min > 0)) { err.textContent = t('errMin'); return; }
      const rec = { id: uid(), date: $('input[name="wdate"]', f).value || LO.todayKey(), types, min: Math.min(min, 1440), level: +(LO.checkedVal(f, 'wlevel') || 2), note: $('input[name="wnote"]', f).value.trim() };
      draft.types = []; draft.min = ''; draft.note = ''; draft.level = 2;
      LO.mutate(H, (s) => { s.workouts.push(rec); }, t('logged'));
    } else {
      const date = $('input[name="sdate"]', f).value || LO.todayKey();
      const bed = $('input[name="sbed"]', f).value;
      const wake = $('input[name="swake"]', f).value;
      if (!bed || !wake) return;
      const q = +(LO.checkedVal(f, 'sq') || 2);
      sdraft.bed = bed; sdraft.wake = wake; sdraft.q = q;
      LO.mutate(H, (s) => { s.sleep.days[date] = { bed, wake, q }; }, t('sleepLogged'));
    }
  });

  LO.view('health', { render });

  /* ---------------- API ---------------- */
  LO.health = {
    store: H,
    face,
    addWater,
    setMood,
    sleepHours: (k) => sleepHours(H.s.sleep.days[k]),
    weekMinutes,
    waterToday: () => H.s.water.days[LO.todayKey()] || 0,
    moodToday: () => H.s.mood.days[LO.todayKey()] || null,
    workoutsSince: (k) => H.s.workouts.filter((w) => w.date >= k).length,
    activity(add) { H.s.workouts.forEach((w) => add(w.date, 'workouts', 1)); },
    workoutMinSince: (k) => H.s.workouts.filter((w) => w.date >= k).reduce((a, w) => a + w.min, 0)
  };
})();
