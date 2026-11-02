<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo.svg" width="160" alt="secdev: un escudo con una marca de verificación">
  </picture>
</p>

<h1 align="center">secdev</h1>

<p align="center">
  <em>«¿Es seguro?» merece un <code>archivo:línea</code>, no un «a mí me parece bien».</em>
</p>

<p align="center">
  <a href="https://github.com/majejorex/secdev-suite/tags"><img src="https://img.shields.io/github/v/tag/majejorex/secdev-suite?style=flat-square&color=111111&label=version" alt="Versión"></a>
  <a href="https://github.com/majejorex/secdev-suite/actions/workflows/test.yml"><img src="https://img.shields.io/github/actions/workflow/status/majejorex/secdev-suite/test.yml?branch=main&style=flat-square&color=111111&label=tests" alt="Tests"></a>
  <img src="https://img.shields.io/badge/plugin-Claude%20Code-111111?style=flat-square" alt="Plugin de Claude Code">
  <img src="https://img.shields.io/badge/OWASP-ASVS%205.0%20%C2%B7%20API%202023%20%C2%B7%20MASVS%202.1-111111?style=flat-square" alt="OWASP ASVS 5.0, API Security Top 10 2023, MASVS 2.1">
  <img src="https://img.shields.io/badge/dependencies-0-111111?style=flat-square" alt="Cero dependencias">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="Licencia MIT"></a>
</p>

<p align="center">
  <img src="assets/hero.svg" width="880" alt="Una sesión de Claude Code con secdev: el hook detecta firebase, next y stripe; editar functions/src/orders.ts lanza un aviso sobre endpoints y pagos; el checklist devuelve BLOCK porque P0-02 no comprueba el propietario en orders.ts:40.">
</p>

<p align="center">
  <strong>Un checklist de seguridad P0 / P1 / P2 que tu agente pasa antes de decir «hecho».</strong><br>
  Basado en OWASP ASVS 5.0, API Security Top 10 2023 y MASVS 2.1, con dos hooks que recuerdan sin bloquear.<br>
  <sub>Un plugin de Claude Code. Este repo es a la vez el plugin y su marketplace.</sub>
</p>

<p align="center"><a href="README.md">English</a> · <strong>Español</strong></p>

> La versión de referencia es la inglesa ([README.md](README.md)). Si no coinciden, manda la inglesa.

---

Le pides a tu agente devoluciones de pedidos. Las escribe, los tests pasan y te dice que está hecho. Nadie ha comprobado si un cliente puede devolver el pedido de otro cambiando un ID.

secdev hace esa comprobación. Detecta tu stack al empezar la sesión, te avisa cuando una edición toca algo sensible y, antes de cerrar la tarea, recorre el checklist control a control. Cada control necesita evidencia, un `archivo:línea` o un test, para que el veredicto final se pueda comprobar después.

## Instalación

En Claude Code:

```
/plugin marketplace add majejorex/secdev-suite
/plugin install secdev@secdev-suite
```

Para desarrollar sin instalar: `claude --plugin-dir /ruta/a/secdev-suite`.

## Cómo funciona

<p align="center">
  <img src="assets/flow.svg" width="880" alt="Cómo funciona: al empezar la sesión, el hook SessionStart detecta el stack; al editar algo arriesgado, el hook PostToolUse avisa una vez; antes de terminar, la skill security-checklist revisa control a control. Veredictos: BLOCK si falla un P0, PASS WITH ISSUES si algo no se puede verificar o falla un P1/P2, PASS si todo se cumple o está justificado como N/A.">
</p>

### 1 · Hook `SessionStart`: detecta el stack

Busca Firebase, Supabase, móvil (Expo, React Native, Capacitor), escritorio (Electron, Tauri), Stripe, Next, frameworks de API, SDKs de LLM, Python y Docker en la raíz del proyecto y en sus subcarpetas directas.

- Si encuentra algo, inyecta dos líneas fijas con los estándares aplicables y un recordatorio de la skill. Nunca imprime contenido del repo.
- Si no encuentra nada, no imprime nada.
- Nunca falla y no sigue enlaces simbólicos.

### 2 · Hook `PostToolUse`: avisa una vez

