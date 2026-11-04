#!/usr/bin/env node
/*
 * Runs the click-through tests (tests/ui.html) in headless Chrome:  node tests/ui-run.js
 * Serves the site on a local port, opens the page and reads the results from it.
 * Needs Chrome or Chromium (GitHub's runners have it; set CHROME=/path to pick one).
 * Exits with 1 when any test fails or the page doesn't finish.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');

const root = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

function findChrome() {
  const list = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'];
  return list.find((p) => p && fs.existsSync(p));
}

const server = http.createServer((req, res) => {
  const file = path.normalize(path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file, (err, buf) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
});

const chrome = findChrome();
if (!chrome) { console.error('Chrome not found; set CHROME to its path.'); process.exit(1); }

server.listen(0, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}/tests/ui.html`;
  const args = ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
    `--user-data-dir=${fs.mkdtempSync(path.join(require('os').tmpdir(), 'planner-ui-'))}`,
    '--virtual-time-budget=120000', '--dump-dom', url];
  execFile(chrome, args, { timeout: 180000, maxBuffer: 20 * 1024 * 1024 }, (err, stdout) => {
    server.close();
    const sum = /<p class="sum" id="sum"([^>]*)>([\s\S]*?)<\/p>/.exec(stdout || '');
    const done = sum && /data-done="1"/.test(sum[1]);
    const items = Array.from((stdout || '').matchAll(/<li(?: class="(fail)?")?>([\s\S]*?)<\/li>/g));
    const text = (h) => h.replace(/<code>/g, '\n    ').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    items.forEach((m) => console.log(`${m[1] ? '✗' : '✓'} ${text(m[2])}`));
    if (!done || !items.length) {
      console.error(`\nThe UI tests did not finish${err ? `: ${err.message}` : ''}.`);
      process.exit(1);
    }
    const failed = +(/data-failed="(\d+)"/.exec(sum[1]) || [0, 1])[1];
    console.log(`\n${items.length - failed} passed, ${failed} failed (UI)`);
    process.exit(failed ? 1 : 0);
  });
});
