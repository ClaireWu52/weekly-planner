/*
 * Run by the deploy workflow just before publishing (not needed locally).
 *
 * GitHub Pages' servers don't all pick up a new version at the same moment,
 * so right after a deploy a page could load some new files and some old ones.
 * This adds ?v=<content hash> to every script and stylesheet in index.html:
 * a changed file gets a new address, so it can only come with the matching
 * index.html. It also renames the service worker's cache so phones that have
 * the app installed refresh their offline copy.
 *
 *   node scripts/stamp_versions.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);

const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const stamps = [];
// An existing ?v= is replaced, so running this twice gives the same result.
html = html.replace(/(<script src="|<link rel="stylesheet" href=")((?:js|css)\/[\w.-]+\.(?:js|css))(?:\?v=[0-9a-f]+)?"/g, (m, attr, file) => {
  const v = hash(fs.readFileSync(path.join(root, file)));
  stamps.push(`${file}?v=${v}`);
  return `${attr}${file}?v=${v}"`;
});
fs.writeFileSync(indexPath, html);

const swPath = path.join(root, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');
const CACHE_RE = /const CACHE = '[^']*';/;
if (!stamps.length || !CACHE_RE.test(sw)) throw new Error('nothing to stamp: index.html or sw.js changed shape');
fs.writeFileSync(swPath, sw.replace(CACHE_RE, `const CACHE = 'planner-${hash(stamps.join('\n'))}';`));

console.log(`Stamped ${stamps.length} files:\n  ${stamps.join('\n  ')}`);
