// Update notice for the SessionStart hook. No network here: the hook only reads a cache that
// update-check.mjs refreshes in the background at most once a day. hooks/update.test.mjs tests it.
import { readFileSync, lstatSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = 'majejorex/secdev-suite';
export const REMOTE_MANIFEST = `https://raw.githubusercontent.com/${REPO}/main/.claude-plugin/plugin.json`;
export const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const SEMVER = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;

export const cacheFile = (dataDir) => join(dataDir, 'update.json');

export function installedVersion() {
  try {
    const p = join(dirname(fileURLToPath(import.meta.url)), '..', '.claude-plugin', 'plugin.json');
    const v = JSON.parse(readFileSync(p, 'utf8')).version;
    return SEMVER.test(v) ? v : null;
  } catch {
    return null;
  }
}

// Only a plain x.y.z is accepted: the cache and the remote are untrusted input.
export function parseVersion(text) {
  try {
    const v = JSON.parse(text)?.version;
    return typeof v === 'string' && SEMVER.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function isNewer(latest, installed) {
  if (!SEMVER.test(latest ?? '') || !SEMVER.test(installed ?? '')) return false;
  const [a, b] = [latest, installed].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

export function readCache(dataDir) {
  try {
    const p = cacheFile(dataDir);
    if (!lstatSync(p).isFile()) return null; // never follow a link planted in place of the cache
    const c = JSON.parse(readFileSync(p, 'utf8'));
    return { checked: Number(c.checked) || 0, latest: SEMVER.test(c.latest ?? '') ? c.latest : null };
  } catch {
    return null;
  }
}

export const needsCheck = (cache, now = Date.now()) => !cache || now - cache.checked > CHECK_EVERY_MS || cache.checked > now;

export function updateNotice(installed, latest) {
  if (!isNewer(latest, installed)) return '';
  return `secdev ${latest} is available (installed: ${installed}). Review what changes in hooks/ before updating: https://github.com/${REPO}/compare/v${installed}...v${latest} · Update: claude plugin marketplace update secdev-suite && claude plugin update secdev@secdev-suite, then restart Claude Code. Turn this check off with SECDEV_NO_UPDATE_CHECK=1.`;
}
