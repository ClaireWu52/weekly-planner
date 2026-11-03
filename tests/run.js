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
['js/travel-calc.js', 'js/quick-date.js', 'js/task-calc.js', 'js/ics-parse.js', 'tests/harness.js', 'tests/travel-calc.test.js', 'tests/quick-date.test.js', 'tests/task-calc.test.js', 'tests/ics-parse.test.js'].forEach((f) => {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
});

const results = globalThis.runTests();
const failed = results.filter((r) => r.error);
results.forEach((r) => console.log(`${r.error ? '✗' : '✓'} ${r.name}${r.error ? `\n    ${r.error}` : ''}`));
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
