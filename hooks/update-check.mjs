// Background child of session-start.mjs: reads the version on main and stores it in the cache.
// It sends nothing about the user's project: one GET to a public file, at most once a day.
// Usage: node update-check.mjs <data dir>. Never fails loudly.
import { writeFileSync, mkdirSync } from 'node:fs';
import { REMOTE_MANIFEST, cacheFile, parseVersion, readCache } from './update.mjs';

const dataDir = process.argv[2];
if (dataDir) {
  let latest = readCache(dataDir)?.latest ?? null; // keep the last known value if the network fails
  try {
    const res = await fetch(REMOTE_MANIFEST, { signal: AbortSignal.timeout(5000), redirect: 'error' });
    if (res.ok) latest = parseVersion((await res.text()).slice(0, 10_000)) ?? latest;
  } catch {
    // offline, timeout or blocked: try again tomorrow
  }
  try {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(cacheFile(dataDir), JSON.stringify({ checked: Date.now(), latest }));
  } catch {
    // no permission: nothing to do
  }
}
process.exit(0);
