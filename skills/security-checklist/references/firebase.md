# Firebase: qué revisar

En Firebase las reglas de seguridad (Firestore, Storage, Realtime Database) **son** la capa de autorización para todo lo que el cliente lee o escribe directamente. Las Cloud Functions usan el Admin SDK, que **se salta las reglas**: dentro de una función, la autorización es responsabilidad del código.

## Reglas (Firestore y Storage) — P0-02, P0-03, P0-09, P0-14

- Por defecto todo denegado; nada de `allow read, write: if true` ni reglas de prueba con fecha.
- `request.auth != null` **no** es autorización: solo dice que hay sesión. Hay que atar el recurso al usuario (`resource.data.ownerId == request.auth.uid`) o a un rol verificado.
- Roles desde custom claims (`request.auth.token.role`) puestos por el servidor, o desde un documento que el cliente no puede escribir. Nunca desde un campo que el propio usuario edita.
- Escrituras con lista blanca de campos: `request.resource.data.keys().hasOnly([...])` y `diff(...).affectedKeys().hasOnly([...])` para impedir la asignación masiva (`role`, `isVerified`, `balance`).
- Validación de tipos y tamaños en las reglas: strings con longitud máxima, enums cerrados.
- `list` (consultas) es distinto de `get`: comprobar que una consulta no devuelve documentos ajenos.
- Storage: `request.resource.size` y `contentType` limitados; rutas privadas con el `uid` en la ruta y comprobado.
- **Tests** con el emulador y `@firebase/rules-unit-testing`: por cada colección sensible, un caso de «otro usuario» y otro de «sin sesión» que deben fallar (P0-15).

## Cloud Functions — P0-02, P0-05, P0-08

- Callables: comprobar `request.auth` y el permiso sobre el recurso concreto en cada una.
- Validar `request.data` con un esquema (zod); no pasar el objeto entero a `set`/`update`.
- App Check: `enforceAppCheck: true` en callables expuestas a la app, sobre todo las caras o con abuso posible.
- Errores: `HttpsError` con mensaje genérico; el detalle va al log, no al cliente.
- HTTP functions (webhooks): verificar la firma (Stripe: `constructEvent` con el raw body); responder rápido y procesar de forma idempotente.
- Triggers: la entrega es al menos una vez, así que tienen que ser idempotentes (marca de evento procesado o transacción).
- Secretos con `defineSecret` (Secret Manager), no en el código ni en `.env` versionado.
- Rate limit propio en funciones caras: Firebase no lo trae por función.

## Auth — P0-01, P0-06

- La protección contra enumeración de emails está activada.
- MFA (TOTP) obligatorio para el staff, comprobado en servidor (claims o reglas), no solo en la UI.
- Revocar los refresh tokens (`revokeRefreshTokens`) al banear o cambiar el rol; las reglas o funciones sensibles comprueban `auth_time` o tokens revocados.
- Dominios autorizados de Auth limitados a los propios.

## Claves y configuración — P0-04, P0-10, P0-11

- La `apiKey` de Firebase en el cliente es un identificador público, no un secreto. Hay que restringirla en Google Cloud (por app o referer y por API).
- Cuentas de servicio y JSON de credenciales nunca en el cliente ni en el repo.
- Un proyecto Firebase por entorno (dev, staging, prod); nada de datos reales en dev.
- IAM: cuentas de servicio con roles concretos; nada de Owner o Editor por comodidad.

## Hosting — P0-12

- Cabeceras en `firebase.json` (`hosting.headers`): CSP, HSTS, X-Content-Type-Options, frame-ancestors o X-Frame-Options, Referrer-Policy.

## Datos y recuperación — P1-07, P2-03

- PITR activado y exports programados a un bucket con retención; restauración probada al menos una vez.
- El borrado de cuenta alcanza todas las colecciones y los ficheros de Storage del usuario. Decidir y documentar qué pasa con los backups.
- Alertas de presupuesto en Google Cloud (P1-06).
