import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { classify, editedText, message, safeSessionId } from './risk.mjs';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'post-edit.mjs');
const sessions = [];
after(() => { for (const s of sessions) rmSync(join(tmpdir(), 'secdev-sessions', `${s}.reminded`), { force: true }); });

function run(input) {
  const started = Date.now();
  const r = spawnSync(process.execPath, [HOOK], { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8' });
  return { ...r, ms: Date.now() - started };
}

test('Firestore rules and callables with auth are risky', () => {
  assert.deepEqual(classify('firestore.rules', "allow update: if request.auth.uid == uid;"), ['access rules', 'auth and sessions', 'roles and permissions']);
  assert.ok(classify('functions/src/index.ts', "export const getChildReport = onCall(async (req) => { if (!req.auth) throw x; })").includes('endpoints and callables'));
});

test('Stripe webhook, tokens on the device and secrets', () => {
  assert.ok(classify('functions/src/stripeWebhook.ts', 'stripe.webhooks.constructEvent(raw, sig, s)').includes('payments and webhooks'));
  assert.ok(classify('src/auth/session.ts', "await AsyncStorage.setItem('token', t)").includes('client-side token or data storage'));
  assert.ok(classify('.env.local', 'X=1').includes('secrets'));
  assert.ok(classify('src/x.ts', "const apiKey = 'abc'").includes('secrets'));
});

test('the negative cases from the evals do not warn', () => {
  assert.deepEqual(classify('app/globals.css', '.btn-primary { background: #1e3a8a; }'), []);
  assert.deepEqual(classify('functions/src/report.ts', 'export function formatDate(d: Date) { return `${d.getDate()}/${d.getMonth() + 1}`; }'), []);
  assert.deepEqual(classify('src/screens/Welcome.tsx', '<Text>Welcome to the app, start here.</Text>'), []);
  assert.deepEqual(classify('README.md', 'password and stripe in a doc'), []);
});

test('Windows paths and MultiEdit', () => {
  assert.ok(classify('C:\\repo\\firestore.rules', '').includes('access rules'));
  assert.match(editedText({ edits: [{ new_string: 'a' }, { new_string: 'onCall(' }] }), /onCall\(/);
});

test('the message only uses fixed categories and names the skill', () => {
  assert.equal(message([]), '');
  assert.match(message(['payments and webhooks']), /^\[secdev\] This change touches: payments and webhooks\. .*secdev:security-checklist/);
});

test('the session id is sanitized for use as a file name', () => {
  assert.equal(safeSessionId('../../etc/passwd'), 'etcpasswd');
  assert.equal(safeSessionId(''), null);
  assert.equal(safeSessionId('abc-123_X'), 'abc-123_X');
});

test('as a process: warns once per session with the PostToolUse format', () => {
  const sid = `test-${process.pid}-${Date.now()}`;
  sessions.push(sid);
  const input = { session_id: sid, tool_name: 'Edit', tool_input: { file_path: 'firestore.rules', new_string: 'allow read: if request.auth != null;' } };
  const first = run(input);
  assert.equal(first.status, 0);
  const out = JSON.parse(first.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.match(out.hookSpecificOutput.additionalContext, /secdev:security-checklist/);
  assert.ok(first.ms < 1000, `took ${first.ms} ms`);
  const second = run(input);
  assert.equal(second.status, 0);
  assert.equal(second.stdout, '', 'a second risky edit in the same session does not repeat the warning');
});

test('as a process: safe edit, empty or broken input → exit 0 and no output', () => {
  for (const input of [{ session_id: 'x', tool_input: { file_path: 'a.css', content: 'b{}' } }, '', '{broken', 'null']) {
    const r = run(input);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
  }
});
