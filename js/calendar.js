/*
 * Export to calendar: builds an .ics file with the weekly schedule (as
 * repeating events), one-off events, to-do deadlines and trip bookings, with reminders,
 * so the phone's own calendar can send notifications.
 * Also imports a calendar file (for example the class schedule from the school's
 * system or Google Calendar) into the schedule, after showing what it will add.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc } = LO;
  const CFG_KEY = 'planner:calendar';

  LO.strings('calendar', {
    zh: {
      title: '导出到日历', intro: '生成一个日历文件（.ics），导入手机或电脑自带的日历后，课程和截止日期就会按时提醒你。',
      what: '要导出的内容', classes: '每周固定的课表安排', once: '只在某一周的安排（今天以后的）', todos: '待办的截止日期',
      trips: '旅行的行程、交通和住宿（航班提前 3 小时提醒，其他提前 1 小时）',
      until: '每周安排重复到', untilHint: '没有设结束日期的安排会重复到这一天，比如期末。',
      alarm: '课前提醒', alarms: { 0: '不提醒', 10: '提前 10 分钟', 15: '提前 15 分钟', 30: '提前 30 分钟', 60: '提前 1 小时' },
      todoAlarm: '截止日期会在前一天早上 9 点提醒。',
      howTitle: '怎么导入',
      how: ['iPhone：用 Safari 打开网站，下载后点开文件，选“全部添加”。', 'Google 日历：在电脑上打开 calendar.google.com → 设置 → 导入和导出 → 选这个文件。建议先新建一个叫“我的计划本”的日历，导入到它里面。', 'Mac：双击下载的文件，用“日历”打开。'],
      reimport: '课表改了以后要重新导出。重新导入前，先删掉上次导入的那个日历，免得重复。',
      download: '下载日历文件', none: '没有可以导出的内容。', done: (n) => `已导出 ${n} 个日程`, due: (x) => `截止：${x}`,
      impTitle: '从日历导入课表', impPick: '选一个日历文件（.ics）。学校选课系统、Google 日历、Outlook 都能导出这种文件。',
      impFound: (w, o) => `找到 ${w} 门每周课程${o ? `、${o} 个单次安排` : ''}。`, impSkipped: (a, x) => [a ? `${a} 个全天事件（比如假期）` : '', x ? `${x} 个按月或按年重复的事件` : ''].filter(Boolean).join('、') + '没有导入。',
      impWeekly: '每周', impOnce: '单次', impMore: (n) => `还有 ${n} 个…`, impCat: '导入成哪一类', impNote: '时间按文件里写的导入。如果日历用的是别的时区，导入后看一下时间对不对。导入后可以撤销。',
      impGo: '导入', impNone: '这个文件里没有可以导入的课程或安排。', impBad: '这个文件读不出来，换一个 .ics 文件试试。',
      impDone: (o) => (o.weekly || o.once ? `已导入 ${[o.weekly ? `${o.weekly} 门每周课程` : '', o.once ? `${o.once} 个单次安排` : ''].filter(Boolean).join('、')}` : '这些都已经在课表里了')
    },
    en: {
      title: 'Export to calendar', intro: 'Creates a calendar file (.ics). Import it into your phone or computer calendar and you will get reminders for classes and deadlines.',
      what: 'What to include', classes: 'Weekly schedule', once: 'This-week-only events (from today on)', todos: 'To-do due dates',
      trips: 'Trips, transport and stays (flights remind you 3 hours before, others 1 hour)',
      until: 'Repeat weekly events until', untilHint: 'Weekly events without an end date repeat until this day, e.g. the end of the semester.',
      alarm: 'Reminder before events', alarms: { 0: 'None', 10: '10 min before', 15: '15 min before', 30: '30 min before', 60: '1 hour before' },
      todoAlarm: 'Due dates remind you at 9am the day before.',
      howTitle: 'How to import',
      how: ['iPhone: open the site in Safari, download, tap the file and choose "Add All".', 'Google Calendar: on a computer open calendar.google.com, Settings, Import & export, and pick the file. It helps to create a calendar called "My Planner" first and import into it.', 'Mac: double-click the downloaded file to open it in Calendar.'],
      reimport: 'Export again after changing your schedule. Before importing again, delete the calendar you imported last time to avoid duplicates.',
      download: 'Download calendar file', none: 'Nothing to export.', done: (n) => `Exported ${n} events`, due: (x) => `Due: ${x}`,
      impTitle: 'Import from a calendar', impPick: "Pick a calendar file (.ics). Your school's course system, Google Calendar and Outlook can all export one.",
      impFound: (w, o) => `Found ${w} weekly class${w === 1 ? '' : 'es'}${o ? ` and ${o} one-off event${o === 1 ? '' : 's'}` : ''}.`, impSkipped: (a, x) => `Not imported: ${[a ? `${a} all-day event${a === 1 ? '' : 's'} (like holidays)` : '', x ? `${x} monthly or yearly event${x === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ')}.`,
      impWeekly: 'Weekly', impOnce: 'Once', impMore: (n) => `${n} more…`, impCat: 'Import as', impNote: "Times are imported as written. If the calendar is in another time zone, check them afterwards. You can undo the import.",
      impGo: 'Import', impNone: 'Nothing in this file can go on the schedule.', impBad: "Couldn't read this file. Try another .ics file.",
      impDone: (o) => (o.weekly || o.once ? `Imported ${[o.weekly ? `${o.weekly} weekly class${o.weekly === 1 ? '' : 'es'}` : '', o.once ? `${o.once} one-off event${o.once === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ')}` : 'All of these are already on the schedule')
    }
  });
  const t = LO.ns('calendar');

  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const stamp = (d, min) => `${ymd(d)}T${pad(Math.floor(min / 60) % 24)}${pad(min % 60)}00`;
  // Local date-time for a day key plus minutes, rolling into the next day when needed
  const at = (key, min) => { const d = LO.parseKey(key); d.setMinutes(min); return `${ymd(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`; };
  const escText = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  function fold(line) {
    // RFC 5545: lines longer than 75 octets continue on the next line after a space
    const enc = new TextEncoder();
    const out = [];
    let cur = '';
    let bytes = 0;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
      cur += ch;
      bytes += b;
    }
    out.push(cur);
    return out.join('\r\n ');
  }

  function loadCfg() {
    const d = new Date();
    const def = { classes: true, once: true, todos: true, trips: true, until: LO.keyOf(LO.addDays(d, 120)), alarm: 15 };
    const c = LO.readJSON(CFG_KEY) || {};
    return Object.assign(def, c);
  }

  // Build the .ics text; returns { text, count }
  function build(cfg) {
    const ev = [];
    const now = new Date();
    const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
    const alarm = (title, trigger) => (trigger ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escText(title)}`, `TRIGGER:${trigger}`, 'END:VALARM'] : []);
    const st = LO.planner ? LO.planner.raw() : null;
    const today = LO.todayKey();
    const thisMon = LO.mondayOf(now);

    if (st && cfg.classes) {
      st.recurring.forEach((e) => {
        let first = LO.addDays(thisMon, e.day);
        if (e.from) { const f = LO.parseKey(e.from); while (LO.keyOf(first) < e.from) first = LO.addDays(first, 7); void f; }
        const untilKey = e.until && e.until < cfg.until ? e.until : cfg.until;
        if (LO.keyOf(first) > untilKey) return;
        const ex = Object.entries(st.weeks || {}).filter(([, w]) => (w.skipped || []).includes(e.id))
          .map(([k]) => stamp(LO.addDays(LO.parseKey(k), e.day), e.start));
        ev.push(['BEGIN:VEVENT', `UID:${e.id}@my-planner`, `DTSTAMP:${dtstamp}`, `DTSTART:${stamp(first, e.start)}`,
          `DTEND:${stamp(first, Math.min(e.end, 1439))}`, `RRULE:FREQ=WEEKLY;UNTIL=${untilKey.replace(/-/g, '')}T235959`,
          ...ex.map((x) => `EXDATE:${x}`), `SUMMARY:${escText(e.title)}`,
          ...(e.place ? [`LOCATION:${escText(e.place)}`] : []), ...(e.note ? [`DESCRIPTION:${escText(e.note)}`] : []),
          ...alarm(e.title, +cfg.alarm ? `-PT${+cfg.alarm}M` : ''), 'END:VEVENT']);
      });
    }
    if (st && cfg.once) {
      Object.entries(st.weeks || {}).forEach(([k, w]) => {
        (w.added || []).forEach((e) => {
          const d = LO.addDays(LO.parseKey(k), e.day);
          if (LO.keyOf(d) < today) return;
          ev.push(['BEGIN:VEVENT', `UID:${e.id}@my-planner`, `DTSTAMP:${dtstamp}`, `DTSTART:${stamp(d, e.start)}`,
            `DTEND:${stamp(d, Math.min(e.end, 1439))}`, `SUMMARY:${escText(e.title)}`,
            ...(e.place ? [`LOCATION:${escText(e.place)}`] : []), ...(e.note ? [`DESCRIPTION:${escText(e.note)}`] : []),
            ...alarm(e.title, +cfg.alarm ? `-PT${+cfg.alarm}M` : ''), 'END:VEVENT']);
        });
      });
    }
    if (cfg.todos && LO.tasks) {
      LO.tasks.openTodos().filter((x) => x.due && x.due >= today).forEach((x) => {
        const d = LO.parseKey(x.due);
        const title = t('due')(x.title);
        ev.push(['BEGIN:VEVENT', `UID:todo-${x.id}@my-planner`, `DTSTAMP:${dtstamp}`, `DTSTART;VALUE=DATE:${ymd(d)}`,
          `DTEND;VALUE=DATE:${ymd(LO.addDays(d, 1))}`, `SUMMARY:${escText(title)}`, ...(x.notes ? [`DESCRIPTION:${escText(x.notes)}`] : []),
          ...alarm(title, '-PT15H'), 'END:VEVENT']);
      });
    }
    if (cfg.trips && LO.travel) {
      LO.travel.calendarItems().forEach((x) => {
        let when;
        if (x.time == null) {
          when = [`DTSTART;VALUE=DATE:${ymd(LO.parseKey(x.date))}`, `DTEND;VALUE=DATE:${ymd(LO.addDays(LO.parseKey(x.endDate || x.date), 1))}`];
        } else {
          const start = at(x.date, x.time);
          let end = x.endTime != null ? at(x.endDate || x.date, x.endTime) : '';
          if (!end || end <= start) end = at(x.date, x.time + 60);
          when = [`DTSTART:${start}`, `DTEND:${end}`];
        }
        ev.push(['BEGIN:VEVENT', `UID:${x.uid}@my-planner`, `DTSTAMP:${dtstamp}`, ...when, `SUMMARY:${escText(x.title)}`,
          ...(x.location ? [`LOCATION:${escText(x.location)}`] : []), ...(x.desc ? [`DESCRIPTION:${escText(x.desc)}`] : []),
          ...alarm(x.title, x.time == null ? '-PT15H' : x.alarm), 'END:VEVENT']);
      });
    }
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//My Planner//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      `X-WR-CALNAME:${escText(LO.t('app.brand'))}`, ...ev.flat(), 'END:VCALENDAR'];
    return { text: lines.map(fold).join('\r\n') + '\r\n', count: ev.length };
  }

  function open() {
    const c = loadCfg();
    LO.openForm({
      title: t('title'),
      body: `<p class="hint">${esc(t('intro'))}</p>`
        + `<div class="fld"><span>${esc(t('what'))}</span>`
        + ['classes', 'once', 'todos', 'trips'].map((k) => `<label class="check"><input type="checkbox" name="cal_${k}"${c[k] ? ' checked' : ''}>${esc(t(k))}</label>`).join('') + '</div>'
        + `<div class="form-row"><label class="fld"><span>${esc(t('until'))}</span><input class="input" type="date" name="cal_until" value="${esc(c.until)}"></label>`
        + `<label class="fld"><span>${esc(t('alarm'))}</span><select name="cal_alarm">${[0, 10, 15, 30, 60].map((m) => `<option value="${m}"${+c.alarm === m ? ' selected' : ''}>${esc(t('alarms')[m])}</option>`).join('')}</select></label></div>`
        + `<p class="hint">${esc(t('untilHint'))} ${esc(t('todoAlarm'))}</p>`
        + `<h3 class="sub-head">${esc(t('howTitle'))}</h3><ol class="install-steps">${t('how').map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`
        + `<p class="hint">${esc(t('reimport'))}</p>`,
      saveLabel: t('download'),
      onSave(dlg) {
        const cfg = {
          classes: $('input[name="cal_classes"]', dlg).checked, once: $('input[name="cal_once"]', dlg).checked,
          todos: $('input[name="cal_todos"]', dlg).checked, trips: $('input[name="cal_trips"]', dlg).checked, until: $('input[name="cal_until"]', dlg).value || loadCfg().until,
          alarm: +$('select[name="cal_alarm"]', dlg).value
        };
        try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (_) { /* ignore */ }
        const { text, count } = build(cfg);
        if (!count) return t('none');
        const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'my-planner.ics';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        LO.toast(t('done')(count));
        return true;
      }
    });
  }

  /* ---------------- import ---------------- */
  const CATS = ['class', 'study', 'work', 'meeting', 'health', 'life', 'other'];
  const hm = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  function openImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ics,text/calendar';
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      if (!f) return;
      let data;
      try { data = LO.icsParse(await f.text()); } catch (_) { LO.toast(t('impBad')); return; }
      showImport(data);
    });
    input.click();
  }
  function showImport(data) {
    const { weekly, once, skipped } = data;
    if (!weekly.length && !once.length) { LO.toast(t('impNone')); return; }
    const days = LO.t('common.days');
    const sep = LO.lang() === 'zh' ? '、' : ', ';
    const rows = weekly.map((x) => [t('impWeekly'), x.title, `${x.days.map((d) => days[d]).join(sep)} ${hm(x.start)}–${hm(x.end)}`, x.place])
      .concat(once.map((x) => [t('impOnce'), x.title, `${LO.shortDate(x.date)} ${hm(x.start)}–${hm(x.end)}`, x.place]));
    const shown = rows.slice(0, 10);
    const skip = skipped.allDay || skipped.other ? `<p class="hint">${esc(t('impSkipped')(skipped.allDay, skipped.other))}</p>` : '';
    LO.openForm({
      title: t('impTitle'),
      saveLabel: t('impGo'),
      body: `<p>${esc(t('impFound')(weekly.length, once.length))}</p>${skip}`
        + `<ul class="imp-list">${shown.map(([k, title, when, place]) => `<li><span class="imp-kind">${esc(k)}</span><b>${esc(title)}</b><span class="hint">${esc(when)}${place ? ` · ${esc(place)}` : ''}</span></li>`).join('')}`
        + `${rows.length > shown.length ? `<li class="hint">${esc(t('impMore')(rows.length - shown.length))}</li>` : ''}</ul>`
        + `<div class="fld"><span>${esc(t('impCat'))}</span><div class="chips">${LO.chips('impcat', CATS.map((c) => [c, esc(LO.t('planner.cats.' + c))]), 'radio', ['class'])}</div></div>`
        + `<p class="hint">${esc(t('impNote'))}</p>`,
      onSave(dlg) {
        LO.planner.importCalendar(data, LO.checkedVal(dlg, 'impcat') || 'class', t('impDone'));
        LO.go('schedule');
        return true;
      }
    });
  }

  LO.calendar = { open, build, openImport };
})();
