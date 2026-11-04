/*
 * Reads a line typed into Today's quick add and says what it records:
 *   喝了2杯水 / water 2          → { kind: 'water', n: 2 }
 *   跑步 30分钟 / gym 1h          → { kind: 'workout', type: 'run', min: 30 }
 *   心情 4 / mood 4              → { kind: 'mood', v: 4 }
 *   睡 23:30-7:10 / slept 0:30-8 → { kind: 'sleep', bed: '23:30', wake: '07:10' }
 *   花了 25 午饭 / lunch spent 12 → { kind: 'spend', amount: 25, note: '午饭' }
 * Anything else is null, and Today adds it as a to-do.
 *
 * LO.quickLog has no page or storage behind it, so tests can run it on its own.
 */
(() => {
  'use strict';
  const LO = window.LO;

  const TYPES = [
    ['run', /跑步|慢跑|跑了|\brun(ning)?\b|\bjog(ging)?\b|\bran\b/i],
    ['walk', /散步|走路|徒步|\bwalk(ed|ing)?\b|\bhik(e|ed|ing)\b/i],
    ['gym', /健身|力量|撸铁|\bgym\b|\blift(ing)?\b|\bweights\b/i],
    ['yoga', /瑜伽|普拉提|\byoga\b|\bpilates\b/i],
    ['swim', /游泳|\bswim(ming)?\b|\bswam\b/i],
    ['bike', /骑车|骑行|单车|\bbik(e|ed|ing)\b|\bcycl(ing|ed)\b/i],
    ['ball', /打球|篮球|羽毛球|网球|足球|排球|乒乓|\b(basketball|tennis|soccer|badminton|volleyball)\b/i],
    ['dance', /跳舞|舞蹈|\bdanc(e|ed|ing)\b/i],
    ['stretch', /拉伸|\bstretch(ed|ing)?\b/i],
    ['other', /运动|锻炼|\bworkout\b|\bexercis(e|ed)\b/i]
  ];
  const DUR = /(\d+(?:\.\d+)?)\s*(分钟|分|小时|个小时|mins?|minutes?|m|hours?|hrs?|h)(?![a-z])/i;

  const time = (s) => {
    const m = /^(\d{1,2})(?:[:：](\d{2}))?$/.exec(s);
    if (!m || +m[1] > 23 || (m[2] && +m[2] > 59)) return '';
    return `${m[1].padStart(2, '0')}:${m[2] || '00'}`;
  };

  function quickLog(text) {
    const s = String(text || '').trim();
    if (!s || s.length > 60) return null;
    let m;

    if ((m = /^喝了?\s*(\d+)?\s*(?:杯|瓶)?\s*水$/.exec(s)) || (m = /^喝水\s*(\d+)\s*杯?$/.exec(s))) return { kind: 'water', n: Math.min(+(m[1] || 1), 20) };
    if ((m = /^(?:drank\s+)?(\d+)?\s*(?:cups?|glass(?:es)?)?\s*(?:of\s+)?water(?:\s+(\d+))?$/i.exec(s))) return { kind: 'water', n: Math.min(+(m[1] || m[2] || 1), 20) };

    if ((m = /^(?:心情|mood)\s*[:：]?\s*([1-5])\s*(?:分|\/\s*5)?$/i.exec(s))) return { kind: 'mood', v: +m[1] };

    if ((m = /^(?:睡觉?了?|sleep|slept)\s*(\d{1,2}(?:[:：]\d{2})?)\s*(?:[-–~到至]|to)\s*(\d{1,2}(?:[:：]\d{2})?)$/i.exec(s))) {
      const bed = time(m[1].replace('：', ':'));
      const wake = time(m[2].replace('：', ':'));
      if (bed && wake && bed !== wake) return { kind: 'sleep', bed, wake };
    }

    const money = '[$¥￥]?\\s*(\\d+(?:\\.\\d{1,2})?)\\s*(?:元|块钱?|刀|美元|dollars?|bucks?)?';
    if ((m = new RegExp(`^(?:花了?|spent|paid)\\s*${money}\\s*(.*)$`, 'i').exec(s)) || (m = new RegExp(`^(.+?)\\s*(?:花了?|spent|paid)\\s*${money}$`, 'i').exec(s))) {
      const numFirst = /^\d/.test(m[1]);
      const amount = +(numFirst ? m[1] : m[2]);
      const note = (numFirst ? m[2] : m[1]).replace(/^(on|for)\s+/i, '').trim();
      if (amount > 0) return { kind: 'spend', amount, note };
    }

    const d = DUR.exec(s);
    const type = TYPES.find(([, re]) => re.test(s));
    if (d && type) {
      // what's left once the activity and the duration are taken out should be short
      const rest = s.replace(d[0], '').replace(type[1], '').replace(/[了\s,，.。]+/g, '');
      if (rest.length <= 4) {
        const n = +d[1];
        const min = Math.round(/^(小时|个小时|h|hours?|hrs?)$/i.test(d[2]) ? n * 60 : n);
        if (min > 0 && min <= 600) return { kind: 'workout', type: type[0], min };
      }
    }
    return null;
  }

  LO.quickLog = quickLog;
})();