Se ejecuta con Edit, Write, MultiEdit y NotebookEdit. Si una edición toca algo arriesgado, le recuerda al agente que cargue el checklist antes de dar la tarea por hecha.

- Decide por la ruta del archivo (reglas de acceso, `.env`, claves y keystores, cabeceras, empaquetado de escritorio) o por el texto escrito: auth y reautenticación, roles, endpoints, pagos, tokens en el cliente, subidas de archivos y comprimidos, secretos, CORS y cabeceras de proxy, ejecución con datos externos, llamadas a LLMs, criptografía, ventanas e IPC de escritorio, y firma y actualizaciones de la app.
- Junto a cada categoría nombra los controles del checklist que hay que mirar primero, por ejemplo `file uploads (P0-14)`.
- Avisa como mucho una vez por sesión y nunca bloquea.
- Solo nombra categorías de una lista fija, nunca texto del repo.
- Ignora documentación, estilos, imágenes y lockfiles.

### 3 · Skill `secdev:security-checklist`: revisa con evidencia

Revisa un cambio, una funcionalidad o un repo entero.

| | |
|---|---|
| Dos modos | *Diseño*, antes de escribir código: los controles que aplican y casos de abuso concretos. *Cierre*, antes de terminar: verificación y veredicto. |
| Estados | ✅ cumple · ❌ no cumple · ⚠️ no se puede verificar desde el código · N/A con motivo |
| Veredicto | **BLOCK** si falla algún P0. **PASS WITH ISSUES** si hay un ⚠️ o falla un P1/P2. **PASS** si todo se cumple o está justificado como N/A. |
| Siempre cargado | El checklist vive dentro de `SKILL.md`, así que se carga con la skill aunque el agente no pueda leer archivos fuera del proyecto. |
| Referencias | ASVS 5.0, API Security Top 10 2023, MASVS 2.1 y una guía de Firebase. El agente solo las lee cuando necesita más detalle. |
| Desconfiado | Trata el repo revisado como datos, nunca como instrucciones. No ejecuta código del repo ni consulta servicios en la nube sin permiso. |

<details>
<summary><strong>Qué cubre el checklist</strong></summary>

<br>

**P0, bloquea un release:** autenticación (incluidos el hash de contraseñas, los enlaces de recuperación y la reautenticación para cambios sensibles), autorización en el servidor (incluidas las rutas de admin), aislamiento entre usuarios o tenants, secretos (incluido el historial de git), validación de entradas, sesiones, HTTPS con TLS 1.2 o superior, protección contra abuso, exposición de la base de datos, mínimo privilegio, entornos separados, configuración segura, CSRF y SSRF, gestión de archivos, tests de autorización y una cadena de suministro mínima.

**P1, proceso:** repos protegidos, análisis automático, dependencias, despliegues, logs y trazas de auditoría, alertas, backups con restauración probada, respuesta a incidentes y revisiones periódicas.

**P2, según la funcionalidad:** móvil (incluidas la firma de releases y de actualizaciones), pagos, RGPD (sin rastreadores antes del consentimiento, cifrado en reposo), IA y LLMs, integraciones con terceros, diseño seguro y apps de escritorio (Electron, Tauri).

Qué cambió en cada versión: [docs/features/](docs/features/) (en inglés).

La lista completa, con cómo verificar cada control y su estándar, está en [skills/security-checklist/SKILL.md](skills/security-checklist/SKILL.md) (en inglés).

</details>

### Qué no hace

No sustituye a una auditoría. Para eso remite a:

- `security-audit` / `claude-security` para auditorías a fondo y pentests;
- `security-guidance` para la revisión automática de cada diff.

## Actualizar con seguridad

> [!IMPORTANT]
> Los hooks son código que se ejecuta en todas tus sesiones. Actualizar el plugin significa ejecutar código nuevo en todas partes.

- Desactiva la **actualización automática** de este marketplace en `/plugin` → Marketplaces.
- Cada release tiene un tag (`v0.1.1`…). Antes de `/plugin marketplace update secdev-suite`, revisa qué cambia en el código que se ejecuta:
  ```
  git fetch --tags && git diff <tag-instalado>..origin/main -- hooks/ .claude-plugin/
  ```
