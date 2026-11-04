/*
 * Tests for js/quick-log.js: reading water, workouts, mood, sleep and spending
 * out of a line typed into Today's quick add.
 */
(() => {
  'use strict';
  const q = window.LO.quickLog;

  test('quickLog: water', () => {
    eq(q('喝水'), { kind: 'water', n: 1 });
    eq(q('喝了2杯水'), { kind: 'water', n: 2 });
    eq(q('喝水 3杯'), { kind: 'water', n: 3 });
    eq(q('water'), { kind: 'water', n: 1 });
    eq(q('2 cups of water'), { kind: 'water', n: 2 });
    eq(q('water 3'), { kind: 'water', n: 3 });
  });

  test('quickLog: workouts with a type and a duration', () => {
    eq(q('跑步 30分钟'), { kind: 'workout', type: 'run', min: 30 });
    eq(q('健身1小时'), { kind: 'workout', type: 'gym', min: 60 });
    eq(q('游泳了 45 分钟'), { kind: 'workout', type: 'swim', min: 45 });
    eq(q('yoga 20 min'), { kind: 'workout', type: 'yoga', min: 20 });
    eq(q('gym 1.5h'), { kind: 'workout', type: 'gym', min: 90 });
    eq(q('运动 40分钟'), { kind: 'workout', type: 'other', min: 40 });
  });

  test('quickLog: a to-do that mentions an activity stays a to-do', () => {
    eq(q('跑步'), null, 'no duration');
    eq(q('报名周六的 5 公里跑步比赛 30 分钟前到'), null, 'too much else in it');
    eq(q('read chapter 3 for 30 min'), null, 'no activity');
  });

  test('quickLog: mood', () => {
    eq(q('心情 4'), { kind: 'mood', v: 4 });
    eq(q('mood: 5'), { kind: 'mood', v: 5 });
    eq(q('心情 7'), null);
  });

  test('quickLog: sleep', () => {
    eq(q('睡 23:30-7:10'), { kind: 'sleep', bed: '23:30', wake: '07:10' });
    eq(q('slept 0:30 to 8'), { kind: 'sleep', bed: '00:30', wake: '08:00' });
    eq(q('睡觉 25:00-7:00'), null);
  });

  test('quickLog: spending, amount before or after', () => {
    eq(q('花了 25 午饭'), { kind: 'spend', amount: 25, note: '午饭' });
    eq(q('花 12.5元 咖啡'), { kind: 'spend', amount: 12.5, note: '咖啡' });
    eq(q('午饭花了25块'), { kind: 'spend', amount: 25, note: '午饭' });
    eq(q('spent $8 on coffee'), { kind: 'spend', amount: 8, note: 'coffee' });
    eq(q('lunch spent 12'), { kind: 'spend', amount: 12, note: 'lunch' });
  });

  test('quickLog: ordinary to-dos', () => {
    eq(q('周五 交作业'), null);
    eq(q('essay due fri'), null);
    eq(q(''), null);
  });
})();
