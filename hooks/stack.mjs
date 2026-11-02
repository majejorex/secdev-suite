// Detección de stack para el hook SessionStart. Sin efectos: lo prueba hooks/stack.test.mjs.
import { existsSync, readFileSync, opendirSync } from 'node:fs';
import { join } from 'node:path';

const MAX_CHILD_DIRS = 30;
const MAX_PACKAGE_JSON_BYTES = 1_000_000;

// Señal → etiqueta. `files` son rutas relativas que delatan el stack; `deps` se busca en package.json.
// Para móvil se usan ficheros concretos, no carpetas `android`/`ios`: Windows no distingue mayúsculas
// y «C:\Program Files\Android» daba falsos positivos.
const RULES = [
  { tag: 'firebase', files: ['firebase.json', 'firestore.rules', 'storage.rules'], deps: ['firebase', 'firebase-admin', 'firebase-functions'] },
  { tag: 'supabase', files: ['supabase/config.toml'], deps: ['@supabase/supabase-js'] },
  { tag: 'móvil', files: ['android/app/build.gradle', 'android/app/build.gradle.kts', 'ios/Podfile'], deps: ['expo', 'react-native'] },
  { tag: 'stripe', deps: ['stripe', '@stripe/stripe-js', '@stripe/stripe-react-native'] },
  { tag: 'next', deps: ['next'] },
  { tag: 'api', deps: ['express', 'fastify', 'hono', 'koa', '@nestjs/core'] },
  { tag: 'llm', deps: ['@anthropic-ai/sdk', 'openai', 'langchain', '@langchain/core', 'ai'] },
  { tag: 'python', files: ['pyproject.toml', 'requirements.txt'] },
  { tag: 'docker', files: ['Dockerfile', 'docker-compose.yml', 'compose.yaml'] },
];

function readDeps(dir) {
  try {
    const raw = readFileSync(join(dir, 'package.json'), 'utf8');
    if (raw.length > MAX_PACKAGE_JSON_BYTES) return new Set();
    const pkg = JSON.parse(raw);
    return new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
  } catch {
    return new Set();
  }
}

function detectIn(dir) {
  const deps = readDeps(dir);
  const tags = new Set();
  for (const rule of RULES) {
    const byFile = (rule.files ?? []).some((f) => existsSync(join(dir, f)));
    const byDep = (rule.deps ?? []).some((d) => deps.has(d));
    if (byFile || byDep) tags.add(rule.tag);
  }
  return tags;
}

// Hasta MAX_CHILD_DIRS subcarpetas visibles, sin listar la carpeta entera (Descargas, cachés…).
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
    // carpeta inexistente o sin permiso: sin hijos
  } finally {
    try { dir?.closeSync(); } catch { /* ya cerrada */ }
  }
  return out;
}

// La raíz y sus hijos directos: cubre workspaces con varios repos, monorepos (apps/*) y `functions/`.
export function detectStack(root) {
  const tags = detectIn(root);
  for (const child of childDirs(root)) for (const t of detectIn(child)) tags.add(t);
  return [...tags].sort();
}

export function standardsFor(tags) {
  const s = ['ASVS 5.0'];
  if (tags.some((t) => ['firebase', 'supabase', 'api', 'next', 'stripe'].includes(t))) s.push('API Security Top 10 2023');
  if (tags.includes('móvil')) s.push('MASVS 2.1');
  return s;
}

export function render(tags) {
  if (tags.length === 0) return '';
  return [
    `[secdev] Stack detectado: ${tags.join(', ')}. Normas aplicables: ${standardsFor(tags).join(' + ')}.`,
    '[secdev] Al diseñar o antes de dar por terminado algo que toque auth, roles, datos de usuario, pagos, subidas, secretos o reglas de acceso, carga la skill secdev:security-checklist.',
  ].join('\n');
}