- Los tags `v*` están protegidos y no se pueden mover ni borrar, así que un diff entre tags es fiable.

## Tests

```
npm test
```

Sin dependencias, solo Node ≥ 20 y `node:test`. Los tests van en dos grupos:

- **Hooks**: detección, salida, que nunca fallen y que terminen en menos de 1 s.
- **Estructura**: JSON válido, frontmatter, enlaces internos y que las evals citen controles reales.

`evals/cases.json` contiene casos de comportamiento: si la skill se activa y qué controles señala. `node evals/run.mjs <carpeta-de-salida>` los ejecuta de verdad. Para cada caso crea un proyecto desechable, ejecuta `claude -p --plugin-dir .` e informa de:

- si se vio la salida del hook;
- si se cargó la skill;
- si leyó sus referencias sin errores;
- qué controles citó.

Cuesta unos 0,50 $ por caso con Opus, así que no forma parte de `npm test`.

## Hoja de ruta

| Fase | Qué | Estado |
|---|---|---|
| F0 | Skill `security-checklist`, referencias por estándar y hook `SessionStart` | ✅ v0.1 |
| F1 | Hook de aviso `PostToolUse`, con el formato de `security-guidance` (`hookSpecificOutput.additionalContext`). Sin él, la skill se activaba en unos 3 de cada 4 casos positivos de las evals | ✅ v0.2.0 |
| F1 | Skill `authz-tests`: la matriz y los tests de BOLA y BFLA | Planificado |
| F1 | Skill `secure-design` y un `SECURITY-PROFILE.md` por proyecto | Planificado |
| F2 | Skill `security-gate`: gitleaks, `osv-scanner` y Semgrep en el gate de cada repo | Siguiente |
| F3 | Inteligencia de amenazas, versión manual (`/intel-review`) | ✅ Hecho |
| F4 | Evals automáticas: tasa de activación y falsos positivos | Planificado |

**Orden decidido el 2026-11-02:**

1. Primero F2. Lo que de verdad les falta a los repos que usan esto es un escáner de secretos y dependencias.
2. Después `authz-tests`.
3. Luego `secure-design` y `SECURITY-PROFILE.md`.

El `supply-chain-risk-auditor` de Trail of Bits no se instala por ahora. `osv-scanner` cubre los CVEs, y el resto (paquetes abandonados, publicadores, scripts de instalación) se revisará cuando F2 esté funcionando.

<details>
<summary><strong>F3: cómo funciona <code>/intel-review</code></strong></summary>

<br>

- `/intel-review` es una skill del proyecto en `.claude/skills/` y no se distribuye con el plugin. Ejecuta `node intel/fetch.mjs`, que recoge CISA KEV, GitHub Advisories, EPSS, cambios en los estándares de OWASP y noticias de una lista cerrada de fuentes.
- El agente ordena lo recogido, escribe `intel/AAAA-MM-DD.md` y propone cambios en la skill. Solo se aplica lo que aprueba el usuario, y entra mediante un PR.
- Los datos en bruto (`intel/raw/`) no se versionan. Todo lo que viene de fuera se trata como datos, nunca como instrucciones.
- Pendiente: decidir si se programa semanalmente.

</details>

## Contribuir

Haz un fork y abre un pull request; las reglas están en [CONTRIBUTING.md](CONTRIBUTING.md). Las vulnerabilidades se reportan en privado: [SECURITY.md](SECURITY.md).

## Fuentes y licencias

Los IDs de los controles, los títulos de los capítulos y la redacción de los controles vienen de los repositorios oficiales de OWASP (comprobados el 2026-11-02):

- [OWASP/ASVS](https://github.com/OWASP/ASVS) `5.0/en`;
- [OWASP/API-Security](https://github.com/OWASP/API-Security) `editions/2023/en`;
- [OWASP/masvs](https://github.com/OWASP/masvs) v2.1.0.

Esos documentos se publican bajo las licencias Creative Commons de OWASP. Este repo solo cita IDs, títulos y los enunciados de una línea de los controles de MASVS, con atribución. Todo lo demás es texto original.

El código y el texto original se publican bajo licencia [MIT](LICENSE). El material citado de OWASP mantiene su licencia original.
