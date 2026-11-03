# Supabase and exposed Postgres

Our own review notes, not an OWASP text. Check them against the Supabase docs for the version in use before quoting them as requirements. Applies when `supabase/config.toml`, `@supabase/supabase-js` or a Supabase URL is present.

| Control | What to look at | Evidence |
|---------|-----------------|----------|
| P0-03, P0-09 | Row Level Security enabled on every table in an exposed schema (`public`); no table without policies | `alter table … enable row level security` in `supabase/migrations/*.sql`, next to a `create policy` |
| P0-03 | Policies tie rows to `auth.uid()` (or a tenant claim), for `select`, `insert`, `update` and `delete` separately; `with check` on writes so a user cannot move a row to someone else | Policies with `using (true)` or no `with check` are NOT MET |
| P0-02, P0-04 | The `service_role` key only on the server; it bypasses RLS. The `anon` key is public by design, so RLS is the only barrier | Grep `service_role` in client code, `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*` |
| P0-03 | Mass assignment: columns such as `role` or `is_admin` not writable by the user (column privileges or a trigger) | Update policy plus column-level `grant` |
| P0-02 | Views and `security definer` functions run with their owner's rights and can skip RLS; views should use `security_invoker` and functions set `search_path` | Migrations that create views or functions in `public` |
| P0-14 | Storage buckets private by default; `storage.objects` policies per owner or tenant; public buckets only for public files | Policies on `storage.objects` |
| P0-12 | Edge Functions verify the JWT and check the permission themselves; CORS with explicit origins | `supabase/functions/*` |
| P0-15 | Tests that sign in as two users and try to read and write each other's rows | pgTAP or integration tests |
| P1-07 | Backups and PITR are a project setting: UNVERIFIED from code | Dashboard |
