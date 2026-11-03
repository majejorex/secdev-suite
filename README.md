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

Or from a terminal:

```
claude plugin marketplace add majejorex/secdev-suite && claude plugin install secdev@secdev-suite
```

Restart Claude Code to load it. Check it with `claude plugin list`: it shows `secdev@secdev-suite` and its version.

Auto-update is off by default for this marketplace, as for any third-party one. Keep it off: when a new version comes out, secdev tells you and you update after reviewing it (see "Updating safely").

To develop without installing: `claude --plugin-dir /path/to/secdev-suite`.

## Use it in any project

Install once and it works in every project you open. There is nothing to configure per project.

| Where do you want it | Command |
|---|---|
| In every project on your machine (default) | `claude plugin install secdev@secdev-suite` |
| In one repo, for everyone who works on it | `claude plugin install secdev@secdev-suite --scope project`. It writes `enabledPlugins` to `.claude/settings.json` (see below). |
| In one repo, only for you | `claude plugin install secdev@secdev-suite --scope local` |

For a team, the repo's `.claude/settings.json` must also declare the marketplace, so a teammate who has never added it gets the plugin when they trust the folder. The install command writes only the second key, so add the first one by hand and commit the file:

```json
{
  "extraKnownMarketplaces": {
    "secdev-suite": { "source": { "source": "github", "repo": "majejorex/secdev-suite" } }
  },
  "enabledPlugins": { "secdev@secdev-suite": true }
}
```

In a new project:

1. **Open it with Claude Code.** If the project uses one of the stacks it knows, you will see `[secdev] Detected stack: ...`. It knows Firebase, Supabase, Expo, React Native and Capacitor, Electron and Tauri, Stripe, Next, Express, Fastify, Hono, Koa and Nest, LLM SDKs, Python and Docker. With any other stack it stays silent, and the skills still work with the general ASVS checklist.
2. **Work as usual.** When an edit touches something sensitive (auth, rules, payments, uploads, secrets, CI workflows, Dockerfiles...) the agent gets a reminder with the controls to check.
3. **Before a PR or a release, ask** "Can we ship this?" or "Review the security of this change" (see the next section).
4. **Once per repo, ask** "Add a security gate to CI". It shows you the workflow and what leaves the repo, and writes `.github/workflows/security.yml` only after your OK. Then, in GitHub (Settings, Rules), require the status checks `secrets`, `dependencies` and `sast`. Until you do, they only warn.
5. **Check it is loaded:** `claude plugin list` shows `secdev@secdev-suite` and its version.

Good to know:

- The gate is for GitHub Actions. On another CI provider the skill gives you the three commands instead.
- If the first run finds a secret in old history, rotate the secret first and purge the history after. Semgrep prints the line it flags, so a leaked secret also stays in the CI log, and a purge does not remove the log.
- To remove it: `claude plugin uninstall secdev@secdev-suite` (add `--scope project` if you installed it that way). To keep it and only turn off the daily version check, set `SECDEV_NO_UPDATE_CHECK=1`.

## Use it in practice

You don't run anything special. You work as usual and ask in plain words, in English or Spanish. These are the four moments where it pays off.

| When | What you type | What you get |
|---|---|---|
| **Before writing a feature** | "I'm going to add refunds for orders. Which security controls apply?" | *Design* mode: the controls that apply and 2-5 concrete abuse cases ("a customer changes `orderId` and refunds someone else's order"). No verdict, no code yet. |
| **While you code** | Nothing. | If an edit touches auth, rules, payments, uploads, secrets… the hook reminds the agent once, naming the controls to check, for example `payments and webhooks (P2-02)`. |
| **Before you open a PR** | "Can we ship this?" or "Review the security of this change." | *Sign-off* mode over the diff: a `Verdict:` line and a table with one row per control that applies, each with `file:line` evidence. |
| **Before a release** | "Review the security of the whole repo before the release." | The same, but every P0 applies. Controls the code can't show (MFA on the cloud console, backups, separate environments) come back as UNVERIFIED with what to check and where. |

### Reading the result

