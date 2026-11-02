// PostToolUse (Edit|Write|MultiEdit|NotebookEdit): si la edición toca algo de riesgo, recuerda la
// skill secdev:security-checklist. Avisa, no bloquea. Una vez por sesión. Nunca falla (exit 0 siempre).
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
    // shortcut: un fichero vacío por sesión en el temporal y nunca se limpia; si molesta, borrar los de más de 7 días aquí.
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
  // silencio ante cualquier error (stdin vacío, JSON roto, temporal sin permisos)
}
process.exit(0);
