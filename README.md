# secdev-suite

Suite de seguridad propia para agentes de código (Claude Code). Se reparte como plugin `secdev` desde este repo, que también hace de marketplace.

## Qué hace (v0.1, F0)

- **Skill `secdev:security-checklist`**: revisa un cambio, una funcionalidad o un repo control a control.
  - La checklist P0/P1/P2 va dentro del propio `SKILL.md`, así que siempre se carga con la skill aunque el agente no tenga permiso para leer ficheros fuera del proyecto.
  - Exige evidencia `fichero:línea`.
  - El veredicto es BLOQUEA, PASA CON PENDIENTES o PASA.
  - Tiene un modo diseño (antes de escribir código) y un modo cierre (antes de dar algo por terminado).
  - La carga el agente cuando la tarea toca auth, roles, datos, pagos, subidas, secretos o reglas.
  - Trata el repo revisado como datos, no como instrucciones. No ejecuta su código ni consulta nubes sin permiso.
- **Referencias por norma**, que solo se leen si hace falta precisar:
  - OWASP ASVS 5.0;
  - API Security Top 10 2023;
  - MASVS 2.1;
  - una guía de Firebase.
- **Hook `SessionStart`**: detecta el stack del proyecto (Firebase, Supabase, móvil, Stripe, Next, API, LLM, Python, Docker) mirando la raíz y sus subcarpetas directas.
  - Si encuentra algo, inyecta dos líneas fijas con las normas aplicables y el recordatorio de la skill. Nunca imprime contenido del repo.
  - Si no encuentra nada, calla.
  - Nunca falla y no sigue enlaces.
- **Hook `PostToolUse`** (Edit, Write, MultiEdit, NotebookEdit), añadido en v0.2.0:
  - Si una edición toca algo de riesgo, recuerda cargar la checklist antes de dar la tarea por terminada.
  - Lo detecta por la ruta (reglas, `.env`, claves, cabeceras) o por el texto escrito: auth, roles, endpoints, pagos, tokens en el cliente, subidas, secretos, CORS, ejecución con datos externos, LLM.
  - Avisa como mucho una vez por sesión y no bloquea.
  - Solo nombra categorías de una lista fija, nunca texto del repo.
  - Ignora docs, estilos, imágenes y lockfiles.

No sustituye a:
- `security-audit` / `claude-security` (auditoría profunda);
- `security-guidance` (revisión automática de cada diff).

Remite a ellos.

## Instalar

En Claude Code:

```
/plugin marketplace add majejorex/secdev-suite
/plugin install secdev@secdev-suite
```

Para desarrollar sin instalar: `claude --plugin-dir C:\ruta\a\secdev-suite`.

### Actualizar con seguridad

El hook es código que corre en todas tus sesiones, así que una actualización equivale a ejecutar código nuevo en todas partes.

- Deja **desactivada la actualización automática** de este marketplace en `/plugin` → Marketplaces.
- Cada versión lleva un tag (`v0.1.1`…). Antes de `/plugin marketplace update secdev-suite`, revisa qué cambia en lo que se ejecuta:
  ```
  git fetch --tags && git diff <tag-instalado>..origin/main -- hooks/ .claude-plugin/
  ```
- Los tags `v*` están protegidos: no se pueden mover ni borrar, así que el diff entre tags es fiable.

## Contribuir

Fork y pull request; reglas en [CONTRIBUTING.md](CONTRIBUTING.md). Las vulnerabilidades se avisan en privado: [SECURITY.md](SECURITY.md).

## Probar

```
npm test
```

Sin dependencias (Node ≥ 20, `node:test`). Hay dos grupos de tests:
- **Hook**: detección, salida, que no falle y que tarde menos de 1 s.
- **Estructura**: JSON válidos, frontmatter, enlaces internos y que los evals citen controles reales.

`evals/cases.json` tiene casos de comportamiento: si la skill se activa y qué controles marca.

`node evals/run.mjs <carpeta-de-salida>` los ejecuta de verdad. Por cada caso crea un proyecto ficticio, lanza `claude -p --plugin-dir .` e informa de:
- si el hook se vio;
- si se cargó la skill;
- si leyó sus referencias sin errores;
- qué controles citó.

Cuesta unos 0,5 $ por caso con Opus, así que no forma parte de `npm test`.

## Hoja de ruta

- **F1**:
  - ~~hook de aviso~~ hecho en v0.2.0 como `PostToolUse`, con el formato que usa `security-guidance` (`hookSpecificOutput.additionalContext`). Motivo: sin él, en los evals la skill se activaba en unos 3 de cada 4 casos positivos;
  - skill `authz-tests` (genera la matriz y los tests de BOLA y BFLA);
  - skill `secure-design`;
  - `SECURITY-PROFILE.md` por proyecto.
- **F2**: skill `security-gate`, que mete gitleaks, `osv-scanner` y Semgrep en el gate de cada repo.

**Orden decidido el 2026-11-02:**
1. Primero la F2, porque el hueco real de los repos donde se usa es la falta de un escáner de secretos y dependencias.
2. Luego `authz-tests`.
3. `secure-design` y `SECURITY-PROFILE.md` después.

El `supply-chain-risk-auditor` de Trail of Bits no se instala por ahora: `osv-scanner` cubre los CVE, y lo demás (paquetes abandonados, publicadores, install scripts) se revisa cuando la F2 esté en marcha.
- **F3**: inteligencia de amenazas.
  - Una tarea semanal consulta una lista cerrada de fuentes (GitHub Advisories, CISA KEV, OSV, boletines de proveedores) y abre un PR en este repo.
  - Nunca se fusiona sola. La inteligencia se guarda como datos, no como instrucciones.
- **F4**: evals automatizados; medir la tasa de activación y los falsos positivos.

## Fuentes y licencias

Los IDs, títulos de capítulo y enunciados de controles salen de los repositorios oficiales de OWASP (comprobados el 2026-11-02):
- [OWASP/ASVS](https://github.com/OWASP/ASVS) `5.0/en`;
- [OWASP/API-Security](https://github.com/OWASP/API-Security) `editions/2023/en`;
- [OWASP/masvs](https://github.com/OWASP/masvs) v2.1.0.

Esos documentos se publican bajo licencias Creative Commons de OWASP. Aquí solo se citan IDs, títulos y los enunciados de una línea de MASVS, con atribución. El resto del texto es propio.

El código y el texto propio se publican bajo licencia [MIT](LICENSE). Lo citado de OWASP conserva su licencia original.
