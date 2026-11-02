// Clasifica una edición como «de riesgo» por su ruta o por el texto que escribe el agente.
// Sin efectos: lo prueba hooks/risk.test.mjs. La salida solo usa nombres de categoría de esta lista fija,
// nunca texto del repo (un nombre de fichero o un comentario podrían llevar instrucciones).

// Ficheros que no son código ni configuración relevante: no avisan.
const SKIP_PATH = /(\.(md|mdx|txt|css|scss|sass|less|svg|png|jpe?g|gif|webp|ico|lock|snap)$|(^|\/)package-lock\.json$|(^|\/)node_modules\/)/i;

const PATH_RULES = [
  ['reglas de acceso', /(^|\/)(firestore|storage|database)\.rules(\.json)?$|(^|\/)supabase\/migrations\/[^/]+\.sql$/i],
  ['secretos', /(^|\/)\.env(\.[^/]*)?$|(^|\/)[^/]*(service-?account|credentials)[^/]*\.json$|\.(pem|key|p12|pfx)$/i],
  ['cabeceras y CORS', /(^|\/)(firebase\.json|vercel\.json|netlify\.toml|_headers)$/i],
];

const CONTENT_RULES = [
  ['auth y sesiones', /\b(req|request)\.auth\b|verifyIdToken|setCustomUserClaims|revokeRefreshTokens|getAuth\(|signInWith\w*|createUserWith\w*|\bpassword\b|jsonwebtoken|\bjwt\b|bcrypt|argon2|\b(refresh|access|id|session)Token\b|multiFactor|\bmfa\b|\btotp\b/i],
  ['roles y permisos', /\b(isAdmin|isStaff|customClaims|permissions?|capabilit(y|ies))\b|\brole(s)?\s*[:=]|\ballow\s+(read|write|create|update|delete|list|get)\b/],
  ['endpoints y callables', /\bon(Call|Request)\s*\(|\b(app|router)\.(get|post|put|patch|delete|use)\s*\(|export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/],
  ['pagos y webhooks', /\bstripe\b|paymentIntent|constructEvent|\bwebhook|\brefund/i],
  ['almacenamiento de tokens o datos en el cliente', /\bAsyncStorage\b|\blocalStorage\b|\bsessionStorage\b|\bSecureStore\b|document\.cookie|Set-Cookie/],
  ['subidas de archivos', /\buploadBytes|\bgetSignedUrl|\bmulter\b|\bupload(File|Image|Document)?\s*\(/],
  ['secretos', /\b(api[_-]?key|client[_-]?secret|private[_-]?key)\b\s*[:=]|-----BEGIN [A-Z ]*PRIVATE KEY|\bsk_(live|test)_|defineSecret\(/i],
  ['CORS y cabeceras', /\bcors\b|Access-Control-Allow|Content-Security-Policy/i],
  ['ejecución o consultas con datos externos', /\beval\s*\(|child_process|\bexecSync?\s*\(|\.(query|raw)\s*\(\s*`[^`]*\$\{/],
  ['llamadas a LLM', /@anthropic-ai\/sdk|messages\.create\(|chat\.completions|\bopenai\b/i],
];

const MAX_TEXT = 200_000; // no analizar ediciones gigantes enteras

// Texto escrito por la herramienta: Write → content, Edit → new_string, MultiEdit → edits[].new_string, NotebookEdit → new_source.
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
  return `[secdev] Este cambio toca: ${cats.join(', ')}. Antes de dar la tarea por terminada, carga la skill secdev:security-checklist en modo cierre y pon su veredicto en la respuesta.`;
}

// Id de sesión saneado para usarlo como nombre de fichero.
export function safeSessionId(id) {
  const s = String(id ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  return s || null;
}
