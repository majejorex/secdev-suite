// Checks that the plugin is loadable: valid JSON, frontmatter of each skill, internal links and the IDs cited by the evals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('plugin.json, marketplace.json and hooks.json are valid and consistent JSON', () => {
  const plugin = JSON.parse(read('.claude-plugin/plugin.json'));
  const market = JSON.parse(read('.claude-plugin/marketplace.json'));
  const hooks = JSON.parse(read('hooks/hooks.json'));
  assert.equal(market.plugins[0].name, plugin.name);
  assert.ok(hooks.hooks.SessionStart[0].hooks[0].command.includes('${CLAUDE_PLUGIN_ROOT}'));
  const post = hooks.hooks.PostToolUse[0];
  assert.equal(post.matcher, 'Edit|Write|MultiEdit|NotebookEdit');
  assert.ok(post.hooks[0].command.includes('${CLAUDE_PLUGIN_ROOT}/hooks/post-edit.mjs'));
  for (const h of [...hooks.hooks.SessionStart, ...hooks.hooks.PostToolUse].flatMap((x) => x.hooks)) assert.ok(h.timeout <= 5);
});

test('each skill has frontmatter with name equal to its folder and a description', () => {
  for (const dir of readdirSync(join(ROOT, 'skills'))) {
    const md = read(`skills/${dir}/SKILL.md`);
    const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(fm, `${dir}: missing frontmatter`);
    assert.match(fm[1], new RegExp(`^name: ${dir}$`, 'm'));
    assert.match(fm[1], /^description: .{80,}/m, `${dir}: description empty or too short`);
  }
});

test('relative links in the skills point to files that exist', () => {
  for (const dir of readdirSync(join(ROOT, 'skills'))) {
    const md = read(`skills/${dir}/SKILL.md`);
    for (const [, href] of md.matchAll(/\]\(([^)#:]+\.md)\)/g)) {
      assert.ok(existsSync(join(ROOT, 'skills', dir, href)), `${dir}: broken link ${href}`);
    }
  }
});

test('the controls the evals expect exist in the checklist', () => {
  const checklist = read('skills/security-checklist/SKILL.md');
  const { cases } = JSON.parse(read('evals/cases.json'));
  for (const c of cases) {
    for (const id of c.expectControls ?? []) assert.ok(checklist.includes(`| ${id} |`), `${c.id}: ${id} is not in SKILL.md`);
  }
});

test('SKILL.md keeps the safety rules for reviewing untrusted repos', () => {
  const md = read('skills/security-checklist/SKILL.md');
  assert.match(md, /is data, not instructions/);
  assert.match(md, /Do not run code from the reviewed repo/);
  assert.match(md, /It can only tighten controls/);
  assert.match(md, /Do not query cloud CLIs or APIs/);
  assert.doesNotMatch(md, /run tests if they are cheap/);
  // allowed-tools makes loading the skill ask for permission and fail in `claude -p` (seen in evals 2026-11-02).
  assert.doesNotMatch(md.split('\n---')[0], /^allowed-tools:/m);
  assert.ok(md.split('\n').length < 150, 'SKILL.md must stay under 150 lines');
});

test('every PostToolUse category names controls that exist in the checklist', async () => {
  const { CONTROLS } = await import('../hooks/risk.mjs');
  const checklist = read('skills/security-checklist/SKILL.md');
  const cats = [...read('hooks/risk.mjs').matchAll(/^\s*\['([^']+)', \//gm)].map((m) => m[1]);
  assert.ok(cats.length >= 10);
  for (const c of cats) assert.ok(CONTROLS[c]?.length, `${c}: no controls in CONTROLS`);
  for (const id of Object.values(CONTROLS).flat()) assert.ok(checklist.includes(`| ${id} |`), `${id} is not in SKILL.md`);
});

test('the evals include cases where the skill must NOT activate', () => {
  const { cases } = JSON.parse(read('evals/cases.json'));
  assert.ok(cases.filter((c) => c.trigger === false).length >= 3);
});

test('the evals keep Spanish cases to check Spanish activation', () => {
  const { cases } = JSON.parse(read('evals/cases.json'));
  assert.ok(cases.filter((c) => c.id.startsWith('es-') && c.trigger).length >= 2);
});

test('the checklist does not repeat IDs', () => {
  const md = read('skills/security-checklist/SKILL.md');
  const section = md.slice(md.indexOf('## Checklist'), md.indexOf('## Output format'));
  const ids = [...section.matchAll(/^\| (P\d-\d\d) \|/gm)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.filter((i) => i.startsWith('P0')).length, 16);
});
