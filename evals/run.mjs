// Runs evals/cases.json with `claude -p --plugin-dir <this repo>` in fictitious projects.
// Usage: node evals/run.mjs <output folder, outside the repo> [model] [id1,id2…] [--repeat N]
// Release runs pin the model (claude-sonnet-5-5) and use --repeat 3 (README, "Testing").
// It costs money (about $0.21 per case and repeat with Sonnet): it is not part of `npm test`.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs, missingMentions, verdictFrom, verdictConsistent, aggregate, summaryMarkdown } from './lib.mjs';

const suite = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let opts;
try {
  opts = parseArgs(process.argv.slice(2));
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
const { outArg, model, only, repeat } = opts;
if (!outArg) {
  console.error('Usage: node evals/run.mjs <output-folder> [model] [id1,id2] [--repeat N]');
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
  mobile: {
    'package.json': { dependencies: { expo: '~52.0.0', 'react-native': '0.76.0', firebase: '^11.0.0', '@react-native-async-storage/async-storage': '2.1.0' } },
    'app.json': { expo: { name: 'demo', slug: 'demo' } },
    'src/auth/session.ts': "import AsyncStorage from '@react-native-async-storage/async-storage';\n\nexport async function login(email: string, password: string) {\n  const res = await fetch('https://api.example.com/login', { method: 'POST', body: JSON.stringify({ email, password }) });\n  return res.json() as Promise<{ token: string }>;\n}\n",
    'src/screens/Welcome.tsx': "import { Text } from 'react-native';\nexport default function Welcome() { return <Text>Welcome to the app, start here.</Text>; }\n",
  },
  desktop: {
    'package.json': { main: 'main.js', devDependencies: { electron: '^33.0.0' } },
    'main.js': "const { app, BrowserWindow } = require('electron');\napp.whenReady().then(() => new BrowserWindow({ width: 800, height: 600 }).loadFile('index.html'));\n",
  },
  next: {
    'package.json': { dependencies: { next: '15.0.0', react: '19.0.0' } },
    'app/page.tsx': "export default function Page() { return <button className=\"btn-primary\">Sign in</button>; }\n",
    'app/globals.css': '.btn-primary { background: #3b82f6; color: white; }\n',
  },
};
FIX.go = {
  "go.mod": "module example.com/shop\n\ngo 1.22\n\nrequire github.com/gin-gonic/gin v1.10.0\n",
  "main.go": "package main\n\nimport \"github.com/gin-gonic/gin\"\n\nfunc authRequired(c *gin.Context) {\n\tif c.GetHeader(\"Authorization\") == \"\" {\n\t\tc.AbortWithStatus(401)\n\t\treturn\n\t}\n\tc.Next()\n}\n\nfunc getOrder(c *gin.Context) {\n\tvar o Order\n\tdb.First(&o, c.Param(\"id\"))\n\tc.JSON(200, o)\n}\n\nfunc main() {\n\tr := gin.Default()\n\tr.Use(authRequired)\n\tr.GET(\"/orders/:id\", getOrder)\n\tr.Run()\n}\n"
};
FIX.python = {
  "requirements.txt": "fastapi==0.115.0\nuvicorn\n",
  "app/main.py": "from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get(\"/health\")\ndef health():\n    return {\"ok\": True}\n"
};
FIX.supabase = {
  "supabase/config.toml": "project_id = \"demo\"\n",
  "supabase/migrations/001_init.sql": "create table public.notes (\n  id uuid primary key default gen_random_uuid(),\n  user_id uuid references auth.users not null,\n  body text not null\n);\n"
};
FIX.llm = {
  "requirements.txt": "anthropic>=0.40\n",
  "agent.py": "import subprocess\nimport anthropic\n\nclient = anthropic.Anthropic()\n\ndef run_task(page_text: str):\n    msg = client.messages.create(model=\"claude-sonnet-5-5\", max_tokens=1024,\n        messages=[{\"role\": \"user\", \"content\": \"Summarize and give a shell command to archive: \" + page_text}])\n    cmd = msg.content[0].text\n    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout\n"
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

function run(c, i) {
  return new Promise((resolve) => {
    const dir = join(outDir, 'fx', `${c.id}-${i}`);
    makeFixture(dir, c.stack);
    for (const [p, content] of Object.entries(c.files ?? {})) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      // The fake key is built here, so no secret-shaped string sits in the repo (GitHub push protection).
      writeFileSync(join(dir, p), content.replace('__FAKE_STRIPE_KEY__', 'sk_' + 'live_' + '51H' + 'x'.repeat(40)));
    }
    // `git: true` commits the fixture, so a case can use the default branch (SECURITY-PROFILE.md is read from it).
    if (c.git) {
      const g = (...a) => spawnSync('git', ['-c', 'user.name=eval', '-c', 'user.email=eval@example.com', ...a], { cwd: dir });
      g('init', '-q', '-b', 'main'); g('add', '-A'); g('commit', '-q', '-m', 'fixture');
    }
    // `expectChanged`: files the case must modify; their content is compared before and after the run.
    const before = Object.fromEntries((c.expectChanged ?? []).map((p) => [p, existsSync(join(dir, p)) ? readFileSync(join(dir, p), 'utf8') : null]));
    const args = ['-p', c.prompt, '--plugin-dir', suite, '--output-format', 'stream-json', '--verbose',
      '--max-budget-usd', '1.5', '--permission-mode', 'acceptEdits',
      // Without it, `claude -p` denies reading references/ (outside the fixture) and the case fails for the wrong reason.
      '--add-dir', suite];
    if (model) args.push('--model', model);
    const p = spawn('claude', args, { cwd: dir }); // native claude.exe: no shell, so prompts arrive without re-escaping
    p.stdin.end();
    let raw = '';
    p.stdout.on('data', (d) => (raw += d));
    p.stderr.on('data', (d) => (raw += d));
    const timer = setTimeout(() => p.kill(), 8 * 60 * 1000);
    p.on('close', () => {
      clearTimeout(timer);
      writeFileSync(join(outDir, `${c.id}-${i}.jsonl`), raw);
      const want = c.skill ?? 'security-checklist'; // the skill this case expects to load
      const skills = [];
      const skillCalls = new Set(); // ids of calls to this skill, to know whether it loaded without error
      let loaded = false;
      const pending = new Map(); // tool_use id → path, for reads inside the plugin
      let refErrors = 0;
      let finalText = '';
      let cost = null;
      let usedModel = null;
      const suiteNorm = suite.toLowerCase().replace(/\\/g, '/');
      for (const line of raw.split('\n')) {
        let m; try { m = JSON.parse(line); } catch { continue; }
        for (const b of m?.message?.content ?? []) {
          if (b.type === 'tool_use' && b.name === 'Skill') {
            skills.push(b.input?.skill);
            if (String(b.input?.skill).includes(want)) skillCalls.add(b.id);
          }
          if (b.type === 'tool_result' && skillCalls.has(b.tool_use_id) && !b.is_error) loaded = true;
          if (b.type === 'tool_use' && ['Read', 'Grep', 'Glob'].includes(b.name)) {
            const p = String(b.input?.file_path ?? b.input?.path ?? '').toLowerCase().replace(/\\/g, '/');
            if (p.startsWith(suiteNorm)) pending.set(b.id, p);
          }
          if (b.type === 'tool_result' && b.is_error && pending.has(b.tool_use_id)) refErrors++;
        }
        if (m.type === 'system' && m.subtype === 'init') usedModel = m.model ?? null;
        if (m.type === 'result') { finalText = m.result ?? ''; cost = m.total_cost_usd; }
      }
      const triggered = skills.some((s) => String(s).includes(want));
      const hookSeen = /\[secdev\] (Stack detectado|Detected stack)/.test(raw);
      // The `claude -p` stream does not show PostToolUse output: the reminder is detected through the
      // control file that hooks/post-edit.mjs leaves for that session.
      const sid = (raw.match(/"session_id":"([A-Za-z0-9_-]+)"/) ?? [])[1];
      const editReminder = Boolean(sid) && existsSync(join(tmpdir(), 'secdev-sessions', `${sid}.reminded`));
      const missing = missingMentions(finalText, c.mustMention);
      const controls = (c.expectControls ?? []).filter((id) => !finalText.includes(id));
      const verdict = verdictFrom(finalText);
      // The checklist and the fix skill give a verdict, and it must follow from its own table.
      const verdictOk = !c.trigger || c.noVerdict || !['security-checklist', 'security-fix'].includes(want) || verdictConsistent(finalText, verdict);
      const notChanged = (c.expectChanged ?? []).filter((p) => (existsSync(join(dir, p)) ? readFileSync(join(dir, p), 'utf8') : null) === before[p]);
      const ok = triggered === c.trigger && (!c.trigger || (loaded && refErrors === 0 && verdictOk && notChanged.length === 0
        && missing.length === 0 && controls.length === 0 && (!c.expectVerdict || verdict === c.expectVerdict)));
      resolve({ id: c.id, run: i, model: usedModel, expected: c.trigger, triggered, loaded, verdict, verdictOk, ok, hookSeen, editReminder, skills, refReads: pending.size, refErrors, cost, notChanged, missingMentions: missing, missingControls: controls });
    });
  });
}

mkdirSync(outDir, { recursive: true });
// Every case `repeat` times, at most CONCURRENCY `claude -p` processes at once (more hit rate limits).
const CONCURRENCY = 8;
const jobs = cases.flatMap((c) => Array.from({ length: repeat }, (_, k) => () => run(c, k + 1)));
const results = [];
let next = 0;
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
  while (next < jobs.length) results.push(await jobs[next++]());
}));
results.sort((a, b) => a.id.localeCompare(b.id) || a.run - b.run);
writeFileSync(join(outDir, 'results.json'), JSON.stringify(results, null, 2));
for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${`${r.id}#${r.run}`.padEnd(25)} expected=${r.expected} triggered=${r.triggered} loaded=${r.loaded} verdict=${r.verdict}${r.verdictOk ? '' : '(INCONSISTENT)'} hook=${r.hookSeen} reminder=${r.editReminder} refReads=${r.refReads} refErrors=${r.refErrors} cost=${r.cost} missingControls=${JSON.stringify(r.missingControls)} notChanged=${JSON.stringify(r.notChanged)} missingMentions=${JSON.stringify(r.missingMentions)}`);
const rows = aggregate(results, cases, repeat);
const { version } = JSON.parse(readFileSync(join(suite, '.claude-plugin/plugin.json'), 'utf8'));
const models = [...new Set(results.map((r) => r.model).filter(Boolean))];
const summary = summaryMarkdown({ date: new Date().toISOString().slice(0, 10), version: `v${version}`, models, repeat, rows });
writeFileSync(join(outDir, 'summary.md'), summary);
console.log(`\n${summary}`);
process.exit(rows.every((r) => r.gateOk) ? 0 : 1);
