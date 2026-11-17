# secdev (skills only)

Your agent says it's secure. secdev makes it show the `file:line`.

This folder is the skills-only build of [secdev-suite](https://github.com/majejorex/secdev-suite) for the Claude directory. It holds three skills and no hooks or scripts of its own:

- `security-checklist`: a P0 / P1 / P2 checklist on OWASP ASVS 5.0, API Security Top 10 2023 and MASVS 2.1. Each control needs a `file:line` or a test. The answer ends with a `Verdict:` line (BLOCK, PASS WITH ISSUES or PASS) and `Hunt: not done`, which says the pass checked these controls and did not look for bugs outside the list.
- `security-fix`: fixes a finding and re-verifies the fix.
- `security-gate`: writes a GitHub Actions workflow with gitleaks, osv-scanner and Semgrep, after showing you what it will add.

## Use it

Ask in plain words: "Can we ship this?", "Review the security of this change", "fix P0-02", "Add a security gate to CI".

## Data

`security-checklist` and `security-fix` read the project you are working on and send nothing anywhere. They do not run the code of a repo they review.

`security-gate` is the only skill that touches a network, and only after it has shown you what it will do and you have said yes, in your own repository:

- osv-scanner sends package names and versions to osv.dev.
- Semgrep downloads its rules and runs with `--metrics=off`.
- gitleaks sends nothing.
- To rank findings it can read the CISA KEV list (nothing is sent) and ask FIRST.org for EPSS scores (this sends CVE IDs, so it asks first).
- The CI workflow it writes downloads the scanner binaries from their GitHub releases.

Nothing is stored by the skills, and no personal data is collected. The skills are not meant for users under 18.

## The full plugin

The repository root is the full Claude Code plugin. It adds two hooks that detect your stack at session start and remind the agent, once per session, to run the checklist after a risky edit. Hooks run code on your machine, so the directory does not take them from this account. Install them from the repository:

```
/plugin marketplace add majejorex/secdev-suite
/plugin install secdev@secdev-suite
```

This folder is a copy of `skills/` in the repository, kept in sync by a test. MIT license.
