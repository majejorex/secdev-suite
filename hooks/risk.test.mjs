import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, mkdirSync, writeFileSync, utimesSync, existsSync } from 'node:fs';
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

test('desktop apps, signing and updates, crypto, re-authentication and archives', () => {
  assert.ok(classify('src/main.ts', 'new BrowserWindow({ webPreferences: { nodeIntegration: true } })').includes('desktop windows and IPC'));
  assert.ok(classify('src/main.ts', "ipcMain.handle('read-file', (e, p) => fs.readFile(p))").includes('desktop windows and IPC'));
  assert.ok(classify('src-tauri/tauri.conf.json', '{}').includes('app signing and platform config'));
  assert.ok(classify('app.json', '{ "updates": { "codeSigningCertificate": "./certs/cert.pem" } }').includes('app signing and platform config'));
  assert.ok(classify('android/app/upload.keystore', '').includes('secrets'));
  assert.ok(classify('src/crypto.ts', "crypto.createCipheriv('aes-256-gcm', key, iv)").includes('cryptography'));
  assert.ok(classify('src/account.ts', 'await reauthenticateWithCredential(user, cred); await updateEmail(user, e);').includes('auth and sessions'));
  assert.ok(classify('src/import.ts', "import AdmZip from 'adm-zip'").includes('file uploads'));
  assert.ok(classify('src/limit.ts', "const ip = req.headers['x-forwarded-for']").includes('headers and CORS'));
});

test('CI workflows and container files', () => {
  assert.ok(classify('.github/workflows/deploy.yml', 'on: pull_request_target').includes('CI/CD pipeline'));
  assert.ok(classify('C:\\repo\\.gitlab-ci.yml', 'stages: [test]').includes('CI/CD pipeline'));
  for (const f of ['Dockerfile', 'api/Dockerfile.prod', 'web.Dockerfile', 'compose.yaml', 'docker-compose.dev.yml', '.dockerignore']) {
    assert.ok(classify(f, 'FROM node:22').includes('containers'), f);
  }
  assert.deepEqual(classify('docs/dockerfile-notes.txt', 'FROM'), []);
});

test('a plain version bump in app.json does not warn', () => {
  assert.deepEqual(classify('app.json', '{ "expo": { "version": "1.2.3" } }'), []);
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
  assert.match(message(['payments and webhooks']), /^\[secdev\] This change touches: payments and webhooks \(P2-02\)\. .*secdev:security-checklist/);
  assert.match(message(['auth and sessions', 'file uploads']), /auth and sessions \(P0-01, P0-06\), file uploads \(P0-14\)\./);
});

test('the session id is sanitized for use as a file name', () => {
  assert.equal(safeSessionId('../../etc/passwd'), 'etcpasswd');
  assert.equal(safeSessionId(''), null);
  assert.equal(safeSessionId('abc-123_X'), 'abc-123_X');
});

test('as a process: marks older than 7 days are deleted, recent ones and other files stay', () => {
  const dir = join(tmpdir(), 'secdev-sessions');
  mkdirSync(dir, { recursive: true });
  const old = `old-${process.pid}-${Date.now()}`;
  const recent = `recent-${process.pid}-${Date.now()}`;
  const other = join(dir, `keep-${process.pid}.txt`);
  const stamp = (name, daysAgo) => {
    writeFileSync(join(dir, name), '');
    const t = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    utimesSync(join(dir, name), t, t);
  };
  stamp(`${old}.reminded`, 8);
  stamp(`${recent}.reminded`, 1);
  stamp(`keep-${process.pid}.txt`, 30);
  const sid = `cleanup-${process.pid}-${Date.now()}`;
  sessions.push(sid, recent);
  const r = run({ session_id: sid, tool_input: { file_path: 'firestore.rules', new_string: 'allow read: if true;' } });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /secdev:security-checklist/, 'the reminder is still shown');
  assert.equal(existsSync(join(dir, `${old}.reminded`)), false, 'old mark deleted');
  assert.equal(existsSync(join(dir, `${recent}.reminded`)), true, 'recent mark kept');
  assert.equal(existsSync(other), true, 'only .reminded files are touched');
  rmSync(other, { force: true });
  assert.ok(r.ms < 1000, `took ${r.ms} ms`);
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
