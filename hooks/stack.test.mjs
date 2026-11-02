import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, rmdirSync, symlinkSync, copyFileSync } from 'node:fs';
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
  const r = spawnSync(process.execPath, [hookPath], { env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir }, encoding: 'utf8' });
  return { ...r, ms: Date.now() - started };
}

const FIREBASE_APP = {
  'package.json': JSON.stringify({ dependencies: { expo: '1', firebase: '1', '@stripe/stripe-react-native': '1' } }),
  'firestore.rules': '',
};

test('detecta firebase + móvil + stripe en un repo Expo', () => {
  assert.deepEqual(detectStack(fixture(FIREBASE_APP)), ['firebase', 'móvil', 'stripe']);
});

test('carpeta sin proyecto ni hijos relevantes: vacío y sin salida', () => {
  assert.deepEqual(detectStack(fixture({ 'notas.txt': 'hola' })), []);
  assert.equal(render([]), '');
});

test('package.json roto no lanza', () => {
  assert.deepEqual(detectStack(fixture({ 'package.json': '{ esto no es json' })), []);
});

test('raíz de workspace: agrega los repos hijos e ignora node_modules', () => {
  const dir = fixture({
    'app/package.json': JSON.stringify({ dependencies: { 'react-native': '1' } }),
    'web/package.json': JSON.stringify({ dependencies: { next: '1' } }),
    'node_modules/x/package.json': JSON.stringify({ dependencies: { openai: '1' } }),
  });
  assert.deepEqual(detectStack(dir), ['móvil', 'next']);
});

test('proyecto con functions/: también mira los hijos aunque la raíz sea proyecto', () => {
  const dir = fixture({
    'package.json': JSON.stringify({ devDependencies: { typescript: '1' } }),
    'firebase.json': '{}',
    'functions/package.json': JSON.stringify({ dependencies: { stripe: '1', openai: '1' } }),
  });
  assert.deepEqual(detectStack(dir), ['firebase', 'llm', 'stripe']);
});

test('una carpeta llamada Android sin proyecto Gradle no es móvil', () => {
  assert.deepEqual(detectStack(fixture({ 'Android/sdk/readme.txt': '' })), []);
  assert.deepEqual(detectStack(fixture({ 'android/app/build.gradle': '' })), ['móvil']);
});

test('normas según stack', () => {
  assert.deepEqual(standardsFor(['python']), ['ASVS 5.0']);
  assert.deepEqual(standardsFor(['firebase', 'móvil', 'llm']), ['ASVS 5.0', 'API Security Top 10 2023', 'MASVS 2.1']);
});

test('salida: como mucho 5 líneas y nombra la skill', () => {
  const out = render(['firebase', 'móvil']);
  assert.ok(out.split('\n').length <= 5);
  assert.match(out, /secdev:security-checklist/);
});

test('como proceso: imprime el contexto en un proyecto Firebase, exit 0 y < 1 s', () => {
  const r = runHook(join(HOOKS_DIR, 'session-start.mjs'), fixture(FIREBASE_APP));
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^\[secdev\] Stack detectado: firebase, móvil, stripe\./m);
  assert.ok(r.stdout.trim().split('\n').length <= 5);
  assert.ok(r.ms < 1000, `tardó ${r.ms} ms`);
});

test('como proceso: directorio inexistente → exit 0 y sin salida', () => {
  const r = runHook(join(HOOKS_DIR, 'session-start.mjs'), join(tmpdir(), 'no-existe-secdev-xyz'));
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('no sigue enlaces de ficheros (package.json o firebase.json apuntando fuera)', (t) => {
  const target = fixture(FIREBASE_APP);
  const dir = fixture({});
  try {
    symlinkSync(join(target, 'package.json'), join(dir, 'package.json'), 'file');
    symlinkSync(join(target, 'firestore.rules'), join(dir, 'firebase.json'), 'file');
  } catch {
    t.skip('no se pueden crear symlinks de fichero en este sistema');
    return;
  }
  assert.deepEqual(detectStack(dir), []);
});

test('package.json enorme se descarta sin leerlo', () => {
  const big = JSON.stringify({ dependencies: { firebase: '1' }, pad: 'x'.repeat(1_100_000) });
  assert.deepEqual(detectStack(fixture({ 'package.json': big })), []);
});

test('como proceso: funciona invocado a través de un junction o symlink', (t) => {
  // El enlace apunta a una copia temporal, nunca a la carpeta real: si el test muere a medias,
  // una limpieza de %TEMP% que siga junctions no puede borrar el código del repo.
  const src = mkdtempSync(join(tmpdir(), 'secdev-src-'));
  temps.push(src);
  for (const f of ['session-start.mjs', 'stack.mjs']) copyFileSync(join(HOOKS_DIR, f), join(src, f));
  const link = join(mkdtempSync(join(tmpdir(), 'secdev-link-')), 'hooks');
  temps.push(dirname(link));
  try {
    symlinkSync(src, link, process.platform === 'win32' ? 'junction' : 'dir');
  } catch {
    t.skip('no se pueden crear enlaces en este sistema');
    return;
  }
  let r;
  try {
    r = runHook(join(link, 'session-start.mjs'), fixture(FIREBASE_APP));
  } finally {
    rmdirSync(link); // quita solo el enlace
  }
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^\[secdev\]/m);
});
