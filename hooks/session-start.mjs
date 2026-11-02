// SessionStart: detects the project stack and reminds the secdev:security-checklist skill.
// Runs in every session: never fails (always exit 0) and stays silent when there is nothing relevant.
// Entry point only (no check for direct invocation: that check failed with junctions).
// Dynamic import inside the try: if stack.mjs breaks, the hook stays silent instead of exiting with an error.
try {
  const { detectStack, render } = await import('./stack.mjs');
  const out = render(detectStack(process.env.CLAUDE_PROJECT_DIR || process.cwd()));
  if (out) process.stdout.write(out + '\n');
} catch {
  // shortcut: total silence on any error; if diagnosing is ever needed, add a log to a file.
}
process.exit(0);
