# OWASP ASVS 5.0: mapa de revisión

Los capítulos y las secciones (ID y título exactos) salen del repositorio oficial `OWASP/ASVS`, carpeta `5.0/en`, comprobados el 2026-11-02. El texto de «Qué mirar» es propio, no copia de OWASP. ASVS 5.0 renumeró todo respecto a 4.0: no uses IDs de 4.0.

**Niveles** (según `0x03-What-is-the-ASVS.md`):
- L1 es el mínimo.
- ASVS dice que la mayoría de aplicaciones deberían aspirar a **L2**.
- L3 es para aplicaciones de alto valor o alto riesgo.

La organización elige el nivel por riesgo. Para saber qué requisitos son de qué nivel, consulta el capítulo oficial; no lo deduzcas.

| Cap. | Secciones | Qué mirar (resumen propio) |
|------|-----------|----------------------------|
| **V1** Encoding and Sanitization | V1.1 Encoding and Sanitization Architecture · V1.2 Injection Prevention · V1.3 Sanitization · V1.4 Memory, String, and Unmanaged Code · V1.5 Safe Deserialization | Consultas parametrizadas, sin concatenar en SQL/NoSQL/shell/plantillas; HTML sanitizado; sin deserializar datos no confiables; SSRF (1.3.6) |
| **V2** Validation and Business Logic | V2.1 Validation and Business Logic Documentation · V2.2 Input Validation · V2.3 Business Logic Security · V2.4 Anti-automation | Esquema en servidor para cada entrada; reglas de negocio (importes, estados, límites) en servidor; límites anti-automatización |
| **V3** Web Frontend Security | V3.1 Web Frontend Security Documentation · V3.2 Unintended Content Interpretation · V3.3 Cookie Setup · V3.4 Browser Security Mechanism Headers · V3.5 Browser Origin Separation · V3.6 External Resource Integrity · V3.7 Other Browser Security Considerations | Flags de cookies; CSP, HSTS y nosniff; CORS y CSRF; SRI para scripts de terceros |
| **V4** API and Web Service | V4.1 Generic Web Service Security · V4.2 HTTP Message Structure Validation · V4.3 GraphQL · V4.4 WebSocket | Content-Type correcto; validación de mensajes; límites de profundidad en GraphQL; auth en WebSocket |
| **V5** File Handling | V5.1 File Handling Documentation · V5.2 File Upload and Content · V5.3 File Storage · V5.4 File Download | Tamaño, tipo y contenido; almacenamiento fuera de la raíz pública; descargas con autorización |
| **V6** Authentication | V6.1 Authentication Documentation · V6.2 Password Security · V6.3 General Authentication Security · V6.4 Authentication Factor Lifecycle and Recovery · V6.5 General Multi-factor authentication requirements · V6.6 Out-of-Band authentication mechanisms · V6.7 Cryptographic authentication mechanism · V6.8 Authentication with an Identity Provider | Política de contraseñas, anti-enumeración, fuerza bruta (6.3.1), recuperación segura, MFA, IdP bien integrado |
| **V7** Session Management | V7.1 Session Management Documentation · V7.2 Fundamental Session Management Security · V7.3 Session Timeout · V7.4 Session Termination · V7.5 Defenses Against Session Abuse · V7.6 Federated Re-authentication | Caducidad, revocación al cerrar sesión o banear, reautenticación en acciones sensibles |
| **V8** Authorization | V8.1 Authorization Documentation · V8.2 General Authorization Design · V8.3 Operation Level Authorization · V8.4 Other Authorization Considerations | Autorización por objeto y por función en servidor; matriz de roles documentada; tenants aislados |
| **V9** Self-contained Tokens | V9.1 Token source and integrity · V9.2 Token content | Firma verificada, `alg` fijado, `aud`/`iss`/`exp` comprobados; sin datos sensibles en el token |
| **V10** OAuth and OIDC | V10.1 Generic OAuth and OIDC Security · V10.2 OAuth Client · V10.3 OAuth Resource Server · V10.4 OAuth Authorization Server · V10.5 OIDC Client · V10.6 OpenID Provider · V10.7 Consent Management | PKCE, `state`/`nonce`, redirect URIs exactas, scopes mínimos |
| **V11** Cryptography | V11.1 Cryptographic Inventory and Documentation · V11.2 Secure Cryptography Implementation · V11.3 Encryption Algorithms · V11.4 Hashing and Hash-based Functions · V11.5 Random Values · V11.6 Public Key Cryptography · V11.7 In-Use Data Cryptography | Algoritmos actuales; aleatoriedad criptográfica para tokens; sin cripto casera |
| **V12** Secure Communication | V12.1 General TLS Security Guidance · V12.2 HTTPS Communication with External Facing Services · V12.3 General Service to Service Communication Security | TLS en todo; certificados válidos; servicio a servicio autenticado |
| **V13** Configuration | V13.1 Configuration Documentation · V13.2 Backend Communication Configuration · V13.3 Secret Management · V13.4 Unintended Information Leakage | Secretos en un gestor; cuentas de servicio con mínimo privilegio (13.2.2); sin debug ni stack traces expuestos; ficheros sensibles no servidos |
| **V14** Data Protection | V14.1 Data Protection Documentation · V14.2 General Data Protection · V14.3 Client-side Data Protection | Clasificación de datos; minimización y retención; nada sensible en el almacenamiento del cliente salvo tokens de sesión (14.3.3) |
| **V15** Secure Coding and Architecture | V15.1 Secure Coding and Architecture Documentation · V15.2 Security Architecture and Dependencies · V15.3 Defensive Coding · V15.4 Safe Concurrency | Dependencias y plazos de corrección, sin funciones de test en producción (15.2.3); asignación masiva evitada; condiciones de carrera (TOCTOU, dobles cobros) |
| **V16** Security Logging and Error Handling | V16.1 Security Logging Documentation · V16.2 General Logging · V16.3 Security Events · V16.4 Log Protection · V16.5 Error Handling | Eventos de seguridad registrados; logs sin secretos ni PII innecesaria; errores genéricos al cliente. Las alertas y la correlación quedan fuera del alcance de ASVS |
| **V17** WebRTC | V17.1 TURN Server · V17.2 Media · V17.3 Signaling | Solo si hay videollamada propia: TURN con credenciales temporales, señalización autenticada |

**No están en ASVS** (la checklist los marca «Fuera de ASVS»): backups y restauración, respuesta a incidentes, protección de repositorios, pipelines de despliegue, DAST y pentest, y MFA en consolas cloud.
