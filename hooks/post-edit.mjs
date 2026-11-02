// PostToolUse (Edit|Write|MultiEdit|NotebookEdit): if the edit touches something risky, reminds
// the secdev:security-checklist skill. Warns, never blocks. Once per session. Never fails (always exit 0).
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

try {
  const { classify, editedText, message, safeSessionId } = await import('./risk.mjs');
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const ti = input.tool_input ?? {};
  const msg = message(classify(ti.file_path ?? ti.notebook_path, editedText(ti)));
  if (msg) {
    const sid = safeSessionId(input.session_id);
    // shortcut: one empty file per session in the temp dir, never cleaned up; if it becomes a nuisance, delete files older than 7 days here.
    const dir = join(tmpdir(), 'secdev-sessions');
    const flag = sid ? join(dir, `${sid}.reminded`) : null;
    if (!flag || !existsSync(flag)) {
      if (flag) {
        mkdirSync(dir, { recursive: true });
        writeFileSync(flag, '');
      }
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg } }) + '\n');
    }
  }
} catch {
  // stay silent on any error (empty stdin, broken JSON, temp dir without permissions)
}
process.exit(0);
