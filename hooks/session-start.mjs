// SessionStart: detects the project stack and reminds the secdev:security-checklist skill.
// It also tells the user when a newer secdev is published (cache refreshed in the background, see update.mjs).
// Runs in every session: never fails (always exit 0) and stays silent when there is nothing relevant.
// Entry point only (no check for direct invocation: that check failed with junctions).
// Dynamic imports inside the try: if a module breaks, the hook stays silent instead of exiting with an error.
let context = '';
let notice = '';
try {
  const { detectStack, render } = await import('./stack.mjs');
  context = render(detectStack(process.env.CLAUDE_PROJECT_DIR || process.cwd()));
} catch {
  // shortcut: total silence on any error; if diagnosing is ever needed, add a log to a file.
}
try {
  const dataDir = process.env.CLAUDE_PLUGIN_DATA;
  if (dataDir && process.env.SECDEV_NO_UPDATE_CHECK !== '1') {
    const { readCache, needsCheck, updateNotice, installedVersion } = await import('./update.mjs');
    const cache = readCache(dataDir);
    if (needsCheck(cache)) {
      const { spawn } = await import('node:child_process');
      const { fileURLToPath } = await import('node:url');
      const script = fileURLToPath(new URL('./update-check.mjs', import.meta.url));
      // Detached and without pipes: the hook never waits for the network.
      spawn(process.execPath, [script, dataDir], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    }
    notice = updateNotice(installedVersion(), cache?.latest);
  }
} catch {
  // never let the update check affect the session
}
if (notice) {
  // systemMessage is shown to the user; the stack context still goes to Claude.
  const out = { systemMessage: notice };
  if (context) out.hookSpecificOutput = { hookEventName: 'SessionStart', additionalContext: context };
  process.stdout.write(JSON.stringify(out) + '\n');
} else if (context) {
  process.stdout.write(context + '\n');
}
process.exit(0);
