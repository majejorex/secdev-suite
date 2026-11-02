// Threat intelligence collection. Closed list of sources; everything that comes in is stored as data.
// No LLM and no dependencies: the agent reads it later, when the user asks (intel-review skill).

export const GHSA_ECOSYSTEMS = ['npm', 'pip', 'maven', 'pub', 'swift', 'actions'];

// Packages of the usual stack: their advisories are included even at medium severity. Names ending in / or : are prefixes.
export const WATCH = {
  npm: ['firebase', 'firebase-admin', 'firebase-functions', '@firebase/', '@supabase/', 'stripe', '@stripe/', 'next',
    'react', 'react-dom', 'react-native', 'expo', 'express', 'jsonwebtoken', 'jose', 'axios', 'multer',
    '@anthropic-ai/', 'openai', 'langchain', '@langchain/', '@modelcontextprotocol/'],
  pip: ['firebase-admin', 'supabase', 'stripe', 'django', 'fastapi', 'flask', 'pyjwt', 'requests', 'pydantic',
    'anthropic', 'openai', 'langchain', 'langchain-core', 'mcp'],
  maven: ['com.google.firebase:'],
  pub: ['firebase_core', 'firebase_auth', 'cloud_firestore', 'supabase_flutter'],
};

// Paths that references/ cites: if they change, IDs and titles must be checked again (the repo OWASP rule).
export const NORMS = [
  { id: 'asvs', repo: 'OWASP/ASVS', path: '5.0/en' },
  { id: 'api-top10', repo: 'OWASP/API-Security', path: 'editions/2023/en' },
  { id: 'masvs', repo: 'OWASP/masvs', path: 'Document' },
  { id: 'llm-top10', repo: 'OWASP/www-project-top-10-for-large-language-model-applications', path: '' },
];

export const FEEDS = [
  { id: 'tldrsec', url: 'https://tldrsec.com/feed.xml' },
  { id: 'portswigger-research', url: 'https://portswigger.net/research/rss' },
  { id: 'trailofbits', url: 'https://blog.trailofbits.com/feed/' },
  { id: 'github-security-blog', url: 'https://github.blog/security/feed/' },
  { id: 'willison-prompt-injection', url: 'https://simonwillison.net/tags/prompt-injection.atom' },
  { id: 'owasp-genai', url: 'https://genai.owasp.org/feed/' },
  { id: 'gcp-security-bulletins', url: 'https://cloud.google.com/feeds/google-cloud-security-bulletins.xml' },
  { id: 'claude-code-releases', url: 'https://github.com/anthropics/claude-code/releases.atom' },
  { id: 'firebase-blog', url: 'https://firebase.blog/rss.xml' },
  { id: 'supabase-blog', url: 'https://supabase.com/rss.xml' },
  { id: 'nextjs-blog', url: 'https://nextjs.org/feed.xml' },
];

const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const MAX_PAGES = 5;
const TIMEOUT_MS = 20000;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

