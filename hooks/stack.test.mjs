import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, rmdirSync, unlinkSync, symlinkSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { detectStack, render, standardsFor } from './stack.mjs';

const HOOKS_DIR = dirname(fileURLToPath(import.meta.url));
const temps = [];
after(() => { for (const d of temps) rmSync(d, { recursive: true, force: true }); });

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'secdev-'));
  temps.push(dir);
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

function runHook(hookPath, projectDir) {
  const started = Date.now();
  // CLAUDE_PLUGIN_DATA empty: no update check, so these tests never touch the network.
  const r = spawnSync(process.execPath, [hookPath], { env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir, CLAUDE_PLUGIN_DATA: '' }, encoding: 'utf8' });
  return { ...r, ms: Date.now() - started };
}

const FIREBASE_APP = {
  'package.json': JSON.stringify({ dependencies: { expo: '1', firebase: '1', '@stripe/stripe-react-native': '1' } }),
  'firestore.rules': '',
};

test('detects firebase + mobile + stripe in an Expo repo', () => {
  assert.deepEqual(detectStack(fixture(FIREBASE_APP)), ['firebase', 'mobile', 'stripe']);
});

test('folder with no project or relevant children: empty and no output', () => {
  assert.deepEqual(detectStack(fixture({ 'notes.txt': 'hello' })), []);
  assert.equal(render([]), '');
});

test('broken package.json does not throw', () => {
  assert.deepEqual(detectStack(fixture({ 'package.json': '{ this is not json' })), []);
});

test('workspace root: aggregates child repos and ignores node_modules', () => {
  const dir = fixture({
    'app/package.json': JSON.stringify({ dependencies: { 'react-native': '1' } }),
    'web/package.json': JSON.stringify({ dependencies: { next: '1' } }),
    'node_modules/x/package.json': JSON.stringify({ dependencies: { openai: '1' } }),
  });
  assert.deepEqual(detectStack(dir), ['mobile', 'next']);
});

test('project with functions/: also looks at children even if the root is a project', () => {
  const dir = fixture({
    'package.json': JSON.stringify({ devDependencies: { typescript: '1' } }),
    'firebase.json': '{}',
    'functions/package.json': JSON.stringify({ dependencies: { stripe: '1', openai: '1' } }),
  });
  assert.deepEqual(detectStack(dir), ['firebase', 'llm', 'stripe']);
});

test('a folder named Android without a Gradle project is not mobile', () => {
  assert.deepEqual(detectStack(fixture({ 'Android/sdk/readme.txt': '' })), []);
  assert.deepEqual(detectStack(fixture({ 'android/app/build.gradle': '' })), ['mobile']);
});

test('detects desktop apps (Electron, Tauri) and Capacitor as mobile', () => {
  assert.deepEqual(detectStack(fixture({ 'package.json': JSON.stringify({ devDependencies: { electron: '1' } }) })), ['desktop']);
  assert.deepEqual(detectStack(fixture({ 'src-tauri/tauri.conf.json': '{}' })), ['desktop']);
  assert.deepEqual(detectStack(fixture({ 'package.json': JSON.stringify({ dependencies: { '@capacitor/core': '1' } }) })), ['mobile']);
});

test('standards by stack', () => {
  assert.deepEqual(standardsFor(['python']), ['ASVS 5.0']);
  assert.deepEqual(standardsFor(['firebase', 'mobile', 'llm']), ['ASVS 5.0', 'API Security Top 10 2023', 'MASVS 2.1']);
});

test('output: at most 5 lines and names the skill', () => {
  const out = render(['firebase', 'mobile']);
  assert.ok(out.split('\n').length <= 5);
  assert.match(out, /secdev:security-checklist/);
});

test('as a process: prints the context in a Firebase project, exit 0 and < 1 s', () => {
  const r = runHook(join(HOOKS_DIR, 'session-start.mjs'), fixture(FIREBASE_APP));
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^\[secdev\] Detected stack: firebase, mobile, stripe\./m);
  assert.ok(r.stdout.trim().split('\n').length <= 5);
  assert.ok(r.ms < 1000, `took ${r.ms} ms`);
});

