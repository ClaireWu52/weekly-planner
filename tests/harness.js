/*
 * A tiny test harness that works in the browser (tests/index.html) and in Node
 * (tests/run.js). Test files call test(name, fn) and use eq / near / ok inside.
 */
(() => {
  'use strict';
  const g = typeof window !== 'undefined' ? window : globalThis;
  const tests = [];
  const show = (v) => JSON.stringify(v);

  g.test = (name, fn) => { tests.push({ name, fn }); };
  g.ok = (cond, msg) => { if (!cond) throw new Error(msg || 'expected true'); };
  g.eq = (actual, expected, msg) => {
    if (show(actual) !== show(expected)) throw new Error(`${msg ? msg + ': ' : ''}expected ${show(expected)}, got ${show(actual)}`);
  };
  // equal to within a cent, for money
  g.near = (actual, expected, msg) => {
    if (typeof actual !== 'number' || Math.abs(actual - expected) > 0.01) throw new Error(`${msg ? msg + ': ' : ''}expected about ${expected}, got ${show(actual)}`);
  };
  // Runs every test; returns [{ name, error }] with error null when it passed.
  g.runTests = () => tests.map(({ name, fn }) => {
    try { fn(); return { name, error: null }; } catch (e) { return { name, error: e.message }; }
  });
})();
