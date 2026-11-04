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
  <sub>Un plugin de Claude Code, y skills normales para cualquier agente (Codex, Cursor y más). Este repo es a la vez el plugin y su marketplace.</sub>
</p>

<p align="center"><a href="README.md">English</a> · <strong>Español</strong></p>

> La versión de referencia es la inglesa ([README.md](README.md)). Si no coinciden, manda la inglesa.

---

Le pides a tu agente devoluciones de pedidos. Las escribe, los tests pasan y te dice que está hecho. Nadie ha comprobado si un cliente puede devolver el pedido de otro cambiando un ID.

secdev hace esa comprobación. Al empezar la sesión nombra el stack. Si una edición toca auth, reglas, pagos, subidas o secretos, un hook se lo recuerda al agente una vez. Antes de cerrar la tarea, el checklist recorre los controles que aplican. Cada uno necesita un `archivo:línea` o un test. El cierre termina con un veredicto y la línea `Hunt: not done`: el pase miró estos controles y no buscó fallos fuera de la lista.

## ¿Puedo fiarme?

Este código corre en todas tus sesiones. Esto es lo que puedes comprobar tú.

- Cero dependencias. Los tests usan Node y `node:test`. Los hooks son archivos cortos en [`hooks/`](hooks/). Las skills son Markdown.
- Cada hook sale con código 0, tarda menos de 1 segundo, imprime como mucho 5 líneas y no imprime nada si no hay nada que decir. Recuerdan. No bloquean una edición. Todos tienen tests.
- Como mucho una vez al día, un proceso en segundo plano lee el `plugin.json` público y te avisa si en `main` hay una versión más nueva. No envía nada de tu proyecto. Se apaga con `SECDEV_NO_UPDATE_CHECK=1`.
- Los comentarios y la documentación del repo que se revisa son datos. El texto dirigido al revisor se informa como prompt injection. Las skills no ejecutan el código de ese repo.
- Los IDs y los títulos de OWASP se copian de los repositorios oficiales, con la fecha en que se comprobaron.
- Una release que cambia una skill pasa los [evals](docs/evals/) en un modelo fijado, 3 veces por caso. Los casos críticos tienen que salir bien las tres.
- `main` exige los checks `test`, `secrets`, `dependencies` y `sast`. Las etiquetas `v*` no se pueden mover. Antes de actualizar, lee el diff de `hooks/`. Mira [Actualizar con seguridad](#actualizar-con-seguridad).

## Instalación

En Claude Code:

```
/plugin marketplace add majejorex/secdev-suite
/plugin install secdev@secdev-suite
```

O desde una terminal:

```
claude plugin marketplace add majejorex/secdev-suite && claude plugin install secdev@secdev-suite
```

Reinicia Claude Code. `claude plugin list` tiene que mostrar `secdev@secdev-suite` y su versión.

La actualización automática está apagada en este marketplace, como en cualquier marketplace de terceros. Déjala apagada. Cuando hay versión nueva, secdev te avisa, y actualizas después de leer el diff (mira «Actualizar con seguridad»).

Para probar un clon sin instalarlo: `claude --plugin-dir /path/to/secdev-suite`.

## Instalar como skill (otros agentes)

Las tres skills de [`skills/`](skills/) son archivos `SKILL.md` normales. Cualquier agente que lea ese formato puede usarlas sin el plugin. El instalador necesita Node.js 22.20 o superior ([CLI `skills`](https://github.com/vercel-labs/skills)):

```bash
npx skills add majejorex/secdev-suite --skill security-checklist --skill security-fix --skill security-gate   # las tres skills
npx skills add majejorex/secdev-suite --skill security-checklist -a codex   # una skill, un agente
npx skills add majejorex/secdev-suite -g                                # todos los proyectos, no solo este
```

También puedes copiar una carpeta al directorio de skills del agente (en Claude Code, `~/.claude/skills/security-checklist/`). Deja `references/` junto a su `SKILL.md`.

`npx skills add` las deja en `.agents/skills/` del proyecto. Claude Code recibe un enlace simbólico. `-g` las deja en tu carpeta de usuario. Sin `--skill`, el instalador ofrece estas tres skills y nada más. `npx skills list` muestra dónde quedaron. Comprobado el 2026-11-03 con `-a claude-code -a codex`.

Te llevas el checklist, la skill de arreglo y el gate de CI, con las mismas frases («¿Podemos publicar esto?», «arregla los P0»). No te llevas los dos hooks ni la comprobación diaria de versión. Eso solo existe en el plugin de Claude Code. Sin ellos, pide tú la revisión.

Dentro del plugin las skills se llaman entre sí como `secdev:security-fix`. Instaladas sueltas, el nombre es la carpeta: `security-fix`.

Abre el agente en el proyecto y pide con palabras normales: «¿Podemos publicar esto?», «Revisa la seguridad de este cambio», «arregla P0-02», «Añade un gate de seguridad en CI». Si el agente lista skills (Claude Code `/skills`, Codex `$`), elige `security-checklist`. Si preguntaste si es seguro o si se puede publicar, la respuesta tiene que acabar con una línea `Verdict:`, `Hunt: not done`, una tabla de los controles NOT MET y UNVERIFIED, y los MET en una línea. Si falta ese bloque, la skill no se cargó.

Actualizaciones: `npx skills update`. Lee el diff antes, como en [Actualizar con seguridad](#actualizar-con-seguridad).

## Úsalo en cualquier proyecto

Una instalación vale para todos los proyectos que abras. No hay nada que configurar por proyecto.

| Dónde lo quieres | Comando |
|---|---|
| En todos los proyectos de tu máquina (por defecto) | `claude plugin install secdev@secdev-suite` |
| En un repo, para quien trabaje en él | `claude plugin install secdev@secdev-suite --scope project`. Escribe `enabledPlugins` en `.claude/settings.json` (mira abajo). |
| En un repo, solo para ti | `claude plugin install secdev@secdev-suite --scope local` |

En un equipo, el `.claude/settings.json` del repo también tiene que nombrar el marketplace, para que un compañero que nunca lo añadió reciba el plugin al fiarse de la carpeta. El comando de instalación solo escribe `enabledPlugins`. Añade el marketplace a mano y haz commit del archivo:

```json
{
  "extraKnownMarketplaces": {
    "secdev-suite": { "source": { "source": "github", "repo": "majejorex/secdev-suite" } }
  },
  "enabledPlugins": { "secdev@secdev-suite": true }
}
```

En un proyecto nuevo:

1. Ábrelo con Claude Code. Si el stack le suena, verás `[secdev] Detected stack: ...`. Conoce Firebase, Supabase, Expo, React Native y Capacitor, Electron y Tauri, Stripe, Next, Express, Fastify, Hono, Koa y Nest, SDKs de LLM, Docker, y Python, Go, Rust, Java y Kotlin, PHP, Ruby y .NET (con los frameworks de API que salen en sus manifiestos). Con otro stack no dice nada. Las skills siguen usando el checklist general de ASVS.
2. Trabaja como siempre. Una edición que toca auth, reglas, pagos, subidas, secretos, workflows de CI o Dockerfiles deja al agente un recordatorio con los controles que hay que mirar.
3. Antes de una PR o de una release, pregunta «¿Podemos publicar esto?» o «Revisa la seguridad de este cambio» (mira la sección siguiente).
4. Una vez por repo, pide «Añade un gate de seguridad en CI». Enseña el workflow y qué sale del repo, y escribe `.github/workflows/security.yml` solo después de que digas que sí. Luego, en GitHub (Settings, Rules), exige los checks `secrets`, `dependencies` y `sast`. Hasta entonces solo avisan.
5. `claude plugin list` muestra `secdev@secdev-suite` y su versión.

El gate es de GitHub Actions. En otro CI, la skill te da los tres comandos.

Si la primera ejecución encuentra un secreto en el historial, rótalo primero y purga el historial después. Semgrep imprime la línea que marca, así que un secreto filtrado también queda en el registro de la CI. Purgar el historial no borra ese registro.

Para quitar el plugin: `claude plugin uninstall secdev@secdev-suite` (añade `--scope project` si lo instalaste así). Para dejarlo y apagar solo la comprobación diaria de versión, define `SECDEV_NO_UPDATE_CHECK=1`.

## Úsalo en el día a día

No hay un comando que lanzar. Trabajas como siempre y preguntas con tus palabras, en español o en inglés.

| Cuándo | Qué escribes | Qué obtienes |
|---|---|---|
| Antes de escribir una funcionalidad | «Voy a añadir devoluciones de pedidos. ¿Qué controles de seguridad aplican?» | Modo diseño: los controles que aplican y 2-5 casos de abuso («un cliente cambia `orderId` y devuelve el pedido de otro»). Sin veredicto, y todavía sin código. |
| Mientras programas | Nada. | Si una edición toca auth, reglas, pagos, subidas o secretos, el hook se lo recuerda al agente una vez, con los controles que hay que mirar, por ejemplo `payments and webhooks (P2-02)`. |
| Antes de abrir una PR | «¿Podemos publicar esto?» o «Revisa la seguridad de este cambio». | Cierre del diff: una línea `Verdict:`, `Hunt: not done`, una fila por control NOT MET o UNVERIFIED (la evidencia nombra la comprobación, como `hasOnly`) y los MET en una línea. |
| Antes de un release | «Revisa la seguridad de todo el repo antes del release». | Lo mismo, y aplican todos los P0. Lo que el código no puede demostrar (MFA en la consola del cloud, backups, entornos separados) sale como UNVERIFIED, con qué mirar y dónde. |

### Cómo leer el resultado

- **BLOCK.** Un P0 no se cumple. No publiques. Pide «arregla P0-02» (o varios a la vez) y vuelve a pasar la revisión.
- **PASS WITH ISSUES.** Ningún P0 está en NOT MET, y hay algo en UNVERIFIED o falla un P1/P2. Publica después de comprobar tú los UNVERIFIED, casi siempre en la consola del cloud. Antes de una release, un P0 en UNVERIFIED necesita tu confirmación.
- **PASS.** Todo lo que aplica está en MET, o en N/A con una razón.

La revisión no toca el código si no lo pides. El arreglo evidente de un NOT MET cabe en una línea, y los IDs (`P0-02`) sirven para referirte a un hallazgo después. Di «arregla los P0» o «arregla P0-02» y `secdev:security-fix` enseña un plan, edita el código, añade el test de autorización, vuelve a mirar las filas arregladas (3 pasadas como máximo) y deja el commit para ti.

### Llamar a una skill por su nombre

Las skills se activan con palabras normales. Si alguna no lo hace, llámala. En el plugin de Claude Code: `/secdev:security-checklist`, `/secdev:security-fix` y `/secdev:security-gate`. Instaladas sueltas: `security-checklist`, `security-fix` y `security-gate` (en Codex, escribe `$` y elige una).

### Consejos

- Di el alcance cuando no sea obvio: «este diff», «la carpeta `functions/`», «todo el repo».
- Un MET sin `archivo:línea` o sin test no es un MET. Pide la cita.
- UNVERIFIED significa que el código no puede demostrarlo. Míralo donde dice el informe y cuéntale al agente lo que has visto.
- Un cierre revisa estos controles y escribe `Hunt: not done`. Para cazar fallos, el [plugin Claude Security](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/claude-security/README.md). La skill llamada [security-audit](https://github.com/cloudflare/security-audit-skill) es otro producto.

## Cómo funciona

<p align="center">
  <img src="assets/flow.svg" width="880" alt="Cómo funciona: al empezar la sesión, el hook SessionStart detecta el stack; al editar algo arriesgado, el hook PostToolUse avisa una vez; antes de terminar, la skill security-checklist revisa control a control. Veredictos: BLOCK si falla un P0, PASS WITH ISSUES si algo no se puede verificar o falla un P1/P2, PASS si todo se cumple o está justificado como N/A.">
</p>

### 1 · Hook `SessionStart`: detecta el stack

Busca Firebase, Supabase, móvil (Expo, React Native, Capacitor), escritorio (Electron, Tauri), Stripe, Next, frameworks de API, SDKs de LLM, Python y Docker en la raíz del proyecto y en sus subcarpetas directas.

- Si encuentra algo, inyecta dos líneas fijas: los estándares que aplican y un recordatorio de la skill. Nunca imprime contenido del repo.
- Si no encuentra nada, no imprime nada.
- No tumba la sesión y no sigue enlaces simbólicos.
- Una vez al día, en segundo plano, mira la versión de `main`. Si hay una más nueva, la sesión siguiente muestra un aviso con el diff de `hooks/` y el comando de actualización (mira «Actualizar con seguridad»).

### 2 · Hook `PostToolUse`: avisa una vez

Corre en Edit, Write, MultiEdit y NotebookEdit. Si la edición toca algo sensible, le dice al agente que cargue el checklist antes de dar la tarea por hecha.

- Mira la ruta (reglas de acceso, `.env`, claves y keystores, cabeceras, empaquetado de escritorio, workflows de CI, Dockerfiles y archivos compose) y el texto escrito: auth y reautenticación, roles, endpoints, pagos, tokens en el cliente, subidas y archivos comprimidos, secretos, CORS y cabeceras de proxy, ejecución con datos externos, llamadas a un LLM, criptografía, ventanas e IPC de escritorio, firma y actualizaciones de la app, y ediciones de `SECURITY-PROFILE.md` (el único markdown que vigila).
- Junto a cada categoría nombra los controles que hay que mirar primero, por ejemplo `file uploads (P0-14)`.
- Como mucho una vez por sesión. Nunca bloquea.
- Las categorías salen de una lista fija. El mensaje nunca incluye texto del repo.
- Ignora documentación, estilos, imágenes y lockfiles.

### 3 · Skill `secdev:security-checklist`: revisa con evidencia

Revisa un cambio, una funcionalidad o un repo entero.

| | |
|---|---|
| Dos modos | Diseño, antes de cualquier código: los controles que aplican y casos de abuso concretos. Cierre, antes de terminar: verificación y un veredicto. |
| Estados | MET, NOT MET, UNVERIFIED (el código no puede demostrarlo), N/A con una razón. Las palabras se quedan en inglés en cualquier idioma. |
| Veredicto | BLOCK si falla algún P0. PASS WITH ISSUES si hay algo UNVERIFIED o falla un P1/P2. PASS si todo se cumple o está justificado como N/A. |
| Siempre cargado | El checklist vive dentro de `SKILL.md`, así que se carga con la skill aunque el agente no pueda leer archivos fuera del proyecto. |
| Referencias | ASVS 5.0, API Security Top 10 2023, MASVS 2.1, y guías de Firebase, Supabase, LLM y otros stacks. El agente lee una guía solo cuando necesita el detalle. |
| El repo es dato | Los comentarios no cambian el procedimiento. La skill no ejecuta el código del repo ni consulta servicios cloud si no se lo pides. |
| Difícil de engañar | Antes del veredicto intenta romper cada MET. Un comentario que dice «esto es seguro», o un test que simula la comprobación, no es evidencia. El texto que pide a revisores o agentes que den por bueno el código se informa como prompt injection. El Unicode oculto (Trojan Source) es NOT MET. Pedirlo no convierte un BLOCK en un PASS. |

<details>
<summary><strong>Qué cubre el checklist</strong></summary>

<br>

**P0, bloquea una release:** autenticación (incluido el hash de contraseñas, los enlaces de recuperación y la reautenticación en cambios sensibles), autorización en el servidor (incluidas las rutas de admin), aislamiento entre usuarios o tenants, secretos (incluido el historial de git), validación de entradas, sesiones, HTTPS con TLS 1.2 o superior, protección contra abuso, exposición de la base de datos, mínimo privilegio, entornos separados, configuración segura, CSRF y SSRF, gestión de archivos, tests de autorización y una cadena de suministro mínima (incluido un script `preinstall`, `postinstall` o `install` que descargue o ejecute código).

**P1, proceso:** repos protegidos, análisis automático, dependencias, despliegues, logs y trazas de auditoría, alertas, backups con una restauración probada, respuesta a incidentes (qué hacer, y en qué orden, si se filtra un secreto), revisiones periódicas y un pipeline de CI/CD reforzado.

**P2, según la funcionalidad:** móvil (incluidas la firma de releases y de actualizaciones), pagos, RGPD (sin rastreadores antes del consentimiento, cifrado en reposo), IA y LLMs, integraciones con terceros, diseño seguro, apps de escritorio (Electron, Tauri) y contenedores.

Qué cambió en cada versión: [docs/features/](docs/features/) (en inglés).

La lista completa, con cómo verificar cada control y su estándar, está en [skills/security-checklist/SKILL.md](skills/security-checklist/SKILL.md) (en inglés).

</details>

### 4 · Skill `secdev:security-gate`: bloquea PRs en CI

Escribe `.github/workflows/security.yml` con tres jobs. Pídelo con palabras normales: «añade un gate de seguridad en CI» o «escanea el repo en busca de secretos ahora».

| Job | Herramienta | Falla cuando |
|---|---|---|
| `secrets` | gitleaks, todo el historial de git | algún commit contiene un secreto |
| `dependencies` | osv-scanner, todos los lockfiles | una dependencia tiene una vulnerabilidad conocida no aceptada en `osv-scanner.toml` |
| `sast` | Semgrep CE, `p/default`, sin métricas | hay cualquier hallazgo |

La única action es `actions/checkout`, fijada por SHA. gitleaks y osv-scanner son binarios de release comprobados con su SHA-256. Semgrep es una imagen fijada por digest. Todos los jobs tienen `contents: read`. Funciona con una política de repo de «solo actions de GitHub» más «exigir SHA».

Antes de escribir el archivo dice qué sale del repo: los nombres de paquetes van a osv.dev, y Semgrep descarga reglas. Escribe solo después de que digas que sí.

Todavía tienes que marcar los tres jobs como checks obligatorios en la protección de rama. Hasta entonces solo avisan.

También puede pasar las tres herramientas en local una vez, si lo permites. Ordena los CVEs primero por CISA KEV y luego por EPSS.

Semgrep imprime la línea que marca, así que un secreto en el código también acaba en el registro de la CI. gitleaks oculta el valor. Rota un secreto filtrado antes que nada.

Este repo usa el mismo workflow, y un test lo mantiene idéntico a la plantilla de la skill. En la primera ejecución encontró dos caracteres Unicode bidireccionales ocultos en nuestros propios tests.

### Qué no hace

Un cierre no es una caza de vulnerabilidades. Para cazar, usa:

- el [plugin Claude Security](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/claude-security/README.md) (`claude-security`). Informa CWE, no estas filas. [security-audit](https://github.com/cloudflare/security-audit-skill) es la skill de auditoría de Cloudflare, otro producto;
- `security-guidance` para una mirada automática a cada diff.

## Actualizar con seguridad

> [!IMPORTANT]
> Los hooks son código que se ejecuta en todas tus sesiones. Actualizar el plugin significa ejecutar código nuevo en todas partes.

- Deja apagada la actualización automática de este marketplace. En los marketplaces de terceros ya viene apagada. Puedes mirarlo en `/plugin`, luego Marketplaces. secdev te avisa cuando hay una versión nueva.
- Cuando se publica una versión nueva, la sesión siguiente muestra un aviso como este (en inglés):
  ```
  secdev 0.3.4 is available (installed: 0.3.3). Review what changes in hooks/ before updating:
  https://github.com/majejorex/secdev-suite/compare/v0.3.3...v0.3.4 · Update: claude plugin marketplace
  update secdev-suite && claude plugin update secdev@secdev-suite, then restart Claude Code.
  ```
  1. Abre el enlace y lee el diff de `hooks/`. Ese código correrá en todas las sesiones.
  2. Actualiza con un comando (dentro de Claude Code, ponle `!` delante):
     ```
     claude plugin marketplace update secdev-suite && claude plugin update secdev@secdev-suite
     ```
  3. Reinicia Claude Code.
- Cómo funciona la comprobación: como mucho una vez al día, un proceso en segundo plano descarga `.claude-plugin/plugin.json` de `main` y se queda solo con la versión. No envía nada de tu proyecto, y la sesión no espera. El resultado se guarda en la carpeta de datos del plugin (`CLAUDE_PLUGIN_DATA`).
- Para apagarlo, define `SECDEV_NO_UPDATE_CHECK=1`.
- Desde un clon: `git fetch --tags && git diff <installed-tag>..origin/main -- hooks/ .claude-plugin/`.
- Las etiquetas `v*` están protegidas. No se pueden mover ni borrar, así que un diff entre etiquetas es de fiar.

## Tests

```
npm test
```

Sin dependencias, solo Node 20 o superior y `node:test`. Dos grupos:

- Hooks: detección, salida, que nunca fallan y que terminan en menos de 1 s.
- Estructura: JSON válido, frontmatter, enlaces internos y que los evals citan controles que existen.

`evals/cases.json` guarda casos de comportamiento: si la skill se activa y qué controles señala. `node evals/run.mjs <carpeta-de-salida>` los ejecuta de verdad. Por cada caso crea un proyecto de usar y tirar, lanza `claude -p --plugin-dir .` e informa:

- si se vio la salida del hook;
- si la skill se cargó;
- si leyó sus referencias sin errores;
- qué controles citó;
- si la respuesta nombra las palabras clave del caso (`mustMention`, por ejemplo `constructEvent` en un webhook de Stripe). Cada ítem puede listar sinónimos. Si falta uno, el caso falla.

Unos 0,21 USD por caso con Sonnet, así que esto no entra en `npm test`.

Un modelo no responde igual dos veces, así que una pasada en verde demuestra poco. Antes de una release que cambia una skill:

```
node evals/run.mjs <carpeta-fuera-del-repo> claude-sonnet-5-5 --repeat 3
```

- Cada caso corre 3 veces, como mucho 8 a la vez, con el modelo fijado por su ID exacto. Se anota el modelo que se usó de verdad.
- Gate: un caso `critical` (los que tienen que acabar en BLOCK, el de prompt injection y los que no deben activarse) pasa 3/3. Cualquier otro caso pasa al menos 2/3. Un caso que a veces falla queda como `flaky`.
- Un caso pasa solo si la skill se carga, se citan los controles esperados, se nombran las palabras clave (con sinónimos) y el veredicto sale de su propia tabla. Un P0 en NOT MET significa BLOCK. Cualquier NOT MET o UNVERIFIED descarta PASS.
- La pasada escribe `summary.md`. Cópialo a `docs/evals/<versión>.md`.
- Coste: unos 18 USD por pasada (30 casos × 3).

## Hoja de ruta

| Fase | Qué | Estado |
|---|---|---|
| F0 | Skill `security-checklist`, referencias por estándar y el hook `SessionStart` | Hecho, v0.1 |
| F1 | Hook de aviso `PostToolUse`, con el formato de `security-guidance` (`hookSpecificOutput.additionalContext`). Sin él, la skill se activaba en unos 3 de cada 4 casos positivos de eval | Hecho, v0.2.0 |
| F1 | Matriz de tests de autorización (BOLA y BFLA) en `security-fix/references/authz-tests.md` | Hecho, v0.5.4 |
| F1 | `SECURITY-PROFILE.md`: el checklist lo crea y lee riesgos aceptados y atestaciones desde la rama por defecto | Hecho, v0.5.0 |
| F1 | Modo diseño en el checklist (controles y casos de abuso antes del código; sin skill aparte) | Hecho, v0.5.4 |
| F5 | Detección de más stacks, referencias para Go, Rust, JVM, PHP, Python, Ruby, .NET, cloud, Supabase y LLM, y la skill `security-fix` | Hecho, v0.5.0 |
| F2 | Skill `security-gate`: gitleaks, `osv-scanner` y Semgrep en el gate de cada repo | Hecho, v0.4.0 |
| F3 | Inteligencia de amenazas, versión manual (`/intel-review`) | Hecho |
| F4 | Evals que miden estabilidad: 3 repeticiones por caso, un gate de release y un modelo fijado | Hecho, v0.4.3 y v0.4.4 |

Orden decidido el 2026-11-02:

1. F2 primero: hecho en v0.4.0.
2. `authz-tests`: la matriz está en `security-fix/references/authz-tests.md` (v0.5.4).
3. `secure-design`: modo diseño en el checklist (v0.5.4).

Pasar los evals en CI no está previsto. Una pasada completa cuesta unos 18 USD, así que quien mantiene el repo la lanza antes de una release que cambia una skill.

El `supply-chain-risk-auditor` de Trail of Bits no está instalado. `osv-scanner` cubre vulnerabilidades conocidas. Un script `preinstall`, `postinstall` o `install` que descargue o ejecute código queda en NOT MET en P0-16 (v0.5.5). Los paquetes abandonados y los cambios de quien publica siguen fuera.

<details>
<summary><strong>F3: cómo funciona <code>/intel-review</code></strong></summary>

<br>

- `/intel-review` es la skill de quien mantiene el repo (`maintainer/intel-review/`; cópiala a `.claude/skills/` para usarla). No se publica con el plugin. Ejecuta `node intel/fetch.mjs`, que recoge CISA KEV, GitHub Advisories, EPSS, cambios en los estándares de OWASP y noticias de una lista cerrada de fuentes.
- El agente ordena lo recogido, escribe `intel/YYYY-MM-DD.md` y propone cambios a la skill. Solo se aplica lo que tú apruebas, y entra por una PR.
- Los datos en bruto (`intel/raw/`) no se versionan. Lo que viene de fuera es dato, nunca una instrucción.
- Sigue abierto: si programarlo cada semana.

</details>

## Ayúdame a mejorarlo

Lo más útil es probarlo en un proyecto que no sea Firebase ni JavaScript y decir qué ha fallado.

- Un resultado mal (un falso positivo, un hallazgo que se le escapó, un veredicto que no sale de la tabla): [abre una issue](https://github.com/majejorex/secdev-suite/issues/new/choose) con el ejemplo más pequeño que puedas compartir.
- Un stack o una plataforma que no conoce: el mismo enlace, «Stack or platform request».
- Preguntas, ideas, cómo se compara con otras herramientas: [Discussions](https://github.com/majejorex/secdev-suite/discussions).
- ¿No estás de acuerdo con un control, con su «cómo verificar» o con su estándar? Es una buena issue. Cada control cita la fuente OWASP de la que sale.
- Si te ha servido, una estrella ayuda a que otras personas lo encuentren.

## Contribuir

Haz un fork y abre una pull request. Las reglas están en [CONTRIBUTING.md](CONTRIBUTING.md). Informa de vulnerabilidades en privado: [SECURITY.md](SECURITY.md).

## Fuentes y licencias

Los IDs de control, los títulos de capítulo y la redacción de los controles salen de los repositorios oficiales de OWASP (comprobados el 2026-11-02):

- [OWASP/ASVS](https://github.com/OWASP/ASVS) `5.0/en`;
- [OWASP/API-Security](https://github.com/OWASP/API-Security) `editions/2023/en`;
- [OWASP/masvs](https://github.com/OWASP/masvs) v2.1.0.

Esos documentos se publican bajo las licencias Creative Commons de OWASP. Este repo solo cita IDs, títulos y los enunciados de una línea de MASVS, con atribución. El resto del texto es original.

El código y el texto original se publican bajo la licencia [MIT](LICENSE). El material citado de OWASP conserva su licencia original.