test('as a process: missing directory → exit 0 and no output', () => {
  const r = runHook(join(HOOKS_DIR, 'session-start.mjs'), join(tmpdir(), 'no-existe-secdev-xyz'));
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('does not follow file links (package.json or firebase.json pointing outside)', (t) => {
  const target = fixture(FIREBASE_APP);
  const dir = fixture({});
  try {
    symlinkSync(join(target, 'package.json'), join(dir, 'package.json'), 'file');
    symlinkSync(join(target, 'firestore.rules'), join(dir, 'firebase.json'), 'file');
  } catch {
    t.skip('cannot create file symlinks on this system');
    return;
  }
  assert.deepEqual(detectStack(dir), []);
});

test('huge package.json is discarded without reading it', () => {
  const big = JSON.stringify({ dependencies: { firebase: '1' }, pad: 'x'.repeat(1_100_000) });
  assert.deepEqual(detectStack(fixture({ 'package.json': big })), []);
});

test('as a process: works when invoked through a junction or symlink', (t) => {
  // The link points to a temporary copy, never to the real folder: if the test dies halfway,
  // a %TEMP% cleanup that follows junctions cannot delete the repo code.
  const src = mkdtempSync(join(tmpdir(), 'secdev-src-'));
  temps.push(src);
  for (const f of ['session-start.mjs', 'stack.mjs']) copyFileSync(join(HOOKS_DIR, f), join(src, f));
  const link = join(mkdtempSync(join(tmpdir(), 'secdev-link-')), 'hooks');
  temps.push(dirname(link));
  try {
    symlinkSync(src, link, process.platform === 'win32' ? 'junction' : 'dir');
  } catch {
    t.skip('cannot create links on this system');
    return;
  }
  let r;
  try {
    r = runHook(join(link, 'session-start.mjs'), fixture(FIREBASE_APP));
  } finally {
    // remove only the link: a Windows junction is deleted as a folder and a POSIX symlink as a file
    (process.platform === 'win32' ? rmdirSync : unlinkSync)(link);
  }
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^\[secdev\]/m);
});

test('detects language tags from their manifest files', () => {
  assert.deepEqual(detectStack(fixture({ 'go.mod': 'module x' })), ['go']);
  assert.deepEqual(detectStack(fixture({ 'Cargo.toml': '[package]' })), ['rust']);
  assert.deepEqual(detectStack(fixture({ 'pom.xml': '<project/>' })), ['jvm']);
  assert.deepEqual(detectStack(fixture({ 'composer.json': '{}' })), ['php']);
  assert.deepEqual(detectStack(fixture({ Gemfile: 'source "https://rubygems.org"' })), ['ruby']);
  assert.deepEqual(detectStack(fixture({ Pipfile: '[packages]' })), ['python']);
});

test('detects frameworks named in non-JS manifests', () => {
  assert.deepEqual(detectStack(fixture({ 'requirements.txt': 'fastapi==0.110\nopenai>=1\nstripe\n' })), ['api', 'llm', 'python', 'stripe']);
  assert.deepEqual(detectStack(fixture({ 'go.mod': 'require github.com/gin-gonic/gin v1.9.0\nrequire github.com/stripe/stripe-go/v76 v76.0.0' })), ['api', 'go', 'stripe']);
  assert.deepEqual(detectStack(fixture({ 'composer.json': '{"require":{"laravel/framework":"^11"}}' })), ['api', 'php']);
  assert.deepEqual(detectStack(fixture({ 'pom.xml': '<artifactId>spring-boot-starter-web</artifactId>' })), ['api', 'jvm']);
  assert.deepEqual(detectStack(fixture({ 'pyproject.toml': 'dependencies = ["firebase-admin", "supabase"]' })), ['firebase', 'python', 'supabase']);
  assert.deepEqual(detectStack(fixture({ 'requirements.txt': 'requests\nnumpy\n' })), ['python']);
});

test('detects .NET by project file, also one folder down', () => {
  assert.deepEqual(detectStack(fixture({ 'App.csproj': '<Project Sdk="Microsoft.NET.Sdk"/>' })), ['dotnet']);
  assert.deepEqual(detectStack(fixture({ 'src/Api.csproj': '<Project Sdk="Microsoft.NET.Sdk.Web"/>' })), ['api', 'dotnet']);
});

test('manifests that are too big or are links are ignored', () => {
  assert.deepEqual(detectStack(fixture({ 'requirements.txt': `${'x'.repeat(300_000)}\nfastapi` })), ['python']);
  const dir = fixture({ 'real.txt': 'fastapi' });
  try {
    symlinkSync(join(dir, 'real.txt'), join(dir, 'requirements.txt'));
  } catch (e) {
    if (e.code === 'EPERM') return; // creating links needs privileges on Windows
    throw e;
  }
  assert.deepEqual(detectStack(dir), []);
});

test('a folder with thousands of entries still answers in under a second', () => {
  const files = { 'go.mod': 'module x' };
  for (let i = 0; i < 2000; i++) files[`f${i}.txt`] = '';
  const dir = fixture(files);
  const t = Date.now();
  detectStack(dir);
  assert.ok(Date.now() - t < 1000);
});
