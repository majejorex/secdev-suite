# secdev (skills only)

Your agent says it's secure. secdev makes it show the `file:line`.

This folder is the skills-only build of [secdev-suite](https://github.com/majejorex/secdev-suite) for the Claude directory. It holds three skills and nothing that runs on your machine:

- `security-checklist`: a P0 / P1 / P2 checklist on OWASP ASVS 5.0, API Security Top 10 2023 and MASVS 2.1. Each control needs a `file:line` or a test. The answer ends with a `Verdict:` line (BLOCK, PASS WITH ISSUES or PASS) and `Hunt: not done`, which says the pass checked these controls and did not look for bugs outside the list.
- `security-fix`: fixes a finding and re-verifies the fix.
- `security-gate`: writes a GitHub Actions workflow with gitleaks, osv-scanner and Semgrep, after showing you what it will add.

## Use it

Ask in plain words: "Can we ship this?", "Review the security of this change", "fix P0-02", "Add a security gate to CI".

## Data

The skills do not send anything anywhere and do not run the code of the repo they review. The only network access is in the CI workflow that `security-gate` proposes, which downloads the scanners in your own repository's pipeline, and only after you say yes.

## The full plugin

The repository root is the full Claude Code plugin. It adds two hooks that detect your stack at session start and remind the agent, once per session, to run the checklist after a risky edit. Hooks run code on your machine, so the directory does not take them from this account. Install them from the repository:

```
/plugin marketplace add majejorex/secdev-suite
/plugin install secdev@secdev-suite
```

This folder is a copy of `skills/` in the repository, kept in sync by a test. MIT license.