// Text from the internet: no tags, no control characters, and short. It is still untrusted data.
export function clean(s, max = 200) {
  if (typeof s !== 'string') return '';
  const t = s
    .slice(0, max * 4 + 1000) // bounds the cost of the regexes below against hostile text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
      if (e[0] === '#') {
        const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return n > 31 && n < 0x110000 ? String.fromCodePoint(n) : ' ';
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    // Control, format (bidi, zero width, Unicode tag characters E0000), private use, unassigned and variation selectors:
    // so no text hides from the human that the agent still reads.
    .replace(/[\p{Cc}\p{Cf}\p{Co}\p{Cn}\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu, ' ')
    .replace(/<(?=[a-z/!?])/gi, '‹') // a decoded entity must not look like a tag again
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export const httpUrl = (u) => (typeof u === 'string' && /^https?:\/\/[^\s"<>]+$/.test(u.trim()) ? u.trim() : null);

const isoDay = (d) => (d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null);

// Hostile feeds: all parsing uses indexOf, in linear time. Lazy regexes were quadratic.
const MAX_BLOCK = 50_000;

// Content of the first <name ...>…</name>, or undefined.
function inner(block, name) {
  const open = block.indexOf(`<${name}`);
  if (open < 0) return undefined;
  const gt = block.indexOf('>', open);
  if (gt < 0 || block[gt - 1] === '/') return undefined;
  const close = block.indexOf(`</${name}>`, gt);
  return close < 0 ? undefined : block.slice(gt + 1, close);
}

// href of the first <link> with no rel or with rel="alternate" (Atom).
function atomHref(block) {
  for (let i = block.indexOf('<link'); i >= 0; i = block.indexOf('<link', i + 1)) {
    const gt = block.indexOf('>', i);
    if (gt < 0) return undefined;
    const tag = block.slice(i, gt + 1);
    const rel = tag.match(/\brel="([^"]*)"/)?.[1];
    if (!rel || rel === 'alternate') return tag.match(/\bhref="([^"]*)"/)?.[1];
    i = gt;
  }
  return undefined;
}

export function parseFeed(xml, source, since) {
  const out = [];
  for (const chunk of xml.split(/<\/(?:item|entry)>/)) {
    const start = Math.max(chunk.lastIndexOf('<item'), chunk.lastIndexOf('<entry'));
    if (start < 0) continue;
    const block = chunk.slice(start, start + MAX_BLOCK);
    const title = clean(inner(block, 'title'));
    const link = httpUrl(clean(inner(block, 'link'), 2000)) ?? httpUrl(clean(atomHref(block), 2000));
    const rawDate = ['pubDate', 'published', 'updated', 'dc:date'].map((n) => inner(block, n)).find(Boolean);
    const date = isoDay(new Date(clean(rawDate, 60)));
    if (title && link && date && date >= since) out.push({ source, title, url: link, date });
  }
  return out;
}

// Pagination is followed only inside the GitHub API: it is the only place the token goes to.
export function nextLink(header) {
  const n = header?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
  try {
    return n && new URL(n).origin === 'https://api.github.com' ? n : null;
  } catch {
    return null;
  }
}

export function isWatched(ecosystem, name) {
  return (WATCH[ecosystem] ?? []).some((w) => (/[/:]$/.test(w) ? name.startsWith(w) : name === w));
}

export function normalizeGhsa(a) {
  const packages = (a.vulnerabilities ?? [])
    .map((v) => v.package && { ecosystem: v.package.ecosystem, name: v.package.name, range: clean(v.vulnerable_version_range ?? '', 100) })
    .filter(Boolean);
  return {
    source: 'ghsa',
    id: a.ghsa_id,
    cve: a.cve_id ?? null,
    title: clean(a.summary),
    severity: a.severity,
    date: (a.published_at ?? '').slice(0, 10),
    packages,
    cwes: (a.cwes ?? []).map((c) => c.cwe_id),
    watched: packages.some((p) => isWatched(p.ecosystem, p.name)),
    url: httpUrl(a.html_url),
  };
}

export function normalizeKev(v) {
  return {
    source: 'kev',
    id: v.cveID,
    cve: v.cveID,
    title: clean(v.vulnerabilityName),
    product: clean(`${v.vendorProject} ${v.product}`, 120),
    date: v.dateAdded,
    ransomware: v.knownRansomwareCampaignUse === 'Known',
    cwes: v.cwes ?? [],
    url: `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(v.cveID)}`,
  };
}

export function summarize(items, norms) {
  const cwe = {};
  for (const i of items) for (const c of i.cwes ?? []) cwe[c] = (cwe[c] ?? 0) + 1;
  const count = (s) => items.filter((i) => i.source === s).length;
  return {
    kev: count('kev'),
    ghsa: count('ghsa'),
    watched: items.filter((i) => i.watched).length,
    feeds: items.filter((i) => !['kev', 'ghsa'].includes(i.source)).length,
    topCwes: Object.entries(cwe).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, n]) => ({ id, n })),
    normsChanged: norms.filter((n) => n.changed).map((n) => n.id),
  };
}

