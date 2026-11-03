# Stack notes (desktop, containers)

Detail moved out of `SKILL.md` to keep it short. Sources: Electron security checklist and OWASP Docker Security Cheat Sheet (rules 1-4, 8, 9, 12, 13), checked 2026-11-03. The wording is our own. Sections for other languages, frameworks and cloud platforms are added in v0.5.0.

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