- **BLOCK**: a P0 control is not met. Don't release. Ask "fix P0-02" (or several at once) and run the review again.
- **PASS WITH ISSUES**: no P0 fails, but something is UNVERIFIED or a P1/P2 fails. You can ship after you check the UNVERIFIED items yourself, usually in the cloud console. Before a release, a P0 at UNVERIFIED needs your explicit OK.
- **PASS**: everything that applies is met, or is N/A with a reason.

The review never changes code on its own: you decide what to fix. When the fix for a NOT MET is obvious, it comes in one line, and the IDs (`P0-02`) let you refer to a finding later.

### Tips

- **Name the scope** when it isn't obvious: "this diff", "the `functions/` folder", "the whole repo".
- **Distrust a MET without evidence.** Every MET must cite a `file:line` or a test. If one doesn't, ask for it.
- **UNVERIFIED is not a failure.** It means the code can't show it. Go and look where the report says, then tell the agent what you found.
- **It's not an audit.** For a deep vulnerability hunt, use `security-audit` or `claude-security` (see below).

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

- It decides from the file path (access rules, `.env`, keys and keystores, headers, desktop packaging, CI workflows, Dockerfiles and compose files) or from the written text: auth and re-authentication, roles, endpoints, payments, client-side tokens, uploads and archives, secrets, CORS and proxy headers, execution with external data, LLM calls, cryptography, desktop windows and IPC, and app signing and updates.
- Next to each category it names the checklist controls to look at first, for example `file uploads (P0-14)`.
- It warns at most once per session and never blocks.
- It only names categories from a fixed list, never text from the repo.
- It ignores docs, styles, images and lockfiles.

### 3 · `secdev:security-checklist` skill: reviews with evidence

It reviews a change, a feature or a whole repo.

