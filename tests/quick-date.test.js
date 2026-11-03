/*
 * Tests for js/quick-date.js: due dates typed into quick-add.
 */
(() => {
  'use strict';
  const qd = window.LO.quickDate;
  // Tuesday 3 November 2026
  const TUE = new Date(2026, 10, 3, 2, 15);
  const at = (text, today = TUE) => qd(text, today);

  test('quickDate: today, tomorrow and the day after', () => {
    eq(at('今天交作业'), { title: '交作业', due: '2026-11-03' });
    eq(at('明天考试'), { title: '考试', due: '2026-11-04' });
    eq(at('后天 还书'), { title: '还书', due: '2026-11-05' });
    eq(at('大后天交报告'), { title: '交报告', due: '2026-11-06' });
    eq(at('tomorrow call mom'), { title: 'call mom', due: '2026-11-04' });
  });

  test('quickDate: a weekday means the next one, today included', () => {
    eq(at('周五 交作业'), { title: '交作业', due: '2026-11-06' });
    eq(at('交作业周五'), { title: '交作业', due: '2026-11-06' });
    eq(at('星期一 开会'), { title: '开会', due: '2026-11-09' }, 'Monday already passed this week');
    eq(at('周二 交实验报告'), { title: '交实验报告', due: '2026-11-03' }, 'today is Tuesday');
    eq(at('周日 打扫'), { title: '打扫', due: '2026-11-08' });
    eq(at('essay due fri'), { title: 'essay', due: '2026-11-06' });
    eq(at('Friday lab report'), { title: 'lab report', due: '2026-11-06' });
  });

  test('quickDate: next week', () => {
    eq(at('下周三 小组讨论'), { title: '小组讨论', due: '2026-11-11' });
    eq(at('下周二 交报告'), { title: '交报告', due: '2026-11-10' }, 'not today, a week from today');
    eq(at('quiz next mon'), { title: 'quiz', due: '2026-11-09' });
  });

  test('quickDate: month and day, rolling into next year once passed', () => {
    eq(at('交报告 11月20日'), { title: '交报告', due: '2026-11-20' });
    eq(at('12月1号 期末'), { title: '期末', due: '2026-12-01' });
    eq(at('交学费 9月1日'), { title: '交学费', due: '2027-09-01' });
    eq(at('final 12/10'), { title: 'final', due: '2026-12-10' });
    eq(at('交报告 2月30日'), { title: '交报告 2月30日', due: '' }, 'no such day');
  });

  test('quickDate: in a few days', () => {
    eq(at('3天后 还书'), { title: '还书', due: '2026-11-06' });
    eq(at('还书两天后'), { title: '还书', due: '2026-11-05' });
    eq(at('return book in 5 days'), { title: 'return book', due: '2026-11-08' });
  });

  test('quickDate: dates in the middle of the text are left alone', () => {
    eq(at('复习周一的笔记'), { title: '复习周一的笔记', due: '' });
    eq(at('买 1/2 杯量杯'), { title: '买 1/2 杯量杯', due: '' });
    eq(at('1/2杯水'), { title: '1/2杯水', due: '' }, 'a fraction touching text is not a date');
    eq(at('Wedding gift'), { title: 'Wedding gift', due: '' });
    eq(at('fried rice'), { title: 'fried rice', due: '' });
  });

  test('quickDate: a date alone stays the title', () => {
    eq(at('明天'), { title: '明天', due: '' });
    eq(at('  周五  '), { title: '周五', due: '' });
    eq(at(''), { title: '', due: '' });
  });

  test('quickDate: month ends and year ends', () => {
    const dec31 = new Date(2026, 11, 31);
    eq(at('明天 跨年', dec31), { title: '跨年', due: '2027-01-01' });
    eq(at('周五 开学', dec31), { title: '开学', due: '2027-01-01' }, 'Dec 31 2026 is a Thursday');
  });
})();
