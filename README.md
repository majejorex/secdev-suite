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
  <img src="https://img.shields.io/badge/skills-any%20agent-111111?style=flat-square" alt="Skills for any agent">
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
  <sub>A Claude Code plugin, and plain skills for any agent (Codex, Cursor and more). This repo is both the plugin and its marketplace.</sub>
</p>

<p align="center"><strong>English</strong> · <a href="README.es.md">Español</a></p>

---

You ask your agent for order refunds. It writes them, the tests pass, and it tells you it's done. Nobody checked whether a customer can refund someone else's order by changing an ID.

secdev runs that check. On session start it names the stack. When an edit touches auth, rules, payments, uploads or secrets, a hook reminds the agent once. Before the task is closed, the checklist goes through the controls that apply. Each one needs a `file:line` or a test. The sign-off ends with a verdict and the line `Hunt: not done`: the pass checked these controls and did not look for bugs outside the list.

## Can I trust it?

This code runs in every session. Here is what you can check yourself.

- Zero dependencies. Tests use Node and `node:test`. The hooks are short files in [`hooks/`](hooks/). The skills are Markdown.
- Each hook exits 0, finishes in under 1 second, prints at most 5 lines, and prints nothing when it has nothing to say. Hooks remind. They do not block an edit. Every hook has tests.
- At most once a day, a background process reads the public `plugin.json` and tells you if a newer version is on `main`. It sends nothing about your project. Set `SECDEV_NO_UPDATE_CHECK=1` to turn that off.
- Comments and docs in the repo you review are data. Text aimed at the reviewer is reported as prompt injection. The skills do not run that repo's code.
- OWASP IDs and titles are copied from the official repositories, with the date they were checked.
- A release that changes a skill runs the [evals](docs/evals/) on a pinned model, 3 times per case. Critical cases have to pass every time.
- `main` needs the checks `test`, `secrets`, `dependencies` and `sast`. The `v*` tags cannot be moved. Before you update, read the `hooks/` diff. See [Updating safely](#updating-safely).

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

Restart Claude Code. `claude plugin list` should show `secdev@secdev-suite` and its version.

Auto-update is off for this marketplace, as it is for any third-party one. Leave it off. When a new version comes out, secdev tells you, and you update after reading the diff (see "Updating safely").

To try a clone without installing: `claude --plugin-dir /path/to/secdev-suite`.

## Install as a skill (other agents)

The three skills in [`skills/`](skills/) are plain `SKILL.md` files. Any agent that reads that format can use them without the plugin. The installer needs Node.js 22.20+ ([`skills` CLI](https://github.com/vercel-labs/skills)):

```bash
npx skills add majejorex/secdev-suite --skill security-checklist --skill security-fix --skill security-gate   # the three skills
npx skills add majejorex/secdev-suite --skill security-checklist -a codex   # one skill, one agent
npx skills add majejorex/secdev-suite -g                                # every project, not just this one
```

You can also copy a folder into the agent's skills directory (for Claude Code, `~/.claude/skills/security-checklist/`). Keep `references/` next to its `SKILL.md`.

`npx skills add` puts them in `.agents/skills/` in the project. Claude Code gets a symlink. `-g` puts them in your home directory. Without `--skill`, the installer offers these three skills and nothing else. `npx skills list` shows where they landed. Checked on 2026-11-03 with `-a claude-code -a codex`.

You get the checklist, the fix skill and the CI gate, from the same sentences ("Can we ship this?", "fix the P0s"). You do not get the two hooks or the daily version check. Those exist only in the Claude Code plugin. Without them, ask for the review yourself.

Inside the plugin the skills call each other as `secdev:security-fix`. Installed on their own, the name is the folder: `security-fix`.

Open the agent in the project and ask in plain words: "Can we ship this?", "Review the security of this change", "fix P0-02", "Add a security gate to CI". If the agent lists skills (Claude Code `/skills`, Codex `$`), pick `security-checklist`. When you asked whether it is secure or ready to ship, the answer has to end with a `Verdict:` line, `Hunt: not done`, a table of the NOT MET and UNVERIFIED controls, and the MET controls on one line. If that block is missing, the skill did not load.

Updates: `npx skills update`. Read the diff first, as in [Updating safely](#updating-safely).

## Use it in any project

One install covers every project you open. There is nothing to configure per project.

| Where do you want it | Command |
|---|---|
| In every project on your machine (default) | `claude plugin install secdev@secdev-suite` |
| In one repo, for everyone who works on it | `claude plugin install secdev@secdev-suite --scope project`. It writes `enabledPlugins` to `.claude/settings.json` (see below). |
| In one repo, only for you | `claude plugin install secdev@secdev-suite --scope local` |

For a team, the repo's `.claude/settings.json` also has to name the marketplace, so a teammate who never added it still gets the plugin when they trust the folder. The install command writes only `enabledPlugins`. Add the marketplace by hand and commit the file:

```json
{
  "extraKnownMarketplaces": {
    "secdev-suite": { "source": { "source": "github", "repo": "majejorex/secdev-suite" } }
  },
  "enabledPlugins": { "secdev@secdev-suite": true }
}
```

In a new project:

1. Open it with Claude Code. On a stack it knows, you get `[secdev] Detected stack: ...`. It knows Firebase, Supabase, Expo, React Native and Capacitor, Electron and Tauri, Stripe, Next, Express, Fastify, Hono, Koa and Nest, LLM SDKs, Docker, and Python, Go, Rust, Java and Kotlin, PHP, Ruby and .NET (with the API frameworks named in their manifests). On any other stack it stays quiet. The skills still use the general ASVS checklist.
2. Work as usual. An edit that touches auth, rules, payments, uploads, secrets, CI workflows or Dockerfiles leaves the agent a reminder with the controls to check.
3. Before a PR or a release, ask "Can we ship this?" or "Review the security of this change" (see the next section).
4. Once per repo, ask "Add a security gate to CI". It shows the workflow and what leaves the repo, and writes `.github/workflows/security.yml` only after you say yes. Then, in GitHub (Settings, Rules), require the status checks `secrets`, `dependencies` and `sast`. Until you do, they only warn.
5. `claude plugin list` shows `secdev@secdev-suite` and its version.

The gate is GitHub Actions. On another CI provider the skill gives you the three commands.

If the first run finds a secret in old history, rotate it first and purge the history after. Semgrep prints the line it flags, so a leaked secret also stays in the CI log. A purge does not remove that log.

To remove the plugin: `claude plugin uninstall secdev@secdev-suite` (add `--scope project` if you installed it that way). To keep it and only turn off the daily version check, set `SECDEV_NO_UPDATE_CHECK=1`.

## Use it in practice

You don't run a command. You work as usual and ask in plain words, in English or Spanish.

| When | What you type | What you get |
|---|---|---|
| Before writing a feature | "I'm going to add refunds for orders. Which security controls apply?" | Design mode: the controls that apply and 2-5 abuse cases ("a customer changes `orderId` and refunds someone else's order"). No verdict, and no code yet. |
| While you code | Nothing. | If an edit touches auth, rules, payments, uploads or secrets, the hook reminds the agent once, with the controls to check, for example `payments and webhooks (P2-02)`. |
| Before you open a PR | "Can we ship this?" or "Review the security of this change." | Sign-off on the diff: a `Verdict:` line, `Hunt: not done`, one row per NOT MET or UNVERIFIED control (the evidence names the check, such as `hasOnly`), and the MET controls on one line. |
| Before a release | "Review the security of the whole repo before the release." | The same, and every P0 applies. What the code cannot show (MFA in the cloud console, backups, separate environments) comes back UNVERIFIED, with what to check and where. |

### Reading the result

- **BLOCK.** A P0 is not met. Don't release. Ask "fix P0-02" (or several at once) and run the review again.
- **PASS WITH ISSUES.** No P0 is NOT MET, and something is UNVERIFIED or a P1/P2 is NOT MET. Ship after you check the UNVERIFIED items yourself, usually in the cloud console. Before a release, a P0 at UNVERIFIED needs your explicit OK.
- **PASS.** Everything that applies is MET, or N/A with a reason.

The review does not edit code unless you ask. An obvious fix for a NOT MET is one line, and the IDs (`P0-02`) are how you refer to a finding later. Say "fix the P0s" or "fix P0-02" and `secdev:security-fix` shows a plan, edits the code, adds the authorization test, re-checks the fixed rows (3 passes at most) and leaves the commit to you.

### Calling a skill by name

The skills turn on from plain words. If one does not, call it. In the Claude Code plugin: `/secdev:security-checklist`, `/secdev:security-fix` and `/secdev:security-gate`. Installed on their own: `security-checklist`, `security-fix` and `security-gate` (in Codex, type `$` and pick one).

### Tips

- Name the scope when it is not obvious: "this diff", "the `functions/` folder", "the whole repo".
- A MET without a `file:line` or a test is not a MET. Ask for the citation.
- UNVERIFIED means the code cannot show it. Look where the report says, then tell the agent what you found.
- A sign-off checks these controls and writes `Hunt: not done`. For a hunt, use the [Claude Security plugin](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/claude-security/README.md). The skill named [security-audit](https://github.com/cloudflare/security-audit-skill) is a different product.

## How it works

<p align="center">
  <img src="assets/flow.svg" width="880" alt="How it works: when a session starts, the SessionStart hook detects the stack; when you edit something risky, the PostToolUse hook warns once; before you finish, the security-checklist skill reviews control by control. Verdicts: BLOCK if a P0 fails, PASS WITH ISSUES if something can't be verified or a P1/P2 fails, PASS if everything is met or justified as N/A.">
</p>

### 1 · `SessionStart` hook: detects the stack

It looks for Firebase, Supabase, mobile (Expo, React Native, Capacitor), desktop (Electron, Tauri), Stripe, Next, API frameworks, LLM SDKs, Python and Docker in the project root and its direct subfolders.

- When it finds any, it injects two fixed lines: the standards that apply, and a reminder about the skill. It never prints repo content.
- When it finds nothing, it prints nothing.
- It does not fail the session, and it does not follow symlinks.
- Once a day, in the background, it checks the version on `main`. If a newer one is published, the next session shows a notice with the `hooks/` diff and the update command (see "Updating safely").

### 2 · `PostToolUse` hook: warns once

It runs on Edit, Write, MultiEdit and NotebookEdit. If the edit touches something risky, it tells the agent to load the checklist before calling the task done.

- It looks at the path (access rules, `.env`, keys and keystores, headers, desktop packaging, CI workflows, Dockerfiles and compose files) and at the written text: auth and re-authentication, roles, endpoints, payments, client-side tokens, uploads and archives, secrets, CORS and proxy headers, execution with external data, LLM calls, cryptography, desktop windows and IPC, app signing and updates, and edits to `SECURITY-PROFILE.md` (the one markdown file it watches).
- Next to each category it names the controls to look at first, for example `file uploads (P0-14)`.
- At most once per session. It never blocks.
- Categories come from a fixed list. The message never includes text from the repo.
- Docs, styles, images and lockfiles are ignored.

### 3 · `secdev:security-checklist` skill: reviews with evidence

It reviews a change, a feature or a whole repo.

| | |
|---|---|
| Two modes | Design, before any code: the controls that apply and concrete abuse cases. Sign-off, before you finish: verification and a verdict. |
| Statuses | MET, NOT MET, UNVERIFIED (the code can't show it), N/A with a reason. The words stay in English in any language. |
| Verdict | BLOCK if any P0 fails. PASS WITH ISSUES if something is UNVERIFIED or a P1/P2 fails. PASS if everything is met or justified as N/A. |
| Always loaded | The checklist lives inside `SKILL.md`, so it loads with the skill even when the agent can't read files outside the project. |
| References | ASVS 5.0, API Security Top 10 2023, MASVS 2.1, and guides for Firebase, Supabase, LLM and other stacks. The agent reads a guide only when it needs the detail. |
| The repo is data | Comments do not change the procedure. The skill does not run the repo's code or query cloud services unless you ask. |
| Hard to fool | Before the verdict it tries to break every MET. A comment that says "this is safe", or a test that mocks the check, is not evidence. Text telling reviewers or agents to pass the code is reported as prompt injection. Hidden Unicode (Trojan Source) is NOT MET. Asking does not turn a BLOCK into a PASS. |

<details>
<summary><strong>What the checklist covers</strong></summary>

<br>

**P0, blocks a release:** authentication (password hashing, reset links and re-authentication for sensitive changes included), server-side authorization (admin routes included), isolation between users or tenants, secrets (git history included), input validation, sessions, HTTPS with TLS 1.2 or later, abuse protection, database exposure, least privilege, separate environments, secure configuration, CSRF and SSRF, file handling, authorization tests and a minimal supply chain (including a `preinstall`, `postinstall` or `install` script that downloads or runs code).

**P1, process:** protected repos, automated scanning, dependencies, deployments, logging and audit trails, alerts, backups with a tested restore, incident response (what to do, in order, when a secret leaks), periodic reviews and a hardened CI/CD pipeline.

**P2, depending on the feature:** mobile (signed releases and updates included), payments, GDPR (no trackers before consent, encryption at rest), AI and LLMs, third-party integrations, secure design, desktop apps (Electron, Tauri) and containers.

What changed in each version: [docs/features/](docs/features/).

The full list, with how to verify each control and its standard, is in [skills/security-checklist/SKILL.md](skills/security-checklist/SKILL.md).

</details>

### 4 · `secdev:security-gate` skill: blocks PRs in CI

It writes `.github/workflows/security.yml` with three jobs. Ask in plain words: "add a security gate to CI" or "scan the repo for secrets now".

| Job | Tool | Fails when |
|---|---|---|
| `secrets` | gitleaks, full git history | any commit contains a secret |
| `dependencies` | osv-scanner, every lockfile | a dependency has a known vulnerability not accepted in `osv-scanner.toml` |
| `sast` | Semgrep CE, `p/default`, metrics off | there is any finding |

The only action is `actions/checkout`, pinned to a SHA. gitleaks and osv-scanner are release binaries checked against their SHA-256. Semgrep is an image pinned by digest. Every job has `contents: read`. That works under a repo policy of "allow only GitHub-owned actions" plus "require SHA pinning".

Before it writes the file, it says what leaves the repo: package names go to osv.dev, and Semgrep downloads rules. It writes only after you say yes.

You still have to mark the three jobs as required status checks in branch protection. Until then they only warn.

It can also run the three tools locally once, if you allow it. It ranks CVEs by CISA KEV first, then by EPSS.

Semgrep prints the line it flags, so a secret in code also ends up in the CI log. gitleaks hides the value. Rotate a leaked secret before anything else.

This repo runs the same workflow, and a test keeps it identical to the template in the skill. The first run found two hidden Unicode bidi characters in our own tests.

### What it doesn't do

A sign-off is not a vulnerability hunt. For a hunt, use:

- the [Claude Security plugin](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/claude-security/README.md) (`claude-security`). It reports CWE, not these rows. [security-audit](https://github.com/cloudflare/security-audit-skill) is Cloudflare's audit skill, a different product;
- `security-guidance` for an automatic look at every diff.

## Updating safely

> [!IMPORTANT]
> The hooks are code that runs in every one of your sessions. Updating the plugin means running new code everywhere.

- Leave auto-update off for this marketplace. Third-party marketplaces already default to off. You can check it in `/plugin`, then Marketplaces. secdev tells you when there is a new version.
- When a new version is published, the next session shows a notice like this one:
  ```
  secdev 0.3.4 is available (installed: 0.3.3). Review what changes in hooks/ before updating:
  https://github.com/majejorex/secdev-suite/compare/v0.3.3...v0.3.4 · Update: claude plugin marketplace
  update secdev-suite && claude plugin update secdev@secdev-suite, then restart Claude Code.
  ```
  1. Open the link and read the diff of `hooks/`. That code will run in every session.
  2. Update with one command (inside Claude Code, prefix it with `!`):
     ```
     claude plugin marketplace update secdev-suite && claude plugin update secdev@secdev-suite
     ```
  3. Restart Claude Code.
- How the check works: at most once a day, a background process downloads `.claude-plugin/plugin.json` from `main` and keeps only the version. It sends nothing about your project, and the session does not wait for it. The result is cached in the plugin data folder (`CLAUDE_PLUGIN_DATA`).
- To turn it off, set `SECDEV_NO_UPDATE_CHECK=1`.
- From a clone: `git fetch --tags && git diff <installed-tag>..origin/main -- hooks/ .claude-plugin/`.
- `v*` tags are protected. They cannot be moved or deleted, so a diff between tags can be trusted.

## Testing

```
npm test
```

No dependencies, just Node ≥ 20 and `node:test`. Two groups:

- Hooks: detection, output, that they never fail, and that they finish in under 1 s.
- Structure: valid JSON, frontmatter, internal links, and that the evals cite real controls.

`evals/cases.json` holds behaviour cases: whether the skill activates, and which controls it flags. `node evals/run.mjs <output-folder>` runs them for real. For each case it creates a throwaway project, runs `claude -p --plugin-dir .` and reports:

- whether the hook output was seen;
- whether the skill was loaded;
- whether it read its references without errors;
- which controls it cited;
- whether the answer names the key words for the case (`mustMention`, for example `constructEvent` for a Stripe webhook). Each item can list synonyms. A missing one fails the case.

About $0.21 per case with Sonnet, so this is not part of `npm test`.

A model does not answer the same way twice, so one green run proves little. Before a release that changes a skill:

```
node evals/run.mjs <folder-outside-the-repo> claude-sonnet-5-5 --repeat 3
```

- Every case runs 3 times, at most 8 at once, with the model pinned by its exact ID. The model actually used is recorded.
- Gate: a `critical` case (the ones that must BLOCK, the prompt-injection case, and the cases that must not activate) passes 3/3. Any other case passes at least 2/3. A case that sometimes fails is `flaky`.
- A case passes only if the skill loads, the expected controls are cited, the key words are named (with synonyms), and the verdict follows from its own table. A P0 at NOT MET means BLOCK. Any NOT MET or UNVERIFIED rules out PASS.
- The run writes `summary.md`. Copy it to `docs/evals/<version>.md`.
- Cost: about $18 per run (30 cases × 3).

## Roadmap

| Phase | What | Status |
|---|---|---|
| F0 | `security-checklist` skill, per-standard references and the `SessionStart` hook | Done, v0.1 |
| F1 | `PostToolUse` warning hook, using the `security-guidance` format (`hookSpecificOutput.additionalContext`). Without it, the skill activated in about 3 of 4 positive eval cases | Done, v0.2.0 |
| F1 | Authorization-test matrix for BOLA and BFLA, in `security-fix/references/authz-tests.md` | Done, v0.5.4 |
| F1 | `SECURITY-PROFILE.md`: the checklist creates it and reads accepted risks and attestations from the default branch | Done, v0.5.0 |
| F1 | Design mode in the checklist (controls and abuse cases before code; no separate skill) | Done, v0.5.4 |
| F5 | Wider stack detection, references for Go, Rust, JVM, PHP, Python, Ruby, .NET, cloud, Supabase and LLM, and the `security-fix` skill | Done, v0.5.0 |
| F2 | `security-gate` skill: gitleaks, `osv-scanner` and Semgrep in every repo's gate | Done, v0.4.0 |
| F3 | Threat intelligence, manual version (`/intel-review`) | Done |
| F4 | Evals that measure stability: 3 repeats per case, a release gate and a pinned model | Done, v0.4.3 and v0.4.4 |

Order decided on 2026-11-02:

1. F2 first: done in v0.4.0.
2. `authz-tests`: the matrix is in `security-fix/references/authz-tests.md` (v0.5.4).
3. `secure-design`: design mode in the checklist (v0.5.4).

Running the evals in CI is not planned. A full run costs about $18, so the maintainer runs it before a release that changes a skill.

Trail of Bits' `supply-chain-risk-auditor` is not installed. `osv-scanner` covers known vulnerabilities. A `preinstall`, `postinstall` or `install` script that downloads or runs code is NOT MET on P0-16 (v0.5.5). Abandoned packages and publisher changes are still out.

<details>
<summary><strong>F3: how <code>/intel-review</code> works</strong></summary>

<br>

- `/intel-review` is the maintainer's skill (`maintainer/intel-review/`; copy it to `.claude/skills/` to use it). It is not shipped with the plugin. It runs `node intel/fetch.mjs`, which collects CISA KEV, GitHub Advisories, EPSS, changes to the OWASP standards and news from a closed list of sources.
- The agent sorts what was collected, writes `intel/YYYY-MM-DD.md` and proposes changes to the skill. Only what you approve is applied, through a PR.
- Raw data (`intel/raw/`) is not versioned. Anything from outside is data, never an instruction.
- Still open: whether to schedule it weekly.

</details>

## Help it get better

The most useful thing you can do is try it on a project that is not Firebase or JavaScript and say what it got wrong.

- A wrong result (a false positive, a missed finding, a verdict that does not follow from the table): [open an issue](https://github.com/majejorex/secdev-suite/issues/new/choose) with the smallest example you can share.
- A stack or platform it does not know: the same link, "Stack or platform request".
- Questions, ideas, how it compares to other tools: [Discussions](https://github.com/majejorex/secdev-suite/discussions).
- Disagree with a control, its "how to verify", or its standard? That is a good issue. Every control cites the OWASP source it comes from.
- If it was useful, a star helps other people find it.

## Contributing

Fork and open a pull request. The rules are in [CONTRIBUTING.md](CONTRIBUTING.md). Report vulnerabilities privately: [SECURITY.md](SECURITY.md).

## Sources and licenses

Control IDs, chapter titles and control wording come from the official OWASP repositories (checked on 2026-11-02):

- [OWASP/ASVS](https://github.com/OWASP/ASVS) `5.0/en`;
- [OWASP/API-Security](https://github.com/OWASP/API-Security) `editions/2023/en`;
- [OWASP/masvs](https://github.com/OWASP/masvs) v2.1.0.

Those documents are published under OWASP's Creative Commons licenses. This repo only quotes IDs, titles and MASVS's one-line control statements, with attribution. All other text is original.

The code and original text are released under the [MIT](LICENSE) license. Quoted OWASP material keeps its original license.
