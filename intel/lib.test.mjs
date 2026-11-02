import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { clean, httpUrl, isWatched, nextLink, normalizeGhsa, normalizeKev, parseFeed, summarize } from './lib.mjs';

const FETCH = fileURLToPath(new URL('./fetch.mjs', import.meta.url));

test('clean: quita etiquetas, CDATA, entidades y caracteres de control, y recorta', () => {
  assert.equal(clean('<![CDATA[<b>Hola</b> &amp; adiós]]>'), 'Hola & adiós');
  assert.equal(clean('a\u0000b‮c\nd'), 'a b c d');
  assert.equal(clean('&#x41;&#66;&#0;'), 'AB');
  assert.equal(clean('x'.repeat(300)).length, 200);
  assert.equal(clean(undefined), '');
});

test('httpUrl: solo http(s) sin espacios', () => {
  assert.equal(httpUrl('https://a.b/c'), 'https://a.b/c');
  assert.equal(httpUrl('javascript:alert(1)'), null);
  assert.equal(httpUrl('https://a.b/c d'), null);
});

test('parseFeed: RSS y Atom, filtra por fecha y descarta enlaces no http', () => {
  const rss = `<rss><channel><item><title><![CDATA[Nuevo ataque]]></title><link>https://x.test/1</link>
    <pubDate>Mon, 27 Oct 2026 10:00:00 GMT</pubDate></item>
    <item><title>Viejo</title><link>https://x.test/0</link><pubDate>Mon, 01 Sep 2026 10:00:00 GMT</pubDate></item>
    <item><title>Malo</title><link>javascript:x</link><pubDate>Mon, 27 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
  assert.deepEqual(parseFeed(rss, 'r', '2026-10-01'), [{ source: 'r', title: 'Nuevo ataque', url: 'https://x.test/1', date: '2026-10-27' }]);

  const atom = `<feed><entry><title type="html">v2.1 &lt;hooks&gt;</title>
    <link rel="self" href="https://x.test/self"/><link rel="alternate" href="https://x.test/rel"/>
    <updated>2026-10-30T01:00:00Z</updated></entry></feed>`;
  assert.deepEqual(parseFeed(atom, 'a', '2026-10-01'), [{ source: 'a', title: 'v2.1 ‹hooks>', url: 'https://x.test/rel', date: '2026-10-30' }]);
});

test('clean: no deja texto invisible ni etiquetas reconstruidas con entidades', () => {
  const tags = String.fromCodePoint(0xe0049, 0xe0067, 0xe006e); // «Ign» en caracteres de etiqueta Unicode
  assert.equal(clean(`ok${tags}­⁠️ fin`), 'ok fin');
  assert.equal(clean('&lt;/untrusted&gt;&lt;system&gt;hola'), '‹/untrusted>‹system>hola');
  assert.equal(clean('1 &lt; 2'), '1 < 2');
});

test('parseFeed: enlaces Atom con entidades se decodifican y con bidi se descartan', () => {
  const entry = (href) => `<feed><entry><title>t</title><link href="${href}"/><updated>2026-10-30T00:00:00Z</updated></entry></feed>`;
  assert.equal(parseFeed(entry('https://x.test/?a=1&amp;b=2'), 's', '2026-10-01')[0].url, 'https://x.test/?a=1&b=2');
  assert.equal(parseFeed(entry('https://x.test/‮moc.live'), 's', '2026-10-01')[0], undefined);
});

test('parseFeed: tiempo lineal ante feeds hostiles', () => {
  for (const bomb of ['<item '.repeat(1e5), `<item>${'<title '.repeat(1e5)}</item>`, `<entry>${'<link href="'.repeat(1e5)}</entry>`]) {
    const t = performance.now();
    parseFeed(bomb, 's', '2026-01-01');
    assert.ok(performance.now() - t < 1000, `tardó ${Math.round(performance.now() - t)} ms`);
  }
});

test('nextLink: sigue la paginación solo dentro de la API de GitHub', () => {
  assert.equal(nextLink('<https://api.github.com/advisories?after=X>; rel="next"'), 'https://api.github.com/advisories?after=X');
  assert.equal(nextLink('<https://evil.test/steal>; rel="next"'), null);
  assert.equal(nextLink('<no es url>; rel="next"'), null);
  assert.equal(nextLink(null), null);
});

test('fetch.mjs: sin ninguna fuente sale con 1 y no escribe nada; --since inválido sale con 2', () => {
  const offline = 'data:text/javascript,globalThis.fetch=()=>Promise.reject(new Error("offline"))';
  const r = spawnSync(process.execPath, ['--import', offline, FETCH, '--since', '2026-01-01'], { encoding: 'utf8', timeout: 10000 });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /ninguna fuente/);
  for (const bad of ['2026-02-31', '2099-01-01', 'ayer']) {
    assert.equal(spawnSync(process.execPath, [FETCH, `--since=${bad}`], { encoding: 'utf8', timeout: 10000 }).status, 2, bad);
  }
});

test('isWatched: nombre exacto o prefijo acabado en / o :', () => {
  assert.ok(isWatched('npm', 'next'));
  assert.ok(!isWatched('npm', 'next-auth'));
  assert.ok(isWatched('npm', '@supabase/ssr'));
  assert.ok(isWatched('maven', 'com.google.firebase:firebase-auth'));
  assert.ok(!isWatched('go', 'next'));
});

test('normalizeGhsa y normalizeKev: campos fijos y texto limpio', () => {
  const g = normalizeGhsa({
    ghsa_id: 'GHSA-1', cve_id: 'CVE-2026-1', summary: 'Bypass <script>', severity: 'high', published_at: '2026-10-28T00:00:00Z',
    html_url: 'https://github.com/advisories/GHSA-1', cwes: [{ cwe_id: 'CWE-285' }],
    vulnerabilities: [{ package: { ecosystem: 'npm', name: 'next' }, vulnerable_version_range: '< 15.0.1' }],
  });
  assert.equal(g.title, 'Bypass');
  assert.equal(g.watched, true);
  assert.deepEqual(g.cwes, ['CWE-285']);
  const k = normalizeKev({ cveID: 'CVE-2026-2', vendorProject: 'V', product: 'P', vulnerabilityName: 'RCE', dateAdded: '2026-10-29', knownRansomwareCampaignUse: 'Known', cwes: ['CWE-78'] });
  assert.equal(k.ransomware, true);
  assert.equal(k.url, 'https://nvd.nist.gov/vuln/detail/CVE-2026-2');
});

test('summarize: cuenta por fuente, CWE y normas cambiadas', () => {
  const s = summarize(
    [{ source: 'kev', cwes: ['CWE-78'] }, { source: 'ghsa', cwes: ['CWE-78', 'CWE-22'], watched: true }, { source: 'tldrsec' }],
    [{ id: 'asvs', changed: true }, { id: 'masvs', changed: false }],
  );
  assert.deepEqual(s, { kev: 1, ghsa: 1, watched: 1, feeds: 1, topCwes: [{ id: 'CWE-78', n: 2 }, { id: 'CWE-22', n: 1 }], normsChanged: ['asvs'] });
});
