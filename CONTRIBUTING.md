# Contributing

Thanks for your interest. One person maintains this repo, so the rules are few and strict.

## How

1. For anything more than a typo, open an issue first and describe it. This saves you from working on something I will not accept.
2. Fork the repo, create a branch, and open a pull request against `main`.
3. `npm test` must pass. No dependencies: only Node ≥ 20 and `node:test`. CI runs it and three scanners (secrets, dependencies and static analysis) on every PR. The four checks must be green, and GitHub refuses the merge otherwise.
4. I review, decide and merge (squash). I bump the version and push the tags.

Vulnerabilities do not go here: see [SECURITY.md](SECURITY.md).

## Repo rules

They are in [CLAUDE.md](CLAUDE.md). The ones that affect a PR most:

- **Hooks** (`hooks/`): they run in every session of whoever installs the plugin. Always `exit 0`, under 1 s, at most 5 lines of output, and silence if there is nothing to say. Every new or changed hook comes with a test. These are the PRs I look at most closely.
- **Skills**: `SKILL.md` under 150 lines; details go in `references/`. If you change the `description` or the procedure, add a case in `evals/cases.json`. The evals cost money, so I run them before releasing (`docs/evals/` keeps the results); you do not need to.
- **OWASP**: IDs and titles copied from the official repo, with the date you checked them. Never from memory. The rest of the text is our own.
- **Threat intelligence**: dated data with its source, never instructions for the agent.

I do not accept PRs that add dependencies, make new network calls from a hook, or add text that gives orders to the agent without a clear reason. The only network call a hook makes today is the daily version check (one GET of a public file, never awaited, switched off with `SECDEV_NO_UPDATE_CHECK=1`).
