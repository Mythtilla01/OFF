# OFF — Open Freedom Forum

Private conversations. Open communities.

## Architecture and security checklist

This repository was supplied with only this README and an empty Git history; there were no routes, dependencies, Supabase integration, migrations, recovery implementation, or RLS policies to audit. The initial implementation therefore establishes a small, deployable Supabase-backed MVP baseline instead of assuming undocumented Lovable state is present.

- [x] Client uses only `VITE_SUPABASE_URL` and a publishable/anon key; it has no service-role credential path.
- [x] Auth is password-based through Supabase Auth; the UI derives a non-deliverable internal auth email from the requested pseudonym. Production should instead use a server-side username-to-auth lookup to avoid exposing this convention.
- [x] RLS restricts private rooms and their messages to members, verifies message ownership for writes, and enables WebSocket realtime for messages.
- [x] Public rooms are intentionally writable by authenticated users; moderation, blocks/reports, rate limits, DMs, receipts, country room assignment, and invitations remain required follow-up work.
- [x] No analytics, tracking pixels, IP reads, or service-role secrets are included.
- [x] The recovery phrase UX is deliberately **not implemented** because no existing verifier was supplied and a three-position fast-hash design would not be safe to present as recovery. `src/services/auth/recovery.ts` preserves only guarded copy for future work.
- [x] Media uploads are intentionally not enabled until a server-side re-encode/metadata-cleaning endpoint exists and has tests.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Apply `supabase/migrations/202609060001_off_mvp.sql` to a new Supabase project before use. Enable email confirmation according to the deployment policy; the UI reports Supabase errors without enumerating an account during registration.

## Current MVP surface

Landing, password authentication, pseudonymous profile trigger, seeded public rooms, optimistic message sending, and Supabase Realtime receiving are implemented. The responsive conversation shell uses live database queries—not fixture chat content.