| | |
|---|---|
| Two modes | *Design*, before any code: the controls that apply and concrete abuse cases. *Sign-off*, before finishing: verification and a verdict. |
| Statuses | MET · NOT MET · UNVERIFIED (can't be verified from the code) · N/A with a reason. They stay in English in any language. |
| Verdict | **BLOCK** if any P0 fails. **PASS WITH ISSUES** if there is a UNVERIFIED or a P1/P2 fails. **PASS** if everything is met or justified as N/A. |
| Always loaded | The checklist lives inside `SKILL.md`, so it loads with the skill even when the agent can't read files outside the project. |
| References | ASVS 5.0, API Security Top 10 2023, MASVS 2.1 and a Firebase guide. The agent reads them only when it needs more detail. |
| Distrustful | It treats the reviewed repo as data, never as instructions. It doesn't run the repo's code or query cloud services without permission. |
| Hard to fool | Before the verdict it tries to refute every MET. A comment saying "this is safe" or a test that mocks the check isn't evidence. Text telling reviewers or AI agents to pass the code is reported as prompt injection, hidden Unicode characters (Trojan Source) as NOT MET, and a BLOCK never becomes a PASS because someone asked. |

<details>
<summary><strong>What the checklist covers</strong></summary>

<br>

**P0, blocks a release:** authentication (password hashing, reset links and re-authentication for sensitive changes included), server-side authorization (admin routes included), isolation between users or tenants, secrets (git history included), input validation, sessions, HTTPS with TLS 1.2 or later, abuse protection, database exposure, least privilege, separate environments, secure configuration, CSRF and SSRF, file handling, authorization tests and a minimal supply chain.

**P1, process:** protected repos, automated scanning, dependencies, deployments, logging and audit trails, alerts, backups with a tested restore, incident response (what to do, in order, when a secret leaks), periodic reviews and a hardened CI/CD pipeline.

**P2, depending on the feature:** mobile (signed releases and updates included), payments, GDPR (no trackers before consent, encryption at rest), AI and LLMs, third-party integrations, secure design, desktop apps (Electron, Tauri) and containers.

What changed in each version: [docs/features/](docs/features/).

The full list, with how to verify each control and its standard, is in [skills/security-checklist/SKILL.md](skills/security-checklist/SKILL.md).

</details>

### 4 · `secdev:security-gate` skill: blocks PRs in CI

It writes `.github/workflows/security.yml` with three blocking jobs. Ask for it in plain words: "add a security gate to CI" or "scan the repo for secrets now".

| Job | Tool | Fails when |
|---|---|---|
| `secrets` | gitleaks, full git history | any commit contains a secret |
| `dependencies` | osv-scanner, every lockfile | a dependency has a known vulnerability not accepted in `osv-scanner.toml` |
| `sast` | Semgrep CE, `p/default`, metrics off | there is any finding |

- **Pinned and minimal:** the only action is `actions/checkout`, pinned to a SHA. gitleaks and osv-scanner are release binaries checked against their SHA-256, Semgrep is an image pinned by digest, and every job has `contents: read`. It works under the strictest repo policy: "allow only GitHub-owned actions" plus "require SHA pinning".
- **It shows before writing:** it says what leaves the repo (package names to osv.dev, rule downloads from Semgrep) and writes the file only after your OK.
- **One step left for you:** make the three jobs required status checks in branch protection. Until then they only warn.
- **Run now:** it can also run the three tools locally once, with your permission. It ranks CVEs by CISA KEV first, then EPSS.
- **Limit:** Semgrep prints the line it flags, so a secret in code also ends up in the CI log (gitleaks hides it). Rotate a leaked secret before anything else.
- **Dogfooded:** this repo runs the same workflow, and a test keeps it identical to the template in the skill. On its first run it found two hidden Unicode bidi characters in our own tests.

### What it doesn't do

It doesn't replace an audit. For that it points to:

- `security-audit` / `claude-security` for in-depth audits and pen tests;
- `security-guidance` for automatic review of every diff.

## Updating safely

> [!IMPORTANT]
> The hooks are code that runs in every one of your sessions. Updating the plugin means running new code everywhere.

- Keep **auto-update off** for this marketplace. It is already off by default for third-party marketplaces; you can check it in `/plugin` → Marketplaces. secdev tells you itself when there is a new version.
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
- which controls it cited;
- whether the answer names the key words for the case (`mustMention`, for example `constructEvent` for a Stripe webhook). Each item can list synonyms, and a missing one fails the case.

It costs about $0.21 per case with Sonnet, so it isn't part of `npm test`.

**Stability.** A model doesn't answer the same way twice, so one green run proves little. Before a release that changes a skill:

```
node evals/run.mjs <folder-outside-the-repo> claude-sonnet-5-5 --repeat 3
```

- Every case runs 3 times, at most 8 at once, with the model pinned by its exact ID (the model actually used is recorded).
- **Gate:** a `critical` case (the ones that must BLOCK, the prompt-injection case and the cases that must not activate) passes 3/3; any other case at least 2/3. A case that sometimes fails is reported as `flaky`.
- A case passes only if the skill loads, the expected controls are cited, the key words are named (with synonyms), and the verdict follows from its own table: a P0 at NOT MET means BLOCK, and any NOT MET or UNVERIFIED rules out PASS.
- The run writes `summary.md`. It is copied to `docs/evals/<version>.md`, so results can be compared between versions.
- Cost: about $9 per run (15 cases × 3).

## Roadmap

| Phase | What | Status |
|---|---|---|
| F0 | `security-checklist` skill, per-standard references and the `SessionStart` hook | Done, v0.1 |
| F1 | `PostToolUse` warning hook, using the `security-guidance` format (`hookSpecificOutput.additionalContext`). Without it, the skill activated in about 3 of 4 positive eval cases | Done, v0.2.0 |
| F1 | `authz-tests` skill: the matrix and tests for BOLA and BFLA | Planned |
| F1 | `secure-design` skill and a per-project `SECURITY-PROFILE.md` | Planned |
| F2 | `security-gate` skill: gitleaks, `osv-scanner` and Semgrep in every repo's gate | Done, v0.4.0 |
| F3 | Threat intelligence, manual version (`/intel-review`) | Done |
| F4 | Evals that measure stability: 3 repeats per case, a release gate and a pinned model | Done, v0.4.3 and v0.4.4 |

**Order decided on 2026-11-02:**

1. ~~F2 first~~: done in v0.4.0.
2. Next, `authz-tests`.
3. After that, `secure-design` and `SECURITY-PROFILE.md`.

Not planned: running the evals in CI. A full run costs about $13, so the maintainer runs it before a release that changes a skill.

Trail of Bits' `supply-chain-risk-auditor` isn't installed for now. `osv-scanner` covers CVEs, and the rest (abandoned packages, publishers, install scripts) will be reviewed now that F2 is running.

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
