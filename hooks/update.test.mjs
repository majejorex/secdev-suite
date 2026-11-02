import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isNewer, parseVersion, readCache, needsCheck, updateNotice, installedVersion, CHECK_EVERY_MS } from './update.mjs';

const HOOKS_DIR = dirname(fileURLToPath(import.meta.url));
const temps = [];
after(() => { for (const d of temps) rmSync(d, { recursive: true, force: true }); });
const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'secdev-upd-')); temps.push(d); return d; };

test('semver comparison', () => {
  assert.equal(isNewer('0.3.10', '0.3.9'), true);
  assert.equal(isNewer('1.0.0', '0.9.9'), true);
  assert.equal(isNewer('0.3.2', '0.3.2'), false);
  assert.equal(isNewer('0.3.1', '0.3.2'), false);
  assert.equal(isNewer('0.4.0-beta', '0.3.2'), false);
  assert.equal(isNewer(null, '0.3.2'), false);
});

test('only a plain x.y.z from the remote or the cache is accepted', () => {
  assert.equal(parseVersion('{"version":"0.3.3"}'), '0.3.3');
  assert.equal(parseVersion('{"version":"0.3.3; rm -rf /"}'), null);
  assert.equal(parseVersion('<html>'), null);
  const dir = tmp();
  writeFileSync(join(dir, 'update.json'), JSON.stringify({ checked: 5, latest: '1.0.0 https://evil' }));
  assert.deepEqual(readCache(dir), { checked: 5, latest: null });
  assert.equal(readCache(join(dir, 'missing')), null);
});

test('checks at most once a day, and again if the clock went backwards', () => {
  const now = 10 * CHECK_EVERY_MS;
  assert.equal(needsCheck(null, now), true);
  assert.equal(needsCheck({ checked: now - 1000 }, now), false);
  assert.equal(needsCheck({ checked: now - CHECK_EVERY_MS - 1 }, now), true);
  assert.equal(needsCheck({ checked: now + CHECK_EVERY_MS }, now), true);
});

test('the notice links the hooks diff and gives the update command', () => {
  assert.equal(updateNotice('0.3.2', '0.3.2'), '');
  assert.equal(updateNotice('0.3.2', null), '');
  const n = updateNotice('0.3.2', '0.3.3');
  assert.match(n, /compare\/v0\.3\.2\.\.\.v0\.3\.3/);
  assert.match(n, /claude plugin marketplace update secdev-suite && claude plugin update secdev@secdev-suite/);
  assert.match(n, /SECDEV_NO_UPDATE_CHECK=1/);
  assert.equal(installedVersion(), JSON.parse(readFileSync(join(HOOKS_DIR, '..', '.claude-plugin', 'plugin.json'), 'utf8')).version);
});

function runSessionStart(env) {
  const started = Date.now();
  const r = spawnSync(process.execPath, [join(HOOKS_DIR, 'session-start.mjs')], { env: { ...process.env, ...env }, encoding: 'utf8' });
  return { ...r, ms: Date.now() - started };
}

test('as a process: a fresh cache with a newer version shows a systemMessage and keeps the stack context', () => {
  const data = tmp();
  writeFileSync(join(data, 'update.json'), JSON.stringify({ checked: Date.now(), latest: '99.0.0' }));
  const project = tmp();
  mkdirSync(project, { recursive: true });
  writeFileSync(join(project, 'firebase.json'), '{}');
  const r = runSessionStart({ CLAUDE_PLUGIN_DATA: data, CLAUDE_PROJECT_DIR: project, SECDEV_NO_UPDATE_CHECK: '' });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.match(out.systemMessage, /^secdev 99\.0\.0 is available/);
  assert.match(out.hookSpecificOutput.additionalContext, /^\[secdev\] Detected stack: firebase\./);
  assert.ok(r.ms < 1000, `took ${r.ms} ms`);
});

test('as a process: up to date or opted out → no notice', () => {
  const data = tmp();
  writeFileSync(join(data, 'update.json'), JSON.stringify({ checked: Date.now(), latest: installedVersion() }));
  assert.equal(runSessionStart({ CLAUDE_PLUGIN_DATA: data, CLAUDE_PROJECT_DIR: tmp(), SECDEV_NO_UPDATE_CHECK: '' }).stdout, '');
  writeFileSync(join(data, 'update.json'), JSON.stringify({ checked: Date.now(), latest: '99.0.0' }));
  assert.equal(runSessionStart({ CLAUDE_PLUGIN_DATA: data, CLAUDE_PROJECT_DIR: tmp(), SECDEV_NO_UPDATE_CHECK: '1' }).stdout, '');
});

test('the background check without a data dir exits 0 and does nothing', () => {
  const r = spawnSync(process.execPath, [join(HOOKS_DIR, 'update-check.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});
