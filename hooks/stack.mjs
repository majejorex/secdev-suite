// Stack detection for the SessionStart hook. No side effects: hooks/stack.test.mjs tests it.
import { lstatSync, readFileSync, opendirSync } from 'node:fs';
import { join } from 'node:path';

const MAX_CHILD_DIRS = 30;
const MAX_PACKAGE_JSON_BYTES = 1_000_000;
const MAX_MANIFEST_BYTES = 256_000;
const MAX_DIR_ENTRIES = 300;

// Manifests of other ecosystems, read as text and searched for framework names (rule.words).
const MANIFESTS = ['requirements.txt', 'pyproject.toml', 'Pipfile', 'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'composer.json', 'Gemfile'];

// Signal → tag. `files` are relative paths that reveal the stack; `deps` are looked up in package.json;
// `words` are regexes tried on the manifests above (and on *.csproj); `ext` are file extensions found in the folder.
// For mobile it uses specific files, not `android`/`ios` folders: Windows is case-insensitive
// and "C:\Program Files\Android" gave false positives.
const RULES = [
  { tag: 'firebase', files: ['firebase.json', 'firestore.rules', 'storage.rules'], deps: ['firebase', 'firebase-admin', 'firebase-functions'], words: [/firebase-admin|firebase\.google\.com\/go|kreait\/firebase/i] },
  { tag: 'supabase', files: ['supabase/config.toml'], deps: ['@supabase/supabase-js'], words: [/supabase/i] },
  { tag: 'mobile', files: ['android/app/build.gradle', 'android/app/build.gradle.kts', 'ios/Podfile'], deps: ['expo', 'react-native', '@capacitor/core'] },
  { tag: 'desktop', files: ['src-tauri/tauri.conf.json'], deps: ['electron', '@tauri-apps/api'] },
  { tag: 'stripe', deps: ['stripe', '@stripe/stripe-js', '@stripe/stripe-react-native'], words: [/\bstripe\b/i] },
  { tag: 'next', deps: ['next'] },
  { tag: 'api', deps: ['express', 'fastify', 'hono', 'koa', '@nestjs/core'], words: [/\b(fastapi|django|flask|starlette)\b|gin-gonic\/gin|labstack\/echo|gofiber\/fiber|go-chi\/chi|spring-boot|laravel\/framework|symfony\/|['"]rails['"]|actix-web|\baxum\b|Microsoft\.NET\.Sdk\.Web/i] },
  { tag: 'llm', deps: ['@anthropic-ai/sdk', 'openai', 'langchain', '@langchain/core', 'ai'], words: [/\b(anthropic|openai|langchain|litellm)\b/i] },
  { tag: 'python', files: ['pyproject.toml', 'requirements.txt', 'Pipfile', 'setup.py'] },
  { tag: 'go', files: ['go.mod'] },
  { tag: 'rust', files: ['Cargo.toml'] },
  { tag: 'jvm', files: ['pom.xml', 'build.gradle', 'build.gradle.kts'] },
  { tag: 'php', files: ['composer.json'] },
  { tag: 'ruby', files: ['Gemfile'] },
  { tag: 'dotnet', ext: ['.csproj', '.fsproj', '.sln'] },
  { tag: 'docker', files: ['Dockerfile', 'docker-compose.yml', 'compose.yaml'] },
];

// Links are never followed: a cloned repo could point firebase.json or package.json at a UNC path
// (\\host\share), and touching it would make Windows send the user's NTLM hash.
function lstatOrNull(p) {
  try {
    return lstatSync(p, { throwIfNoEntry: false }) ?? null;
  } catch {
    return null;
  }
}

function exists(p) {
  const st = lstatOrNull(p);
  return Boolean(st && (st.isFile() || st.isDirectory()));
}

function readDeps(dir) {
  try {
    const p = join(dir, 'package.json');
    const st = lstatOrNull(p);
    if (!st?.isFile() || st.size > MAX_PACKAGE_JSON_BYTES) return new Set();
    const pkg = JSON.parse(readFileSync(p, 'utf8'));
    return new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
  } catch {
    return new Set();
  }
}

function readText(p) {
  try {
    const st = lstatOrNull(p);
    return st?.isFile() && st.size <= MAX_MANIFEST_BYTES ? readFileSync(p, 'utf8') : '';
  } catch {
    return '';
  }
}

// Names in the folder (at most MAX_DIR_ENTRIES, so a huge folder cannot slow the hook) and the text of its manifests.
function scanFolder(dir) {
  const names = [];
  let d;
  try {
    d = opendirSync(dir);
    let e;
    while (names.length < MAX_DIR_ENTRIES && (e = d.readSync()) !== null) names.push(e.name);
  } catch {
    // missing folder or no permission
  } finally {
    try { d?.closeSync(); } catch { /* already closed */ }
  }
  const files = [...MANIFESTS, ...names.filter((n) => n.endsWith('.csproj'))];
  return { names, text: files.map((n) => readText(join(dir, n))).join('\n') };
}

function detectIn(dir) {
  const deps = readDeps(dir);
  const { names, text } = scanFolder(dir);
  const tags = new Set();
  for (const rule of RULES) {
    const byFile = (rule.files ?? []).some((f) => exists(join(dir, f)));
    const byDep = (rule.deps ?? []).some((d) => deps.has(d));
    const byWord = (rule.words ?? []).some((re) => re.test(text));
    const byExt = (rule.ext ?? []).some((x) => names.some((n) => n.endsWith(x)));
    if (byFile || byDep || byWord || byExt) tags.add(rule.tag);
  }
  return tags;
}

// Up to MAX_CHILD_DIRS visible subfolders, without listing the whole folder (Downloads, caches...).
function childDirs(root) {
  const out = [];
  let dir;
  try {
    dir = opendirSync(root);
    let entry;
    while (out.length < MAX_CHILD_DIRS && (entry = dir.readSync()) !== null) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') out.push(join(root, entry.name));
    }
  } catch {
    // missing folder or no permission: no children
  } finally {
    try { dir?.closeSync(); } catch { /* already closed */ }
  }
  return out;
}

// The root and its direct children: covers workspaces with several repos, monorepos (apps/*) and `functions/`.
export function detectStack(root) {
  const tags = detectIn(root);
  for (const child of childDirs(root)) for (const t of detectIn(child)) tags.add(t);
  return [...tags].sort();
}

export function standardsFor(tags) {
  const s = ['ASVS 5.0'];
  if (tags.some((t) => ['firebase', 'supabase', 'api', 'next', 'stripe'].includes(t))) s.push('API Security Top 10 2023');
  if (tags.includes('mobile')) s.push('MASVS 2.1');
  return s;
}

export function render(tags) {
  if (tags.length === 0) return '';
  return [
    `[secdev] Detected stack: ${tags.join(', ')}. Applicable standards: ${standardsFor(tags).join(' + ')}.`,
    '[secdev] Before calling done anything that touches auth, roles, user data, payments, uploads, secrets or access rules, load secdev:security-checklist.',
  ].join('\n');
}
