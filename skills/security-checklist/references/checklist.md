# Checklist P0 / P1 / P2

Prioridades:
- **P0** bloquea publicar.
- **P1** debe estar en el proceso de desarrollo y operación.
- **P2** pasa a ser obligatorio cuando existe la funcionalidad o el riesgo.

Un control solo bloquea si **aplica**: un proyecto sin subidas de archivos no falla P0-14.

Columnas:
- **Cómo verificar**: dónde buscar la evidencia.
- **Norma**: el capítulo de ASVS 5.0 (V), el riesgo del API Security Top 10 2023 (API) o el control de MASVS 2.1 (MASVS).

## P0 — Obligatorios antes de producción

| ID | Control | Cómo verificar | Norma |
|----|---------|----------------|-------|
| P0-01 | **Autenticación segura**: proveedor fiable, login y recuperación protegidos, MFA obligatorio para administradores | Proveedor de identidad (no auth casera); flujo de reset sin enumeración de usuarios; MFA del staff exigido en servidor, no solo en la UI | V6, API2, MASVS-AUTH-1 |
| P0-02 | **Autorización en backend** en cada petición; nunca roles, IDs ni permisos que mande el cliente | Cada endpoint/callable lee la identidad del token verificado y comprueba permiso; roles desde claims o BD del servidor | V8.2, V8.3, API1, API5 |
| P0-03 | **Aislamiento de datos** entre usuarios, familias, empresas o tenants (reglas de BaaS o RLS) | Reglas que atan el recurso al `uid` o al tenant; tests que intentan leer y escribir datos ajenos | V8.2, V8.4, API1, API3 |
| P0-04 | **Secretos protegidos**: nada privilegiado en frontend, apps, código ni repo | Grep de claves (`sk_live`, `-----BEGIN`, `service_account`, `AKIA`); variables `EXPO_PUBLIC_`/`NEXT_PUBLIC_` = públicas; secretos en un gestor | V13.3, MASVS-STORAGE-1 |
| P0-05 | **Validación de entradas en servidor** contra inyección (SQL/NoSQL, comandos, plantillas) y XSS | Esquema (zod, pydantic) en cada entrada; consultas parametrizadas; salida codificada; sin `eval`/`innerHTML` con datos externos | V1, V2.2, MASVS-CODE-4 |
| P0-06 | **Sesiones seguras**: caducidad, revocación, almacenamiento seguro; cookies HttpOnly, Secure y SameSite | Duración de tokens y refresco; revocación al cerrar sesión, cambiar contraseña o banear; tokens en Keychain/Keystore o cookie HttpOnly, no en localStorage | V7, V9, V3.3, MASVS-STORAGE-1 |
| P0-07 | **HTTPS obligatorio** | Sin `http://` a servicios propios; HSTS en la web; Android sin cleartext; ATS en iOS | V12, MASVS-NETWORK-1 |
| P0-08 | **Protección contra abusos**: rate limiting, límite de intentos de login, bots, consumo de APIs e IA | Límites por usuario o IP en endpoints caros y de login; protección anti-bot (App Check, captcha); tope de coste en llamadas a LLM | V2.4, API4, API6 |
| P0-09 | **Base de datos protegida**: sin exposición pública innecesaria, permisos mínimos, credenciales por entorno | Reglas por defecto en deny; sin `allow read, write: if true`; la BD no es accesible desde internet sin auth; credenciales distintas por entorno | V13.2, V14.2 |
| P0-10 | **Infraestructura con mínimo privilegio** y MFA en cuentas cloud y administrativas | Cuentas de servicio con roles concretos, no Owner/Editor; MFA en cloud, GitHub, Stripe y el registrador del dominio | V13.2, V15.2 |
| P0-11 | **Entornos separados** (dev, staging, prod); sin datos reales sensibles en dev | Proyectos o cuentas distintos por entorno; seeds sintéticos en dev | V13.1, V14.1 |
| P0-12 | **Configuración segura**: sin debug en prod, errores sin detalles internos, CORS restringido, CSP y cabeceras | Flags de debug; respuestas de error genéricas al cliente; CORS con orígenes explícitos; CSP, HSTS, X-Content-Type-Options, frame-ancestors | V13.4, V16.5, V3.4, API8 |
| P0-13 | **CSRF y SSRF** | Cookies de sesión con SameSite + token CSRF en formularios con cookie; URLs salientes con lista permitida, sin IPs internas ni metadatos cloud | V3.5, V1.3, API7 |
| P0-14 | **Archivos protegidos**: tipo, tamaño y contenido validados; documentos privados con acceso restringido | Reglas de Storage o validación en servidor (tamaño, MIME); rutas privadas por usuario; URLs firmadas de vida corta | V5, API3 |
| P0-15 | **Pruebas de autorización automáticas**: un usuario no accede a datos, endpoints o funciones de otro cambiando IDs, roles o parámetros | Tests (emulador de reglas, integración) con un caso de «otro usuario» y otro de «rol inferior» por recurso sensible | V8, API1, API5 |
| P0-16 | **Cadena de suministro mínima**: lockfile versionado, sin vulnerabilidades críticas o altas conocidas y explotables en lo que llega a producción | `package-lock.json`/`uv.lock` en git; `npm audit --omit=dev` u `osv-scanner` sin críticas abiertas, o con justificación escrita | V15.2, MASVS-CODE-3, API10 |

