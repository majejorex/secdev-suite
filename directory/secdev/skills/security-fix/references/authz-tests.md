# Authorization tests

P0-15 for a P0-02 or P0-03 fix. Two cases, written so they fail if the check is removed:

1. **Other user.** Caller A reads or writes a resource owned by B. Expect deny.
2. **Lower role.** A signed-in non-admin calls an admin action, or sends a role in the body. Expect deny.

When the row is P0-03, the same file also denies a write that sets `role`, `balance` or an owner id. The allowlist is `keys().hasOnly` / `affectedKeys()` in rules, or the API's field allowlist.

Use the runner the repo already has. Do not add a dependency.

| Where the check lives | File | Run |
|---|---|---|
| Firestore or Storage rules | a test next to the rules, using `@firebase/rules-unit-testing` only if that dependency is already installed | the repo's test command, or `firebase emulators:exec` if the repo already uses the emulator |
| Supabase RLS | the repo's SQL or database test | the repo's test command |
| HTTP route or callable | the repo's existing test for that route (`node:test` or whatever the repo uses) | the repo's test command |

If the repo has no test runner, still write the file in the closest form above and say the command. P0-15 stays NOT MET until that file exists.
