# Stack notes

Our own review notes: where to look for the checklist controls in each stack. They are not OWASP text and not requirements; check the docs of the framework version in use before quoting one. The Electron and Docker parts come from the Electron security checklist and the OWASP Docker Security Cheat Sheet (rules 1-4, 8, 9, 12, 13), checked 2026-11-03.

## Backend languages and frameworks

For each one: authorization (P0-02, P0-03), input handling (P0-05), session and CSRF (P0-06, P0-13).

| Stack | Authorization and isolation | Injection and input | Sessions, CSRF, config |
|-------|-----------------------------|---------------------|------------------------|
| Go (gin, echo, fiber, chi) | Auth middleware on the router group, not per handler by habit; handlers load the object by id **and** owner | `database/sql` with `$1` placeholders, not `fmt.Sprintf` into a query; `html/template`, not `text/template`, for HTML | Cookie flags set by hand; `http.Server` timeouts set; CORS origins explicit |
| Rust (actix-web, axum) | Extractor or layer for auth on the router; owner check in the query | `sqlx` bound parameters, not `format!` into SQL; `unsafe` blocks justified | Cookie flags; request body size limits |
| Java and Kotlin (Spring Boot) | `SecurityFilterChain` denies by default; `@PreAuthorize` or equivalent on services; object-level check in the query | `JdbcTemplate` and JPA parameters, not string concatenation; Bean Validation on DTOs; DTOs, not entities, for writes (mass assignment) | CSRF protection not disabled for cookie sessions; Actuator endpoints not public |
| PHP (Laravel, Symfony) | Policies or voters on every controller action; route middleware groups | Eloquent/Doctrine bindings, not `DB::raw` with input; Form Requests; `$fillable` or `$guarded` set (mass assignment) | `APP_DEBUG=false` and `.env` out of the web root; CSRF middleware on |
| Python (Django, FastAPI, Flask) | Django: permission classes and `get_queryset` filtered by owner; FastAPI: auth dependency on every router, not only some routes; owner checked in the query | ORM parameters, not f-strings in `raw()` or `text()`; pydantic or serializer allowlists for writes (mass assignment) | `DEBUG=False`, `ALLOWED_HOSTS`, `SECRET_KEY` from the environment; Django CSRF middleware on |
| Ruby (Rails) | `before_action` authentication on controllers; Pundit or CanCan policies; scope records by owner | ActiveRecord placeholders, not interpolation in `where`; strong parameters (`permit`) for writes | `protect_from_forgery`; `force_ssl`; credentials not in the repo |
| .NET (ASP.NET Core) | `[Authorize]` and a fallback policy that requires authentication; resource-based authorization for objects | EF Core or Dapper parameters, not interpolated SQL; model validation; DTOs for writes | Antiforgery for cookie sessions; Developer exception page off in production; HTTPS redirection and HSTS |

## Cloud and hosting

| Platform | What to look at |
|----------|-----------------|
| AWS | IAM policies without `*` actions or resources on sensitive services; S3 Block Public Access on; security groups not open to `0.0.0.0/0` for admin ports; secrets in Secrets Manager or SSM, not in Lambda environment variables in the repo |
| Google Cloud | Service accounts with specific roles, not Owner or Editor; buckets without `allUsers`; Cloud Run and Functions authenticated unless meant to be public |
| Azure | RBAC at the narrowest scope; storage accounts without public blob access; Key Vault for secrets; App Service HTTPS only |
| Vercel, Netlify, Cloudflare | Secrets in the platform's environment settings; `NEXT_PUBLIC_*` and similar are public; preview deployments do not share production data or secrets; security headers set in config |
| Terraform and IaC | No secrets in `.tf`, `.tfvars` or state in the repo; remote state with encryption and access control; no wildcard IAM; public buckets and `0.0.0.0/0` rules flagged |
| Kubernetes | Pods not privileged and not root; `runAsNonRoot`, `readOnlyRootFilesystem`; no secrets in manifests or ConfigMaps; NetworkPolicies; RBAC without `cluster-admin` for apps |

Console settings (MFA, org policies, billing alerts) are UNVERIFIED from code.

## Electron and Tauri (P2-07)

- Electron: `contextIsolation` and `sandbox` on, `nodeIntegration` off, `webSecurity` not disabled, a CSP.
- IPC handlers check `event.senderFrame` and validate their arguments.
- `contextBridge` exposes specific functions, never `ipcRenderer` itself.
- No `shell.openExternal` with external URLs. Navigation and new windows are limited.
- Tauri: capabilities with the minimum permissions.
- Both: signed binary (notarized on macOS); updates over HTTPS and signed.

## Containers (P2-08)

- `USER` other than root.
- Base image pinned by digest or exact version, and kept updated.
- No secrets in `ENV`, `ARG` or `COPY` (use build secrets or runtime secrets).
- `.dockerignore` excludes `.env` and `.git`.
- No Docker socket mounted, no `privileged: true`.
- Capabilities dropped (`cap_drop: [ALL]`), `no-new-privileges`, read-only filesystem where possible.
- Image scanned in CI.
