// Pure helpers for evals/run.mjs: argument parsing, grading and the release gate.
// No side effects, so evals/lib.test.mjs tests them without spending money.

export function parseArgs(argv) {
  const rest = [];
  let repeat = 1;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--repeat') repeat = Number(argv[++i]);
    else rest.push(argv[i]);
  }
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 10) throw new Error('--repeat must be an integer from 1 to 10');
  const [outArg = '', model = '', only = ''] = rest;
  return { outArg, model, only, repeat };
}

// Each item is a word or a list of alternatives; any alternative counts. Case-insensitive.
export function missingMentions(text, mustMention = []) {
  const t = String(text).toLowerCase();
  return mustMention.filter((w) => ![w].flat().some((alt) => t.includes(String(alt).toLowerCase())));
}

const ES = { BLOQUEA: 'BLOCK', 'PASA CON PENDIENTES': 'PASS WITH ISSUES', PASA: 'PASS' };
export function verdictFrom(text) {
  const raw = (String(text).match(/(?:Verdict|Veredicto)[^\n:]{0,60}:\**\s*\**\s*(BLOCK|PASS WITH ISSUES|PASS|BLOQUEA|PASA CON PENDIENTES|PASA)/i) ?? [])[1]?.toUpperCase() ?? null;
  return ES[raw] ?? raw;
}

// The verdict must follow from the table: a P0 at NOT MET means BLOCK; any NOT MET or UNVERIFIED row rules out PASS.
export function verdictConsistent(text, verdict) {
  if (verdict === null) return false;
  const t = String(text);
  if (/^\|\s*P0-\d\d\s*\|[^\n]*\|\s*\**NOT MET\**\s*\|/m.test(t)) return verdict === 'BLOCK';
  if (/^\|\s*P\d-\d\d\s*\|[^\n]*\|\s*\**(NOT MET|UNVERIFIED)\**\s*\|/m.test(t)) return verdict !== 'PASS';
  return true;
}

// Release gate: a critical case must pass every repeat; any other case at least two thirds of them.
export function aggregate(runs, cases, repeat) {
  return cases.map((c) => {
    const mine = runs.filter((r) => r.id === c.id);
    const passes = mine.filter((r) => r.ok).length;
    const need = c.critical ? repeat : Math.ceil((2 * repeat) / 3);
    const status = passes === repeat ? 'stable' : passes === 0 ? 'failing' : 'flaky';
    const cost = mine.reduce((a, r) => a + (r.cost ?? 0), 0);
    return { id: c.id, critical: Boolean(c.critical), passes, repeat, need, status, gateOk: passes >= need, cost };
  });
}

export function summaryMarkdown({ date, version, models, repeat, rows }) {
  const total = rows.reduce((a, r) => a + r.cost, 0);
  const gateOk = rows.every((r) => r.gateOk);
  const lines = [
    `# Evals ${version} (${date})`,
    '',
    `Model: ${models.join(', ') || 'unknown'} · repeats: ${repeat} · cost: $${total.toFixed(2)} · gate: **${gateOk ? 'PASS' : 'FAIL'}**`,
    '',
    'Gate: a critical case passes every repeat; any other case at least two thirds of them.',
    '',
    '| Case | Critical | Passes | Status | Gate |',
    '|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.id} | ${r.critical ? 'yes' : ''} | ${r.passes}/${r.repeat} | ${r.status} | ${r.gateOk ? 'pass' : 'fail'} |`),
    '',
  ];
  return lines.join('\n');
}
