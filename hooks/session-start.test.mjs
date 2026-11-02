import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { detectStack, render, standardsFor } from './session-start.mjs';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'session-start.mjs');

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'secdev-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

test('detecta firebase + móvil + stripe en un repo Expo', () => {
  const dir = fixture({
    'package.json': JSON.stringify({ dependencies: { expo: '1', firebase: '1', '@stripe/stripe-react-native': '1' } }),
    'firestore.rules': '',
  });
  assert.deepEqual(detectStack(dir), ['firebase', 'móvil', 'stripe']);
});

test('carpeta sin proyecto ni hijos relevantes: vacío y sin salida', () => {
  const dir = fixture({ 'notas.txt': 'hola' });
  assert.deepEqual(detectStack(dir), []);
  assert.equal(render([]), '');
});

test('package.json roto no lanza', () => {
  const dir = fixture({ 'package.json': '{ esto no es json' });
  assert.deepEqual(detectStack(dir), []);
});

test('raíz de workspace: agrega los repos hijos', () => {
  const dir = fixture({
    'app/package.json': JSON.stringify({ dependencies: { 'react-native': '1' } }),
    'web/package.json': JSON.stringify({ dependencies: { next: '1' } }),
    'node_modules/x/package.json': JSON.stringify({ dependencies: { openai: '1' } }),
  });
  assert.deepEqual(detectStack(dir), ['móvil', 'next']);
});

test('normas según stack', () => {
  assert.deepEqual(standardsFor(['python']), ['ASVS 5.0']);
  assert.deepEqual(standardsFor(['firebase', 'móvil', 'llm']), ['ASVS 5.0', 'API Security Top 10 2023', 'MASVS 2.1', 'OWASP LLM Top 10']);
});

test('salida: como mucho 5 líneas y nombra la skill', () => {
  const out = render(['firebase', 'móvil']);
  assert.ok(out.split('\n').length <= 5);
  assert.match(out, /secdev:security-checklist/);
});

test('el proceso termina con 0 y rápido aunque el directorio no exista', () => {
  const started = Date.now();
  const r = spawnSync(process.execPath, [HOOK], {
    env: { ...process.env, CLAUDE_PROJECT_DIR: join(tmpdir(), 'no-existe-secdev-xyz') },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.ok(Date.now() - started < 1000, 'debe tardar menos de 1 s');
});
