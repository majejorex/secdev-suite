// PostToolUse (Edit|Write|MultiEdit|NotebookEdit): if the edit touches something risky, reminds
// the secdev:security-checklist skill. Warns, never blocks. Once per session. Never fails (always exit 0).
import { readFileSync, mkdirSync, writeFileSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SCANNED = 1000;

// Deletes the marks of sessions that ended long ago. Only runs when a new mark is created, so it costs nothing on most edits.
function removeOldFlags(dir) {
  const now = Date.now();
  for (const name of readdirSync(dir).slice(0, MAX_SCANNED)) {
    if (!name.endsWith('.reminded')) continue;
    try {
      if (now - statSync(join(dir, name)).mtimeMs > MAX_AGE_MS) unlinkSync(join(dir, name));
    } catch {
      // already gone or not ours to delete
    }
  }
}

try {
  const { classify, editedText, message, safeSessionId } = await import('./risk.mjs');
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const ti = input.tool_input ?? {};
  const msg = message(classify(ti.file_path ?? ti.notebook_path, editedText(ti)));
  if (msg) {
    const sid = safeSessionId(input.session_id);
    // One empty file per session in the temp dir; the ones older than 7 days are deleted when a new one is created.
    const dir = join(tmpdir(), 'secdev-sessions');
    const flag = sid ? join(dir, `${sid}.reminded`) : null;
    if (!flag || !existsSync(flag)) {
      if (flag) {
        mkdirSync(dir, { recursive: true });
        writeFileSync(flag, '');
        try { removeOldFlags(dir); } catch { /* cleanup is optional */ }
      }
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg } }) + '\n');
    }
  }
} catch {
  // stay silent on any error (empty stdin, broken JSON, temp dir without permissions)
}
process.exit(0);
