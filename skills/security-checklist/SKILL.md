---
name: security-checklist
description: Checklist de seguridad con evidencia (P0 bloquea publicar, P1 proceso, P2 según funcionalidad) basada en OWASP ASVS 5.0, API Security Top 10 2023 y MASVS 2.1, con referencias para Firebase y Supabase. Úsala al diseñar o antes de dar por terminada cualquier tarea que toque autenticación, login, roles o permisos, datos de usuario o de otros usuarios, pagos o webhooks, subidas de archivos, secretos o claves, reglas de acceso (Firestore/Storage rules, RLS), endpoints o callables, sesiones o tokens, CORS/CSP o cabeceras, datos sanitarios o de menores, o funciones con LLM. También para «¿es seguro?», «revisa la seguridad de este cambio», «checklist de seguridad», «¿podemos publicar?».
---

# Security checklist

Comprueba que un cambio, una funcionalidad o un repo cumple el estándar de seguridad, control a control y con evidencia. No es una auditoría de vulnerabilidades: para eso remite a otras herramientas (ver «Escalar»).

Principio: nunca confiar en el frontend, nunca confiar en los datos recibidos, nunca asumir que un usuario autenticado puede acceder a cualquier recurso.

## Modos

- **Diseño** (antes de escribir código): lista los controles aplicables y 2–5 casos de abuso concretos («un familiar cambia `childId` en la petición y lee el expediente de otro menor»). Sin veredicto.
- **Cierre** (antes de dar algo por terminado, abrir PR o publicar): verifica cada control aplicable y da veredicto.

Si no está claro, usa **cierre**.

## Procedimiento

1. **Alcance.** Qué se revisa: el diff, una funcionalidad o el repo entero. Lista los ficheros y las rutas de datos afectadas.
2. **Perfil.** Usa el stack que inyectó el hook `[secdev]` o detéctalo (package.json, firebase.json, app.json). Si el repo tiene `SECURITY-PROFILE.md`, léelo: manda sobre los valores por defecto (datos especiales, roles, entornos).
3. **Controles.** Abre [references/checklist.md](references/checklist.md) y marca qué controles aplican. Abre solo la referencia de norma que el stack necesita:
   - Siempre: [references/asvs-5.md](references/asvs-5.md) (solo los capítulos que toque el cambio).
   - API, callables, BaaS o backend: [references/api-top10-2023.md](references/api-top10-2023.md).
   - App móvil (Expo, React Native, nativa): [references/masvs-2.md](references/masvs-2.md).
   - Firebase: [references/firebase.md](references/firebase.md).
4. **Verificación.** Para cada control aplicable, busca la evidencia en el código, la configuración o los tests (Grep/Read; ejecutar tests si son baratos). Estados:
   - ✅ cumple: con evidencia `fichero:línea`, comando y su salida, o test que lo cubre.
   - ❌ no cumple: con evidencia de la ausencia o del fallo.
   - ⚠️ no verificable desde el código (consola cloud, configuración de proveedor, proceso humano): di qué hay que mirar y dónde.
   - N/A: con una frase de por qué no aplica.
   Sin evidencia no hay ✅. «Parece que» no es evidencia.
5. **Veredicto.**
   - **BLOQUEA** si algún P0 aplicable está ❌.
   - **PASA CON PENDIENTES** si no hay P0 ❌ pero hay P1/P2 ❌ o ⚠️.
   - **PASA** si todo lo aplicable está ✅ o N/A justificado.

## Formato de salida

```
Veredicto: BLOQUEA | PASA CON PENDIENTES | PASA
Alcance: <qué se revisó>   Stack: <tags>   Normas: <ASVS/API/MASVS>

| ID | Control | Estado | Evidencia / qué falta | Norma |
|----|---------|--------|------------------------|-------|
| P0-02 | Autorización en backend | ❌ | functions/src/x.ts:40 no comprueba propietario | ASVS V8.2 · API1 |

Pendientes ordenados: P0 ❌ primero, luego P1, P2 y ⚠️.
```

Una fila por control aplicable. Los N/A van agrupados al final en una línea.

## Reglas

- No escribas secretos, tokens ni datos personales en el informe: redacta (`sk_live_…[REDACTADO]`).
- No lances pruebas activas (altas de usuarios, escrituras, escaneos de red) contra producción. Contra otros entornos, solo con permiso expreso de la persona.
- No arregles nada en este paso salvo que te lo pidan: el resultado es el informe.
- Si un control es ❌ y el arreglo es evidente, di cuál en una línea.
- Un test desactivado (`.skip`, `.only`) o un umbral rebajado no cuentan como evidencia.

## Escalar

- Auditoría completa de vulnerabilidades o pentest: skill `security-audit` o plugin `claude-security`.
- Revisión automática de cada diff y commit: plugin `security-guidance` (si está instalado, ya corre solo).
- Dependencias y cadena de suministro: `npm audit` / `osv-scanner` sobre el lockfile.
