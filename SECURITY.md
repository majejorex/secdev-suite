# Seguridad

## Cómo avisar de una vulnerabilidad

No abras un issue público. Usa **Security → Report a vulnerability** en este repo (aviso privado de GitHub). Cuenta qué has visto, cómo reproducirlo y qué versión (`tag`) usas.

Respondo lo antes que pueda. Esto lo mantiene una sola persona, así que no hay plazos garantizados.

## Qué me interesa sobre todo

- **`hooks/`**: corren en cada sesión de Claude Code de quien instala el plugin. Cualquier forma de que un hook ejecute algo inesperado, filtre datos, se cuelgue o meta instrucciones en el contexto del agente.
- **Skills y referencias**: texto que pueda empujar al agente a hacer algo inseguro (inyección de instrucciones).
- **Marketplace / `plugin.json`**: cualquier cosa que haga instalar algo distinto de lo que hay en el repo.

## Versiones

Solo se corrige la última versión publicada. Los tags `vX.Y.Z` no se pueden mover ni borrar.
