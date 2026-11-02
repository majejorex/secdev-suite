// SessionStart: detecta el stack del proyecto y recuerda la skill secdev:security-checklist.
// Corre en todas las sesiones: nunca falla (exit 0 siempre) y calla si no hay nada relevante.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_CHILD_DIRS = 30;

// Señal → etiqueta. `deps` busca en dependencies/devDependencies de package.json.
const RULES = [
  { tag: 'firebase', files: ['firebase.json', 'firestore.rules', 'storage.rules'], deps: ['firebase', 'firebase-admin', 'firebase-functions'] },
  { tag: 'supabase', files: ['supabase/config.toml'], deps: ['@supabase/supabase-js'] },
  { tag: 'móvil', files: ['android', 'ios'], deps: ['expo', 'react-native'] },
  { tag: 'stripe', deps: ['stripe', '@stripe/stripe-js', '@stripe/stripe-react-native'] },
  { tag: 'next', deps: ['next'] },
  { tag: 'api', deps: ['express', 'fastify', 'hono', 'koa', '@nestjs/core'] },
  { tag: 'llm', deps: ['@anthropic-ai/sdk', 'openai', 'langchain', '@langchain/core', 'ai'] },
  { tag: 'python', files: ['pyproject.toml', 'requirements.txt'] },
  { tag: 'docker', files: ['Dockerfile', 'docker-compose.yml', 'compose.yaml'] },
];

function readDeps(dir) {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
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

function isProject(dir) {
  return ['package.json', 'pyproject.toml', 'requirements.txt', 'go.mod', 'firebase.json'].some((f) => existsSync(join(dir, f)));
}

// Mira el directorio y, si no es un proyecto, sus hijos directos (raíz de un workspace con varios repos).
export function detectStack(root) {
  const tags = detectIn(root);
  if (!isProject(root)) {
    let children = [];
    try {
      children = readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
        .slice(0, MAX_CHILD_DIRS);
    } catch {
      children = [];
    }
    for (const child of children) for (const t of detectIn(join(root, child.name))) tags.add(t);
  }
  return [...tags].sort();
}

export function standardsFor(tags) {
  const s = ['ASVS 5.0'];
  if (tags.some((t) => ['firebase', 'supabase', 'api', 'next', 'stripe'].includes(t))) s.push('API Security Top 10 2023');
  if (tags.includes('móvil')) s.push('MASVS 2.1');
  if (tags.includes('llm')) s.push('OWASP LLM Top 10');
  return s;
}

export function render(tags) {
  if (tags.length === 0) return '';
  return [
    `[secdev] Stack detectado: ${tags.join(', ')}. Normas aplicables: ${standardsFor(tags).join(' + ')}.`,
    '[secdev] Al diseñar o antes de dar por terminado algo que toque auth, roles, datos de usuario, pagos, subidas, secretos o reglas de acceso, carga la skill secdev:security-checklist.',
  ].join('\n');
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  try {
    const out = render(detectStack(process.env.CLAUDE_PROJECT_DIR || process.cwd()));
    if (out) process.stdout.write(out + '\n');
  } catch {
    // shortcut: silencio total ante cualquier error; si algún día hace falta diagnosticar, añadir un log a fichero.
  }
  process.exit(0);
}
