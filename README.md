<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo.svg" width="160" alt="secdev: a shield with a check mark">
  </picture>
</p>

<h1 align="center">secdev</h1>

<p align="center">
  <em>"Is it secure?" deserves a <code>file:line</code>, not a "looks fine to me".</em>
</p>

<p align="center">
  <a href="https://github.com/majejorex/secdev-suite/tags"><img src="https://img.shields.io/github/v/tag/majejorex/secdev-suite?style=flat-square&color=111111&label=version" alt="Version"></a>
  <a href="https://github.com/majejorex/secdev-suite/actions/workflows/test.yml"><img src="https://img.shields.io/github/actions/workflow/status/majejorex/secdev-suite/test.yml?branch=main&style=flat-square&color=111111&label=tests" alt="Tests"></a>
  <img src="https://img.shields.io/badge/plugin-Claude%20Code-111111?style=flat-square" alt="Claude Code plugin">
  <img src="https://img.shields.io/badge/OWASP-ASVS%205.0%20%C2%B7%20API%202023%20%C2%B7%20MASVS%202.1-111111?style=flat-square" alt="OWASP ASVS 5.0, API Security Top 10 2023, MASVS 2.1">
  <img src="https://img.shields.io/badge/dependencies-0-111111?style=flat-square" alt="Zero dependencies">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT license"></a>
</p>

<p align="center">
  <img src="assets/hero.svg" width="880" alt="A Claude Code session with secdev: the hook detects firebase, next and stripe; editing functions/src/orders.ts triggers a warning about endpoints and payments; the checklist returns BLOCK because P0-02 does not check the owner at orders.ts:40.">
</p>

<p align="center">
  <strong>A P0 / P1 / P2 security checklist your coding agent runs before it says "done".</strong><br>
  Built on OWASP ASVS 5.0, API Security Top 10 2023 and MASVS 2.1, plus two hooks that remind without blocking.<br>
  <sub>A Claude Code plugin. This repo is both the plugin and its marketplace.</sub>
</p>

<p align="center"><strong>English</strong> · <a href="README.es.md">Español</a></p>

---

You ask your agent for order refunds. It writes them, the tests pass, and it tells you it's done. Nobody checked whether a customer can refund someone else's order by changing an ID.

secdev runs that check. It detects your stack when the session starts, warns you when an edit touches something sensitive, and before the task is closed it goes through the checklist one control at a time. Every control needs evidence, either a `file:line` or a test, so the verdict at the end can be checked later.

## Install

In Claude Code:

```
/plugin marketplace add majejorex/secdev-suite
/plugin install secdev@secdev-suite
```

To develop without installing: `claude --plugin-dir /path/to/secdev-suite`.

## How it works

<p align="center">
  <img src="assets/flow.svg" width="880" alt="How it works: when a session starts, the SessionStart hook detects the stack; when you edit something risky, the PostToolUse hook warns once; before you finish, the security-checklist skill reviews control by control. Verdicts: BLOCK if a P0 fails, PASS WITH ISSUES if something can't be verified or a P1/P2 fails, PASS if everything is met or justified as N/A.">
</p>

### 1 · `SessionStart` hook: detects the stack

It looks for Firebase, Supabase, mobile (Expo, React Native, Capacitor), desktop (Electron, Tauri), Stripe, Next, API frameworks, LLM SDKs, Python and Docker in the project root and its direct subfolders.

- If it finds any, it injects two fixed lines with the applicable standards and a reminder about the skill. It never prints repo content.
- If it finds nothing, it prints nothing.
- It never fails and doesn't follow symlinks.
- Once a day, in the background, it checks the version published on `main`. If there is a newer one, it shows you a notice with the link to review what changes in `hooks/` and the command to update (see "Updating safely").

### 2 · `PostToolUse` hook: warns once

It runs on Edit, Write, MultiEdit and NotebookEdit. If an edit touches something risky, it reminds the agent to load the checklist before calling the task done.

