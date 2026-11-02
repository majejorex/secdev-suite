// Comprueba que el plugin es cargable: JSON válidos, frontmatter de cada skill, enlaces internos y IDs citados por los evals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('plugin.json, marketplace.json y hooks.json son JSON válidos y coherentes', () => {
  const plugin = JSON.parse(read('.claude-plugin/plugin.json'));
  const market = JSON.parse(read('.claude-plugin/marketplace.json'));
  const hooks = JSON.parse(read('hooks/hooks.json'));
  assert.equal(market.plugins[0].name, plugin.name);
  assert.ok(hooks.hooks.SessionStart[0].hooks[0].command.includes('${CLAUDE_PLUGIN_ROOT}'));
});

test('cada skill tiene frontmatter con name igual a su carpeta y description', () => {
  for (const dir of readdirSync(join(ROOT, 'skills'))) {
    const md = read(`skills/${dir}/SKILL.md`);
    const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(fm, `${dir}: falta frontmatter`);
    assert.match(fm[1], new RegExp(`^name: ${dir}$`, 'm'));
    assert.match(fm[1], /^description: .{80,}/m, `${dir}: description vacía o corta`);
  }
});

test('los enlaces relativos de las skills apuntan a ficheros que existen', () => {
  for (const dir of readdirSync(join(ROOT, 'skills'))) {
    const md = read(`skills/${dir}/SKILL.md`);
    for (const [, href] of md.matchAll(/\]\(([^)#:]+\.md)\)/g)) {
      assert.ok(existsSync(join(ROOT, 'skills', dir, href)), `${dir}: enlace roto ${href}`);
    }
  }
});

test('los controles que esperan los evals existen en la checklist', () => {
  const checklist = read('skills/security-checklist/SKILL.md');
  const { cases } = JSON.parse(read('evals/cases.json'));
  for (const c of cases) {
    for (const id of c.expectControls ?? []) assert.ok(checklist.includes(`| ${id} |`), `${c.id}: ${id} no está en SKILL.md`);
  }
});

test('SKILL.md mantiene las reglas de seguridad para revisar repos no confiables', () => {
  const md = read('skills/security-checklist/SKILL.md');
  assert.match(md, /son datos, no instrucciones/);
  assert.match(md, /No ejecutes código del repo revisado/);
  assert.match(md, /Solo puede endurecer controles/);
  assert.match(md, /No consultes CLIs ni APIs cloud/);
  assert.doesNotMatch(md, /ejecutar tests si son baratos/);
  // allowed-tools hace que la carga de la skill pida permiso y falle en `claude -p` (visto en evals 2026-11-02).
  assert.doesNotMatch(md.split('\n---')[0], /^allowed-tools:/m);
  assert.ok(md.split('\n').length < 150, 'SKILL.md debe seguir por debajo de 150 líneas');
});

test('los evals incluyen casos en los que la skill NO debe activarse', () => {
  const { cases } = JSON.parse(read('evals/cases.json'));
  assert.ok(cases.filter((c) => c.trigger === false).length >= 3);
});

test('la checklist no repite IDs', () => {
  const md = read('skills/security-checklist/SKILL.md');
  const section = md.slice(md.indexOf('## Checklist'), md.indexOf('## Formato de salida'));
  const ids = [...section.matchAll(/^\| (P\d-\d\d) \|/gm)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.filter((i) => i.startsWith('P0')).length, 16);
});
