#!/usr/bin/env node
/*
 * Runs the tests in Node, with no packages to install:  node tests/run.js
 * Exits with 1 when any test fails, so it can also run before a deploy.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
// the code under test reads window.LO, as it does in the browser
globalThis.window = globalThis;
globalThis.LO = {};
['js/travel-calc.js', 'js/quick-date.js', 'js/task-calc.js', 'js/ics-parse.js', 'js/schedule-calc.js', 'js/sync-photos.js', 'js/sync-merge.js', 'js/term-calc.js', 'js/quick-log.js', 'js/insight-calc.js', 'js/dates-calc.js', 'tests/harness.js', 'tests/travel-calc.test.js', 'tests/quick-date.test.js', 'tests/task-calc.test.js', 'tests/ics-parse.test.js', 'tests/schedule-calc.test.js', 'tests/sync-photos.test.js', 'tests/sync-merge.test.js', 'tests/term-calc.test.js', 'tests/quick-log.test.js', 'tests/insight-calc.test.js', 'tests/dates-calc.test.js'].forEach((f) => {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
});

const results = globalThis.runTests();
const failed = results.filter((r) => r.error);
results.forEach((r) => console.log(`${r.error ? '✗' : '✓'} ${r.name}${r.error ? `\n    ${r.error}` : ''}`));
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
