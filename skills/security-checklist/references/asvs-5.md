# OWASP ASVS 5.0: mapa de revisión

Capítulos y secciones copiados del repositorio oficial `OWASP/ASVS`, carpeta `5.0/en`, comprobado el 2026-11-02. El texto de «Qué mirar» es propio, no copia de OWASP. ASVS 5.0 renumeró todo respecto a 4.0: no uses IDs de 4.0.

**Niveles:**
- **L1** como base para todo.
- **L2** cuando hay datos personales sensibles (salud, menores, pagos) o cuentas de staff con poder.
- **L3** solo si el modelo de amenazas lo pide.

Para los requisitos exactos de un nivel, consulta el capítulo oficial en lugar de inventarlos.

| Cap. | Secciones | Qué mirar (resumen propio) |
|------|-----------|----------------------------|
| **V1** Encoding and Sanitization | V1.1 Architecture · V1.2 Injection Prevention · V1.3 Sanitization · V1.4 Memory, String, and Unmanaged Code · V1.5 Safe Deserialization | Consultas parametrizadas, sin concatenar en SQL/NoSQL/shell/plantillas; HTML sanitizado; sin deserializar datos no confiables |
| **V2** Validation and Business Logic | V2.1 Documentation · V2.2 Input Validation · V2.3 Business Logic Security · V2.4 Anti-automation | Esquema en servidor para cada entrada; reglas de negocio (importes, estados, límites) en servidor; límites anti-automatización |
| **V3** Web Frontend Security | V3.1 Documentation · V3.2 Unintended Content Interpretation · V3.3 Cookie Setup · V3.4 Browser Security Mechanism Headers · V3.5 Browser Origin Separation · V3.6 External Resource Integrity · V3.7 Other Browser Security Considerations | Flags de cookies; CSP, HSTS y nosniff; CORS y CSRF; SRI para scripts de terceros |
| **V4** API and Web Service | V4.1 Generic Web Service Security · V4.2 HTTP Message Structure Validation · V4.3 GraphQL · V4.4 WebSocket | Content-Type correcto; validación de mensajes; límites de profundidad en GraphQL; auth en WebSocket |
| **V5** File Handling | V5.1 Documentation · V5.2 File Upload and Content · V5.3 File Storage · V5.4 File Download | Tamaño, tipo y contenido; almacenamiento fuera de la raíz pública; descargas con autorización |
| **V6** Authentication | V6.1 Documentation · V6.2 Password Security · V6.3 General Authentication Security · V6.4 Factor Lifecycle and Recovery · V6.5 General MFA · V6.6 Out-of-Band · V6.7 Cryptographic authentication · V6.8 Authentication with an Identity Provider | Política de contraseñas, anti-enumeración, recuperación segura, MFA (staff obligatorio), IdP bien integrado |
| **V7** Session Management | V7.1 Documentation · V7.2 Fundamental Session Management Security · V7.3 Session Timeout · V7.4 Session Termination · V7.5 Defenses Against Session Abuse · V7.6 Federated Re-authentication | Caducidad, revocación al cerrar sesión o banear, reautenticación en acciones sensibles |
| **V8** Authorization | V8.1 Documentation · V8.2 General Authorization Design · V8.3 Operation Level Authorization · V8.4 Other Authorization Considerations | Autorización por objeto y por función en servidor; matriz de roles documentada; tenants aislados |
| **V9** Self-contained Tokens | V9.1 Token source and integrity · V9.2 Token content | Firma verificada, `alg` fijado, `aud`/`iss`/`exp` comprobados; sin datos sensibles en el token |
| **V10** OAuth and OIDC | V10.1 Generic · V10.2 OAuth Client · V10.3 OAuth Resource Server · V10.4 OAuth Authorization Server · V10.5 OIDC Client · V10.6 OpenID Provider · V10.7 Consent Management | PKCE, `state`/`nonce`, redirect URIs exactas, scopes mínimos |
| **V11** Cryptography | V11.1 Inventory and Documentation · V11.2 Secure Implementation · V11.3 Encryption Algorithms · V11.4 Hashing · V11.5 Random Values · V11.6 Public Key Cryptography · V11.7 In-Use Data Cryptography | Algoritmos actuales; aleatoriedad criptográfica para tokens; sin cripto casera |
| **V12** Secure Communication | V12.1 General TLS · V12.2 HTTPS with External Facing Services · V12.3 Service to Service | TLS en todo; certificados válidos; servicio a servicio autenticado |
| **V13** Configuration | V13.1 Documentation · V13.2 Backend Communication Configuration · V13.3 Secret Management · V13.4 Unintended Information Leakage | Secretos en gestor; cuentas de servicio mínimas; sin debug ni stack traces expuestos; ficheros sensibles no servidos |
| **V14** Data Protection | V14.1 Documentation · V14.2 General Data Protection · V14.3 Client-side Data Protection | Clasificación de datos; minimización y retención; nada sensible en caché o almacenamiento del cliente |
| **V15** Secure Coding and Architecture | V15.1 Documentation · V15.2 Security Architecture and Dependencies · V15.3 Defensive Coding · V15.4 Safe Concurrency | Inventario de dependencias y SCA; asignación masiva evitada; condiciones de carrera (TOCTOU, dobles cobros) |
| **V16** Security Logging and Error Handling | V16.1 Documentation · V16.2 General Logging · V16.3 Security Events · V16.4 Log Protection · V16.5 Error Handling | Eventos de seguridad registrados; logs sin secretos ni PII innecesaria; errores genéricos al cliente |
| **V17** WebRTC | V17.1 TURN Server · V17.2 Media · V17.3 Signaling | Solo si hay videollamada propia: TURN con credenciales temporales, señalización autenticada |
