/*
 * Tests for LO.syncMerge in js/sync-merge.js: combining two devices' copies of a
 * section against the copy they last agreed on.
 */
(() => {
  'use strict';
  const { merge3 } = window.LO.syncMerge;
  const todo = (id, title, extra) => Object.assign({ id, title, done: false }, extra);

  test('syncMerge: to-dos added on each device are both kept', () => {
    const base = { todos: [todo('a', 'A')] };
    const local = { todos: [todo('a', 'A'), todo('b', 'B')] };
    const remote = { todos: [todo('a', 'A'), todo('c', 'C')] };
    eq(merge3(base, local, remote, true).todos.map((x) => x.id), ['a', 'b', 'c']);
  });

  test('syncMerge: a to-do deleted on one device stays deleted', () => {
    const base = { todos: [todo('a', 'A'), todo('b', 'B')] };
    const local = { todos: [todo('a', 'A')] };
    const remote = { todos: [todo('a', 'A'), todo('b', 'B'), todo('c', 'C')] };
    eq(merge3(base, local, remote, false).todos.map((x) => x.id), ['a', 'c']);
  });

  test('syncMerge: deleted on one device but edited on the other, the edit is kept', () => {
    const base = { todos: [todo('a', 'A')] };
    const local = { todos: [] };
    const remote = { todos: [todo('a', 'A', { done: true })] };
    eq(merge3(base, local, remote, true).todos, [todo('a', 'A', { done: true })]);
  });

  test('syncMerge: different fields of the same item changed on each side are both kept', () => {
    const base = { todos: [todo('a', 'A')] };
    const local = { todos: [todo('a', 'A renamed')] };
    const remote = { todos: [todo('a', 'A', { done: true })] };
    eq(merge3(base, local, remote, false).todos, [todo('a', 'A renamed', { done: true })]);
  });

  test('syncMerge: the same field changed on both sides goes to the winner', () => {
    const base = { todos: [todo('a', 'A')] };
    const local = { todos: [todo('a', 'Mine')] };
    const remote = { todos: [todo('a', 'Theirs')] };
    eq(merge3(base, local, remote, true).todos[0].title, 'Mine');
    eq(merge3(base, local, remote, false).todos[0].title, 'Theirs');
  });

  test('syncMerge: check-ins kept by date are combined', () => {
    const base = { dailies: [{ id: 'd', done: { '2026-11-01': 1 } }] };
    const local = { dailies: [{ id: 'd', done: { '2026-11-01': 1, '2026-11-02': 1 } }] };
    const remote = { dailies: [{ id: 'd', done: { '2026-11-01': 1, '2026-11-03': 1 } }] };
    eq(merge3(base, local, remote, true).dailies[0].done, { '2026-11-01': 1, '2026-11-02': 1, '2026-11-03': 1 });
  });

  test('syncMerge: a date key removed on one side is removed', () => {
    const base = { log: { a: 1, b: 2 } };
    eq(merge3(base, { log: { a: 1 } }, { log: { a: 1, b: 2, c: 3 } }, true), { log: { a: 1, c: 3 } });
  });

  test('syncMerge: a reorder on one side is followed, new items keep their place', () => {
    const base = [todo('a', 'A'), todo('b', 'B'), todo('c', 'C')];
    const local = [todo('c', 'C'), todo('a', 'A'), todo('b', 'B')];
    const remote = [todo('a', 'A'), todo('x', 'X'), todo('b', 'B'), todo('c', 'C')];
    eq(merge3(base, local, remote, true).map((x) => x.id), ['c', 'a', 'x', 'b']);
    eq(merge3(base, remote, local, true).map((x) => x.id), ['c', 'a', 'x', 'b']);
  });

  test('syncMerge: plain lists are taken whole from the side that changed', () => {
    const base = { days: [1, 1, 1, 1, 1, 0, 0] };
    const remote = { days: [1, 0, 1, 0, 1, 0, 0] };
    eq(merge3(base, base, remote, true), remote);
  });

  test('syncMerge: no change on either side leaves it as it is', () => {
    const s = { v: 1, todos: [todo('a', 'A')], n: 3 };
    eq(merge3(s, s, JSON.parse(JSON.stringify(s)), false), s);
  });

  test('syncMerge: a key added on both sides with different values goes to the winner', () => {
    eq(merge3({}, { k: 1 }, { k: 2 }, false), { k: 2 });
    eq(merge3({}, { k: { a: 1 } }, { k: { b: 2 } }, false), { k: { a: 1, b: 2 } });
  });
})();
