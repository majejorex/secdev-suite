// The directory package (directory/secdev) is a skills-only copy of skills/. This fails when they drift.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PKG = join(ROOT, 'directory', 'secdev');

const files = (dir, base = dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? files(p, base) : [relative(base, p).split(sep).join('/')];
}).sort();

test('directory/secdev/skills is an exact copy of skills/', () => {
  const src = files(join(ROOT, 'skills'));
  assert.deepEqual(files(join(PKG, 'skills')), src, 'same list of files: copy skills/ again');
  for (const f of src) {
    assert.equal(readFileSync(join(PKG, 'skills', f), 'utf8'), readFileSync(join(ROOT, 'skills', f), 'utf8'), `${f} differs`);
  }
});

test('directory/secdev has the same identity as the plugin, an icon, and no code', () => {
  const root = JSON.parse(readFileSync(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
  const pkg = JSON.parse(readFileSync(join(PKG, '.claude-plugin', 'plugin.json'), 'utf8'));
  for (const k of ['name', 'version', 'description', 'license', 'homepage', 'repository']) assert.equal(pkg[k], root[k], k);
  assert.ok(existsSync(join(PKG, pkg.icon)), 'icon file exists');
  const all = files(PKG);
  assert.equal(all.some((f) => /(^|\/)hooks\/|(^|\/)package(-lock)?\.json$|\.(mjs|js|sh|svg)$/.test(f)), false, 'no hooks, npm files, scripts or SVG');
  assert.equal(readFileSync(join(PKG, 'LICENSE'), 'utf8'), readFileSync(join(ROOT, 'LICENSE'), 'utf8'));
});
