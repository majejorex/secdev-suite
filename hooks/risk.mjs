// Classifies an edit as "risky" by its path or by the text the agent writes.
// No side effects: hooks/risk.test.mjs tests it. The output only uses category names from this fixed list,
// never text from the repo (a file name or a comment could carry instructions).

// Files that are not code or relevant configuration: no warning.
const SKIP_PATH = /(\.(md|mdx|txt|css|scss|sass|less|svg|png|jpe?g|gif|webp|ico|lock|snap)$|(^|\/)package-lock\.json$|(^|\/)node_modules\/)/i;

const PATH_RULES = [
  ['access rules', /(^|\/)(firestore|storage|database)\.rules(\.json)?$|(^|\/)supabase\/migrations\/[^/]+\.sql$/i],
  ['secrets', /(^|\/)\.env(\.[^/]*)?$|(^|\/)[^/]*(service-?account|credentials)[^/]*\.json$|\.(pem|key|p12|pfx)$/i],
  ['headers and CORS', /(^|\/)(firebase\.json|vercel\.json|netlify\.toml|_headers)$/i],
];

const CONTENT_RULES = [
  ['auth and sessions', /\b(req|request)\.auth\b|verifyIdToken|setCustomUserClaims|revokeRefreshTokens|getAuth\(|signInWith\w*|createUserWith\w*|\bpassword\b|jsonwebtoken|\bjwt\b|bcrypt|argon2|\b(refresh|access|id|session)Token\b|multiFactor|\bmfa\b|\btotp\b/i],
  ['roles and permissions', /\b(isAdmin|isStaff|customClaims|permissions?|capabilit(y|ies))\b|\brole(s)?\s*[:=]|\ballow\s+(read|write|create|update|delete|list|get)\b/],
  ['endpoints and callables', /\bon(Call|Request)\s*\(|\b(app|router)\.(get|post|put|patch|delete|use)\s*\(|export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/],
  ['payments and webhooks', /\bstripe\b|paymentIntent|constructEvent|\bwebhook|\brefund/i],
  ['client-side token or data storage', /\bAsyncStorage\b|\blocalStorage\b|\bsessionStorage\b|\bSecureStore\b|document\.cookie|Set-Cookie/],
  ['file uploads', /\buploadBytes|\bgetSignedUrl|\bmulter\b|\bupload(File|Image|Document)?\s*\(/],
  ['secrets', /\b(api[_-]?key|client[_-]?secret|private[_-]?key)\b\s*[:=]|-----BEGIN [A-Z ]*PRIVATE KEY|\bsk_(live|test)_|defineSecret\(/i],
  ['headers and CORS', /\bcors\b|Access-Control-Allow|Content-Security-Policy/i],
  ['execution or queries with external data', /\beval\s*\(|child_process|\bexecSync?\s*\(|\.(query|raw)\s*\(\s*`[^`]*\$\{/],
  ['LLM calls', /@anthropic-ai\/sdk|messages\.create\(|chat\.completions|\bopenai\b/i],
];

const MAX_TEXT = 200_000; // do not analyze huge edits in full

// Text written by the tool: Write → content, Edit → new_string, MultiEdit → edits[].new_string, NotebookEdit → new_source.
export function editedText(toolInput = {}) {
  const parts = [toolInput.content, toolInput.new_string, toolInput.new_source];
  for (const e of Array.isArray(toolInput.edits) ? toolInput.edits : []) parts.push(e?.new_string);
  return parts.filter((p) => typeof p === 'string').join('\n').slice(0, MAX_TEXT);
}

export function classify(filePath, text) {
  const path = String(filePath ?? '').replace(/\\/g, '/');
  if (!path || SKIP_PATH.test(path)) return [];
  const cats = new Set();
  for (const [cat, re] of PATH_RULES) if (re.test(path)) cats.add(cat);
  for (const [cat, re] of CONTENT_RULES) if (re.test(text ?? '')) cats.add(cat);
  return [...cats];
}

export function message(cats) {
  if (cats.length === 0) return '';
  return `[secdev] This change touches: ${cats.join(', ')}. Before you call the task done, load the secdev:security-checklist skill in sign-off mode and put its verdict in your reply.`;
}

// Sanitized session id, safe to use as a file name.
export function safeSessionId(id) {
  const s = String(id ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  return s || null;
}
