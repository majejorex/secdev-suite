# OWASP ASVS 5.0: review map

The chapters and sections (exact ID and title) come from the official `OWASP/ASVS` repository, folder `5.0/en`, checked on 2026-11-02. The "What to look at" text is our own, not a copy of OWASP. ASVS 5.0 renumbered everything compared to 4.0: do not use 4.0 IDs.

**Levels** (per `0x03-What-is-the-ASVS.md`):
- L1 is the minimum.
- ASVS says most applications should aim for **L2**.
- L3 is for high-value or high-risk applications.

The organization picks the level by risk. To know which requirements belong to which level, check the official chapter; do not infer it.

| Ch. | Sections | What to look at (own summary) |
|-----|----------|-------------------------------|
| **V1** Encoding and Sanitization | V1.1 Encoding and Sanitization Architecture · V1.2 Injection Prevention · V1.3 Sanitization · V1.4 Memory, String, and Unmanaged Code · V1.5 Safe Deserialization | Parameterized queries, no concatenation into SQL/NoSQL/shell/templates; sanitized HTML; no deserializing untrusted data; SSRF (1.3.6) |
| **V2** Validation and Business Logic | V2.1 Validation and Business Logic Documentation · V2.2 Input Validation · V2.3 Business Logic Security · V2.4 Anti-automation | Server-side schema for every input; business rules (amounts, states, limits) on the server; anti-automation limits |
| **V3** Web Frontend Security | V3.1 Web Frontend Security Documentation · V3.2 Unintended Content Interpretation · V3.3 Cookie Setup · V3.4 Browser Security Mechanism Headers · V3.5 Browser Origin Separation · V3.6 External Resource Integrity · V3.7 Other Browser Security Considerations | Cookie flags; CSP, HSTS and nosniff; CORS and CSRF; SRI for third-party scripts |
| **V4** API and Web Service | V4.1 Generic Web Service Security · V4.2 HTTP Message Structure Validation · V4.3 GraphQL · V4.4 WebSocket | Correct Content-Type; message validation; depth limits in GraphQL; auth on WebSocket |
| **V5** File Handling | V5.1 File Handling Documentation · V5.2 File Upload and Content · V5.3 File Storage · V5.4 File Download | Size, type and content; storage outside the public root; downloads with authorization |
| **V6** Authentication | V6.1 Authentication Documentation · V6.2 Password Security · V6.3 General Authentication Security · V6.4 Authentication Factor Lifecycle and Recovery · V6.5 General Multi-factor authentication requirements · V6.6 Out-of-Band authentication mechanisms · V6.7 Cryptographic authentication mechanism · V6.8 Authentication with an Identity Provider | Password policy, anti-enumeration, brute force (6.3.1), secure recovery, MFA, IdP integrated correctly |
| **V7** Session Management | V7.1 Session Management Documentation · V7.2 Fundamental Session Management Security · V7.3 Session Timeout · V7.4 Session Termination · V7.5 Defenses Against Session Abuse · V7.6 Federated Re-authentication | Expiry, revocation on logout or ban, re-authentication for sensitive actions |
| **V8** Authorization | V8.1 Authorization Documentation · V8.2 General Authorization Design · V8.3 Operation Level Authorization · V8.4 Other Authorization Considerations | Per-object and per-function authorization on the server; documented role matrix; isolated tenants |
| **V9** Self-contained Tokens | V9.1 Token source and integrity · V9.2 Token content | Signature verified, `alg` pinned, `aud`/`iss`/`exp` checked; no sensitive data in the token |
| **V10** OAuth and OIDC | V10.1 Generic OAuth and OIDC Security · V10.2 OAuth Client · V10.3 OAuth Resource Server · V10.4 OAuth Authorization Server · V10.5 OIDC Client · V10.6 OpenID Provider · V10.7 Consent Management | PKCE, `state`/`nonce`, exact redirect URIs, minimal scopes |
| **V11** Cryptography | V11.1 Cryptographic Inventory and Documentation · V11.2 Secure Cryptography Implementation · V11.3 Encryption Algorithms · V11.4 Hashing and Hash-based Functions · V11.5 Random Values · V11.6 Public Key Cryptography · V11.7 In-Use Data Cryptography | Current algorithms; cryptographic randomness for tokens; no home-made crypto |
| **V12** Secure Communication | V12.1 General TLS Security Guidance · V12.2 HTTPS Communication with External Facing Services · V12.3 General Service to Service Communication Security | TLS everywhere; valid certificates; authenticated service-to-service calls |
| **V13** Configuration | V13.1 Configuration Documentation · V13.2 Backend Communication Configuration · V13.3 Secret Management · V13.4 Unintended Information Leakage | Secrets in a secret manager; least-privilege service accounts (13.2.2); no debug or stack traces exposed; sensitive files not served |
| **V14** Data Protection | V14.1 Data Protection Documentation · V14.2 General Data Protection · V14.3 Client-side Data Protection | Data classification; minimization and retention; nothing sensitive in client storage except session tokens (14.3.3) |
| **V15** Secure Coding and Architecture | V15.1 Secure Coding and Architecture Documentation · V15.2 Security Architecture and Dependencies · V15.3 Defensive Coding · V15.4 Safe Concurrency | Dependencies and remediation deadlines, no test functions in production (15.2.3); mass assignment avoided; race conditions (TOCTOU, double charges) |
| **V16** Security Logging and Error Handling | V16.1 Security Logging Documentation · V16.2 General Logging · V16.3 Security Events · V16.4 Log Protection · V16.5 Error Handling | Security events logged; logs without secrets or needless PII; generic errors to the client. Alerting and correlation are outside the scope of ASVS |
| **V17** WebRTC | V17.1 TURN Server · V17.2 Media · V17.3 Signaling | Only if you run your own video calls: TURN with temporary credentials, authenticated signaling |

**Not in ASVS** (the checklist marks them "Outside ASVS"): backups and restore, incident response, repository protection, deployment pipelines, DAST and pentest, and MFA on cloud consoles.
