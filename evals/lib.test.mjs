import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, missingMentions, verdictFrom, verdictConsistent, verdictAccepted, aggregate, summaryMarkdown } from './lib.mjs';

test('arguments: positional plus --repeat anywhere, bounded', () => {
  assert.deepEqual(parseArgs(['out', 'claude-sonnet-5-5', '--repeat', '3', 'a,b']), { outArg: 'out', model: 'claude-sonnet-5-5', only: 'a,b', repeat: 3 });
  assert.deepEqual(parseArgs(['out']), { outArg: 'out', model: '', only: '', repeat: 1 });
  assert.throws(() => parseArgs(['out', '--repeat', '0']));
  assert.throws(() => parseArgs(['out', '--repeat', 'x']));
  assert.throws(() => parseArgs(['out', '--repeat', '50']));
});

test('mentions: words or lists of alternatives, case-insensitive', () => {
  assert.deepEqual(missingMentions('Uses constructEvent and idempotency keys', [['constructEvent', 'raw body'], 'idempot']), []);
  assert.deepEqual(missingMentions('checks the RAW BODY', [['constructEvent', 'raw body'], 'idempot']), ['idempot']);
});

test('verdict: English and Spanish', () => {
  assert.equal(verdictFrom('**Verdict:** BLOCK\n'), 'BLOCK');
  assert.equal(verdictFrom('Veredicto: PASA CON PENDIENTES'), 'PASS WITH ISSUES');
  assert.equal(verdictFrom('**Veredicto del checklist de seguridad (secdev): PASS WITH ISSUES**'), 'PASS WITH ISSUES');
  assert.equal(verdictFrom('no verdict here'), null);
});

test('verdict must follow from the table', () => {
  const p0fail = '| P0-02 | Backend authorization | NOT MET | x.ts:40 | V8.2 |';
  const p1fail = '| P1-05 | Logs | NOT MET | none | V16 |';
  const p0warn = '| P0-10 | MFA | UNVERIFIED | console | V13 |';
  const allOk = '| P0-02 | Backend authorization | MET | x.ts:40 | V8.2 |';
  assert.equal(verdictConsistent(p0fail, 'BLOCK'), true);
  assert.equal(verdictConsistent(p0fail, 'PASS WITH ISSUES'), false);
  assert.equal(verdictConsistent(p1fail, 'PASS'), false);
  assert.equal(verdictConsistent(p0warn, 'PASS'), false);
  assert.equal(verdictConsistent(p0warn, 'PASS WITH ISSUES'), true);
  assert.equal(verdictConsistent(allOk, 'PASS'), true);
  assert.equal(verdictConsistent(allOk, null), false);
  assert.equal(verdictAccepted('Design: P0-02 applies. A relative changes childId.', false, true), true);
  assert.equal(verdictAccepted('Verdict: BLOCK\n| P0-02 | x | NOT MET | y | V8 |', false, true), false);
  assert.equal(verdictAccepted('Verdict: BLOCK\n| P0-02 | x | NOT MET | y | V8 |', true), true);
  assert.equal(verdictAccepted(`Verdict: BLOCK\n${p0fail}`, false), true);
  assert.equal(verdictAccepted(`Verdict: PASS\n${p0fail}`, false), false);
});

test('gate: critical needs every repeat, others two thirds', () => {
  const cases = [{ id: 'crit', critical: true }, { id: 'norm' }, { id: 'bad' }];
  const runs = [
    { id: 'crit', ok: true, cost: 0.2 }, { id: 'crit', ok: true, cost: 0.2 }, { id: 'crit', ok: false, cost: 0.2 },
    { id: 'norm', ok: true, cost: 0.1 }, { id: 'norm', ok: true, cost: 0.1 }, { id: 'norm', ok: false, cost: 0.1 },
    { id: 'bad', ok: false }, { id: 'bad', ok: false }, { id: 'bad', ok: false },
  ];
  const rows = aggregate(runs, cases, 3);
  assert.deepEqual(rows.map((r) => [r.id, r.passes, r.status, r.gateOk]), [['crit', 2, 'flaky', false], ['norm', 2, 'flaky', true], ['bad', 0, 'failing', false]]);
  const md = summaryMarkdown({ date: '2026-11-03', version: 'v9.9.9', models: ['m'], repeat: 3, rows });
  assert.match(md, /gate: \*\*FAIL\*\*/);
  assert.match(md, /\| crit \| yes \| 2\/3 \| flaky \| fail \|/);
  assert.match(md, /cost: \$0\.90/);
});
