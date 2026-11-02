// Ejecuta evals/cases.json con `claude -p --plugin-dir <este repo>` en proyectos ficticios.
// Uso: node evals/run.mjs <carpeta-de-salida, fuera del repo> [modelo] [id1,id2…]
// Cuesta dinero (≈0,5 $ por caso con Opus): no forma parte de `npm test`.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const suite = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [outArg, model = '', only = ''] = process.argv.slice(2);
if (!outArg) {
  console.error('Uso: node evals/run.mjs <carpeta-de-salida> [modelo] [id1,id2]');
  process.exit(2);
}
const outDir = resolve(outArg);
const all = JSON.parse(readFileSync(join(suite, 'evals/cases.json'), 'utf8')).cases;
const cases = only ? all.filter((c) => only.split(',').includes(c.id)) : all;

const FIX = {
  firebase: {
    'package.json': { dependencies: { firebase: '^11.0.0' } },
    'firebase.json': { firestore: { rules: 'firestore.rules' }, functions: { source: 'functions' } },
    'firestore.rules': "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{db}/documents {\n    match /users/{uid} {\n      allow read: if request.auth != null;\n      allow create: if request.auth.uid == uid;\n    }\n    match /children/{childId} {\n      allow read, write: if request.auth != null && resource.data.parentId == request.auth.uid;\n    }\n  }\n}\n",
    'functions/package.json': { dependencies: { 'firebase-functions': '^6.0.0', 'firebase-admin': '^13.0.0' } },
    'functions/src/index.ts': "import { onCall, HttpsError } from 'firebase-functions/v2/https';\nimport { getFirestore } from 'firebase-admin/firestore';\n\nexport const ping = onCall(async (req) => {\n  if (!req.auth) throw new HttpsError('unauthenticated', 'login');\n  return { ok: true };\n});\n",
  },
  stripe: { 'functions/package.json': { dependencies: { 'firebase-functions': '^6.0.0', 'firebase-admin': '^13.0.0', stripe: '^17.0.0' } } },
  'móvil': {
    'package.json': { dependencies: { expo: '~52.0.0', 'react-native': '0.76.0', firebase: '^11.0.0', '@react-native-async-storage/async-storage': '2.1.0' } },
    'app.json': { expo: { name: 'demo', slug: 'demo' } },
    'src/auth/session.ts': "import AsyncStorage from '@react-native-async-storage/async-storage';\n\nexport async function login(email: string, password: string) {\n  const res = await fetch('https://api.example.com/login', { method: 'POST', body: JSON.stringify({ email, password }) });\n  return res.json() as Promise<{ token: string }>;\n}\n",
    'src/screens/Welcome.tsx': "import { Text } from 'react-native';\nexport default function Welcome() { return <Text>Bienvenido a la aplicacion, empiza aqui.</Text>; }\n",
  },
  next: {
    'package.json': { dependencies: { next: '15.0.0', react: '19.0.0' } },
    'app/page.tsx': "export default function Page() { return <button className=\"btn-primary\">Entrar</button>; }\n",
    'app/globals.css': '.btn-primary { background: #3b82f6; color: white; }\n',
  },
};
FIX.firebase['functions/src/report.ts'] = "export function formatDate(d: Date) { return d.toISOString(); }\nexport function buildReport(data: { createdAt: Date; name: string }) {\n  const date = `${data.createdAt.getDate()}/${data.createdAt.getMonth() + 1}/${data.createdAt.getFullYear()}`;\n  return { name: data.name, date };\n}\n";

function makeFixture(dir, stack) {
  rmSync(dir, { recursive: true, force: true });
  for (const tag of stack) for (const [p, c] of Object.entries(FIX[tag] ?? {})) {
    const full = join(dir, p);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, typeof c === 'string' ? c : JSON.stringify(c, null, 2));
  }
}

