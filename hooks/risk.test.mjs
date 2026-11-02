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

test('reglas de Firestore y callables con auth son de riesgo', () => {
  assert.deepEqual(classify('firestore.rules', "allow update: if request.auth.uid == uid;"), ['reglas de acceso', 'auth y sesiones', 'roles y permisos']);
  assert.ok(classify('functions/src/index.ts', "export const getChildReport = onCall(async (req) => { if (!req.auth) throw x; })").includes('endpoints y callables'));
});

test('webhook de Stripe, tokens en el dispositivo y secretos', () => {
  assert.ok(classify('functions/src/stripeWebhook.ts', 'stripe.webhooks.constructEvent(raw, sig, s)').includes('pagos y webhooks'));
  assert.ok(classify('src/auth/session.ts', "await AsyncStorage.setItem('token', t)").includes('almacenamiento de tokens o datos en el cliente'));
  assert.ok(classify('.env.local', 'X=1').includes('secretos'));
  assert.ok(classify('src/x.ts', "const apiKey = 'abc'").includes('secretos'));
});

test('los casos negativos de los evals no avisan', () => {
  assert.deepEqual(classify('app/globals.css', '.btn-primary { background: #1e3a8a; }'), []);
  assert.deepEqual(classify('functions/src/report.ts', 'export function formatDate(d: Date) { return `${d.getDate()}/${d.getMonth() + 1}`; }'), []);
  assert.deepEqual(classify('src/screens/Welcome.tsx', '<Text>Bienvenido a la aplicación, empieza aquí.</Text>'), []);
  assert.deepEqual(classify('README.md', 'password y stripe en un doc'), []);
});

test('rutas de Windows y MultiEdit', () => {
  assert.ok(classify('C:\\repo\\firestore.rules', '').includes('reglas de acceso'));
  assert.match(editedText({ edits: [{ new_string: 'a' }, { new_string: 'onCall(' }] }), /onCall\(/);
});

test('el mensaje solo usa categorías fijas y nombra la skill', () => {
  assert.equal(message([]), '');
  assert.match(message(['pagos y webhooks']), /^\[secdev\] Este cambio toca: pagos y webhooks\. .*secdev:security-checklist/);
});

test('el id de sesión se sanea para usarlo como nombre de fichero', () => {
  assert.equal(safeSessionId('../../etc/passwd'), 'etcpasswd');
  assert.equal(safeSessionId(''), null);
  assert.equal(safeSessionId('abc-123_X'), 'abc-123_X');
});

test('como proceso: avisa una vez por sesión con el formato de PostToolUse', () => {
  const sid = `test-${process.pid}-${Date.now()}`;
  sessions.push(sid);
  const input = { session_id: sid, tool_name: 'Edit', tool_input: { file_path: 'firestore.rules', new_string: 'allow read: if request.auth != null;' } };
  const first = run(input);
  assert.equal(first.status, 0);
  const out = JSON.parse(first.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.match(out.hookSpecificOutput.additionalContext, /secdev:security-checklist/);
  assert.ok(first.ms < 1000, `tardó ${first.ms} ms`);
  const second = run(input);
  assert.equal(second.status, 0);
  assert.equal(second.stdout, '', 'la segunda edición de riesgo en la misma sesión no repite el aviso');
});

test('como proceso: edición sin riesgo, entrada vacía o rota → exit 0 y sin salida', () => {
  for (const input of [{ session_id: 'x', tool_input: { file_path: 'a.css', content: 'b{}' } }, '', '{roto', 'null']) {
    const r = run(input);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
  }
});
