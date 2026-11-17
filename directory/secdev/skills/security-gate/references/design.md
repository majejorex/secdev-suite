# security-gate: why the template is shaped this way

Each choice maps to checklist control P1-10 (hardened CI/CD pipeline). Versions, SHAs and checksums were checked on 2026-11-03.

- It runs on `pull_request`, never `pull_request_target`: code from a fork never gets secrets or a write token.
- `permissions: contents: read` for every job.
- Every action is pinned to a commit SHA and the image to a digest.
- The only action is `actions/checkout`, which GitHub owns. The gate works under the strictest repo policy ("allow only GitHub-owned actions" plus "require SHA pinning") and adds no third-party action to the supply chain.
- `persist-credentials: false` keeps the token out of `.git/config`.
- gitleaks and osv-scanner are release binaries checked against their SHA-256. This also avoids the gitleaks action, which needs a license for organizations.
- osv-scanner runs with `--allow-no-lockfiles`: without it, a lockfile with no packages exits with code 128.
- Semgrep uses `p/default` with `--metrics=off`: `--config auto` cannot run with metrics off.
