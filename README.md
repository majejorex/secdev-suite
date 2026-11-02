# secdev-suite

Suite de seguridad propia para agentes de código (Claude Code). Se reparte como plugin `secdev` desde este repo, que también hace de marketplace.

## Qué hace (v0.1, F0)

- **Skill `secdev:security-checklist`**: revisa un cambio, una funcionalidad o un repo control a control. Usa la checklist P0/P1/P2 y exige evidencia `fichero:línea`. El veredicto es BLOQUEA, PASA CON PENDIENTES o PASA. Tiene un modo diseño (antes de escribir código) y un modo cierre (antes de dar algo por terminado). La carga el agente cuando la tarea toca auth, roles, datos, pagos, subidas, secretos o reglas.
- **Referencias por norma**, que se cargan solo si hacen falta:
  - OWASP ASVS 5.0;
  - API Security Top 10 2023;
  - MASVS 2.1;
  - una guía de Firebase.
- **Hook `SessionStart`**: detecta el stack del proyecto (Firebase, Supabase, móvil, Stripe, Next, API, LLM, Python, Docker). Si encuentra algo, inyecta dos líneas con las normas aplicables y el recordatorio de la skill. Si no, calla. Nunca falla.

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

Para desarrollar, apunta el marketplace a la carpeta local en vez de a GitHub (`/plugin marketplace add C:\ruta\a\secdev-suite`). Después de cambiar algo, `/plugin marketplace update secdev-suite` y `/reload-plugins`.

## Probar

```
npm test
```

Sin dependencias (Node ≥ 20, `node:test`). Hay dos grupos de tests:
- **Hook**: detección, salida, que no falle y que tarde menos de 1 s.
- **Estructura**: JSON válidos, frontmatter, enlaces internos y que los evals citen controles reales.

`evals/cases.json` tiene casos de comportamiento: si la skill se activa y qué controles marca. De momento se comprueban a mano con `claude -p "<prompt>"` en un proyecto del stack indicado.

## Hoja de ruta

- **F1**:
  - skill `authz-tests` (genera la matriz y los tests de BOLA y BFLA);
  - skill `secure-design`;
  - `SECURITY-PROFILE.md` por proyecto.
- **F2**: skill `security-gate`, que mete gitleaks, `osv-scanner` y Semgrep en el gate de cada repo.
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

Repo privado; todos los derechos reservados salvo lo citado.
