// SessionStart: detecta el stack del proyecto y recuerda la skill secdev:security-checklist.
// Corre en todas las sesiones: nunca falla (exit 0 siempre) y calla si no hay nada relevante.
// Es solo punto de entrada (sin comprobar si se invoca directamente: con junctions esa comprobación fallaba).
// Import dinámico dentro del try: si stack.mjs se rompe, el hook calla en vez de salir con error.
try {
  const { detectStack, render } = await import('./stack.mjs');
  const out = render(detectStack(process.env.CLAUDE_PROJECT_DIR || process.cwd()));
  if (out) process.stdout.write(out + '\n');
} catch {
  // shortcut: silencio total ante cualquier error; si algún día hace falta diagnosticar, añadir un log a fichero.
}
process.exit(0);
