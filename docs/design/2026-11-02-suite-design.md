# secdev suite design (2026-11-02)

## Intent

Make `secdev` the best open-source security plugin for Claude Code, for any stack (web, mobile, backend, frontend). The key moment is **before release**: the user runs a skill and gets (1) a clear verdict with an ordered list of fixes, (2) optional patches they approve, (3) an exportable report.

Anti-goals: **heavy** (noise, endless reports), **invented** findings or standards, wasted tokens.

## Decisions

### By the maintainer
- Public, MIT, everything in English (code, docs, skills). The skill answers in the user's language.
- Separate skills: `check`, `gate`, `audit`, `design`, `authz-tests`, `fix`.
- `audit` level is chosen at launch (`quick|standard|deep`), or asked interactively. Default: cheap sweep + strong verifier on candidates only.
- Report: Markdown in the repo (`SECURITY-REPORT.md`); SARIF optional.
- The edit hook only reminds; it never blocks.
- Delivered in this order: v0.3 base → v0.4 gate + CVE → v0.5 audit → v0.6 authz-tests + design → v0.7 fix.
- Before release (`check` with repo/release scope, and `audit`), controls that code cannot show (P0-10 console MFA, P0-11 separate environments, P1-07 backups) are **asked to the user**:
  - The answer is recorded as `attested by the user, <date>` and counts for the verdict.
  - No answer or "don't know" → ⚠️.
  - Claims written in the repo never count as attestation.

### Builder calls (revisable)
- `security-checklist` is renamed to `check`. This is a breaking change, noted in the changelog.
- The checklist has a single source, `core/checklist.md`, which `scripts/sync-checklist.mjs` copies between markers into each SKILL.md that needs it. A test keeps them identical.
  - It must live inside SKILL.md, because reading plugin files can trigger permission prompts.
- In a **diff**, P0-10/P0-11 are project-level: they are left out of the verdict and get one line pointing to `audit`.
- Compact report:
  - rows only for ❌ and ⚠️;
  - ✅ on one line with their evidence, N/A on one line;
  - at most 20 numbered findings;
  - a `Not checked:` line at the end.
- Default exclusions (from `anthropics/claude-code-security-review`): DoS, rate limiting, generic validation without impact and open redirect do not block without proof.
  - Exception: P0-08 still blocks on login and on cost endpoints (LLM, SMS).
- "No proof, no finding": every `audit` finding needs a source→sink trace with `file:line`. The verifier starts from "refuted".
- No live pentesting. The README points to Strix for staging.
- CVE lookups (OSV, CISA KEV, EPSS) send dependency names to third parties, so they ask for permission every time and are never run from a hook.
- The PostToolUse reminder fires once per risky stretch. It re-arms when `secdev:check` runs, in either of two ways:
  - the model calls it through the Skill tool, caught by PreToolUse with matcher `Skill` (documented);
  - the user types `/secdev:check`, caught by `UserPromptExpansion`, which fires only for slash commands, not on every prompt.

  Both handlers print nothing.
- Standards expiry is not part of `npm test`, so outside PRs are not broken by it. A weekly scheduled workflow runs `scripts/check-sources.mjs` instead.
- Zero dependencies (`node:test`). Evals default to Sonnet.

## Prior art borrowed

- **Trail of Bits skills:**
  - a separate pass that tries to refute each finding before the verdict;
  - "report when / skip when" per check;
  - a "when not to use" note in every skill.
- **Anthropic `security-guidance`:** low-noise reminders and per-layer env switches.
- **`claude-code-security-review`:** the exclusion list and a dedicated false-positive filter step.
- **ponytail:**
  - one-shot reports with a findings cap, numbered so the user can say "fix 2 and 5";
  - a `Not checked:` line;
  - only the needed text injected.
- **Shannon / Strix:** "no exploit, no report", adapted here as a static source→sink trace plus a failing test.
- **OSV querybatch + CISA KEV + EPSS:** free, key-less, deterministic ranking of dependency CVEs.
- **Ralph loop:** used only inside `fix`, capped at 3 iterations, stopping as soon as a pass does not improve.

## Left to the builder

File-level layout inside each skill, exact wording of messages, and test names.
