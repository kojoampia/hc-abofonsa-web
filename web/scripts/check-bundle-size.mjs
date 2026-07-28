#!/usr/bin/env node
/**
 * Spec §13.1 performance budget, enforced in CI (plan task 107).
 *
 * The budget is on *initial* JavaScript — what a first-time visitor on a Ghanaian mobile network
 * downloads before the page is interactive — measured gzipped, because that is what crosses the
 * wire. The CMS is explicitly outside it: `/admin` is lazy-loaded, staff-only, and its weight is
 * irrelevant to a visitor who never goes there. This script therefore also *proves* the CMS is
 * absent from the initial graph rather than trusting that it stayed lazy; a stray eager import of
 * an admin symbol would otherwise quietly pull the whole chunk into main and only show up as a
 * budget number creeping upward.
 *
 * The initial set is read from index.csr.html: the entry <script> plus every modulepreload the
 * build emitted for its static imports.
 *
 * **What this does NOT cover.** Chunks the app pulls in with a dynamic `import()` during hydration
 * are not listed in the HTML and are not counted here. On the home page that is currently ~240 kB
 * uncompressed across six files, mostly Angular Material — real cost to a real visitor that this
 * number omits. Measured in the browser, the home page fetches 17 JS files; this script sees 11.
 *
 * That gap is why `e2e/visual.spec.ts` carries a browser-based weight assertion as well: it loads
 * the page for real and counts everything that crosses the wire, compressed, which is the only
 * honest measure. Keep this script as the fast pre-build check, but do not read its number as
 * "what a visitor downloads" — read the e2e one for that.
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUDGET_BYTES = 220 * 1024;

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const browserDir = join(webRoot, 'dist', 'abofonsa-web', 'browser');
const indexPath = join(browserDir, 'index.csr.html');

if (!existsSync(indexPath)) {
  console.error(`check-bundle-size: no build found at ${indexPath}. Run \`ng build\` first.`);
  process.exit(1);
}

const html = readFileSync(indexPath, 'utf8');

// Entry script plus the preloaded chunks it statically imports — everything the browser fetches
// before it can run the app.
const initial = new Set();
for (const match of html.matchAll(/<script[^>]*\ssrc="([^"]+\.js)"/g)) {
  initial.add(match[1]);
}
for (const match of html.matchAll(/<link[^>]*rel="modulepreload"[^>]*\shref="([^"]+\.js)"/g)) {
  initial.add(match[1]);
}

if (initial.size === 0) {
  console.error('check-bundle-size: parsed no initial scripts out of index.csr.html — the build output shape changed.');
  process.exit(1);
}

const files = [...initial].sort().map((name) => {
  const raw = readFileSync(join(browserDir, name.replace(/^\//, '')));
  return { name, gzipped: gzipSync(raw, { level: 9 }).length };
});

const total = files.reduce((sum, file) => sum + file.gzipped, 0);

// A chunk carrying CMS code would name admin sources in the stats graph. Checking the stats file
// rather than the chunk text avoids false positives from the word "admin" appearing in a string.
const statsPath = join(webRoot, 'dist', 'abofonsa-web', 'stats.json');
const leaked = [];
if (existsSync(statsPath)) {
  const { outputs } = JSON.parse(readFileSync(statsPath, 'utf8'));
  for (const { name } of files) {
    const entry = outputs[`${name.replace(/^\//, '')}`];
    const adminInputs = Object.keys(entry?.inputs ?? {}).filter((input) => input.startsWith('src/app/admin/'));
    if (adminInputs.length > 0) {
      leaked.push(`${name} ← ${adminInputs.slice(0, 3).join(', ')}${adminInputs.length > 3 ? ', …' : ''}`);
    }
  }
} else {
  console.warn('check-bundle-size: stats.json absent, skipping the admin-leak check (build with --stats-json).');
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
console.log(`Initial JavaScript (gzipped), ${files.length} file(s):`);
for (const file of files) {
  console.log(`  ${kb(file.gzipped).padStart(9)}  ${file.name}`);
}
console.log(`  ${'—'.repeat(9)}`);
console.log(`  ${kb(total).padStart(9)}  total   (budget ${kb(BUDGET_BYTES)}, ${((total / BUDGET_BYTES) * 100).toFixed(1)}% used)`);

let failed = false;
if (leaked.length > 0) {
  console.error('\ncheck-bundle-size: CMS code has leaked into the initial bundle:');
  leaked.forEach((line) => console.error(`  ${line}`));
  console.error('  /admin must stay lazy — check for a non-type import of an admin symbol from public code.');
  failed = true;
}
if (total > BUDGET_BYTES) {
  console.error(`\ncheck-bundle-size: over budget by ${kb(total - BUDGET_BYTES)} (spec §13.1).`);
  failed = true;
}
if (failed) {
  process.exit(1);
}

const headroom = BUDGET_BYTES - total;
console.log(`\ncheck-bundle-size: within budget, ${kb(headroom)} of headroom.`);
if (headroom < 10 * 1024) {
  console.warn('check-bundle-size: under 10 kB of headroom — the next dependency will likely break the budget.');
}