function run(c) {
  return new Promise((resolve) => {
    const dir = join(outDir, 'fx', c.id);
    makeFixture(dir, c.stack);
    const args = ['-p', c.prompt, '--plugin-dir', suite, '--output-format', 'stream-json', '--verbose',
      '--max-budget-usd', '1.5', '--permission-mode', 'acceptEdits'];
    if (model) args.push('--model', model);
    const p = spawn('claude', args, { cwd: dir }); // claude.exe nativo: sin shell, los prompts llegan sin re-escapar
    p.stdin.end();
    let raw = '';
    p.stdout.on('data', (d) => (raw += d));
    p.stderr.on('data', (d) => (raw += d));
    const timer = setTimeout(() => p.kill(), 8 * 60 * 1000);
    p.on('close', () => {
      clearTimeout(timer);
      writeFileSync(join(outDir, `${c.id}.jsonl`), raw);
      const skills = [];
      const skillCalls = new Set(); // ids de llamadas a esta skill, para saber si cargó sin error
      let loaded = false;
      const pending = new Map(); // tool_use id → ruta, para lecturas dentro del plugin
      let refErrors = 0;
      let finalText = '';
      let cost = null;
      const suiteNorm = suite.toLowerCase().replace(/\\/g, '/');
      for (const line of raw.split('\n')) {
        let m; try { m = JSON.parse(line); } catch { continue; }
        for (const b of m?.message?.content ?? []) {
          if (b.type === 'tool_use' && b.name === 'Skill') {
            skills.push(b.input?.skill);
            if (String(b.input?.skill).includes('security-checklist')) skillCalls.add(b.id);
          }
          if (b.type === 'tool_result' && skillCalls.has(b.tool_use_id) && !b.is_error) loaded = true;
          if (b.type === 'tool_use' && ['Read', 'Grep', 'Glob'].includes(b.name)) {
            const p = String(b.input?.file_path ?? b.input?.path ?? '').toLowerCase().replace(/\\/g, '/');
            if (p.startsWith(suiteNorm)) pending.set(b.id, p);
          }
          if (b.type === 'tool_result' && b.is_error && pending.has(b.tool_use_id)) refErrors++;
        }
        if (m.type === 'result') { finalText = m.result ?? ''; cost = m.total_cost_usd; }
      }
      const triggered = skills.some((s) => String(s).includes('security-checklist'));
      const hookSeen = raw.includes('[secdev] Stack detectado');
      const missing = (c.mustMention ?? []).filter((w) => !finalText.toLowerCase().includes(w.toLowerCase()));
      const controls = (c.expectControls ?? []).filter((id) => !finalText.includes(id));
      // Coherencia: con alguna fila P0 en ❌ el veredicto tiene que ser BLOQUEA.
      const verdict = (finalText.match(/Veredicto:\**\s*\**\s*(BLOQUEA|PASA CON PENDIENTES|PASA)/i) ?? [])[1]?.toUpperCase() ?? null;
      const p0Fail = /^\|\s*P0-\d\d\s*\|[^\n]*\|\s*❌\s*\|/m.test(finalText);
      const verdictOk = !c.trigger || (verdict !== null && (!p0Fail || verdict === 'BLOQUEA'));
      const ok = triggered === c.trigger && (!c.trigger || (loaded && refErrors === 0 && verdictOk));
      resolve({ id: c.id, expected: c.trigger, triggered, loaded, verdict, p0Fail, verdictOk, ok, hookSeen, skills, refReads: pending.size, refErrors, cost, missingMentions: missing, missingControls: controls });
    });
  });
}

mkdirSync(outDir, { recursive: true });
const results = await Promise.all(cases.map(run));
writeFileSync(join(outDir, 'results.json'), JSON.stringify(results, null, 2));
for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.id.padEnd(22)} esperado=${r.expected} activó=${r.triggered} cargó=${r.loaded} veredicto=${r.verdict}${r.verdictOk ? '' : '(INCOHERENTE)'} hook=${r.hookSeen} lecturasRef=${r.refReads} erroresRef=${r.refErrors} coste=${r.cost} faltanCtrl=${JSON.stringify(r.missingControls)} faltanMenc=${JSON.stringify(r.missingMentions)}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
