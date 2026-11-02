# Firebase: what to review

In Firebase, the security rules (Firestore, Storage, Realtime Database) **are** the authorization layer for everything the client reads or writes directly. Cloud Functions use the Admin SDK, which **bypasses the rules**: inside a function, authorization is the code's responsibility.

## Rules (Firestore and Storage): P0-02, P0-03, P0-09, P0-14

- Everything denied by default; no `allow read, write: if true` and no dated test rules.
- `request.auth != null` is **not** authorization: it only says there is a session. Tie the resource to the user (`resource.data.ownerId == request.auth.uid`) or to a verified role.
- Roles from custom claims (`request.auth.token.role`) set by the server, or from a document the client cannot write. Never from a field the user edits.
- Writes with a field allowlist: `request.resource.data.keys().hasOnly([...])` and `diff(...).affectedKeys().hasOnly([...])` to prevent mass assignment (`role`, `isVerified`, `balance`).
- Type and size validation in the rules: strings with a maximum length, closed enums.
- Rules do not filter results: a query is rejected entirely if the rule is not guaranteed by the query itself. The real risk is a broad `allow list` (or `read`), such as `if request.auth != null`, which lets any signed-in user read the whole collection. Review `list` separately from `get`.
- Storage: limit `request.resource.size` and `contentType`; private paths with the `uid` in the path and checked.
- **Tests** with the emulator and `@firebase/rules-unit-testing`: for each sensitive collection, an "other user" case and a "no session" case that must fail (P0-15).

## Cloud Functions: P0-02, P0-05, P0-08

- Callables: check `request.auth` and the permission on the specific resource in each one.
- Validate `request.data` with a schema (zod); do not pass the whole object to `set`/`update`.
- App Check: `enforceAppCheck: true` on callables exposed to the app, especially expensive ones or ones open to abuse.
- Errors: `HttpsError` with a generic message; the detail goes to the log, not to the client.
- HTTP functions (webhooks): verify the signature (Stripe: `constructEvent` with the raw body); respond fast and process idempotently.
- Triggers: delivery is at least once, so they must be idempotent (processed-event marker or transaction).
- Secrets with `defineSecret` (Secret Manager), not in the code or in a versioned `.env`.
- Own rate limit on expensive functions: Firebase does not provide one per function.

## Auth: P0-01, P0-06

- Email enumeration protection is turned on.
- MFA (TOTP or SMS) required for staff. It requires upgrading to Firebase Authentication with Identity Platform. Check it on the server: in rules with `request.auth.token.firebase.sign_in_second_factor`, in functions with the same field of the decoded token. A UI-only requirement does not count.
- Revocation: `revokeRefreshTokens` does not invalidate ID tokens already issued (valid for up to 1 h) and `onCall` does not check revocation. In sensitive functions, use `verifyIdToken(token, true)` or your own check. In rules, store a revocation marker and compare it with `request.auth.token.auth_time`.
- Session persistence on the web: the SDK stores the refresh token in browser storage. ASVS 14.3.3 allows session tokens there. Own recommendation: with CSP and XSS defense.
- Persistence in React Native: `getReactNativePersistence(AsyncStorage)` stores it in AsyncStorage, which is not encrypted. This is ⚠️: prefer an adapter over SecureStore, or write down the accepted risk.
- Authorized Auth domains limited to your own.

## Keys and configuration: P0-04, P0-10, P0-11

- The Firebase `apiKey` in the client is a public identifier, not a secret. Restrict it in Google Cloud (by app or referrer and by API).
- Service accounts and credential JSON never in the client or the repo.
- One Firebase project per environment (dev, staging, prod); no real data in dev.
- IAM: service accounts with specific roles; no Owner or Editor for convenience.

## Hosting: P0-12

- Headers in `firebase.json` (`hosting.headers`): CSP, HSTS, X-Content-Type-Options, frame-ancestors or X-Frame-Options, Referrer-Policy.

## Data and recovery: P1-07, P2-03

- PITR enabled and scheduled exports to a bucket with retention; restore tested at least once.
- Account deletion reaches all collections and the user's Storage files. Decide and document what happens to the backups.
- Budget alerts in Google Cloud (P1-06).