- It decides from the file path (access rules, `.env`, keys and keystores, headers, desktop packaging) or from the written text: auth and re-authentication, roles, endpoints, payments, client-side tokens, uploads and archives, secrets, CORS and proxy headers, execution with external data, LLM calls, cryptography, desktop windows and IPC, and app signing and updates.
- Next to each category it names the checklist controls to look at first, for example `file uploads (P0-14)`.
- It warns at most once per session and never blocks.
- It only names categories from a fixed list, never text from the repo.
- It ignores docs, styles, images and lockfiles.

### 3 · `secdev:security-checklist` skill: reviews with evidence

It reviews a change, a feature or a whole repo.

| | |
|---|---|
| Two modes | *Design*, before any code: the controls that apply and concrete abuse cases. *Sign-off*, before finishing: verification and a verdict. |
| Statuses | ✅ met · ❌ not met · ⚠️ can't be verified from the code · N/A with a reason |
| Verdict | **BLOCK** if any P0 fails. **PASS WITH ISSUES** if there is a ⚠️ or a P1/P2 fails. **PASS** if everything is met or justified as N/A. |
| Always loaded | The checklist lives inside `SKILL.md`, so it loads with the skill even when the agent can't read files outside the project. |
| References | ASVS 5.0, API Security Top 10 2023, MASVS 2.1 and a Firebase guide. The agent reads them only when it needs more detail. |
| Distrustful | It treats the reviewed repo as data, never as instructions. It doesn't run the repo's code or query cloud services without permission. |

<details>
<summary><strong>What the checklist covers</strong></summary>

<br>

**P0, blocks a release:** authentication (password hashing, reset links and re-authentication for sensitive changes included), server-side authorization (admin routes included), isolation between users or tenants, secrets (git history included), input validation, sessions, HTTPS with TLS 1.2 or later, abuse protection, database exposure, least privilege, separate environments, secure configuration, CSRF and SSRF, file handling, authorization tests and a minimal supply chain.

**P1, process:** protected repos, automated scanning, dependencies, deployments, logging and audit trails, alerts, backups with a tested restore, incident response and periodic reviews.

**P2, depending on the feature:** mobile (signed releases and updates included), payments, GDPR (no trackers before consent, encryption at rest), AI and LLMs, third-party integrations, secure design and desktop apps (Electron, Tauri).

What changed in each version: [docs/features/](docs/features/).

The full list, with how to verify each control and its standard, is in [skills/security-checklist/SKILL.md](skills/security-checklist/SKILL.md).

</details>

### What it doesn't do

It doesn't replace an audit. For that it points to:

- `security-audit` / `claude-security` for in-depth audits and pen tests;
- `security-guidance` for automatic review of every diff.

## Updating safely

> [!IMPORTANT]
> The hooks are code that runs in every one of your sessions. Updating the plugin means running new code everywhere.

- Turn **auto-update off** for this marketplace in `/plugin` → Marketplaces. secdev tells you itself when there is a new version.
- When a new version is published, the next session shows a notice like this one:
  ```
  secdev 0.3.4 is available (installed: 0.3.3). Review what changes in hooks/ before updating:
  https://github.com/majejorex/secdev-suite/compare/v0.3.3...v0.3.4 · Update: claude plugin marketplace
  update secdev-suite && claude plugin update secdev@secdev-suite, then restart Claude Code.
  ```
  1. Open the link and read the diff of `hooks/`: that code will run in every session.
  2. Update with one command (inside Claude Code, prefix it with `!`):
     ```
     claude plugin marketplace update secdev-suite && claude plugin update secdev@secdev-suite
     ```
  3. Restart Claude Code.