// ---- red ----

async function get(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': 'secdev-suite-intel', ...headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} at ${new URL(url).host}`);
  return res;
}

const ghHeaders = (token) => ({ Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });

export async function fetchKev(since) {
  const { vulnerabilities } = await (await get(KEV_URL)).json();
  return vulnerabilities.filter((v) => v.dateAdded >= since).map(normalizeKev);
}

// A failure (rate limit, timeout) stops only this query and keeps the pages already read.
async function ghsaQuery(params, token, onError) {
  let url = `https://api.github.com/advisories?type=reviewed&per_page=100&${new URLSearchParams(params)}`;
  const out = [];
  try {
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const res = await get(url, ghHeaders(token));
      out.push(...(await res.json()));
      url = nextLink(res.headers.get('link'));
    }
  } catch (e) {
    onError(`ghsa:${params.ecosystem}/${params.severity ?? 'watched'}`, e);
  }
  return out;
}

export async function fetchGhsa(since, token, onError) {
  const queries = GHSA_ECOSYSTEMS.flatMap((ecosystem) => [
    ...['critical', 'high'].map((severity) => ({ ecosystem, severity, published: `>=${since}` })),
    ...(WATCH[ecosystem] ? [{ ecosystem, published: `>=${since}` }] : []),
  ]);
  const seen = new Map();
  for (const q of queries) {
    for (const a of await ghsaQuery(q, token, onError)) {
      const n = normalizeGhsa(a);
      // The query without severity only contributes watched packages; the rest at medium severity is noise here.
      if (!seen.has(n.id) && (q.severity || n.watched)) seen.set(n.id, n);
    }
  }
  return [...seen.values()];
}

export async function addEpss(items) {
  const cves = [...new Set(items.map((i) => i.cve).filter((c) => /^CVE-\d{4}-\d+$/.test(c ?? '')))];
  const score = {};
  for (let i = 0; i < cves.length; i += 100) {
    const { data } = await (await get(`https://api.first.org/data/v1/epss?limit=100&cve=${cves.slice(i, i + 100).join(',')}`)).json();
    for (const d of data ?? []) score[d.cve] = Number(d.epss);
  }
  for (const it of items) if (it.cve && it.cve in score) it.epss = score[it.cve];
}

export async function fetchNorms(since, token, onError) {
  const norms = await Promise.all(NORMS.map(async (n) => {
    const base = `https://api.github.com/repos/${n.repo}`;
    let commits, releases;
    try {
      [commits, releases] = await Promise.all([
        get(`${base}/commits?per_page=1${n.path ? `&path=${encodeURIComponent(n.path)}` : ''}`, ghHeaders(token)).then((r) => r.json()),
        get(`${base}/releases?per_page=1`, ghHeaders(token)).then((r) => r.json()),
      ]);
    } catch (e) {
      onError(`owasp:${n.id}`, e);
      return null;
    }
    const lastCommit = commits[0]?.commit?.committer?.date?.slice(0, 10) ?? null;
    const release = releases[0] ? { tag: clean(releases[0].tag_name, 60), date: releases[0].published_at?.slice(0, 10) } : null;
    return {
      id: n.id,
      url: `https://github.com/${n.repo}${n.path ? `/tree/HEAD/${n.path}` : ''}`,
      lastCommit,
      release,
      changed: (lastCommit ?? '') >= since || (release?.date ?? '') >= since,
    };
  }));
  return norms.filter(Boolean);
}

const MAX_FEED_BYTES = 2_000_000;

export async function fetchFeed(feed, since) {
  const xml = (await (await get(feed.url)).text()).slice(0, MAX_FEED_BYTES);
  return parseFeed(xml, feed.id, since).slice(0, 30);
}