## P1 — Obligatorios en el proceso de desarrollo

| ID | Control | Cómo verificar | Norma |
|----|---------|----------------|-------|
| P1-01 | **Repositorios protegidos**: MFA, rama principal protegida, PR revisado por otro, sin secretos | Protección de rama (o regla escrita si CI está parada); plantilla de PR con revisión | V15.1 |
| P1-02 | **Análisis automático**: SAST, SCA y detección de secretos | gitleaks/trufflehog, Semgrep/CodeQL y Dependabot/osv-scanner en el gate o en CI | V15.2 |
| P1-03 | **Dependencias al día**: versiones controladas, sin librerías abandonadas o innecesarias | Lockfile; revisión periódica de desactualizadas; eliminar dependencias sin uso | V15.2, MASVS-CODE-3 |
| P1-04 | **Despliegues controlados**: pipeline con tests, bloqueo ante fallos críticos, sin cambios manuales en prod | Gate antes de desplegar; despliegue con script, no a mano en consola; rollback documentado | V13.1 |
| P1-05 | **Logs y auditoría**: fallos de auth, accesos denegados, cambios de permisos y operaciones sensibles; nunca contraseñas, tokens ni datos sensibles innecesarios | Log de auditoría para acciones de admin; grep de `console.log` con tokens o PII | V16.2, V16.3, V16.4 |
| P1-06 | **Monitorización y alertas**: actividad sospechosa, errores anómalos, consumo excesivo, fuerza bruta | Alertas de presupuesto, de errores y de picos de login fallido configuradas (⚠️ normalmente en consola) | V16.3, API4 |
| P1-07 | **Backups** automáticos, cifrados, protegidos frente a borrado y **restauración probada** | PITR o exports programados; retención; un restore probado con fecha | V14.2 |
| P1-08 | **Plan de respuesta a incidentes**: revocar credenciales, bloquear accesos, investigar, restaurar, comunicar brechas (RGPD: 72 h a la autoridad) | Documento con pasos y responsables; inventario de secretos rotables | V16.1 |
| P1-09 | **Revisiones periódicas**: DAST (OWASP ZAP), revisión de permisos, pentest proporcional al riesgo | Fecha de la última auditoría y de la última revisión de IAM | V15.1 |

## P2 — Según funcionalidad

| ID | Control | Cuándo aplica | Cómo verificar | Norma |
|----|---------|---------------|----------------|-------|
| P2-01 | **Seguridad móvil**: credenciales en Keychain/Keystore, almacenamiento local protegido, sin secretos en APK/IPA | App móvil | `expo-secure-store` o equivalente para tokens; nada sensible en AsyncStorage sin cifrar; `allowBackup` revisado | MASVS-STORAGE, MASVS-CRYPTO-2 |
| P2-02 | **Pagos seguros**: proveedor especializado, importes calculados en backend, firma de webhooks, idempotencia | Pagos | El importe sale del servidor, no del cliente; `constructEvent` con raw body; claves de idempotencia; eventos repetidos sin doble efecto | V2.3, API6, API10 |
| P2-03 | **Protección de datos y RGPD**: minimización, acceso, retención, cifrado, borrado seguro; más medidas con datos sanitarios (art. 9) o de menores | Datos personales | Inventario de datos; borrado de cuenta que alcanza backups y exports; retención escrita; DPIA si hay datos especiales | V14, MASVS-PRIVACY |
| P2-04 | **IA y LLM**: sin fugas por prompts, herramientas o documentos; control de prompt injection, permisos de herramientas y costes | Funciones con LLM o agentes | El contenido externo se trata como datos; las herramientas con el mínimo permiso; topes de tokens y gasto; salida validada antes de actuar | OWASP LLM Top 10, API10 |
| P2-05 | **Integraciones externas**: comunicaciones autenticadas, webhooks validados, tokens con permisos limitados, datos intercambiados controlados | Terceros (pagos, correo, video, OAuth) | Firma de webhooks; scopes mínimos; timeouts; respuestas de terceros validadas | V10, API10 |
| P2-06 | **Diseño seguro desde el principio**: datos sensibles, posibles atacantes, superficies de ataque y riesgos antes de construir | Funcionalidad nueva | Modo **diseño** de esta skill: controles aplicables y casos de abuso escritos antes del código | V15.1, V2.1 |

## Funcionalidad terminada

Una funcionalidad no está terminada hasta que:
1. funciona;
2. tiene autenticación y autorización adecuadas;
3. valida entradas y protege sus datos;
4. no expone información ni credenciales;
5. tiene pruebas automáticas de seguridad relevantes;
6. puede monitorizarse y recuperarse ante fallos.