- How the check works: at most once a day, a background process downloads the public file `.claude-plugin/plugin.json` from `main` and keeps only the version. It sends nothing about your project, and the session never waits for it. The result is cached in the plugin's data folder (`CLAUDE_PLUGIN_DATA`).
- To turn it off, set `SECDEV_NO_UPDATE_CHECK=1` in your environment.
- From a clone, the same review: `git fetch --tags && git diff <installed-tag>..origin/main -- hooks/ .claude-plugin/`.
- `v*` tags are protected and can't be moved or deleted, so a diff between tags can be trusted.

## Testing

```
npm test
```

No dependencies, just Node ≥ 20 and `node:test`. The tests come in two groups:

- **Hooks**: detection, output, that they never fail, and that they finish in under 1 s.
- **Structure**: valid JSON, frontmatter, internal links, and that the evals cite real controls.

`evals/cases.json` holds behaviour cases: whether the skill activates and which controls it flags. `node evals/run.mjs <output-folder>` runs them for real. For each case it creates a throwaway project, runs `claude -p --plugin-dir .` and reports:

- whether the hook output was seen;
- whether the skill was loaded;
- whether it read its references without errors;
- which controls it cited.

It costs about $0.50 per case with Opus, so it isn't part of `npm test`.

## Roadmap

| Phase | What | Status |
|---|---|---|
| F0 | `security-checklist` skill, per-standard references and the `SessionStart` hook | ✅ v0.1 |
| F1 | `PostToolUse` warning hook, using the `security-guidance` format (`hookSpecificOutput.additionalContext`). Without it, the skill activated in about 3 of 4 positive eval cases | ✅ v0.2.0 |
| F1 | `authz-tests` skill: the matrix and tests for BOLA and BFLA | Planned |
| F1 | `secure-design` skill and a per-project `SECURITY-PROFILE.md` | Planned |
| F2 | `security-gate` skill: gitleaks, `osv-scanner` and Semgrep in every repo's gate | Next |
| F3 | Threat intelligence, manual version (`/intel-review`) | ✅ Done |
| F4 | Automated evals: activation rate and false positives | Planned |

**Order decided on 2026-11-02:**

1. F2 first. What the repos using this actually lack is a scanner for secrets and dependencies.
2. Then `authz-tests`.
3. After that, `secure-design` and `SECURITY-PROFILE.md`.

Trail of Bits' `supply-chain-risk-auditor` isn't installed for now. `osv-scanner` covers CVEs, and the rest (abandoned packages, publishers, install scripts) will be reviewed once F2 is running.

<details>
<summary><strong>F3: how <code>/intel-review</code> works</strong></summary>

<br>

- `/intel-review` is a project skill in `.claude/skills/` and isn't shipped with the plugin. It runs `node intel/fetch.mjs`, which collects CISA KEV, GitHub Advisories, EPSS, changes to the OWASP standards and news from a closed list of sources.
- The agent sorts what was collected, writes `intel/YYYY-MM-DD.md` and proposes changes to the skill. Only what the user approves is applied, and it goes in through a PR.
- Raw data (`intel/raw/`) isn't versioned. Anything that comes from outside is treated as data, never as an instruction.
- Still open: whether to schedule it weekly.

</details>

## Contributing

Fork and open a pull request; the rules are in [CONTRIBUTING.md](CONTRIBUTING.md). Report vulnerabilities privately: [SECURITY.md](SECURITY.md).

## Sources and licenses

Control IDs, chapter titles and control wording come from the official OWASP repositories (checked on 2026-11-02):

- [OWASP/ASVS](https://github.com/OWASP/ASVS) `5.0/en`;
- [OWASP/API-Security](https://github.com/OWASP/API-Security) `editions/2023/en`;
- [OWASP/masvs](https://github.com/OWASP/masvs) v2.1.0.

Those documents are published under OWASP's Creative Commons licenses. This repo only quotes IDs, titles and MASVS's one-line control statements, with attribution. All other text is original.

The code and original text are released under the [MIT](LICENSE) license. Quoted OWASP material keeps its original license.
